import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY no está configurado en las variables de entorno.");
    _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}

// Keep named export for backwards compat — resolved lazily
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const CREDIT_UNIT_USD = 75; // 1 crédito = $75

export const CREDIT_PACKAGES = [
  { credits: 1,  label: "1 crédito",   desc: "Consulta simple",   popular: false },
  { credits: 3,  label: "3 créditos",  desc: "Consulta media",    popular: false },
  { credits: 5,  label: "5 créditos",  desc: "Consulta compleja", popular: true  },
  { credits: 10, label: "10 créditos", desc: "Paquete mediano",   popular: false },
  { credits: 20, label: "20 créditos", desc: "Paquete grande",    popular: false },
];

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Plan Starter",
    price_usd: 200,
    credits_per_month: 2,
    features: ["2 consultas rápidas/mes", "Acceso a biblioteca de documentos", "Email de respuesta en 24h"],
    stripe_price_id: process.env.STRIPE_PRICE_STARTER ?? "",
  },
  {
    id: "pyme",
    name: "Plan Pyme",
    price_usd: 400,
    credits_per_month: 5,
    features: ["5 créditos/mes", "1 reunión mensual", "Asesor asignado", "Acceso a biblioteca"],
    stripe_price_id: process.env.STRIPE_PRICE_PYME ?? "",
    popular: true,
  },
  {
    id: "corporativo",
    name: "Plan Corporativo",
    price_usd: 1000,
    credits_per_month: 15,
    features: ["15 créditos/mes", "2 reuniones mensuales", "Asesor senior dedicado", "Reportes trimestrales", "Acceso prioritario"],
    stripe_price_id: process.env.STRIPE_PRICE_CORPORATIVO ?? "",
  },
];
