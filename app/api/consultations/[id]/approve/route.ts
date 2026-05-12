import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

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
    // payment — mark as approved, billing handled externally
    newStatus = "approved";
    notes = "Aprobada con pago directo";
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
