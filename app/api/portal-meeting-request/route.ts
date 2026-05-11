import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

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

  const admin = adminClient();

  // If email wasn't resolved client-side, look it up server-side
  let resolvedEmail = advisor_email ?? "";
  if (!resolvedEmail && advisor_id) {
    try {
      const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      resolvedEmail = authData?.users?.find((u: { id: string; email?: string }) => u.id === advisor_id)?.email ?? "";
    } catch { /* best effort */ }
  }

  // Insert meeting request using admin client (bypasses RLS for insert)
  const { data: request, error: insertErr } = await admin
    .from("meeting_requests")
    .insert({
      client_id: profile.client_id,
      client_user_id: user.id,
      client_name: profile.name,
      client_company: clientCompany,
      advisor_id,
      advisor_name,
      advisor_email,
      topic,
      preferred_dates: preferred_dates ?? "",
      duration_minutes: duration_minutes ?? 60,
      notes: notes ?? "",
      status: "pendiente",
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("meeting_requests insert error", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Send email notification to advisor
  const resend = new Resend(process.env.RESEND_API_KEY ?? "not_configured");
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec";

  if (resolvedEmail) await resend.emails.send({
    from: fromEmail,
    to: resolvedEmail,
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
              <td style="padding: 10px 12px; background: #f9f9f9; border-radius: 6px 6px 0 0; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #eee;">Tema</td>
              <td style="padding: 10px 12px; background: #f9f9f9; border-radius: 6px 6px 0 0; font-size: 14px; color: #111; border-bottom: 1px solid #eee;"><strong>${topic}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #eee;">Duración solicitada</td>
              <td style="padding: 10px 12px; font-size: 14px; color: #333; border-bottom: 1px solid #eee;">${duration_minutes} minutos</td>
            </tr>
            ${preferred_dates ? `
            <tr>
              <td style="padding: 10px 12px; background: #f9f9f9; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #eee;">Fechas / horarios preferidos</td>
              <td style="padding: 10px 12px; background: #f9f9f9; font-size: 14px; color: #333; border-bottom: 1px solid #eee;">${preferred_dates}</td>
            </tr>
            ` : ""}
            ${notes ? `
            <tr>
              <td style="padding: 10px 12px; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Notas adicionales</td>
              <td style="padding: 10px 12px; font-size: 14px; color: #555;">${notes}</td>
            </tr>
            ` : ""}
          </table>

          <div style="background: #FFF0F8; border-radius: 10px; border-left: 3px solid #C8007A; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #7D0049; font-weight: 600;">Acción requerida</p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #7D0049;">
              Responde al cliente dentro de las próximas <strong>24 horas</strong> confirmando o proponiendo un horario alternativo.
              El cliente fue informado de que tu respuesta puede tomar hasta 24 horas según tu disponibilidad.
            </p>
          </div>

          <p style="font-size: 13px; color: #888; margin: 0;">
            Puedes responder directamente a este correo o contactar al cliente en:
            <a href="mailto:${user.email}" style="color: #C8007A;">${user.email}</a>
          </p>
        </div>
      </div>
    `,
    replyTo: user.email,
  });

  // Push notification to advisor in hub (best-effort)
  try {
    const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const fromEmail    = process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec";

    if (vapidPublic && vapidPrivate) {
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", advisor_id);

      if (subs && subs.length > 0) {
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
