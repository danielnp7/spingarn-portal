import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type MeetingStatus = "pendiente" | "aceptada" | "rechazada";

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; bg: string; icon: string }> = {
  pendiente: { label: "Pendiente de respuesta", color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
  aceptada:  { label: "Confirmada",             color: "#16A34A", bg: "#F0FDF4", icon: "✅" },
  rechazada: { label: "Respondida",             color: "#7C3AED", bg: "#F5F3FF", icon: "📅" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function MisReunionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("name, client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");

  const res = await fetch(
    `${supabaseUrl}/rest/v1/meeting_requests?client_user_id=eq.${user.id}&order=created_at.desc`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }
  );

  const requests = res.ok ? await res.json() as {
    id: string; topic: string; advisor_name: string; preferred_dates: string;
    duration_minutes: number; notes: string; status: MeetingStatus;
    created_at: string; responded_at: string | null;
  }[] : [];

  const pending   = requests.filter(r => r.status === "pendiente").length;
  const confirmed = requests.filter(r => r.status === "aceptada").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Reuniones</h1>
        <p className="text-gray-400 text-sm mt-1">Solicitudes de reunión con tu equipo asesor.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendientes",   value: pending,                           color: "#D97706", bg: "#FFFBEB" },
          { label: "Confirmadas",  value: confirmed,                         color: "#16A34A", bg: "#F0FDF4" },
          { label: "Total",        value: requests.length,                   color: "#6B7280", bg: "#F9FAFB" },
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
          <a href="/portal/reunion"
            className="inline-block mt-3 text-sm font-semibold hover:underline"
            style={{ color: "#C8007A" }}>
            Agendar una reunión →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pendiente;
            return (
              <div key={req.id}
                className="bg-white rounded-xl border shadow-sm p-5"
                style={{ borderColor: req.status === "aceptada" ? "#BBF7D0" : req.status === "pendiente" ? "#FDE68A" : "#E5E7EB" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{cfg.icon}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                      {req.status === "pendiente" && (
                        <span className="text-xs text-amber-500 animate-pulse">● Esperando respuesta</span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{req.topic}</h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                      <span>👤 {req.advisor_name}</span>
                      <span>⏱ {req.duration_minutes} min</span>
                      <span className="text-xs text-gray-400">Solicitada el {fmtDate(req.created_at)}</span>
                    </div>

                    {/* Preferred dates */}
                    {req.preferred_dates && req.preferred_dates !== "Sin fecha preferida indicada" && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Horarios que propusiste</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{req.preferred_dates}</pre>
                      </div>
                    )}

                    {/* Notes */}
                    {req.notes && (
                      <p className="text-xs text-gray-400 mt-1">Contexto: {req.notes}</p>
                    )}

                    {/* Response date */}
                    {req.responded_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        Respondida el {fmtDate(req.responded_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <a href="/portal/reunion"
        className="block w-full text-center py-3 rounded-xl text-sm font-semibold text-white transition"
        style={{ background: "#C8007A" }}>
        + Solicitar nueva reunión
      </a>
    </div>
  );
}
