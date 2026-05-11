"use client";
import { useState, useEffect } from "react";

type Advisor = { id: string; name: string; email: string; role: string };
type Slot = { date: string; time: string };

const DURATIONS = [
  { value: 30,  label: "30 min — consulta rápida" },
  { value: 60,  label: "60 min — reunión estándar" },
  { value: 90,  label: "90 min — sesión de trabajo" },
  { value: 120, label: "2 horas — taller / revisión" },
];

const ROLE_LABEL: Record<string, string> = {
  admin:    "Partner",
  partner2: "Partner",
  manager:  "Líder de Equipo",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatSlot(slot: Slot): string {
  if (!slot.date) return "";
  const d = new Date(`${slot.date}T${slot.time || "00:00"}`);
  const dateStr = d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = slot.time
    ? d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })
    : "Horario a confirmar";
  return `${dateStr} a las ${timeStr}`;
}

const inputStyle = {
  border: "1px solid #E5E7EB",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  outline: "none",
  background: "white",
  width: "100%",
  colorScheme: "light" as const,
};

export default function ReunionPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);

  const [advisorId, setAdvisorId] = useState("");
  const [topic, setTopic] = useState("");
  const [slots, setSlots] = useState<Slot[]>([{ date: "", time: "" }]);
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

  function updateSlot(idx: number, field: keyof Slot, value: string) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addSlot() {
    if (slots.length < 3) setSlots(prev => [...prev, { date: "", time: "" }]);
  }

  function removeSlot(idx: number) {
    setSlots(prev => prev.filter((_, i) => i !== idx));
  }

  function buildPreferredDates(): string {
    const filled = slots.filter(s => s.date);
    if (filled.length === 0) return "Sin fecha preferida indicada";
    return filled.map((s, i) => `Opción ${i + 1}: ${formatSlot(s)}`).join("\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!advisorId) { setError("Selecciona un asesor"); return; }
    if (!topic.trim()) { setError("Escribe el tema de la reunión"); return; }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/portal-meeting-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        advisor_id:       selectedAdvisor!.id,
        advisor_name:     selectedAdvisor!.name,
        advisor_email:    selectedAdvisor!.email,
        topic,
        preferred_dates:  buildPreferredDates(),
        duration_minutes: duration,
        notes,
      }),
    });

    const json = await res.json();
    if (!res.ok) setError(json.error ?? "Error al enviar");
    else setSent(true);
    setSubmitting(false);
  }

  function resetForm() {
    setSent(false); setAdvisorId(""); setTopic("");
    setSlots([{ date: "", time: "" }]); setNotes(""); setDuration(60);
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
          style={{ background: "#FFF0F8" }}>📅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitud enviada</h2>
        <p className="text-gray-500 text-sm mb-2">
          <strong>{selectedAdvisor?.name}</strong> recibirá tu solicitud y confirmará un horario dentro de las próximas 24 horas.
        </p>
        <p className="text-gray-400 text-xs mb-8">Revisa tu correo electrónico para la confirmación.</p>
        <button onClick={resetForm}
          className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold transition"
          style={{ background: "#C8007A" }}>
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

      {/* Disclosure */}
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

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">

        {/* Advisor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Asesor</label>
          <select
            value={advisorId}
            onChange={e => setAdvisorId(e.target.value)}
            disabled={loadingAdvisors}
            style={inputStyle}
            onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
            onBlur={e => e.target.style.boxShadow = "none"}
          >
            <option value="">{loadingAdvisors ? "Cargando asesores..." : "Selecciona un asesor"}</option>
            {advisors.map(a => (
              <option key={a.id} value={a.id}>{a.name} — {ROLE_LABEL[a.role] ?? a.role}</option>
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
            placeholder="Ej: Revisión de estados financieros Q1, seguimiento de propuesta..."
            style={inputStyle}
            onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duración estimada</label>
          <div className="grid grid-cols-2 gap-2">
            {DURATIONS.map(d => (
              <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                className="px-3 py-2.5 rounded-xl text-sm text-left border transition-all"
                style={duration === d.value
                  ? { background: "#C8007A", color: "white", borderColor: "#C8007A" }
                  : { background: "white", color: "#4B5563", borderColor: "#E5E7EB" }
                }>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date/time slots */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Fechas y horarios preferidos
              <span className="text-gray-400 font-normal ml-1">(hasta 3 opciones)</span>
            </label>
          </div>

          <div className="space-y-3">
            {slots.map((slot, idx) => (
              <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {slots.length > 1 ? `Opción ${idx + 1}` : "Fecha y hora"}
                  </span>
                  {slots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(idx)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Date picker */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <span>📅</span> Fecha
                    </p>
                    <input
                      type="date"
                      value={slot.date}
                      min={todayStr()}
                      onChange={e => updateSlot(idx, "date", e.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "8px 12px" }}
                      onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
                      onBlur={e => e.target.style.boxShadow = "none"}
                    />
                  </div>

                  {/* Time picker */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <span>🕐</span> Hora
                    </p>
                    <input
                      type="time"
                      value={slot.time}
                      onChange={e => updateSlot(idx, "time", e.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "8px 12px" }}
                      onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
                      onBlur={e => e.target.style.boxShadow = "none"}
                    />
                  </div>
                </div>

                {/* Preview */}
                {slot.date && (
                  <p className="mt-2.5 text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-100">
                    {formatSlot(slot)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {slots.length < 3 && (
            <button type="button" onClick={addSlot}
              className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all">
              + Agregar otra opción de horario
            </button>
          )}
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
            style={{ ...inputStyle, resize: "none" }}
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
