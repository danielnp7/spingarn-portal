"use client";
import { useState } from "react";

const PACKAGES = [
  { credits: 1,  label: "1 crédito",   desc: "Consulta simple",   fee: 75   },
  { credits: 3,  label: "3 créditos",  desc: "Consulta media",    fee: 225  },
  { credits: 5,  label: "5 créditos",  desc: "Consulta compleja", fee: 375, popular: true },
  { credits: 10, label: "10 créditos", desc: "Paquete mediano",   fee: 750  },
  { credits: 20, label: "20 créditos", desc: "Paquete grande",    fee: 1500 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function RequestTopupButton({ unitUsd }: { unitUsd: number }) {
  const [open, setOpen]       = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const credits    = selected ?? (custom ? parseInt(custom) : null);
  const amountUsd  = credits ? credits * unitUsd : null;

  async function payWithCard() {
    if (!credits || credits <= 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al iniciar pago"); setLoading(false); return; }
      window.location.href = data.url;
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setSelected(null);
    setCustom("");
    setLoading(false);
    setError("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: "#C8007A" }}
      >
        💳 Comprar créditos con tarjeta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-900">Comprar créditos</p>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Selecciona un paquete</p>
              <div className="space-y-2">
                {PACKAGES.map(p => (
                  <button
                    key={p.credits}
                    onClick={() => { setSelected(p.credits); setCustom(""); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all relative"
                    style={selected === p.credits
                      ? { borderColor: "#C8007A", background: "#FFF0F8" }
                      : { borderColor: "#E5E7EB", background: "white" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                      <p className="text-xs text-gray-400">{p.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.popular && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#C8007A" }}>Popular</span>
                      )}
                      <p className="text-sm font-bold text-gray-700">{fmt(p.credits * unitUsd)}</p>
                    </div>
                  </button>
                ))}

                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all"
                  style={custom && !selected ? { borderColor: "#C8007A", background: "#FFF0F8" } : { borderColor: "#E5E7EB" }}>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Cantidad personalizada</p>
                    <input
                      type="number" min={1} placeholder="Ej: 8"
                      value={custom}
                      onChange={e => { setCustom(e.target.value); setSelected(null); }}
                      className="w-full text-sm font-semibold bg-transparent outline-none text-gray-900 placeholder-gray-300"
                    />
                  </div>
                  {custom && parseInt(custom) > 0 && (
                    <p className="text-sm font-bold text-gray-700 flex-shrink-0">{fmt(parseInt(custom) * unitUsd)}</p>
                  )}
                </div>
              </div>

              {amountUsd != null && credits != null && credits > 0 && (
                <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FFF0F8" }}>
                  <span className="text-sm font-medium" style={{ color: "#C8007A" }}>Total</span>
                  <span className="font-bold" style={{ color: "#C8007A" }}>
                    {fmt(amountUsd)} <span className="text-xs font-normal">({credits} cr × {fmt(unitUsd)})</span>
                  </span>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={close}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all">
                  Cancelar
                </button>
                <button
                  onClick={payWithCard}
                  disabled={loading || !credits || credits <= 0}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "#C8007A" }}
                >
                  {loading ? "Redirigiendo…" : "Pagar con tarjeta →"}
                </button>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Pago seguro procesado por Stripe · Los créditos se acreditan inmediatamente
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
