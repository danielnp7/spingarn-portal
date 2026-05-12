import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = adminClient();
  const { data: consultation, error } = await admin
    .from("consultations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !consultation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["submitted", "classified"].includes(consultation.status)) {
    return NextResponse.json({ error: "Only submitted consultations can be classified" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Eres un consultor senior de Spingarn, firma especializada en servicios legales, tributarios, financieros y estratégicos para empresas en Ecuador. Debes clasificar la siguiente consulta de un cliente.

Título: ${consultation.title}
Área: ${AREA_LABELS[consultation.area] ?? consultation.area}
Urgencia declarada: ${consultation.urgency}
Descripción: ${consultation.description}

Clasifica esta consulta y devuelve ÚNICAMENTE un JSON válido con exactamente estos campos:

{
  "complexity": "simple" | "media" | "compleja" | "cotizacion_manual" | "requiere_reunion" | "requiere_socio_senior",
  "area_responsible": string (área interna responsable),
  "priority": "baja" | "normal" | "alta" | "urgente",
  "estimated_hours": number (decimal, ej: 1.5),
  "estimated_fee": number (USD, sin decimales),
  "estimated_credits": number (entero),
  "estimated_sla_hours": number (horas para respuesta),
  "classification_note": string (explicación breve en español, 2-3 oraciones máximo)
}

Criterios de clasificación:
- simple: consulta puntual estándar, respuesta directa → 1 crédito, USD 75, 24h
- media: análisis moderado, revisión de documentos básicos → 3 créditos, USD 225, 48h
- compleja: análisis profundo, múltiples áreas, criterio técnico avanzado → 5+ créditos, USD 375+, 72h
- cotizacion_manual: requiere scope detallado y propuesta formal → presupuesto a definir
- requiere_reunion: la consulta es ambigua o requiere contexto adicional → programar reunión
- requiere_socio_senior: situación de alto riesgo, decisión estratégica, requiere socio → escalar

No incluyas texto fuera del JSON. No uses markdown. Solo el objeto JSON.`;

  let classification;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    let raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    classification = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Error al clasificar con IA" }, { status: 500 });
  }

  // Validate required fields
  const required = ["complexity", "area_responsible", "priority", "estimated_hours",
    "estimated_fee", "estimated_credits", "estimated_sla_hours", "classification_note"];
  for (const f of required) {
    if (classification[f] === undefined) {
      return NextResponse.json({ error: `Campo IA faltante: ${f}` }, { status: 500 });
    }
  }

  // Apply urgency multiplier on top of AI base estimate
  const mult = URGENCY_MULT[consultation.urgency] ?? 1.0;
  const needsManual = ["cotizacion_manual", "requiere_reunion", "requiere_socio_senior"].includes(classification.complexity);
  if (!needsManual) {
    classification.estimated_credits = Math.max(1, Math.ceil(classification.estimated_credits * mult));
    classification.estimated_fee     = Math.round(classification.estimated_fee * mult);
  }

  const { error: updateError } = await admin
    .from("consultations")
    .update({
      status: "classified",
      complexity: classification.complexity,
      area_responsible: classification.area_responsible,
      priority: classification.priority,
      estimated_hours: classification.estimated_hours,
      estimated_fee: classification.estimated_fee,
      estimated_credits: classification.estimated_credits,
      estimated_sla_hours: classification.estimated_sla_hours,
      classification_note: classification.classification_note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, classification });
}
