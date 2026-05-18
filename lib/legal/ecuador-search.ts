import { tavily } from "@tavily/core";

const AGENT_CONFIG: Record<string, {
  tavilyQueries: string[];
  tavilyDomains: string[];
  jinaUrls: { url: string; label: string }[];
}> = {
  laboral: {
    tavilyQueries: [
      "salario básico unificado SBU Ecuador 2025 valor acuerdo ministerial vigente",
      "aportaciones IESS Ecuador 2025 porcentaje empleado empleador vigente",
    ],
    tavilyDomains: ["trabajo.gob.ec", "iess.gob.ec", "registroficial.gob.ec"],
    jinaUrls: [{ url: "https://www.trabajo.gob.ec/salarios/", label: "Ministerio del Trabajo — Salarios" }],
  },
  corporativo: {
    tavilyQueries: [
      "Superintendencia de Compañías SCVS Ecuador resolución 2025",
      "SCPM fusiones adquisiciones Ecuador 2025 normativa",
    ],
    tavilyDomains: ["supercias.gob.ec", "scpm.gob.ec", "registroficial.gob.ec"],
    jinaUrls: [{ url: "https://www.supercias.gob.ec/portalscvs/", label: "SCVS — Superintendencia de Compañías" }],
  },
  tributario: {
    tavilyQueries: [
      "resoluciones SRI Ecuador 2025 impuesto renta IVA retenciones vigentes",
      "reforma tributaria Ecuador 2025 LORTI normativa vigente",
    ],
    tavilyDomains: ["sri.gob.ec", "registroficial.gob.ec", "finanzas.gob.ec"],
    jinaUrls: [{ url: "https://www.sri.gob.ec/normativa-vigente", label: "SRI — Normativa vigente" }],
  },
  financiero: {
    tavilyQueries: [
      "tasas de interés BCE Ecuador 2025 activa pasiva referencial",
      "Banco Central Ecuador indicadores económicos 2025",
    ],
    tavilyDomains: ["bce.fin.ec", "superbancos.gob.ec", "registroficial.gob.ec"],
    jinaUrls: [{ url: "https://www.bce.fin.ec/tasas-de-interes/", label: "BCE — Tasas de interés" }],
  },
  aviacion: {
    tavilyQueries: [
      "DGAC Ecuador resolución aviación civil 2025 normativa",
      "regulaciones aeronáuticas Ecuador RDAC 2025 vigentes",
    ],
    tavilyDomains: ["aviacion.gob.ec", "registroficial.gob.ec"],
    jinaUrls: [{ url: "https://www.aviacion.gob.ec/regulaciones-aeronauticas-del-ecuador-rae/", label: "DGAC — Regulaciones" }],
  },
  contratacion_publica: {
    tavilyQueries: [
      "SERCOP Ecuador umbrales contratación pública 2025 resolución vigente",
      "LOSNCP reforma Ecuador 2025 normativa SERCOP",
    ],
    tavilyDomains: ["sercop.gob.ec", "registroficial.gob.ec"],
    jinaUrls: [{ url: "https://www.sercop.gob.ec/normativa/", label: "SERCOP — Normativa" }],
  },
  propiedad_intelectual: {
    tavilyQueries: [
      "SENADI Ecuador 2025 marcas patentes resolución normativa vigente",
      "propiedad intelectual Ecuador Código INGENIOS 2025",
    ],
    tavilyDomains: ["senadi.gob.ec", "registroficial.gob.ec"],
    jinaUrls: [{ url: "https://www.senadi.gob.ec/normativa/", label: "SENADI — Normativa" }],
  },
  datos_tecnologia: {
    tavilyQueries: [
      "LOPDP Ecuador 2025 Superintendencia Protección Datos Personales resolución",
      "ARCOTEL Ecuador 2025 telecomunicaciones resolución normativa",
    ],
    tavilyDomains: ["arcotel.gob.ec", "registroficial.gob.ec", "snap.gob.ec"],
    jinaUrls: [{ url: "https://www.arcotel.gob.ec/resoluciones/", label: "ARCOTEL — Resoluciones" }],
  },
};

async function tavilySearch(query: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("[tavily] TAVILY_API_KEY no configurada");
    return [];
  }
  const client = tavily({ apiKey });
  try {
    const result = await client.search(query, {
      searchDepth: "advanced",
      maxResults: 5,
      includeAnswer: true,
    });
    const snippets: string[] = [];
    if (result.answer) snippets.push(`Síntesis: ${result.answer}`);
    for (const r of result.results.slice(0, 4)) {
      if (r.content && r.content.length > 50) {
        snippets.push(`[${r.title ?? r.url}]\n${r.content.slice(0, 600)}\nFuente: ${r.url}`);
      }
    }
    console.log(`[tavily] "${query.slice(0, 80)}…" → ${snippets.length} resultados`);
    return snippets;
  } catch (err) {
    console.error("[tavily] error:", err);
    return [];
  }
}

async function fetchJina(url: string, label: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "text",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = (await res.text()).slice(0, 5000).trim();
    if (text.length < 100) return null;
    return `[${label}]\n${text}`;
  } catch {
    return null;
  }
}

export async function buildAgentLegalBlock(
  agentId: string,
  caseDescription: string,
): Promise<string> {
  const config = AGENT_CONFIG[agentId];
  if (!config) return "";

  const year = new Date().getFullYear();
  const caseTitle = caseDescription.split("\n")[0].slice(0, 120);
  const specificQuery = `${caseTitle} Ecuador ${year} normativa vigente reforma`;
  const areaQuery = config.tavilyQueries[0].replace(/20\d\d/g, String(year));

  const [specificSnippets, areaSnippets, ...jinaResults] = await Promise.all([
    tavilySearch(specificQuery),
    tavilySearch(areaQuery),
    ...config.jinaUrls.map(({ url, label }) => fetchJina(url, label)),
  ]);

  const snippets = [
    ...specificSnippets,
    ...areaSnippets.filter(s => !specificSnippets.includes(s)),
    ...jinaResults.filter((s): s is string => !!s),
  ];

  if (snippets.length === 0) return "";

  return `\n\n---\nINFORMACIÓN LEGAL VIGENTE OBTENIDA EN TIEMPO REAL (${new Date().toISOString().split("T")[0]}):\n${snippets.join("\n\n")}\n---`;
}
