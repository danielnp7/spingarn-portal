import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";


export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("name, client_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "cliente") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: clientRow } = profile.client_id
    ? await supabase.from("clients").select("name").eq("id", profile.client_id).single()
    : { data: null };

  const clientCompany = clientRow?.name ?? profile.name ?? "Cliente";

  const body = await req.json();
  const { advisor_id, advisor_name, advisor_email, topic, preferred_dates, duration_minutes, notes } = body;

  if (!advisor_id || !topic) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Remove ALL whitespace (including embedded newlines from copy-paste)
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");

  // Resolve advisor email via REST
  let resolvedEmail = (advisor_email ?? "").trim();
  if (!resolvedEmail && advisor_id) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${advisor_id}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (res.ok) {
        const userData = await res.json();
        resolvedEmail = userData?.email ?? "";
      }
    } catch { /* best effort */ }
  }

  // Insert via REST — bypasses Supabase JS SDK to avoid header encoding issues
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/meeting_requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      client_id: profile.client_id,
      client_user_id: user.id,
      client_name: profile.name,
      client_company: clientCompany,
      advisor_id,
      advisor_name,
      advisor_email: resolvedEmail,
      topic,
      preferred_dates: preferred_dates ?? "",
      duration_minutes: duration_minutes ?? 60,
      notes: notes ?? "",
      status: "pendiente",
    }),
  });

  if (!insertRes.ok) {
    const errBody = await insertRes.text();
    console.error("meeting_requests insert error", errBody);
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 });
  }

  const [request] = await insertRes.json() as [{ id: string }];

  // Send email notification to advisor (best-effort — never blocks the response)
  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? "not_configured");
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec";
    const clientEmail = user.email ?? "";

    if (resolvedEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: [resolvedEmail],
        subject: `Solicitud de reunión — ${clientCompany}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #C8007A; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Solicitud de Reunión</h1>
              <p style="color: #FFD6EE; margin: 4px 0 0; font-size: 14px;">Portal de Clientes · Spingarn</p>
            </div>
            <div style="background: #fff; border: 1px solid #f0f0f0; border-top: none; padding: 28px 32px; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 6px; font-size: 14px;">Hola <strong>${advisor_name}</strong>,</p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #555;">
                Tu cliente <strong>${clientCompany}</strong> (${profile.name}) ha solicitado una reunión contigo a través del portal.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 12px; background: #f9f9f9; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #eee;">Tema</td>
                  <td style="padding: 10px 12px; background: #f9f9f9; font-size: 14px; color: #111; border-bottom: 1px solid #eee;"><strong>${topic}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #eee;">Duración</td>
                  <td style="padding: 10px 12px; font-size: 14px; color: #333; border-bottom: 1px solid #eee;">${duration_minutes} minutos</td>
                </tr>
                ${preferred_dates ? `<tr>
                  <td style="padding: 10px 12px; background: #f9f9f9; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #eee;">Horarios preferidos</td>
                  <td style="padding: 10px 12px; background: #f9f9f9; font-size: 14px; color: #333; border-bottom: 1px solid #eee; white-space: pre-line;">${preferred_dates}</td>
                </tr>` : ""}
                ${notes ? `<tr>
                  <td style="padding: 10px 12px; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase;">Notas</td>
                  <td style="padding: 10px 12px; font-size: 14px; color: #555;">${notes}</td>
                </tr>` : ""}
              </table>
              <div style="background: #FFF0F8; border-radius: 10px; border-left: 3px solid #C8007A; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #7D0049; font-weight: 600;">Acción requerida</p>
                <p style="margin: 6px 0 0; font-size: 13px; color: #7D0049;">
                  Responde al cliente dentro de las próximas <strong>24 horas</strong>. Puedes gestionar la solicitud desde el Hub de Spingarn.
                </p>
              </div>
              ${clientEmail ? `<p style="font-size: 13px; color: #888; margin: 0;">Email del cliente: <a href="mailto:${clientEmail}" style="color: #C8007A;">${clientEmail}</a></p>` : ""}
            </div>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error("email send error (non-fatal)", emailErr);
  }

  // Push notification to advisor in hub (best-effort)
  try {
    const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const fromEmail    = process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec";

    if (vapidPublic && vapidPrivate) {
      const subsRes = await fetch(
        `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${advisor_id}&select=endpoint,p256dh,auth`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const subs = subsRes.ok ? await subsRes.json() : [];

      if (Array.isArray(subs) && subs.length > 0) {
        const webpush = await import("web-push");
        webpush.default.setVapidDetails(`mailto:${fromEmail}`, vapidPublic, vapidPrivate);
        const payload = JSON.stringify({
          title: "Nueva solicitud de reunión",
          body: `${clientCompany} quiere reunirse: ${topic}`,
          href: "/reuniones",
        });
        await Promise.allSettled(
          subs.map(sub =>
            webpush.default.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            )
          )
        );
      }
    }
  } catch (e) {
    console.error("push notification error", e);
  }

  return NextResponse.json({ ok: true, id: request?.id });
}
