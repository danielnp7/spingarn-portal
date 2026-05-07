import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FIRM_SERVICES = `
SERVICIOS DE SPINGARN INTEGRATED BUSINESS CONSULTING:

ÁREA FINANCIERA E INVERSIONES (PRIORIDAD):
- Valoración de Negocios: DCF, múltiplos de mercado, peritajes SCVS, M&A, due diligence de valor
- Precios de Transferencia: cumplimiento normativa ecuatoriana, análisis comparables, consulta previa SRI, defensa en auditorías
- Estructuración Financiera: modelación financiera, estructuración de deuda, capital privado, fondos de inversión, planes de negocio

TRANSFORMACIÓN DIGITAL E IA:
- Optimización Operativa con IA: automatización con n8n/Make/agentes IA, hasta 70% reducción de tiempo manual
- Inteligencia de Datos: dashboards ejecutivos, modelos predictivos, consolidación de datos
- Transformación Digital: digitalización integral, metodología diagnóstico→diseño→implementación→escala

SERVICIOS JURÍDICOS Y DE CONSULTORÍA:
- Impuestos: tributación local, estrategia fiscal, international tax, BEPS, procesos judiciales y administrativos, aduana
- Corporativo & Bancario: procesos societarios, M&A, contratos bancarios, negociaciones estratégicas
- Protección de Datos Personales: cumplimiento LOPDP, políticas de privacidad, DPO externalizado
- Derecho Administrativo: contratación pública, SERCOP, infraestructura, regulatorio (ARCOTEL, ARCSA)
- Competencia: antimonopolio, control de concentraciones ante SCPM, compliance competitivo
- Civil & Resolución de Controversias: mediación, arbitraje (CAM, ICC), litigio contractual
- Energía: hidrocarburos, energías renovables, Oil & Gas, minería, concesiones
- Laboral: relaciones laborales, procesos MRL, consultoría de RRHH, reestructuraciones
- Propiedad Intelectual: marcas SENADI, patentes, derechos de autor, franquicias y licencias
- Comercio Exterior & Aduanas: trade compliance, regímenes especiales, OEA, SENAE
- Transferencia de Tecnología: I+D+i, vigilancia tecnológica, libertad de operación, licenciamiento
- Compliance: due diligence de integridad, prevención lavado de activos, anticorrupción, gobierno corporativo
- APP & Concesiones: iniciativas privadas, estructuración financiero-jurídica de APP
- Aviación, Movilidad & Turismo: DGAC, leasing de aeronaves, habilitaciones hoteleras, MINTUR
`;

const SYSTEM_PROMPT = (clientName: string, projects: string) => `
Eres el asesor virtual de Spingarn Integrated Business Consulting, una firma ecuatoriana de consultoría integral.
Tu función es conversar con clientes de la firma de forma natural, cálida y profesional en español.

CONTEXTO DEL CLIENTE:
Empresa: ${clientName}
Proyectos activos con Spingarn:
${projects}

${FIRM_SERVICES}

TUS OBJETIVOS:
1. Identificar nuevas necesidades de negocio del cliente basándote en sus proyectos actuales y en lo que te cuente
2. Responder si Spingarn ofrece algún servicio específico que el cliente pregunte
3. Hacer recomendaciones relevantes y explicarlas de forma sencilla
4. Cuando identifiques una oportunidad clara de servicio adicional, mencionarla con naturalidad
5. Ayudar a que el cliente entienda el valor que Spingarn puede agregar más allá de los proyectos actuales

INSTRUCCIONES:
- Sé conversacional, no uses listas largas ni lenguaje excesivamente técnico
- Haz preguntas para entender mejor las necesidades
- Cuando el cliente exprese interés concreto en un servicio o tenga una necesidad clara, incluye al final de tu respuesta exactamente esta línea: [LEAD_READY]
- Respuestas cortas y directas, máximo 3-4 párrafos
- No inventes servicios que no están en la lista
- Si el cliente pregunta algo fuera del alcance de Spingarn, dilo honestamente y sugiere alternativas dentro de lo que sí hacemos
`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, client_id")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) return NextResponse.json({ error: "No client" }, { status: 403 });

    const [{ messages }, { data: clientRow }, { data: projects }] = await Promise.all([
      req.json().then((b: { messages: Anthropic.MessageParam[] }) => b),
      supabase.from("clients").select("name").eq("id", profile.client_id).single(),
      supabase
        .from("projects")
        .select("name, status, area:areas(name), description")
        .eq("client_id", profile.client_id)
        .neq("status", "cancelado"),
    ]);

    const clientName = clientRow?.name ?? profile.name;
    const projectLines = (projects ?? []).map((p: { name: string; status: string; area: unknown; description?: string }) => {
      const area = (p.area as { name?: string } | null)?.name ?? "";
      return `- ${p.name} (${area}, estado: ${p.status})${p.description ? ": " + p.description : ""}`;
    }).join("\n") || "- Sin proyectos activos registrados";

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: SYSTEM_PROMPT(clientName, projectLines),
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const leadReady = text.includes("[LEAD_READY]");
    const cleanText = text.replace("[LEAD_READY]", "").trim();

    return NextResponse.json({ text: cleanText, leadReady });
  } catch (err) {
    console.error("portal-chat error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
