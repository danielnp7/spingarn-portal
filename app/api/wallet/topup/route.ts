import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, name")
    .eq("id", user.id)
    .single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  const body = await req.json() as { credits: number; notes?: string };
  const { credits, notes } = body;
  if (!credits || credits <= 0) return NextResponse.json({ error: "Créditos inválidos" }, { status: 400 });

  const admin = adminClient();

  const { data: wallet } = await admin
    .from("client_wallet")
    .select("credit_unit_usd")
    .eq("client_id", profile.client_id)
    .maybeSingle();

  const unitUsd = wallet?.credit_unit_usd ?? 75;
  const amountUsd = credits * unitUsd;

  const { data: payReq, error } = await admin
    .from("payment_requests")
    .insert({
      client_id: profile.client_id,
      type: "wallet_topup",
      status: "pending",
      credits_requested: credits,
      amount_usd: amountUsd,
      notes: notes?.trim() || null,
      created_by_user_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify contador(es)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && resendKey !== "re_xxxxxxxxxxxxxxxx") {
    const { data: contadores } = await admin
      .from("profiles")
      .select("id, name, email")
      .eq("role", "contador");

    const { data: clientData } = await admin
      .from("clients")
      .select("name")
      .eq("id", profile.client_id)
      .single();

    const clientName = (clientData as { name: string } | null)?.name ?? profile.name ?? "Cliente";
    const hubUrl = process.env.HUB_URL ?? "https://hub.spingarn.ec";
    const resend = new Resend(resendKey);

    for (const c of (contadores ?? []) as { email: string; name: string }[]) {
      if (!c.email) continue;
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec",
        to: [c.email],
        subject: `Solicitud de recarga de créditos — ${clientName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A">
            <div style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:28px;border-radius:16px 16px 0 0">
              <h1 style="color:white;margin:0;font-size:18px">Spingarn Hub</h1>
              <p style="color:#DDD6FE;margin:4px 0 0;font-size:13px">Nueva solicitud de recarga de créditos</p>
            </div>
            <div style="padding:24px;background:white;border-radius:0 0 16px 16px;border:1px solid #F3F4F6">
              <p style="margin:0 0 16px;color:#374151">Hola <strong>${c.name}</strong>,</p>
              <p style="color:#374151;margin:0 0 16px">
                El cliente <strong>${clientName}</strong> ha solicitado una recarga de créditos en su wallet.
              </p>
              <div style="background:#F5F3FF;border-radius:12px;padding:20px;margin:16px 0;border-left:4px solid #7C3AED">
                <table style="width:100%;border-collapse:collapse">
                  <tr>
                    <td style="padding:5px 0;color:#9CA3AF;font-size:13px;width:50%">Cliente</td>
                    <td style="padding:5px 0;font-size:13px;font-weight:600">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#9CA3AF;font-size:13px">Créditos solicitados</td>
                    <td style="padding:5px 0;font-size:15px;font-weight:700;color:#7C3AED">${credits} crédito${credits !== 1 ? "s" : ""}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#9CA3AF;font-size:13px">Valor equivalente</td>
                    <td style="padding:5px 0;font-size:13px;font-weight:600">${fmt(amountUsd)}</td>
                  </tr>
                  ${notes ? `<tr><td style="padding:5px 0;color:#9CA3AF;font-size:13px">Nota del cliente</td><td style="padding:5px 0;font-size:13px;font-style:italic">${notes}</td></tr>` : ""}
                </table>
              </div>
              <a href="${hubUrl}/cobranza"
                style="display:inline-block;background:#7C3AED;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:8px">
                Ir a Cobranza →
              </a>
              <p style="margin:20px 0 0;color:#9CA3AF;font-size:12px">Spingarn Integrated Business Consulting · Quito, Ecuador</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, id: payReq.id });
}
