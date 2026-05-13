import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { stripe, CREDIT_UNIT_USD } from "@/lib/stripe";

function adminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
  return createAdmin(url, key);
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3001");

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { credits, plan_id } = await req.json();
  const admin = adminClient();

  const { data: profile } = await admin.from("profiles")
    .select("client_id, name")
    .eq("id", user.id).single();
  if (!profile?.client_id) return NextResponse.json({ error: "No client linked" }, { status: 400 });

  const { data: clientRow } = await admin.from("clients")
    .select("name, stripe_customer_id")
    .eq("id", profile.client_id).single();

  // Get or create Stripe customer
  let stripeCustomerId = (clientRow as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: (clientRow as { name: string } | null)?.name ?? profile.name ?? undefined,
      metadata: { client_id: profile.client_id, user_id: user.id },
    });
    stripeCustomerId = customer.id;
    await admin.from("clients").update({ stripe_customer_id: stripeCustomerId }).eq("id", profile.client_id);
  }

  // ── Suscripción ─────────────────────────────────────────────────────────────
  if (plan_id) {
    const PLANS: Record<string, { name: string; price_id: string; credits: number }> = {
      starter:     { name: "Plan Starter",     price_id: process.env.STRIPE_PRICE_STARTER ?? "",     credits: 2  },
      pyme:        { name: "Plan Pyme",         price_id: process.env.STRIPE_PRICE_PYME ?? "",        credits: 5  },
      corporativo: { name: "Plan Corporativo",  price_id: process.env.STRIPE_PRICE_CORPORATIVO ?? "", credits: 15 },
    };
    const plan = PLANS[plan_id];
    if (!plan || !plan.price_id) {
      return NextResponse.json({ error: "Plan no configurado. Agrega STRIPE_PRICE_* en Vercel." }, { status: 400 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: plan.price_id, quantity: 1 }],
      success_url: `${BASE_URL}/portal/wallet?checkout=success&plan=${plan_id}`,
      cancel_url:  `${BASE_URL}/portal/planes?checkout=cancelled`,
      metadata: { client_id: profile.client_id, user_id: user.id, plan_id, credits: String(plan.credits), type: "subscription" },
    });
    return NextResponse.json({ url: session.url });
  }

  // ── Recarga de créditos (one-time) ──────────────────────────────────────────
  if (!credits || credits <= 0) {
    return NextResponse.json({ error: "Créditos inválidos" }, { status: 400 });
  }
  const amountCents = Math.round(credits * CREDIT_UNIT_USD * 100);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: amountCents,
        product_data: {
          name: `${credits} crédito${credits !== 1 ? "s" : ""} Spingarn`,
          description: `Recarga de ${credits} crédito${credits !== 1 ? "s" : ""} para servicios de consultoría`,
        },
      },
    }],
    success_url: `${BASE_URL}/portal/wallet?checkout=success&credits=${credits}`,
    cancel_url:  `${BASE_URL}/portal/wallet?checkout=cancelled`,
    metadata: { client_id: profile.client_id, user_id: user.id, credits: String(credits), type: "topup" },
  });

  return NextResponse.json({ url: session.url });
}
