"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AREAS = [
  "M&A y Energía",
  "Propiedad Intelectual",
  "Aviación y Regulatorio",
  "Protección de Datos Personales",
  "Contratación Pública",
  "Tecnología y Telecomunicaciones",
  "Laboral y Seguridad Social",
  "Tax & Finance",
];

const URGENCY = [
  { value: "baja", label: "Baja — sin prisa" },
  { value: "media", label: "Media — próximas semanas" },
  { value: "alta", label: "Alta — esta semana" },
];

export default function SolicitudesPage() {
  const [area, setArea] = useState("");
  const [urgency, setUrgency] = useState("media");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!area || !description) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sesión expirada. Recarga la página."); setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("client_id, name").eq("id", user.id).single();

    const { error: err } = await supabase.from("client_requests").insert({
      client_id: profile?.client_id,
      user_id: user.id,
      user_name: profile?.name,
      area,
      urgency,
      description,
      contact_preference: contact,
      status: "pendiente",
    });

    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitud enviada</h2>
        <p className="text-gray-500 text-sm mb-6">Tu asesor de Spingarn recibirá tu requerimiento y te contactará a la brevedad.</p>
        <button onClick={() => { setSent(false); setArea(""); setDescription(""); setContact(""); }}
          className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
          Nueva solicitud
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitar Servicio</h1>
        <p className="text-gray-400 text-sm mt-1">Cuéntanos qué necesitas y te asignamos el equipo ideal.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Área de servicio</label>
          <select
            value={area}
            onChange={e => setArea(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Selecciona un área</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Describe tu requerimiento</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            rows={5}
            placeholder="Describe con el mayor detalle posible lo que necesitas..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Urgencia</label>
          <div className="flex gap-2 flex-wrap">
            {URGENCY.map(u => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUrgency(u.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  urgency === u.value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ¿Cómo prefieres que te contactemos? <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder="Ej: WhatsApp +593..., email, llamada..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </div>
  );
}
