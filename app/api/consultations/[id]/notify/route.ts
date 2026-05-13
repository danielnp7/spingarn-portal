import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

const STATUS_LABELS: Record<string, string> = {
  submitted:               "Nueva consulta recibida",
  classified:              "Consulta clasificada",
  pending_client_approval: "Consulta pendiente de tu aprobación",
  approved:                "Consulta aprobada — iniciando trabajo",
  in_progress:             "Consulta en progreso",
  internal_review:         "Consulta en revisión interna",
  partner_review:          "Consulta en revisión de socio",
  answered:                "Consulta respondida",
  closed:                  "Consulta cerrada",
  cancelled:               "Consulta cancelada",
  requires_extra_approval: "Se requiere aprobación adicional",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status, toTeam } = await req.json().catch(() => ({}));

  const admin = adminClient();
  const { data: consultation } = await admin
    .from("consultations")
    .select("*, client:clients(name)")
    .eq("id", id)
    .single();

  if (!consultation) return NextResponse.json({ ok: false });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec";
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://portal.spingarn.ec";
  const hubUrl    = "https://hub.spingarn.ec";

  const statusLabel = STATUS_LABELS[status] ?? `Estado actualizado: ${status}`;
  const clientName  = (consultation.client as { name: string } | null)?.name ?? "Cliente";

  // Push notification to assigned partner (or all admins if unassigned)
  if (status === "submitted" || status === "approved" || toTeam) {
    try {
      const vapidPublic  = (process.env.VAPID_PUBLIC_KEY  ?? "").replace(/\s/g, "");
      const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").replace(/\s/g, "");
      if (vapidPublic && vapidPrivate) {
        // Find hub users to notify: assigned partner first, fallback to all admins
        let notifyIds: string[] = [];
        if (consultation.assigned_to) {
          notifyIds = [consultation.assigned_to];
        } else {
          const { data: admins } = await admin
            .from("profiles").select("id").in("role", ["admin", "partner2"]);
          notifyIds = (admins ?? []).map((p: { id: string }) => p.id);
        }

        if (notifyIds.length > 0) {
          const { data: subs } = await admin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .in("user_id", notifyIds);

          if (subs && subs.length > 0) {
            const webpush = await import("web-push");
            webpush.default.setVapidDetails(
              `mailto:${process.env.RESEND_FROM_EMAIL ?? "hub@spingarn.ec"}`,
              vapidPublic, vapidPrivate
            );
            const payload = JSON.stringify({
              title: `Nueva consulta — ${clientName}`,
              body: consultation.title,
              href: `/consultas/${id}`,
              tag: `consulta-${id}`,
            });
            await Promise.allSettled(
              subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
                webpush.default.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload
                ).catch(() => admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint))
              )
            );
          }
        }
      }
    } catch { /* non-critical */ }

    const teamEmail = process.env.LEAD_RECIPIENT ?? "dnarvaez@spingarn.ec";
    await resend.emails.send({
      from,
      to: [teamEmail],
      subject: `[Consulta] ${statusLabel} — ${clientName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <div style="background:#C8007A;color:white;padding:20px 24px;border-radius:12px 12px 0 0">
            <p style="margin:0;font-size:12px;opacity:0.8">Spingarn Hub — Módulo de Consultas</p>
            <h2 style="margin:8px 0 0;font-size:20px">${statusLabel}</h2>
          </div>
          <div style="background:#fff;border:1px solid #f3f4f6;border-top:none;padding:24px;border-radius:0 0 12px 12px">
            <p style="color:#374151;margin:0 0 16px"><strong>Cliente:</strong> ${clientName}</p>
            <p style="color:#374151;margin:0 0 16px"><strong>Consulta:</strong> ${consultation.title}</p>
            <p style="color:#374151;margin:0 0 16px"><strong>Área:</strong> ${consultation.area} · <strong>Urgencia:</strong> ${consultation.urgency}</p>
            ${consultation.estimated_fee ? `<p style="color:#374151;margin:0 0 16px"><strong>Honorario est.:</strong> $${consultation.estimated_fee}</p>` : ""}
            <a href="${hubUrl}/consultas/${id}" style="display:inline-block;background:#C8007A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
              Ver en Hub →
            </a>
          </div>
        </div>
      `,
    }).catch(() => {});
  }

  // Notify client on status changes (answered, etc.)
  if (["answered", "requires_extra_approval", "pending_client_approval"].includes(status)) {
    // Get client user emails
    const { data: clientUsers } = await admin
      .from("profiles")
      .select("id")
      .eq("client_id", consultation.client_id)
      .eq("role", "cliente");

    const { data: authUsers } = await admin.auth.admin.listUsers();
    const clientEmails = (authUsers?.users ?? [])
      .filter(u => (clientUsers ?? []).some((p: { id: string }) => p.id === u.id))
      .map(u => u.email)
      .filter(Boolean) as string[];

    if (clientEmails.length > 0) {
      await resend.emails.send({
        from,
        to: clientEmails,
        subject: `[Spingarn] ${statusLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="background:#C8007A;color:white;padding:20px 24px;border-radius:12px 12px 0 0">
              <p style="margin:0;font-size:12px;opacity:0.8">Portal Spingarn</p>
              <h2 style="margin:8px 0 0;font-size:20px">${statusLabel}</h2>
            </div>
            <div style="background:#fff;border:1px solid #f3f4f6;border-top:none;padding:24px;border-radius:0 0 12px 12px">
              <p style="color:#374151;margin:0 0 16px">Tu consulta <strong>"${consultation.title}"</strong> ha sido actualizada.</p>
              ${status === "answered" ? `<p style="color:#374151;margin:0 0 16px">El equipo Spingarn ha preparado una respuesta formal. Ingresa al portal para revisarla.</p>` : ""}
              ${status === "pending_client_approval" ? `<p style="color:#374151;margin:0 0 16px">Tu consulta fue clasificada. Revisa la estimación de honorarios y autoriza el trabajo para comenzar.</p>` : ""}
              <a href="${portalUrl}/portal/consultas/${id}" style="display:inline-block;background:#C8007A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
                Ver en mi portal →
              </a>
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
