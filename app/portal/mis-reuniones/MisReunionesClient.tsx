"use client";
import { useState } from "react";
import Link from "next/link";

type MeetingStatus = "pendiente" | "aceptada" | "rechazada" | "contrapropuesta";

interface Meeting {
  id: string;
  topic: string;
  advisor_name: string;
  preferred_dates: string;
  duration_minutes: number;
  notes: string;
  status: MeetingStatus;
  created_at: string;
  responded_at: string | null;
  confirmed_date: string | null;
  counter_proposed_dates: string | null;
  response_message: string | null;
}

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; bg: string; icon: string }> = {
  pendiente:       { label: "Esperando respuesta", color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
  aceptada:        { label: "Confirmada",           color: "#16A34A", bg: "#F0FDF4", icon: "✅" },
  rechazada:       { label: "Respondida",           color: "#6B7280", bg: "#F9FAFB", icon: "📅" },
  contrapropuesta: { label: "Horario alternativo",  color: "#7C3AED", bg: "#F5F3FF", icon: "🗓" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-EC", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function parseCounterSlots(text: string | null): string[] {
  if (!text) return [];
  return text.split("\n").filter(l => l.trim().length > 0);
}

export default function MisReunionesClient({ requests }: { requests: Meeting[] }) {
  const [accepting, setAccepting]   = useState<{ id: string; slots: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState<Set<string>>(new Set());

  const pending        = requests.filter(r => r.status === "pendiente").length;
  const confirmed      = requests.filter(r => r.status === "aceptada").length;
  const needsAction    = requests.filter(r => r.status === "contrapropuesta" && !done.has(r.id)).length;

  async function handleAccept(requestId: string, confirmedDate: string) {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/portal-meeting-accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, confirmed_date: confirmedDate }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al confirmar");
    } else {
      setDone(prev => new Set([...prev, requestId]));
      setAccepting(null);
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Reuniones</h1>
        <p className="text-gray-400 text-sm mt-1">Solicitudes de reunión con tu equipo asesor.</p>
      </div>

      {/* Alert for counter-proposals needing action */}
      {needsAction > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-5 py-4 flex items-start gap-3">
          <span className="text-purple-500 text-lg flex-shrink-0 mt-0.5">🗓</span>
          <div>
            <p className="text-sm font-semibold text-purple-800">
              {needsAction === 1 ? "Tu asesor propuso un horario alternativo" : `Tu asesor propuso ${needsAction} horarios alternativos`}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">Revisa las opciones abajo y confirma el que mejor te convenga.</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendientes",   value: pending,          color: "#D97706", bg: "#FFFBEB" },
          { label: "Confirmadas",  value: confirmed,         color: "#16A34A", bg: "#F0FDF4" },
          { label: "Total",        value: requests.length,   color: "#6B7280", bg: "#F9FAFB" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-3xl mb-3">📅</p>
          <p className="font-medium text-gray-600">No has solicitado reuniones todavía</p>
          <Link href="/portal/reunion"
            className="inline-block mt-3 text-sm font-semibold hover:underline"
            style={{ color: "#C8007A" }}>
            Agendar una reunión →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const cfg          = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pendiente;
            const counterSlots = parseCounterSlots(req.counter_proposed_dates);
            const isAccepted   = done.has(req.id);
            const effectiveStatus: MeetingStatus = isAccepted ? "aceptada" : req.status;
            const effectiveCfg = STATUS_CONFIG[effectiveStatus];

            return (
              <div key={req.id}
                className="bg-white rounded-xl border shadow-sm p-5"
                style={{
                  borderColor:
                    effectiveStatus === "aceptada"        ? "#BBF7D0" :
                    effectiveStatus === "contrapropuesta" ? "#DDD6FE" :
                    effectiveStatus === "pendiente"       ? "#FDE68A" : "#E5E7EB",
                }}
              >
                {/* Status row */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{effectiveCfg.icon}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: effectiveCfg.color, background: effectiveCfg.bg }}>
                    {effectiveCfg.label}
                  </span>
                  {effectiveStatus === "pendiente" && (
                    <span className="text-xs text-amber-500 animate-pulse">● Esperando respuesta</span>
                  )}
                  {effectiveStatus === "contrapropuesta" && !isAccepted && (
                    <span className="text-xs text-purple-600 font-medium animate-pulse">● Requiere tu confirmación</span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{req.topic}</h3>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                  <span>👤 {req.advisor_name}</span>
                  <span>⏱ {req.duration_minutes} min</span>
                  <span className="text-xs text-gray-400">Solicitada el {fmtDate(req.created_at)}</span>
                </div>

                {/* Confirmed date */}
                {(req.confirmed_date || isAccepted) && (
                  <div className="bg-green-50 rounded-lg px-3 py-2.5 mb-3 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5 flex-shrink-0">✅</span>
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-0.5">Fecha confirmada</p>
                      <p className="text-xs text-green-600">{req.confirmed_date}</p>
                    </div>
                  </div>
                )}

                {/* Counter-proposal slots to choose from */}
                {effectiveStatus === "contrapropuesta" && !isAccepted && counterSlots.length > 0 && (
                  <div className="bg-purple-50 rounded-lg px-4 py-3 mb-3">
                    <p className="text-xs font-semibold text-purple-700 mb-3">
                      Tu asesor propone los siguientes horarios — elige el que más te convenga:
                    </p>
                    <div className="space-y-2">
                      {counterSlots.map((slot, i) => (
                        <button key={i}
                          onClick={() => handleAccept(req.id, slot)}
                          disabled={submitting}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-purple-200 hover:border-purple-400 hover:shadow-sm transition-all text-left disabled:opacity-50"
                        >
                          <span className="text-sm text-gray-800">{slot}</span>
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                            style={{ background: "#7C3AED" }}>
                            {submitting ? "..." : "Aceptar"}
                          </span>
                        </button>
                      ))}
                    </div>
                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                  </div>
                )}

                {/* Advisor message */}
                {req.response_message && (
                  <div className="bg-pink-50 rounded-lg px-3 py-2 mb-2">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: "#C8007A" }}>Mensaje de tu asesor</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{req.response_message}</p>
                  </div>
                )}

                {/* Client's original preferred dates */}
                {req.preferred_dates && req.preferred_dates !== "Sin fecha preferida indicada" && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Horarios que propusiste</p>
                    <pre className="text-xs text-gray-500 whitespace-pre-wrap font-sans">{req.preferred_dates}</pre>
                  </div>
                )}

                {req.notes && (
                  <p className="text-xs text-gray-400 mt-1">Contexto: {req.notes}</p>
                )}

                {req.responded_at && effectiveStatus !== "pendiente" && (
                  <p className="text-xs text-gray-400 mt-2">Respondida el {fmtDate(req.responded_at)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link href="/portal/reunion"
        className="block w-full text-center py-3 rounded-xl text-sm font-semibold text-white transition"
        style={{ background: "#C8007A" }}>
        + Solicitar nueva reunión
      </Link>
    </div>
  );
}
