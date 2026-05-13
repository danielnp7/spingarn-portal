"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CREDIT_COST = 1;

type Session = { id: string; title: string; status: string; created_at: string };

export default function ConsejoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/council/sessions")
      .then(r => r.json())
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .finally(() => setLoadingSessions(false));

    fetch("/api/wallet")
      .then(r => r.json())
      .then(d => {
        const balance = (d?.balance_credits ?? 0) - (d?.reserved_credits ?? 0);
        setCredits(balance);
      })
      .catch(() => setCredits(null));
  }, []);

  const canAfford = credits === null || credits >= CREDIT_COST;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || description.trim().length < 50 || !canAfford) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/council/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError(`Créditos insuficientes. Tienes ${data.available ?? 0} y esta sesión requiere ${data.needed}.`);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Error");
      router.push(`/portal/consejo/${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error procesando el caso");
      setLoading(false);
    }
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending:    { label: "Pendiente",   color: "#6B7280" },
    processing: { label: "En proceso",  color: "#F59E0B" },
    completed:  { label: "Completado",  color: "#10B981" },
    failed:     { label: "Error",       color: "#EF4444" },
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🏛 Consejo Consultivo Spingarn
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Panel de especialistas en derecho, finanzas, tributación, aviación y más — deliberando sobre tu caso en paralelo.
          </p>
        </div>
        {credits !== null && (
          <div className={`flex-shrink-0 text-center px-4 py-2 rounded-xl border ${credits >= CREDIT_COST ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <p className="text-2xl font-bold" style={{ color: credits >= CREDIT_COST ? "#16A34A" : "#DC2626" }}>{credits}</p>
            <p className="text-xs text-gray-500">crédito{credits !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>

      {/* No credits warning */}
      {credits !== null && credits < CREDIT_COST && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-700">Sin créditos disponibles</p>
            <p className="text-xs text-red-500 mt-0.5">Cada sesión del consejo consume {CREDIT_COST} crédito. Recarga para continuar.</p>
          </div>
          <Link href="/portal/wallet" className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "#C8007A" }}>
            Recargar →
          </Link>
        </div>
      )}

      {/* New case form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Nuevo caso</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#FFF0F8", color: "#C8007A" }}>
            {CREDIT_COST} crédito por sesión
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título del caso</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Reestructuración societaria con implicaciones laborales y tributarias"
              maxLength={200}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Descripción del caso <span className="text-gray-400 font-normal">(mínimo 50 caracteres)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={7}
              placeholder="Describe el contexto completo: situación actual, partes involucradas, documentos existentes, plazos, lo que necesitas resolver y cualquier detalle relevante. Cuanto más detalle, mejor podrá deliberar el consejo."
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none leading-relaxed"
            />
            <p className="text-xs text-gray-400 mt-1">{description.length} caracteres · mínimo 50</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-xs text-red-600">{error}</p>
              {error.includes("Créditos") && (
                <Link href="/portal/wallet" className="text-xs font-semibold underline mt-1 block" style={{ color: "#C8007A" }}>Recargar créditos →</Link>
              )}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-pink-100 bg-pink-50 p-4 text-sm text-pink-700 flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <div>
                <p className="font-semibold">El consejo está deliberando…</p>
                <p className="text-pink-600 mt-0.5">Los especialistas analizan tu caso en paralelo. Esto toma entre 30 y 90 segundos.</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || description.trim().length < 50 || !title.trim() || !canAfford}
            className="w-full py-3 text-white rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "#C8007A" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#A3005F"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#C8007A"; }}
          >
            {loading ? "Deliberando…" : !canAfford ? "Sin créditos — recarga para continuar" : `Someter al Consejo · ${CREDIT_COST} crédito`}
          </button>
        </form>
      </div>

      {/* Previous sessions */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Casos anteriores</h2>
        {loadingSessions ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no has sometido ningún caso al consejo.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const st = statusLabel[s.status] ?? { label: s.status, color: "#6B7280" };
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(`/portal/consejo/${s.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-pink-200 hover:shadow-sm transition flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: st.color + "18", color: st.color }}>
                    {st.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
