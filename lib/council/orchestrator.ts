import Anthropic from "@anthropic-ai/sdk";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { COUNCIL_AGENTS, ORCHESTRATOR_SYSTEM_PROMPT, selectRelevantAgents, type CouncilAgent } from "./agents";
import { buildAgentLegalBlock } from "@/lib/legal/ecuador-search";

const MODEL = "claude-sonnet-4-6";

export interface AgentResult {
  agent: CouncilAgent;
  response: string;
}

export interface CouncilResult {
  agentResults: AgentResult[];
  councilResponse: string;
  selectedAgents: CouncilAgent[];
}

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

type KnowledgeEntry = { type: string; title: string; content: string; source: string | null; effective_date: string | null };

async function fetchKnowledge(agentId: string): Promise<KnowledgeEntry[]> {
  try {
    const admin = adminClient();
    const { data } = await admin
      .from("agent_knowledge")
      .select("type, title, content, source, effective_date")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .order("type")
      .order("created_at", { ascending: false });
    return (data ?? []) as KnowledgeEntry[];
  } catch {
    return [];
  }
}

function buildKnowledgeBlock(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";

  const typeLabels: Record<string, string> = {
    norma_vigente:  "NORMAS VIGENTES",
    jurisprudencia: "JURISPRUDENCIA Y PRECEDENTES",
    caso_tipo:      "CASOS TIPO",
    criterio:       "CRITERIOS SPINGARN",
    alerta_cambio:  "⚠ ALERTAS DE CAMBIO NORMATIVO RECIENTE",
    otro:           "INFORMACIÓN ADICIONAL",
  };

  const grouped: Record<string, KnowledgeEntry[]> = {};
  for (const e of entries) {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e);
  }

  const sections = Object.entries(grouped).map(([type, items]) => {
    const header = typeLabels[type] ?? type.toUpperCase();
    const body = items.map(e => {
      let text = `• ${e.title}\n${e.content}`;
      if (e.source) text += `\n  Fuente: ${e.source}`;
      if (e.effective_date) text += ` · Vigente desde: ${e.effective_date}`;
      return text;
    }).join("\n\n");
    return `=== ${header} ===\n${body}`;
  });

  return `\n\n---\nCONOCIMIENTO ESPECIALIZADO DE SPINGARN PARA ESTE AGENTE\n(Información validada por los socios de la firma — tiene precedencia sobre tu conocimiento base cuando haya conflicto)\n\n${sections.join("\n\n")}\n---`;
}

async function runAgent(
  client: Anthropic,
  agent: CouncilAgent,
  caseTitle: string,
  caseDescription: string,
  knowledge: KnowledgeEntry[],
  legalBlock: string,
): Promise<AgentResult> {
  const knowledgeBlock = buildKnowledgeBlock(knowledge);
  const systemPrompt = agent.systemPrompt + knowledgeBlock + legalBlock;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `CASO SOMETIDO AL CONSEJO CONSULTIVO DE SPINGARN\n\nTítulo: ${caseTitle}\n\nDescripción:\n${caseDescription}\n\nAnaliza este caso desde tu área de especialización y presenta tu posición al consejo.`,
      },
    ],
  });

  const response = message.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("\n");

  return { agent, response };
}

async function synthesize(client: Anthropic, caseTitle: string, agentResults: AgentResult[]): Promise<string> {
  const deliberations = agentResults
    .map(r => `### ${r.agent.emoji} ${r.agent.name}\n${r.response}`)
    .join("\n\n---\n\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `CASO: ${caseTitle}\n\nDELIBERACIONES DEL CONSEJO:\n\n${deliberations}\n\nRedacta la posición unificada e institucional del Consejo Consultivo de Spingarn.`,
      },
    ],
  });

  return message.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("\n");
}

export async function runCouncil(caseTitle: string, caseDescription: string): Promise<CouncilResult> {
  const client = getClient();
  const selectedAgents = selectRelevantAgents(caseDescription);

  // Fetch knowledge + legal context for all agents in parallel, then run agents
  const agentResults = await Promise.all(
    selectedAgents.map(async agent => {
      const [knowledge, legalBlock] = await Promise.all([
        fetchKnowledge(agent.id),
        buildAgentLegalBlock(agent.id, caseDescription, client).catch(() => ""),
      ]);
      return runAgent(client, agent, caseTitle, caseDescription, knowledge, legalBlock);
    })
  );

  const councilResponse = await synthesize(client, caseTitle, agentResults);

  return { agentResults, councilResponse, selectedAgents };
}
