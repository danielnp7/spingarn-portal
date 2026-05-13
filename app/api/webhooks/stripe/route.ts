import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient as createAdmin } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

async function addCredits(admin: ReturnType<typeof adminClient>, clientId: string, credits: number, description: string, amountUsd: number): Promise<void> {
  // Upsert wallet balance
  const { data: wallet } = await admin.from("client_wallet").select("balance_credits").eq("client_id", clientId).single();
  const current = wallet?.balance_credits ?? 0;
  await admin.from("client_wallet").upsert({
    client_id: clientId,
    balance_credits: current + credits,
    updated_at: new Date().toISOString(),
  }, { onConflict: "client_id" });

  // Record transaction
  await admin.from("wallet_transactions").insert({
    client_id: clientId,
    type: "credit",
    credits,
    amount_usd: amountUsd,
    description,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = adminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { client_id, credits, type, plan_id } = session.metadata ?? {};
    if (!client_id) return NextResponse.json({ ok: true });

    if (type === "topup" && credits) {
      const n = parseInt(credits);
      const usd = (session.amount_total ?? 0) / 100;
      await addCredits(admin, client_id, n, `Recarga de ${n} crédito${n !== 1 ? "s" : ""} vía tarjeta`, usd);
    }

    if (type === "subscription" && credits && plan_id) {
      const n = parseInt(credits);
      const usd = (session.amount_total ?? 0) / 100;
      await addCredits(admin, client_id, n, `Activación ${plan_id} — ${n} créditos`, usd);
      // Record subscription
      await admin.from("client_subscriptions").upsert({
        client_id,
        plan_id,
        stripe_subscription_id: session.subscription as string,
        status: "active",
        credits_per_month: n,
        started_at: new Date().toISOString(),
      }, { onConflict: "client_id" });
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null; billing_reason?: string; amount_paid?: number };
    const sub = invoice.subscription ?? null;
    if (!sub || invoice.billing_reason !== "subscription_cycle") return NextResponse.json({ ok: true });

    const { data: subRow } = await admin.from("client_subscriptions")
      .select("client_id, credits_per_month, plan_id")
      .eq("stripe_subscription_id", sub).single();

    if (subRow) {
      const n = subRow.credits_per_month ?? 0;
      const usd = (invoice.amount_paid ?? 0) / 100;
      await addCredits(admin, subRow.client_id, n, `Renovación mensual ${subRow.plan_id} — ${n} créditos`, usd);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await admin.from("client_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);
  }

  return NextResponse.json({ ok: true });
}
