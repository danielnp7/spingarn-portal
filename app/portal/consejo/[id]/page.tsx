"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type AgentResponse = { agent_id: string; agent_name: string; agent_area: string; response: string };
type Session = {
  id: string; title: string; description: string;
  status: string; council_response: string | null; created_at: string; completed_at: string | null;
};

const AGENT_EMOJIS: Record<string, string> = {
  laboral: "⚖️", corporativo: "🏛️", tributario: "📊", financiero: "💹",
  aviacion: "✈️", contratacion_publica: "🏗️", propiedad_intelectual: "💡", datos_tecnologia: "🔐",
};

export default function ConsejoSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [agentResponses, setAgentResponses] = useState<AgentResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/council/sessions/${id}`)
      .then(r => r.json())
      .then(d => {
        setSession(d.session ?? null);
        setAgentResponses(d.agentResponses ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Cargando respuesta del consejo…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Caso no encontrado.</p>
        <button onClick={() => router.push("/portal/consejo")} className="mt-4 text-sm underline" style={{ color: "#C8007A" }}>Volver</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Back */}
      <button onClick={() => router.push("/portal/consejo")} className="text-sm flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        Volver al Consejo
      </button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{session.title}</h1>
        <p className="text-xs text-gray-400 mt-1">
          Sometido el {new Date(session.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}
          {session.completed_at && ` · Resuelto el ${new Date(session.completed_at).toLocaleDateString("es-EC", { day: "numeric", month: "long" })}`}
        </p>
      </div>

      {/* Case description */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Caso sometido</p>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{session.description}</p>
      </div>

      {/* Council response */}
      {session.status === "completed" && session.council_response ? (
        <div className="bg-white rounded-2xl border-2 p-6 shadow-sm" style={{ borderColor: "#C8007A22" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "#C8007A" }}>S</div>
            <div>
              <p className="text-sm font-bold text-gray-900">Posición del Consejo Consultivo</p>
              <p className="text-xs text-gray-400">Spingarn Integrated Business Consulting</p>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed
            [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-5 [&_h2]:mb-2
            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-4 [&_h3]:mb-1.5
            [&_ul]:pl-4 [&_li]:mb-1 [&_strong]:text-gray-900
            [&_hr]:border-gray-100 [&_hr]:my-4">
            <ReactMarkdown>{session.council_response}</ReactMarkdown>
          </div>
        </div>
      ) : session.status === "processing" ? (
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-8 h-8 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-pink-800">El consejo está deliberando</p>
            <p className="text-xs text-pink-600 mt-0.5">Los especialistas analizan tu caso. Recarga en unos momentos.</p>
          </div>
        </div>
      ) : session.status === "failed" ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-sm text-red-600">Hubo un error procesando este caso. Por favor contáctanos.</p>
        </div>
      ) : null}

      {/* Agent deliberations — only partner1 sees this section */}
      {agentResponses && agentResponses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Deliberaciones internas</span>
            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">Solo visible para ti</span>
          </div>
          <div className="space-y-2">
            {agentResponses.map(ar => (
              <div key={ar.agent_id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveAgent(activeAgent === ar.agent_id ? null : ar.agent_id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span>{AGENT_EMOJIS[ar.agent_id] ?? "🔍"}</span>
                    {ar.agent_name}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${activeAgent === ar.agent_id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {activeAgent === ar.agent_id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed
                      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-3 [&_h3]:mb-1
                      [&_ul]:pl-4 [&_li]:mb-1 [&_strong]:text-gray-800">
                      <ReactMarkdown>{ar.response}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
