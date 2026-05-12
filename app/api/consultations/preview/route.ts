import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const AREA_LABELS: Record<string, string> = {
  aviacion:              "Aviación y Regulatorio",
  contratacion_publica:  "Contratación Pública",
  laboral:               "Laboral y Seguridad Social",
  ma_energia:            "M&A y Energía",
  propiedad_intelectual: "Propiedad Intelectual",
  datos_personales:      "Protección de Datos Personales",
  tax_finance:           "Tax and Finance",
  tecnologia:            "Tecnología y Telecomunicaciones",
};

const URGENCY_MULT: Record<string, number> = { baja: 0.8, media: 1.0, alta: 1.5, critica: 2.0 };

// POST /api/consultations/preview — AI estimate before submitting (does NOT save)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, area, urgency, description } = await req.json();
  if (!title || !area || !description || description.length < 15) {
    return NextResponse.json({ error: "Datos insuficientes para estimar" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Eres un consultor senior de Spingarn (firma legal, tributaria, financiera y estratégica en Ecuador). Estima la complejidad de esta consulta de cliente.

Título: ${title}
Área: ${AREA_LABELS[area] ?? area}
Urgencia: ${urgency ?? "media"}
Descripción: ${description}

Devuelve ÚNICAMENTE un JSON válido:
{
  "complexity": "simple" | "media" | "compleja" | "cotizacion_manual" | "requiere_reunion" | "requiere_socio_senior",
  "estimated_credits": number,
  "estimated_fee": number,
  "estimated_sla_hours": number,
  "confidence": "alta" | "media" | "baja",
  "note": string (1 oración en español explicando el criterio)
}

Criterios: simple=1 crédito/$75/24h, media=3 créditos/$225/48h, compleja=5+ créditos/$375+/72h, cotizacion_manual/requiere_reunion/requiere_socio_senior=presupuesto a definir.
Solo JSON, sin markdown.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    let raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const result = JSON.parse(raw);

    // Apply urgency multiplier server-side too
    const mult = URGENCY_MULT[urgency ?? "media"] ?? 1.0;
    if (!["cotizacion_manual", "requiere_reunion", "requiere_socio_senior"].includes(result.complexity)) {
      result.estimated_credits = Math.max(1, Math.ceil((result.estimated_credits ?? 1) * mult));
      result.estimated_fee     = Math.round((result.estimated_fee ?? 75) * mult);
    }
    result.urgency_multiplier = mult;

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "No se pudo estimar" }, { status: 500 });
  }
}
