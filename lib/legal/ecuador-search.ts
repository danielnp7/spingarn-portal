import Anthropic from "@anthropic-ai/sdk";

const AGENT_FETCH_SOURCES: Record<string, { url: string; label: string }[]> = {
  laboral:              [{ url: "https://www.trabajo.gob.ec/normativa-legal/", label: "Normativa Ministerio del Trabajo" }],
  corporativo:          [{ url: "https://www.supercias.gob.ec/portalscvs/", label: "Superintendencia de Compañías (SCVS)" }],
  tributario:           [{ url: "https://www.sri.gob.ec/normativa-vigente", label: "Normativa SRI vigente" }],
  financiero:           [{ url: "https://www.bce.fin.ec/tasas-de-interes/", label: "Tasas de interés BCE" }],
  aviacion:             [{ url: "https://www.aviacion.gob.ec/regulaciones-aeronauticas-del-ecuador-rae/", label: "Regulaciones DGAC" }],
  contratacion_publica: [{ url: "https://www.sercop.gob.ec/normativa/", label: "Normativa SERCOP" }],
  propiedad_intelectual:[{ url: "https://www.senadi.gob.ec/normativa/", label: "Normativa SENADI" }],
  datos_tecnologia:     [{ url: "https://www.arcotel.gob.ec/resoluciones/", label: "Resoluciones ARCOTEL" }],
};

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SpingarnLegalBot/1.0; legal research)",
        "Accept": "text/html,application/xhtml+xml,text/plain",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 20000);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{3,}/g, "\n")
    .trim()
    .slice(0, 8000);
}

async function extractRelevantSnippets(
  anthropic: Anthropic,
  rawText: string,
  sourceLabel: string,
  query: string,
): Promise<string | null> {
  if (!rawText.trim()) return null;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{
        role: "user",
        content: `Del contenido de "${sourceLabel}", extrae SOLO los fragmentos relevantes para: "${query}". Si no hay contenido relevante, responde NADA. Máximo 250 palabras, texto plano.\n\nCONTENIDO:\n${rawText.slice(0, 4000)}`,
      }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (text === "NADA" || text.length < 20) return null;
    return `[${sourceLabel}]\n${text}`;
  } catch {
    return null;
  }
}

export async function buildAgentLegalBlock(
  agentId: string,
  caseDescription: string,
  anthropic: Anthropic,
): Promise<string> {
  const sources = AGENT_FETCH_SOURCES[agentId] ?? [];
  if (sources.length === 0) return "";

  const query = caseDescription.slice(0, 200);

  let liveSnippet: string | null = null;
  try {
    const { url, label } = sources[0];
    const html = await fetchWithTimeout(url, 4000);
    if (html) {
      const text = stripHtml(html);
      if (text.length > 100) {
        liveSnippet = await extractRelevantSnippets(anthropic, text, label, query);
      }
    }
  } catch {
    // silent fail
  }

  if (!liveSnippet) return "";

  return `\n\n---\nEXTRACTO FUENTE OFICIAL CONSULTADA EN TIEMPO REAL (${new Date().toISOString().split("T")[0]}):\n${liveSnippet}\n---`;
}
