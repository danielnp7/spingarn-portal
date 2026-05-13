"use client";
import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 200,
    credits: 2,
    desc: "Para personas y empresas con consultas ocasionales",
    features: [
      "2 créditos por mes",
      "Consultas con respuesta en 24–48h",
      "Acceso a biblioteca de documentos",
      "Soporte por email",
    ],
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    id: "pyme",
    name: "Pyme",
    price: 400,
    credits: 5,
    desc: "Para empresas con necesidades recurrentes de asesoría",
    features: [
      "5 créditos por mes",
      "1 reunión mensual con tu asesor",
      "Asesor asignado",
      "Acceso a biblioteca de documentos",
      "Prioridad en respuesta",
    ],
    color: "#C8007A",
    bg: "#FFF0F8",
    popular: true,
  },
  {
    id: "corporativo",
    name: "Corporativo",
    price: 1000,
    credits: 15,
    desc: "Para empresas con alta demanda de servicios legales y tributarios",
    features: [
      "15 créditos por mes",
      "2 reuniones mensuales",
      "Asesor senior dedicado",
      "Reportes trimestrales",
      "Acceso prioritario a socios",
      "Biblioteca completa + documentos personalizados",
    ],
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
];

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function PlanesPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState("");

  async function subscribe(planId: string) {
    setLoading(planId);
    setError("");
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al iniciar suscripción"); setLoading(null); return; }
      window.location.href = data.url;
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Planes de suscripción</h1>
        <p className="text-gray-400 mt-1 text-sm">Créditos renovados cada mes · Cancela cuando quieras</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map(plan => (
          <div key={plan.id}
            className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col relative"
            style={{ borderColor: plan.popular ? plan.color : "#E5E7EB", borderWidth: plan.popular ? 2 : 1 }}>

            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 text-center py-1 text-xs font-bold text-white"
                style={{ background: plan.color }}>
                MÁS POPULAR
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col" style={{ paddingTop: plan.popular ? "2.5rem" : "1.5rem" }}>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: plan.color }}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <p className="text-3xl font-bold text-gray-900">{fmt(plan.price)}</p>
                  <p className="text-sm text-gray-400 mb-1">/mes</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">{plan.credits} créditos mensuales incluidos</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{plan.desc}</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0 mt-0.5 font-bold" style={{ color: plan.color }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => subscribe(plan.id)}
                disabled={loading !== null}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{ background: plan.color }}
              >
                {loading === plan.id ? "Redirigiendo…" : `Suscribirse a ${plan.name}`}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-5 text-center space-y-1">
        <p className="text-sm font-semibold text-gray-700">¿Prefieres pagar por uso?</p>
        <p className="text-xs text-gray-400">Compra créditos individuales desde tu billetera, sin suscripción mensual.</p>
        <Link href="/portal/wallet"
          className="inline-block mt-2 text-sm font-semibold hover:underline"
          style={{ color: "#C8007A" }}>
          Ir a Mis Créditos →
        </Link>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Pago seguro procesado por Stripe · Facturas disponibles en tu panel · Cancela en cualquier momento
      </p>
    </div>
  );
}
