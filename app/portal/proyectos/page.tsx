import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STEPS = [
  { key: "propuesta", label: "Propuesta" },
  { key: "aprobado", label: "Aprobado" },
  { key: "en_ejecucion", label: "En Ejecución" },
  { key: "entregado", label: "Entregado" },
  { key: "cerrado", label: "Finalizado" },
];

function getProgress(status: string) {
  if (status === "cancelado") return -1;
  const idx = STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    propuesta: "bg-gray-100 text-gray-600",
    aprobado: "bg-blue-100 text-blue-700",
    en_ejecucion: "bg-amber-100 text-amber-700",
    entregado: "bg-green-100 text-green-700",
    cerrado: "bg-gray-100 text-gray-500",
    cancelado: "bg-red-100 text-red-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    propuesta: "Propuesta", aprobado: "Aprobado", en_ejecucion: "En Ejecución",
    entregado: "Entregado", cerrado: "Finalizado", cancelado: "Cancelado",
  };
  return map[s] ?? s;
}

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, start_date, deadline, client_notes, leader:profiles!leader_id(name), owner:profiles!owner_id(name)")
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
            {active.map(p => {
              const stepIdx = getProgress(p.status);
              const leader = (p.leader as { name?: string } | null)?.name ?? (p.owner as { name?: string } | null)?.name ?? "—";
              return (
                <Link key={p.id} href={`/portal/proyectos/${p.id}`}
                  className="block bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-pink-200 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#C8007A] transition-colors">{p.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Líder: {leader}
                        {p.start_date && <span className="ml-3">Inicio: {new Date(p.start_date).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}</span>}
                      </p>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      {STEPS.map((step, i) => (
                        <div key={step.key} className="flex flex-col items-center flex-1">
                          <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
                            i <= stepIdx
                              ? "border-[#C8007A] bg-[#C8007A]"
                              : "border-gray-200 bg-white"
                          }`} />
                        </div>
                      ))}
                    </div>
                    <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%`, background: "#C8007A" }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      {STEPS.map((step, i) => (
                        <span key={step.key} className={`text-[9px] font-medium flex-1 text-center ${i <= stepIdx ? "text-[#C8007A]" : "text-gray-300"}`}>
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {p.client_notes && (
                    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#FFF0F8", borderLeft: "3px solid #C8007A" }}>
                      <span className="font-semibold" style={{ color: "#C8007A" }}>Actualización: </span>
                      <span className="text-gray-700 line-clamp-1">{(p as typeof p & { client_notes?: string }).client_notes}</span>
                    </div>
                  )}

                  <p className="text-xs mt-3" style={{ color: "#C8007A" }}>Ver detalle →</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-2">
            {closed.map(p => (
              <Link key={p.id} href={`/portal/proyectos/${p.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{(p.leader as { name?: string } | null)?.name ?? (p.owner as { name?: string } | null)?.name ?? "—"}</p>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                  {statusLabel(p.status)}
                </span>
              </Link>
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
