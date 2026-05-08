"use client";
import { useState, useEffect } from "react";

type Advisor = { id: string; name: string; email: string; role: string };

const DURATIONS = [
  { value: 30,  label: "30 minutos — consulta rápida" },
  { value: 60,  label: "60 minutos — reunión estándar" },
  { value: 90,  label: "90 minutos — sesión de trabajo" },
  { value: 120, label: "2 horas — taller / revisión amplia" },
];

const ROLE_LABEL: Record<string, string> = {
  admin:    "Partner",
  partner2: "Partner",
  manager:  "Líder de Equipo",
};

export default function ReunionPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);

  const [advisorId, setAdvisorId] = useState("");
  const [topic, setTopic] = useState("");
  const [preferredDates, setPreferredDates] = useState("");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portal-advisors")
      .then(r => r.json())
      .then(data => { setAdvisors(data); setLoadingAdvisors(false); })
      .catch(() => setLoadingAdvisors(false));
  }, []);

  const selectedAdvisor = advisors.find(a => a.id === advisorId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!advisorId || !topic) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/portal-meeting-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        advisor_id:      selectedAdvisor!.id,
        advisor_name:    selectedAdvisor!.name,
        advisor_email:   selectedAdvisor!.email,
        topic,
        preferred_dates: preferredDates,
        duration_minutes: duration,
        notes,
      }),
    });

    const json = await res.json();
    if (!res.ok) setError(json.error ?? "Error al enviar");
    else setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
          style={{ background: "#FFF0F8" }}>
          📅
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitud enviada</h2>
        <p className="text-gray-500 text-sm mb-2">
          <strong>{selectedAdvisor?.name}</strong> recibirá tu solicitud y confirmará un horario dentro de las próximas 24 horas.
        </p>
        <p className="text-gray-400 text-xs mb-8">Revisa tu correo electrónico para la confirmación.</p>
        <button
          onClick={() => { setSent(false); setAdvisorId(""); setTopic(""); setPreferredDates(""); setNotes(""); setDuration(60); }}
          className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold transition"
          style={{ background: "#C8007A" }}
        >
          Nueva solicitud
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agendar Reunión</h1>
        <p className="text-gray-400 text-sm mt-1">Solicita una reunión con tu asesor de Spingarn.</p>
      </div>

      {/* Disclosure banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 flex items-start gap-3">
        <span className="text-blue-400 text-lg flex-shrink-0">ℹ️</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">Sobre la confirmación de reuniones</p>
          <p className="text-sm text-blue-600 mt-0.5 leading-relaxed">
            Esta es una solicitud tentativa. Tu asesor revisará su disponibilidad y confirmará o propondrá
            un horario alternativo <strong>dentro de las próximas 24 horas</strong> por correo electrónico.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">

        {/* Advisor selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Asesor</label>
          <select
            value={advisorId}
            onChange={e => setAdvisorId(e.target.value)}
            required
            disabled={loadingAdvisors}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none bg-white disabled:text-gray-400"
            onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
            onBlur={e => e.target.style.boxShadow = "none"}
          >
            <option value="">{loadingAdvisors ? "Cargando asesores..." : "Selecciona un asesor"}</option>
            {advisors.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} — {ROLE_LABEL[a.role] ?? a.role}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tema de la reunión</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            required
            placeholder="Ej: Revisión de estados financieros Q1, seguimiento de propuesta..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none"
            onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duración estimada</label>
          <div className="grid grid-cols-2 gap-2">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className="px-3 py-2.5 rounded-xl text-sm text-left border transition-all"
                style={duration === d.value
                  ? { background: "#C8007A", color: "white", borderColor: "#C8007A" }
                  : { background: "white", color: "#4B5563", borderColor: "#E5E7EB" }
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred dates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Fechas u horarios preferidos <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={preferredDates}
            onChange={e => setPreferredDates(e.target.value)}
            rows={3}
            placeholder="Ej: Lunes o martes en la mañana, cualquier día después de las 15h00, semana del 20 de mayo..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none"
            onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contexto adicional <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Información relevante que tu asesor deba saber antes de la reunión..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none"
            onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !advisorId || !topic}
          className="w-full py-3 text-white rounded-xl text-sm font-semibold transition disabled:opacity-40"
          style={{ background: "#C8007A" }}
          onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = "#A3005F"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#C8007A"; }}
        >
          {submitting ? "Enviando solicitud..." : "Enviar solicitud de reunión"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Tu asesor recibirá esta solicitud por correo y responderá dentro de 24 horas.
        </p>
      </form>
    </div>
  );
}
