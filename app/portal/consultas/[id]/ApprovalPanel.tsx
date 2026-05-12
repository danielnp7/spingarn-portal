"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const COMPLEXITY_LABELS: Record<string, { label: string; color: string; description: string }> = {
  simple:                { label: "Simple",            color: "#059669", description: "Consulta puntual de respuesta directa." },
  media:                 { label: "Media",             color: "#D97706", description: "Análisis moderado con revisión de documentos." },
  compleja:              { label: "Compleja",          color: "#DC2626", description: "Análisis técnico profundo y criterio avanzado." },
  cotizacion_manual:     { label: "Cotización manual", color: "#7C3AED", description: "Requiere propuesta formal con alcance detallado." },
  requiere_reunion:      { label: "Requiere reunión",  color: "#2563EB", description: "Necesitamos más contexto antes de cotizar." },
  requiere_socio_senior: { label: "Socio senior",      color: "#9D174D", description: "Situación de alto impacto. Escalaremos a un socio." },
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function ApprovalPanel({
  consultationId, title, complexity, estimatedFee, estimatedCredits,
  estimatedHours, estimatedSlaHours, classificationNote,
  walletBalance, creditUnitUsd,
}: {
  consultationId: string;
  title: string;
  complexity: string | null;
  estimatedFee: number | null;
  estimatedCredits: number | null;
  estimatedHours: number | null;
  estimatedSlaHours: number | null;
  classificationNote: string | null;
  walletBalance: number;
  creditUnitUsd: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [insufficientCredits, setInsufficientCredits] = useState<{ available: number; needed: number } | null>(null);

  const complexityInfo = complexity ? COMPLEXITY_LABELS[complexity] : null;
  const canUseCredits = walletBalance >= (estimatedCredits ?? 0) && (estimatedCredits ?? 0) > 0;
  const needsManualQuote = ["cotizacion_manual", "requiere_reunion", "requiere_socio_senior"].includes(complexity ?? "");

  async function approve(type: string) {
    setLoading(type);
    setError("");
    setInsufficientCredits(null);
    try {
      const res = await fetch(`/api/consultations/${consultationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_type: type }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setInsufficientCredits({ available: data.available, needed: data.needed });
        } else {
          setError(data.error ?? "Error al procesar");
        }
        setLoading(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-300 overflow-hidden shadow-sm" style={{ background: "#FFFBEB" }}>
      <div className="px-5 py-4 border-b border-amber-200">
        <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Tu autorización es requerida para continuar
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Classification result */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-3">Clasificación de tu consulta</p>
          <div className="bg-white rounded-xl p-4 border border-amber-100 space-y-4">
            {complexityInfo && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${complexityInfo.color}15` }}>
                  <span className="text-lg">
                    {complexity === "simple" && "💬"}
                    {complexity === "media" && "📋"}
                    {(complexity === "compleja" || complexity === "cotizacion_manual") && "📊"}
                    {complexity === "requiere_reunion" && "📅"}
                    {complexity === "requiere_socio_senior" && "👤"}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: complexityInfo.color }}>
                    {complexityInfo.label}
                  </p>
                  <p className="text-xs text-gray-500">{complexityInfo.description}</p>
                </div>
              </div>
            )}

            {!needsManualQuote && estimatedFee != null && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Honorario estimado</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(estimatedFee)}</p>
                </div>
                {estimatedCredits != null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Créditos requeridos</p>
                    <p className="text-lg font-bold text-gray-900">
                      {estimatedCredits} <span className="text-sm text-gray-400">crédito{estimatedCredits !== 1 ? "s" : ""}</span>
                    </p>
                  </div>
                )}
                {estimatedSlaHours != null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Tiempo de respuesta</p>
                    <p className="text-lg font-bold text-gray-900">
                      {estimatedSlaHours}h
                    </p>
                  </div>
                )}
              </div>
            )}

            {needsManualQuote && (
              <div className="pt-3 border-t border-gray-50">
                <p className="text-sm text-gray-600">
                  Esta consulta requiere una evaluación personalizada. El equipo Spingarn te contactará para definir el alcance y honorarios.
                </p>
              </div>
            )}

            {classificationNote && (
              <div className="pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-500 leading-relaxed">{classificationNote}</p>
                <p className="text-[10px] text-gray-400 mt-1 italic">
                  Clasificación asistida por IA · Estimación sujeta a verificación por el equipo consultor.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Wallet info */}
        {!needsManualQuote && (
          <div className="flex items-center justify-between text-sm bg-white rounded-xl p-3 border border-amber-100">
            <span className="text-gray-600 flex items-center gap-2">
              <span>💎</span> Créditos disponibles
            </span>
            <span className="font-bold text-gray-900">
              {walletBalance} crédito{walletBalance !== 1 ? "s" : ""}
              <span className="text-xs font-normal text-gray-400 ml-1">≈ {fmt(walletBalance * creditUnitUsd)}</span>
            </span>
          </div>
        )}

        {insufficientCredits && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-red-700 mb-1">Créditos insuficientes</p>
            <p className="text-xs text-red-600">
              Tienes {insufficientCredits.available} crédito{insufficientCredits.available !== 1 ? "s" : ""} disponibles pero se requieren {insufficientCredits.needed}. Puedes pagar directamente o solicitar una cotización formal.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2.5">
          {!needsManualQuote && canUseCredits && (
            <button
              onClick={() => approve("credits")}
              disabled={!!loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "#C8007A" }}
            >
              {loading === "credits" ? "Procesando…" : (
                <>
                  <span>💎</span>
                  Aprobar usando {estimatedCredits} crédito{estimatedCredits !== 1 ? "s" : ""} ({fmt(estimatedFee ?? 0)})
                </>
              )}
            </button>
          )}

          {!needsManualQuote && (
            <button
              onClick={() => approve("payment")}
              disabled={!!loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-gray-800 border-2 border-gray-200 bg-white hover:border-gray-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading === "payment" ? "Procesando…" : (
                <>
                  <span>💳</span>
                  Aprobar y coordinar pago
                </>
              )}
            </button>
          )}

          <button
            onClick={() => approve("quote_request")}
            disabled={!!loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading === "quote_request" ? "Procesando…" : (
              <>
                <span>📋</span>
                {needsManualQuote ? "Solicitar cotización formal" : "Solicitar cotización formal en su lugar"}
              </>
            )}
          </button>

          <button
            onClick={() => approve("cancel")}
            disabled={!!loading}
            className="w-full py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {loading === "cancel" ? "Cancelando…" : "Cancelar esta consulta"}
          </button>
        </div>

        <p className="text-[11px] text-amber-700 leading-relaxed border-t border-amber-200 pt-3">
          Al aprobar, confirmas que autorizas a Spingarn a ejecutar el trabajo descrito bajo los honorarios estimados indicados. Esta aprobación queda registrada con tu usuario, la fecha y el alcance aprobado.
        </p>
      </div>
    </div>
  );
}
