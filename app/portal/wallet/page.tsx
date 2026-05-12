import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import RequestTopupButton from "./RequestTopupButton";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

const TX_TYPE: Record<string, { label: string; color: string; sign: string }> = {
  credit:     { label: "Recarga",   color: "#059669", sign: "+" },
  debit:      { label: "Consumo",   color: "#DC2626", sign: "−" },
  reserve:    { label: "Reserva",   color: "#D97706", sign: "−" },
  release:    { label: "Liberación",color: "#059669", sign: "+" },
  adjustment: { label: "Ajuste",    color: "#6B7280", sign: "±" },
};

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("client_id, name").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const admin = (() => {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
    return createAdmin(url, key);
  })();

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    admin.from("client_wallet").select("*").eq("client_id", profile.client_id).maybeSingle(),
    admin.from("wallet_transactions").select("*").eq("client_id", profile.client_id).order("created_at", { ascending: false }).limit(50),
  ]);

  const balance   = wallet?.balance_credits ?? 0;
  const reserved  = wallet?.reserved_credits ?? 0;
  const used      = wallet?.used_credits ?? 0;
  const available = balance - reserved;
  const unitUsd   = wallet?.credit_unit_usd ?? 75;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Créditos</h1>
        <p className="text-sm text-gray-400 mt-0.5">Saldo y movimientos de tu bolsa de horas Spingarn</p>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #C8007A 0%, #7D0049 100%)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%,-30%)" }} />
        <p className="text-sm mb-1" style={{ color: "#FFD6EE" }}>Créditos disponibles</p>
        <p className="text-5xl font-bold mb-1">{available}</p>
        <p className="text-sm" style={{ color: "#FFD6EE" }}>≈ {fmt(available * unitUsd)}</p>
        <p className="text-xs mt-3" style={{ color: "#FFD6EE" }}>1 crédito = {fmt(unitUsd)} · tarifa estándar Spingarn</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Balance total",   value: balance,   color: "#C8007A", unit: "créditos" },
          { label: "En reserva",      value: reserved,  color: "#D97706", unit: "créditos" },
          { label: "Consumidos",      value: used,      color: "#6B7280", unit: "créditos" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-gray-300">{s.unit}</p>
          </div>
        ))}
      </div>

      {/* Credit packages info */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Paquetes de consulta</p>
        <div className="space-y-3">
          {[
            { type: "simple",  credits: 1, fee: 75,  sla: "24h", label: "Consulta simple",  desc: "Respuesta puntual y directa" },
            { type: "media",   credits: 3, fee: 225, sla: "48h", label: "Consulta media",   desc: "Análisis moderado con documentos" },
            { type: "compleja",credits: 5, fee: 375, sla: "72h", label: "Consulta compleja",desc: "Análisis técnico profundo" },
          ].map(p => (
            <div key={p.type} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-400">{p.desc} · SLA {p.sla}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{p.credits} crédito{p.credits > 1 ? "s" : ""}</p>
                <p className="text-xs text-gray-400">{fmt(p.fee)}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-2">Consultas complejas, cotizaciones manuales y casos que requieren socio senior tienen tarifa personalizada.</p>
        </div>
      </div>

      {/* Recharge CTA */}
      {available < 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Créditos bajos</p>
            <p className="text-xs text-amber-700">Tienes {available} crédito{available !== 1 ? "s" : ""} disponibles. Solicita una recarga para seguir usando los servicios Spingarn.</p>
          </div>
        </div>
      )}

      <RequestTopupButton unitUsd={unitUsd} />

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Historial de movimientos</p>
        </div>
        {(transactions ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">
            <p className="text-sm">Sin movimientos aún.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(transactions ?? []).map((tx: {
              id: string; type: string; credits: number; amount_usd: number | null;
              description: string; created_at: string; consultation_id: string | null;
            }) => {
              const t = TX_TYPE[tx.type] ?? { label: tx.type, color: "#6B7280", sign: "±" };
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ color: t.color, background: `${t.color}15` }}>
                        {t.label}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDate(tx.created_at)}</span>
                      {tx.consultation_id && (
                        <Link href={`/portal/consultas/${tx.consultation_id}`} className="text-xs hover:underline" style={{ color: "#C8007A" }}>
                          Ver consulta →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-bold" style={{ color: t.color }}>
                      {t.sign}{Math.abs(tx.credits)} cr
                    </p>
                    {tx.amount_usd != null && (
                      <p className="text-xs text-gray-400">{fmt(tx.amount_usd)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
