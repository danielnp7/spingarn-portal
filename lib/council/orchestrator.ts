import Anthropic from "@anthropic-ai/sdk";
import { COUNCIL_AGENTS, ORCHESTRATOR_SYSTEM_PROMPT, selectRelevantAgents, type CouncilAgent } from "./agents";

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

async function runAgent(client: Anthropic, agent: CouncilAgent, caseTitle: string, caseDescription: string): Promise<AgentResult> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: agent.systemPrompt,
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

  // Run all relevant agents in parallel
  const agentResults = await Promise.all(
    selectedAgents.map(agent => runAgent(client, agent, caseTitle, caseDescription))
  );

  // Synthesize into unified council response
  const councilResponse = await synthesize(client, caseTitle, agentResults);

  return { agentResults, councilResponse, selectedAgents };
}
