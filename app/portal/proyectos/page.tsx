import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STEPS = ["Propuesta", "Aprobado", "En Ejecución", "Entregado", "Finalizado"];
const STEP_KEYS = ["propuesta", "aprobado", "en_ejecucion", "entregado", "cerrado"];

function getStepIdx(status: string) {
  const i = STEP_KEYS.indexOf(status);
  return i === -1 ? 0 : i;
}

const STATUS_LABEL: Record<string, string> = {
  propuesta: "Propuesta", aprobado: "Aprobado", en_ejecucion: "En Ejecución",
  entregado: "Entregado", cerrado: "Finalizado", cancelado: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  propuesta: "bg-gray-100 text-gray-600", aprobado: "bg-blue-100 text-blue-700",
  en_ejecucion: "bg-amber-100 text-amber-700", entregado: "bg-green-100 text-green-700",
  cerrado: "bg-gray-200 text-gray-500", cancelado: "bg-red-100 text-red-600",
};

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, start_date, deadline, client_notes, owner:profiles!owner_id(name)")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false });

  // Fetch leader names separately to avoid PostgREST join issues
  const leaderMap: Record<string, string> = {};
  if (projects && projects.length > 0) {
    const { data: rawProjects } = await supabase
      .from("projects")
      .select("id, leader_id")
      .in("id", projects.map(p => p.id));
    if (rawProjects) {
      const leaderIds = rawProjects.map(p => p.leader_id).filter(Boolean) as string[];
      if (leaderIds.length > 0) {
        const { data: leaders } = await supabase.from("profiles").select("id, name").in("id", leaderIds);
        const leaderById = Object.fromEntries((leaders ?? []).map(l => [l.id, l.name]));
        rawProjects.forEach(p => {
          if (p.leader_id && leaderById[p.leader_id]) leaderMap[p.id] = leaderById[p.leader_id];
        });
      }
    }
  }

  const active = (projects ?? []).filter(p => !["cerrado", "cancelado"].includes(p.status));
  const closed = (projects ?? []).filter(p => ["cerrado", "cancelado"].includes(p.status));

  function ProjectCard({ p }: { p: NonNullable<typeof projects>[0] }) {
    const stepIdx = getStepIdx(p.status);
    const pct = STEPS.length > 1 ? (stepIdx / (STEPS.length - 1)) * 100 : 0;
    const leaderName = leaderMap[p.id] ?? (p.owner as { name?: string } | null)?.name ?? "—";
    const startDate = p.start_date
      ? new Date(p.start_date).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
      : null;

    return (
      <Link href={`/portal/proyectos/${p.id}`} className="block">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-pink-200 hover:shadow-md transition-all cursor-pointer">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">{p.name}</h3>
              <p className="text-xs text-gray-400 mt-1">
                Líder: <span className="font-medium text-gray-600">{leaderName}</span>
                {startDate && <span className="ml-3">Inicio: <span className="font-medium text-gray-600">{startDate}</span></span>}
              </p>
            </div>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABEL[p.status] ?? p.status}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct}%`, background: "#C8007A" }} />
            </div>
            <div className="flex justify-between">
              {STEPS.map((label, i) => (
                <span key={label} className="text-[9px] font-medium" style={{ color: i <= stepIdx ? "#C8007A" : "#D1D5DB" }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Client note preview */}
          {p.client_notes && (
            <div className="rounded-lg px-3 py-2 text-xs mt-2" style={{ background: "#FFF0F8", borderLeft: "3px solid #C8007A" }}>
              <span className="font-semibold" style={{ color: "#C8007A" }}>Actualización: </span>
              <span className="text-gray-600">{String(p.client_notes).slice(0, 80)}{String(p.client_notes).length > 80 ? "…" : ""}</span>
            </div>
          )}

          <p className="text-xs mt-3 font-medium" style={{ color: "#C8007A" }}>Ver detalle →</p>
        </div>
      </Link>
    );
  }

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
            {active.map(p => <ProjectCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-2">
            {closed.map(p => (
              <Link key={p.id} href={`/portal/proyectos/${p.id}`} className="block">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{leaderMap[p.id] ?? (p.owner as { name?: string } | null)?.name ?? "—"}</p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
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
