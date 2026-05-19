import Anthropic from "@anthropic-ai/sdk";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { COUNCIL_AGENTS, ORCHESTRATOR_SYSTEM_PROMPT, selectRelevantAgents, type CouncilAgent } from "./agents";
import { tavily } from "@tavily/core";

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

export type StreamEvent =
  | { type: "agent"; result: AgentResult }
  | { type: "synthesis"; response: string };

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

type HubAgent = { id: string; name: string; description: string | null; department_id: string };
type KnowledgeEntry = { type: string; title: string; content: string; source: string | null; effective_date: string | null };

async function selectCouncilAgents(caseTitle: string, caseDescription: string): Promise<CouncilAgent[]> {
  const caseText = (caseTitle + " " + caseDescription).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  try {
    const admin = adminClient();
    const { data: hubAgents } = await admin.from("agents").select("id, name, description, department_id");

    const matchedDepts = new Set<string>();
    for (const agent of (hubAgents ?? []) as HubAgent[]) {
      const agentText = (agent.name + " " + (agent.description ?? ""))
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const tokens = agentText.split(/[\s,;:()\-\/]+/).filter(t => t.length > 3);
      if (tokens.some(t => caseText.includes(t))) {
        matchedDepts.add(agent.department_id);
      }
    }

    if (matchedDepts.size > 0) {
      const fromHub = COUNCIL_AGENTS.filter(a => matchedDepts.has(a.id));
      if (fromHub.length > 0) return fromHub;
    }
  } catch { /* fall through */ }

  return selectRelevantAgents(caseDescription);
}

async function fetchAllKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    const admin = adminClient();
    const { data } = await admin
      .from("agent_knowledge")
      .select("type, title, content, source, effective_date")
      .eq("is_active", true)
      .order("type")
      .order("created_at", { ascending: false });
    return (data ?? []) as KnowledgeEntry[];
  } catch {
    return [];
  }
}

async function buildCaseLegalBlock(caseTitle: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return "";
  try {
    const year = new Date().getFullYear();
    const query = `${caseTitle} Ecuador ${year} normativa vigente legislación`;
    const client = tavily({ apiKey });
    const result = await client.search(query, { searchDepth: "advanced", maxResults: 5, includeAnswer: true });
    const snippets: string[] = [];
    if (result.answer) snippets.push(`Síntesis: ${result.answer}`);
    for (const r of result.results.slice(0, 4)) {
      if (r.content && r.content.length > 50)
        snippets.push(`[${r.title ?? r.url}]\n${r.content.slice(0, 500)}\nFuente: ${r.url}`);
    }
    if (snippets.length === 0) return "";
    return `\n\n---\nINFORMACIÓN EN TIEMPO REAL (${new Date().toISOString().split("T")[0]}):\n${snippets.join("\n\n")}\n---`;
  } catch {
    return "";
  }
}

function buildKnowledgeBlock(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";
  const typeLabels: Record<string, string> = {
    norma_vigente: "NORMAS VIGENTES", jurisprudencia: "JURISPRUDENCIA Y PRECEDENTES",
    caso_tipo: "CASOS TIPO", criterio: "CRITERIOS SPINGARN",
    alerta_cambio: "⚠ ALERTAS DE CAMBIO NORMATIVO RECIENTE", otro: "INFORMACIÓN ADICIONAL",
  };
  const grouped: Record<string, KnowledgeEntry[]> = {};
  for (const e of entries) { if (!grouped[e.type]) grouped[e.type] = []; grouped[e.type].push(e); }
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
  return `\n\n---\nCONOCIMIENTO ESPECIALIZADO DE SPINGARN\n(Información validada por los socios — tiene precedencia)\n\n${sections.join("\n\n")}\n---`;
}

async function runAgent(
  client: Anthropic, agent: CouncilAgent,
  caseTitle: string, caseDescription: string,
  knowledge: KnowledgeEntry[], legalBlock: string,
): Promise<AgentResult> {
  const knowledgeBlock = buildKnowledgeBlock(knowledge);
  const hierarchyNote = `\n\nJERARQUÍA DE FUENTES:\n1. CONOCIMIENTO SPINGARN — máxima prioridad\n2. INFORMACIÓN EN TIEMPO REAL — cifras y resoluciones vigentes\n3. Conocimiento de entrenamiento — marcos normativos estables`;
  const systemPrompt = agent.systemPrompt + knowledgeBlock + hierarchyNote + legalBlock;
  const message = await client.messages.create({
    model: MODEL, max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: `CASO: ${caseTitle}\n\n${caseDescription}\n\nAnaliza desde tu especialización.` }],
  });
  const response = message.content.filter(b => b.type === "text").map(b => (b as { type: "text"; text: string }).text).join("\n");
  return { agent, response };
}

async function synthesize(client: Anthropic, caseTitle: string, agentResults: AgentResult[]): Promise<string> {
  const deliberations = agentResults.map(r => `### ${r.agent.emoji} ${r.agent.name}\n${r.response}`).join("\n\n---\n\n");
  const message = await client.messages.create({
    model: MODEL, max_tokens: 2000,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `CASO: ${caseTitle}\n\nDELIBERACIONES:\n\n${deliberations}\n\nRedacta la posición unificada del Consejo Consultivo de Spingarn.` }],
  });
  return message.content.filter(b => b.type === "text").map(b => (b as { type: "text"; text: string }).text).join("\n");
}

export async function runCouncil(
  caseTitle: string,
  caseDescription: string,
  emit?: (event: StreamEvent) => void,
): Promise<CouncilResult> {
  const client = getClient();
  const selectedAgents = await selectCouncilAgents(caseTitle, caseDescription);

  const [allKnowledge, legalBlock] = await Promise.all([
    fetchAllKnowledge(),
    buildCaseLegalBlock(caseTitle),
  ]);

  const agentResults: AgentResult[] = [];
  await Promise.all(
    selectedAgents.map(async agent => {
      const result = await runAgent(client, agent, caseTitle, caseDescription, allKnowledge, legalBlock);
      agentResults.push(result);
      emit?.({ type: "agent", result });
    })
  );

  const councilResponse = await synthesize(client, caseTitle, agentResults);
  emit?.({ type: "synthesis", response: councilResponse });

  return { agentResults, councilResponse, selectedAgents };
}
