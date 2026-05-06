import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function statusLabel(s: string) {
  const map: Record<string, string> = {
    propuesta: "Propuesta", aprobado: "Aprobado", en_ejecucion: "En Ejecución",
    entregado: "Entregado", cerrado: "Cerrado", cancelado: "Cancelado",
  };
  return map[s] ?? s;
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    propuesta: "bg-gray-100 text-gray-600", aprobado: "bg-blue-100 text-blue-700",
    en_ejecucion: "bg-amber-100 text-amber-700", entregado: "bg-green-100 text-green-700",
    cerrado: "bg-gray-100 text-gray-500", cancelado: "bg-red-100 text-red-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, deadline, client_notes, value, start_date, area:areas(name), owner:profiles!owner_id(name)")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false });

  const active = projects?.filter(p => !["cerrado", "cancelado"].includes(p.status)) ?? [];
  const closed = projects?.filter(p => ["cerrado", "cancelado"].includes(p.status)) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Proyectos</h1>
        <p className="text-gray-400 text-sm mt-1">{projects?.length ?? 0} proyectos en total</p>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Activos</h2>
          <div className="space-y-3">
            {active.map(p => (
              <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(p.area as { name?: string } | null)?.name ?? "—"} · Asesor: {(p.owner as { name?: string } | null)?.name ?? "—"}
                    </p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusColor(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>
                {(p as typeof p & { client_notes?: string }).client_notes && (
                  <div className="rounded-lg p-3 mb-3 text-sm" style={{ background: "#FFF0F8", borderLeft: "3px solid #C8007A" }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: "#C8007A" }}>Actualización de tu asesor</p>
                    <p className="text-gray-700">{(p as typeof p & { client_notes?: string }).client_notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {p.start_date && <span>Inicio: {new Date(p.start_date).toLocaleDateString("es-EC")}</span>}
                  {p.deadline && <span>Entrega: {new Date(p.deadline).toLocaleDateString("es-EC")}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-2">
            {closed.map(p => (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 opacity-70">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{(p.area as { name?: string } | null)?.name ?? "—"}</p>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                  {statusLabel(p.status)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(projects?.length ?? 0) === 0 && (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
          <p>No tienes proyectos registrados aún.</p>
        </div>
      )}
    </div>
  );
}
