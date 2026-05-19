"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const CREDIT_COST = 1;
const BRAND = "#C8007A";

type Session = { id: string; title: string; status: string; created_at: string };
type StreamedAgent = { agent_id: string; agent_name: string; agent_area: string; agent_emoji: string; response: string };

const AGENT_EMOJI: Record<string, string> = {
  laboral: "⚖️", corporativo: "🏛️", tributario: "📊", financiero: "💹",
  aviacion: "✈️", contratacion_publica: "🏗️", propiedad_intelectual: "💡", datos_tecnologia: "🔐",
};

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pendiente",  color: "#6B7280" },
  processing: { label: "En proceso", color: "#F59E0B" },
  completed:  { label: "Completado", color: "#10B981" },
  failed:     { label: "Error",      color: "#EF4444" },
};

export default function ConsejoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  // Streaming state
  const [phase, setPhase] = useState<"idle" | "streaming" | "done" | "failed">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamedAgents, setStreamedAgents] = useState<StreamedAgent[]>([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/council/sessions")
      .then(r => r.json())
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .finally(() => setLoadingSessions(false));
    fetch("/api/wallet")
      .then(r => r.json())
      .then(d => setCredits((d?.balance_credits ?? 0) - (d?.reserved_credits ?? 0)))
      .catch(() => setCredits(null));
  }, []);

  const canAfford = credits === null || credits >= CREDIT_COST;
  const descLen = description.trim().length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || descLen < 50 || !canAfford) return;

    setError("");
    setPhase("streaming");
    setStreamedAgents([]);
    setSynthesis(null);
    setSessionId(null);
    setExpandedAgent(null);

    try {
      const res = await fetch("/api/council/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        setError(`Créditos insuficientes. Tienes ${data.available ?? 0} y esta sesión requiere ${data.needed ?? CREDIT_COST}.`);
        setPhase("idle");
        return;
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error enviando el caso");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("event: ")) continue;
          const nlIdx = part.indexOf("\n");
          if (nlIdx < 0) continue;
          const event = part.slice(7, nlIdx);
          const rawData = part.slice(nlIdx + 6);
          let data: Record<string, unknown>;
          try { data = JSON.parse(rawData); } catch { continue; }

          if (event === "session") {
            setSessionId(data.session_id as string);
            setCredits(prev => prev !== null ? prev - CREDIT_COST : null);
          } else if (event === "agent") {
            setStreamedAgents(prev => [...prev, data as unknown as StreamedAgent]);
          } else if (event === "synthesis") {
            setSynthesis(data.response as string);
          } else if (event === "done") {
            setPhase("done");
          } else if (event === "error") {
            throw new Error(data.message as string ?? "Error procesando el caso");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error enviando el caso");
      setPhase("failed");
    }
  }

  function reset() {
    setPhase("idle");
    setTitle("");
    setDescription("");
    setStreamedAgents([]);
    setSynthesis(null);
    setSessionId(null);
    setError("");
    fetch("/api/council/sessions").then(r => r.json()).then(d => { if (Array.isArray(d)) setSessions(d); });
  }

  const isStreaming = phase === "streaming" || phase === "done";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* ── STREAMING VIEW ──────────────────────────────────────── */}
      {isStreaming ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {phase === "done"
                  ? `${streamedAgents.length} especialista${streamedAgents.length !== 1 ? "s" : ""} deliberaron`
                  : "El consejo está deliberando…"}
              </p>
            </div>
            {phase === "done" && (
              <button onClick={reset} className="flex-shrink-0 text-xs font-semibold text-white px-4 py-2 rounded-xl" style={{ background: BRAND }}>
                Nuevo caso
              </button>
            )}
          </div>

          {/* Synthesis */}
          {synthesis ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                <span className="text-base">🏛</span>
                <p className="text-sm font-bold text-gray-900">Posición del Consejo Consultivo</p>
              </div>
              <div className="px-6 py-5 prose prose-sm prose-gray max-w-none">
                <ReactMarkdown>{synthesis}</ReactMarkdown>
              </div>
              {sessionId && (
                <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50">
                  <button onClick={() => router.push(`/portal/consejo/${sessionId}`)}
                    className="text-xs font-medium hover:underline" style={{ color: BRAND }}>
                    Ver sesión completa →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: BRAND, borderTopColor: "transparent" }} />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {streamedAgents.length > 0 ? "Sintetizando posición del consejo…" : "Cargando conocimiento y seleccionando especialistas…"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {streamedAgents.length > 0
                    ? `${streamedAgents.length} especialista${streamedAgents.length !== 1 ? "s" : ""} completado${streamedAgents.length !== 1 ? "s" : ""}`
                    : "Esto puede tomar entre 30 y 90 segundos"}
                </p>
              </div>
            </div>
          )}

          {/* Agent deliberations */}
          {streamedAgents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Deliberaciones individuales</p>
              <div className="space-y-2">
                {streamedAgents.map(ar => {
                  const emoji = ar.agent_emoji || AGENT_EMOJI[ar.agent_id] || "🤖";
                  const isOpen = expandedAgent === ar.agent_id;
                  return (
                    <div key={ar.agent_id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition"
                        onClick={() => setExpandedAgent(isOpen ? null : ar.agent_id)}>
                        <span className="text-base flex-shrink-0">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{ar.agent_name}</p>
                          <p className="text-xs text-gray-400">{ar.agent_area}</p>
                        </div>
                        <span className="text-xs text-green-600 font-medium flex-shrink-0 mr-1">Completado</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 px-5 py-4 prose prose-sm prose-gray max-w-none bg-gray-50/50">
                          <ReactMarkdown>{ar.response}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  );
                })}
                {phase === "streaming" && (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 px-4 py-3.5 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-gray-400">Analizando…</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

      ) : (
        /* ── FORM VIEW ──────────────────────────────────────────── */
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🏛 Consejo Consultivo Spingarn</h1>
              <p className="text-gray-500 text-sm mt-1">Panel de especialistas deliberando sobre tu caso en paralelo.</p>
            </div>
            {credits !== null && (
              <div className={`flex-shrink-0 text-center px-4 py-2 rounded-xl border ${credits >= CREDIT_COST ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                <p className="text-2xl font-bold" style={{ color: credits >= CREDIT_COST ? "#16A34A" : "#DC2626" }}>{credits}</p>
                <p className="text-xs text-gray-500">crédito{credits !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>

          {credits !== null && credits < CREDIT_COST && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-700">Sin créditos disponibles</p>
                <p className="text-xs text-red-500 mt-0.5">Cada sesión consume {CREDIT_COST} crédito.</p>
              </div>
              <Link href="/portal/wallet" className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: BRAND }}>
                Recargar →
              </Link>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">Nuevo caso</h2>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#FFF0F8", color: BRAND }}>
                {CREDIT_COST} crédito por sesión
              </span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título del caso</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Reestructuración societaria con implicaciones laborales y tributarias"
                  maxLength={200} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Descripción del caso <span className="text-gray-400 font-normal">(mínimo 50 caracteres)</span>
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={7} required
                  placeholder="Describe el contexto completo: situación actual, partes involucradas, documentos existentes, plazos y lo que necesitas resolver."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none leading-relaxed"
                />
                <p className="text-xs text-gray-400 mt-1">{descLen} caracteres · mínimo 50</p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-xs text-red-600">{error}</p>
                  {error.includes("Créditos") && (
                    <Link href="/portal/wallet" className="text-xs font-semibold underline mt-1 block" style={{ color: BRAND }}>Recargar créditos →</Link>
                  )}
                </div>
              )}

              <button type="submit"
                disabled={descLen < 50 || !title.trim() || !canAfford}
                className="w-full py-3 text-white rounded-xl text-sm font-semibold transition disabled:opacity-40"
                style={{ background: BRAND }}>
                {!canAfford ? "Sin créditos — recarga para continuar" : `Someter al Consejo · ${CREDIT_COST} crédito`}
              </button>
            </form>
          </div>

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
                    <button key={s.id} onClick={() => router.push(`/portal/consejo/${s.id}`)}
                      className="w-full text-left bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-pink-200 hover:shadow-sm transition flex items-center justify-between gap-4">
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
        </>
      )}
    </div>
  );
}
