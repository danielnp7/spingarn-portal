"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PACKAGES = [
  { credits: 1,  label: "1 crédito",   desc: "Consulta simple",   fee: 75  },
  { credits: 3,  label: "3 créditos",  desc: "Consulta media",    fee: 225 },
  { credits: 5,  label: "5 créditos",  desc: "Consulta compleja", fee: 375 },
  { credits: 10, label: "10 créditos", desc: "Paquete mediano",   fee: 750 },
  { credits: 20, label: "20 créditos", desc: "Paquete grande",    fee: 1500 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function RequestTopupButton({ unitUsd }: { unitUsd: number }) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom]     = useState("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  const credits = selected ?? (custom ? parseInt(custom) : null);
  const amountUsd = credits ? credits * unitUsd : null;

  async function submit() {
    if (!credits || credits <= 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits, notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Error al enviar solicitud");
        setLoading(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setSelected(null);
    setCustom("");
    setNotes("");
    setLoading(false);
    setSuccess(false);
    setError("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: "#7C3AED" }}
      >
        💎 Solicitar recarga de créditos
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-900">Solicitar recarga de créditos</p>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {success ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-4xl">✅</p>
                <p className="font-bold text-gray-900">Solicitud enviada</p>
                <p className="text-sm text-gray-500">El equipo Spingarn recibió tu solicitud y se pondrá en contacto para coordinar el pago.</p>
                <button
                  onClick={close}
                  className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#7C3AED" }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Selecciona un paquete</p>
                <div className="space-y-2">
                  {PACKAGES.map(p => (
                    <button
                      key={p.credits}
                      onClick={() => { setSelected(p.credits); setCustom(""); }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selected === p.credits ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                        <p className="text-xs text-gray-400">{p.desc}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-700">{fmt(p.credits * unitUsd)}</p>
                    </button>
                  ))}

                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    custom && !selected ? "border-violet-500 bg-violet-50" : "border-gray-200"
                  }`}>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Cantidad personalizada</p>
                      <input
                        type="number"
                        min={1}
                        placeholder="Ej: 8"
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

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Nota (opcional)</p>
                  <textarea
                    rows={2}
                    placeholder="Ej: Para un proyecto específico..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>

                {amountUsd != null && credits != null && credits > 0 && (
                  <div className="bg-violet-50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm text-violet-700">Total a pagar</span>
                    <span className="font-bold text-violet-900">{fmt(amountUsd)} <span className="text-xs font-normal text-violet-600">({credits} cr × {fmt(unitUsd)})</span></span>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={close}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submit}
                    disabled={loading || !credits || credits <= 0}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: "#7C3AED" }}
                  >
                    {loading ? "Enviando…" : "Enviar solicitud"}
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  El equipo Spingarn recibirá tu solicitud y coordinará el pago contigo directamente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
