import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { Resend } from "resend";

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

// POST /api/consultations/[id]/approve
// Body: { approval_type: 'credits' | 'payment' | 'quote_request' | 'cancel' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  const body = await req.json();
  const { approval_type } = body as { approval_type: string };

  if (!["credits", "payment", "quote_request", "cancel"].includes(approval_type)) {
    return NextResponse.json({ error: "approval_type inválido" }, { status: 400 });
  }

  const admin = adminClient();
  const { data: consultation } = await admin
    .from("consultations")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.client_id)
    .single();

  if (!consultation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (consultation.status !== "pending_client_approval") {
    return NextResponse.json({ error: "Consulta no está pendiente de aprobación" }, { status: 400 });
  }

  let newStatus: string;
  let notes: string | undefined;

  if (approval_type === "cancel") {
    newStatus = "cancelled";
    notes = "Cancelada por el cliente";
  } else if (approval_type === "quote_request") {
    newStatus = "classified";
    notes = "Cliente solicitó cotización formal";
  } else if (approval_type === "credits") {
    // Check wallet balance
    const { data: wallet } = await admin
      .from("client_wallet")
      .select("*")
      .eq("client_id", profile.client_id)
      .maybeSingle();

    const available = (wallet?.balance_credits ?? 0) - (wallet?.reserved_credits ?? 0);
    const needed = consultation.estimated_credits ?? 0;

    if (available < needed) {
      return NextResponse.json({
        error: "Créditos insuficientes",
        available,
        needed,
        shortfall: needed - available,
      }, { status: 402 });
    }

    // Reserve credits
    if (wallet && needed > 0) {
      await admin.from("client_wallet").update({
        reserved_credits: (wallet.reserved_credits ?? 0) + needed,
        updated_at: new Date().toISOString(),
      }).eq("id", wallet.id);

      await admin.from("wallet_transactions").insert({
        client_id: profile.client_id,
        consultation_id: id,
        type: "reserve",
        credits: needed,
        amount_usd: (consultation.estimated_fee ?? 0),
        description: `Reserva para consulta: ${consultation.title}`,
        created_by: user.id,
      });
    }

    newStatus = "approved";
    notes = `Aprobada con ${needed} crédito${needed !== 1 ? "s" : ""}`;
  } else {
    // payment — create payment_request and notify contador
    newStatus = "approved";
    notes = "Aprobada — pago a coordinar con contador";

    await admin.from("payment_requests").insert({
      client_id: profile.client_id,
      consultation_id: id,
      type: "consultation_payment",
      status: "pending",
      amount_usd: consultation.estimated_fee ?? null,
      credits_requested: null,
      notes: `Pago directo aprobado por cliente para consulta: ${consultation.title}`,
      created_by_user_id: user.id,
    });

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

      const clientName = (clientData as { name: string } | null)?.name ?? "Cliente";
      const hubUrl = process.env.HUB_URL ?? "https://hub.spingarn.ec";
      const resend = new Resend(resendKey);

      for (const c of (contadores ?? []) as { email: string; name: string }[]) {
        if (!c.email) continue;
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@spingarn.ec",
          to: [c.email],
          subject: `Coordinación de pago requerida — ${consultation.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A">
              <div style="background:linear-gradient(135deg,#C8007A,#7D0049);padding:28px;border-radius:16px 16px 0 0">
                <h1 style="color:white;margin:0;font-size:18px">Spingarn Hub</h1>
                <p style="color:#FFD6EE;margin:4px 0 0;font-size:13px">Solicitud de coordinación de pago</p>
              </div>
              <div style="padding:24px;background:white;border-radius:0 0 16px 16px;border:1px solid #F3F4F6">
                <p style="margin:0 0 16px;color:#374151">Hola <strong>${c.name}</strong>,</p>
                <p style="color:#374151;margin:0 0 16px">
                  El cliente <strong>${clientName}</strong> aprobó una consulta con pago directo y requiere coordinación de pago.
                </p>
                <div style="background:#FFF0F8;border-radius:12px;padding:20px;margin:16px 0;border-left:4px solid #C8007A">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1A1A1A">${consultation.title}</p>
                  <table style="width:100%;border-collapse:collapse;margin-top:8px">
                    <tr>
                      <td style="padding:4px 0;color:#9CA3AF;font-size:13px;width:50%">Cliente</td>
                      <td style="padding:4px 0;font-size:13px;font-weight:600">${clientName}</td>
                    </tr>
                    ${consultation.estimated_fee != null ? `<tr>
                      <td style="padding:4px 0;color:#9CA3AF;font-size:13px">Honorario aprobado</td>
                      <td style="padding:4px 0;font-size:15px;font-weight:700;color:#C8007A">${fmt(consultation.estimated_fee)}</td>
                    </tr>` : ""}
                  </table>
                </div>
                <a href="${hubUrl}/cobranza"
                  style="display:inline-block;background:#C8007A;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
                  Ir a Cobranza →
                </a>
              </div>
            </div>
          `,
        }).catch(() => {});
      }
    }
  }

  // Record approval
  await admin.from("consultation_approvals").insert({
    consultation_id: id,
    approval_type,
    amount_usd: approval_type !== "cancel" ? (consultation.estimated_fee ?? 0) : null,
    credits_used: approval_type === "credits" ? (consultation.estimated_credits ?? 0) : null,
    approved_by_user_id: user.id,
    status: "approved",
    notes,
  });

  // Update consultation status
  await admin.from("consultations").update({
    status: newStatus,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    approved_fee: approval_type !== "cancel" ? (consultation.estimated_fee ?? null) : null,
    approved_credits: approval_type === "credits" ? (consultation.estimated_credits ?? null) : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  return NextResponse.json({ ok: true, status: newStatus });
}
