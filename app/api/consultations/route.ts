import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

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

async function classifyConsultation(
  admin: ReturnType<typeof adminClient>,
  consultationId: string,
  title: string,
  area: string,
  urgency: string,
  description: string,
) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Eres un consultor senior de Spingarn, firma especializada en servicios legales, tributarios, financieros y estratégicos para empresas en Ecuador. Debes clasificar la siguiente consulta de un cliente.

Título: ${title}
Área: ${AREA_LABELS[area] ?? area}
Urgencia declarada: ${urgency}
Descripción: ${description}

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

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  let raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const c = JSON.parse(raw);

  const required = ["complexity", "area_responsible", "priority", "estimated_hours",
    "estimated_fee", "estimated_credits", "estimated_sla_hours", "classification_note"];
  for (const f of required) {
    if (c[f] === undefined) throw new Error(`Campo IA faltante: ${f}`);
  }

  const mult = URGENCY_MULT[urgency] ?? 1.0;
  const needsManual = ["cotizacion_manual", "requiere_reunion", "requiere_socio_senior"].includes(c.complexity);
  if (!needsManual) {
    c.estimated_credits = Math.max(1, Math.ceil(c.estimated_credits * mult));
    c.estimated_fee     = Math.round(c.estimated_fee * mult);
  }

  await admin.from("consultations").update({
    status:               "classified",
    complexity:           c.complexity,
    area_responsible:     c.area_responsible,
    priority:             c.priority,
    estimated_hours:      c.estimated_hours,
    estimated_fee:        c.estimated_fee,
    estimated_credits:    c.estimated_credits,
    estimated_sla_hours:  c.estimated_sla_hours,
    classification_note:  c.classification_note,
    updated_at:           new Date().toISOString(),
  }).eq("id", consultationId);
}

// GET /api/consultations — list for logged-in client
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from("consultations")
    .select("*")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const BUCKET = "client-files";

// POST /api/consultations — create and classify new consultation
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  // Accept both FormData (with files) and JSON
  let title: string, description: string, area: string, urgency: string, sub_area_id: string | undefined;
  let fileEntries: File[] = [];

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const fd = await req.formData();
    title       = (fd.get("title") as string | null)?.trim() ?? "";
    description = (fd.get("description") as string | null)?.trim() ?? "";
    area        = (fd.get("area") as string | null) ?? "";
    urgency     = (fd.get("urgency") as string | null) ?? "media";
    sub_area_id = (fd.get("sub_area_id") as string | null) ?? undefined;
    fileEntries = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  } else {
    const body  = await req.json();
    title       = body.title?.trim() ?? "";
    description = body.description?.trim() ?? "";
    area        = body.area ?? "";
    urgency     = body.urgency ?? "media";
    sub_area_id = body.sub_area_id;
  }

  if (!title || !description || !area) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const admin = adminClient();

  // Auto-assign to the partner responsible for this sub-area (never managers or staff)
  let assigned_to: string | null = null;
  if (sub_area_id) {
    const { data: advisor } = await admin
      .from("profiles")
      .select("id")
      .eq("sub_area_id", sub_area_id)
      .in("role", ["admin", "partner2"])
      .limit(1)
      .maybeSingle();
    assigned_to = advisor?.id ?? null;
  }

  const { data, error } = await admin
    .from("consultations")
    .insert({
      client_id:          profile.client_id,
      created_by_user_id: user.id,
      title:              title.trim(),
      description:        description.trim(),
      area,
      urgency:            urgency ?? "media",
      status:             "submitted",
      ...(sub_area_id ? { sub_area_id } : {}),
      ...(assigned_to  ? { assigned_to } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Upload attachments and store metadata on the consultation
  if (fileEntries.length > 0) {
    const uploaded: { name: string; url: string; size: number; type: string }[] = [];
    for (const file of fileEntries) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${profile.client_id}/consultas/${data.id}/adjuntos/${Date.now()}_${safeName}`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(
        path, Buffer.from(await file.arrayBuffer()),
        { contentType: file.type || "application/octet-stream", upsert: false }
      );
      if (!upErr) uploaded.push({ name: file.name, url: path, size: file.size, type: file.type });
    }
    if (uploaded.length > 0) {
      await admin.from("consultations").update({ attachments: uploaded }).eq("id", data.id);
      data.attachments = uploaded;
    }
  }

  // Run AI classification inline (synchronous — no URL dependency)
  try {
    await classifyConsultation(admin, data.id, data.title, data.area, data.urgency, data.description);
  } catch {
    // Classification failed silently — consultation stays at "submitted", hub can retrigger
  }

  // Send push notification directly (no intermediate fetch — avoids fire-and-forget failures)
  try {
    const vapidPublic  = (process.env.VAPID_PUBLIC_KEY  ?? "").replace(/\s/g, "");
    const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").replace(/\s/g, "");
    if (vapidPublic && vapidPrivate) {
      // Notify assigned partner, or all admins/partners if unassigned
      let notifyIds: string[] = [];
      if (assigned_to) {
        notifyIds = [assigned_to];
      } else {
        const { data: partners } = await admin
          .from("profiles").select("id").in("role", ["admin", "partner2"]);
        notifyIds = (partners ?? []).map((p: { id: string }) => p.id);
      }

      if (notifyIds.length > 0) {
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .in("user_id", notifyIds);

        if (subs && subs.length > 0) {
          const { data: clientRow } = await admin
            .from("clients").select("name").eq("id", data.client_id).single();
          const clientName = (clientRow as { name: string } | null)?.name ?? "Cliente";

          const webpush = await import("web-push");
          webpush.default.setVapidDetails(
            `mailto:hub@spingarn.ec`, vapidPublic, vapidPrivate,
          );
          const payload = JSON.stringify({
            title: `Nueva consulta — ${clientName}`,
            body: data.title,
            href: `/consultas/${data.id}`,
            tag: `consulta-${data.id}`,
          });
          await Promise.allSettled(
            subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
              webpush.default.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
              ).catch(() => admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint))
            )
          );
        }
      }
    }
  } catch { /* non-critical */ }

  // Notify team by email (fire-and-forget)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3001");
  const cookie = req.headers.get("cookie") ?? "";
  fetch(`${baseUrl}/api/consultations/${data.id}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({ status: "submitted", toTeam: true }),
  }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
