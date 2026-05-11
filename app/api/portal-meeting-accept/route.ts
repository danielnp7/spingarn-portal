import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { request_id, confirmed_date } = await req.json();
  if (!request_id || !confirmed_date) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");

  // Verify this request belongs to this client
  const checkRes = await fetch(
    `${supabaseUrl}/rest/v1/meeting_requests?id=eq.${request_id}&client_user_id=eq.${user.id}&select=id,advisor_id,advisor_name,client_name,topic`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const rows = checkRes.ok ? await checkRes.json() as { id: string; advisor_id: string; advisor_name: string; client_name: string; topic: string }[] : [];
  if (!rows[0]) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const meeting = rows[0];

  // Update status to "aceptada" with confirmed_date
  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/meeting_requests?id=eq.${request_id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status: "aceptada", confirmed_date, responded_at: new Date().toISOString() }),
    }
  );

  if (!updateRes.ok) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });

  // Notify advisor by email (non-fatal)
  try {
    const advisorUserRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${meeting.advisor_id}`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const advisorUser  = advisorUserRes.ok ? await advisorUserRes.json() : null;
    const advisorEmail = advisorUser?.email;

    if (advisorEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY ?? "not_configured");
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec",
        to:      [advisorEmail],
        subject: `✅ Cliente confirmó horario — ${meeting.topic}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#16A34A;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;font-size:20px;">✅ Horario Confirmado por el Cliente</h1>
              <p style="color:#BBF7D0;margin:4px 0 0;font-size:14px;">Portal de Clientes · Spingarn</p>
            </div>
            <div style="background:#fff;border:1px solid #f0f0f0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 6px;font-size:14px;">Hola <strong>${meeting.advisor_name}</strong>,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#555;">
                <strong>${meeting.client_name}</strong> ha aceptado uno de los horarios que propusiste.
              </p>
              <div style="background:#F0FDF4;border-radius:10px;border-left:3px solid #16A34A;padding:14px 18px;margin-bottom:18px;">
                <p style="margin:0 0 4px;font-size:12px;color:#16A34A;font-weight:600;">Fecha confirmada</p>
                <p style="margin:0;font-size:14px;color:#14532D;">${confirmed_date}</p>
              </div>
              <div style="background:#f9f9f9;border-radius:10px;padding:14px 18px;">
                <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;">Tema</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#111;">${meeting.topic}</p>
              </div>
            </div>
          </div>
        `,
      });
    }
  } catch (e) {
    console.error("email error (non-fatal)", e);
  }

  return NextResponse.json({ ok: true });
}
