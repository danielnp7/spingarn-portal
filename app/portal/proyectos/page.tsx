import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STEPS = ["Propuesta", "Aprobado", "En Ejecución", "Entregado", "Finalizado"];
const STEP_KEYS = ["propuesta", "aprobado", "en_ejecucion", "entregado", "cerrado"];

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

  const rows = projects ?? [];

  // Fetch leader_id, assigned_to and resolve names separately
  const leaderMap: Record<string, string> = {};  // líder a cargo
  const ownerMap: Record<string, string> = {};   // responsable (partner)
  if (rows.length > 0) {
    const { data: raw } = await supabase
      .from("projects")
      .select("id, leader_id, assigned_to, owner_id")
      .in("id", rows.map(p => p.id));

    const allIds = [...new Set((raw ?? []).flatMap(p => [p.leader_id, p.assigned_to, p.owner_id].filter(Boolean)))] as string[];
    if (allIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", allIds);
      const byId = Object.fromEntries((profiles ?? []).map(l => [l.id, l.name]));
      (raw ?? []).forEach(p => {
        // Líder: leader_id → assigned_to
        const liderId = p.leader_id ?? p.assigned_to;
        if (liderId && byId[liderId]) leaderMap[p.id] = byId[liderId];
        // Responsable: owner_id
        if (p.owner_id && byId[p.owner_id]) ownerMap[p.id] = byId[p.owner_id];
      });
    }
  }

  const active = rows.filter(p => !["cerrado", "cancelado"].includes(p.status));
  const closed = rows.filter(p => ["cerrado", "cancelado"].includes(p.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Proyectos</h1>
        <p className="text-gray-400 text-sm mt-1">{rows.length} proyectos en total</p>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Activos</h2>
          <div className="space-y-3">
            {active.map(p => {
              const stepIdx = Math.max(0, STEP_KEYS.indexOf(p.status));
              const pct = (stepIdx / (STEPS.length - 1)) * 100;
              const leaderName = leaderMap[p.id] ?? "—";
              const ownerName = ownerMap[p.id] ?? (p.owner as { name?: string } | null)?.name ?? "—";
              const startDate = p.start_date
                ? new Date(p.start_date).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
                : null;
              const notes = p.client_notes as string | null;

              return (
                <Link key={p.id} href={`/portal/proyectos/${p.id}`} style={{ display: "block", textDecoration: "none" }}>
                  <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #F3F4F6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: "#111827", fontSize: 14, margin: 0 }}>{p.name}</p>
                        <p style={{ color: "#9CA3AF", fontSize: 12, margin: "4px 0 0" }}>
                          Responsable: <strong style={{ color: "#6B7280" }}>{ownerName}</strong>
                          <span style={{ marginLeft: 12 }}>Gestor: <strong style={{ color: "#6B7280" }}>{leaderName}</strong></span>
                          {startDate && <span style={{ marginLeft: 12 }}>Inicio: <strong style={{ color: "#6B7280" }}>{startDate}</strong></span>}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`} style={{ flexShrink: 0 }}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ height: 8, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#C8007A", borderRadius: 99, transition: "width 0.3s" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        {STEPS.map((label, i) => (
                          <span key={label} style={{ fontSize: 9, fontWeight: 500, color: i <= stepIdx ? "#C8007A" : "#D1D5DB", flex: 1, textAlign: "center" }}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Client note */}
                    {notes && (
                      <div style={{ background: "#FFF0F8", borderLeft: "3px solid #C8007A", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                        <span style={{ color: "#C8007A", fontWeight: 600 }}>Actualización: </span>
                        <span style={{ color: "#374151" }}>{notes.length > 100 ? notes.slice(0, 100) + "…" : notes}</span>
                      </div>
                    )}

                    <p style={{ color: "#C8007A", fontSize: 12, fontWeight: 500, marginTop: 10 }}>Ver detalle →</p>
                  </div>
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
              <Link key={p.id} href={`/portal/proyectos/${p.id}`} style={{ display: "block", textDecoration: "none" }}>
                <div style={{ background: "white", borderRadius: 12, padding: "12px 16px", border: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 16, opacity: 0.6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, color: "#374151", fontSize: 14, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                    <p style={{ color: "#9CA3AF", fontSize: 12, margin: "2px 0 0" }}>Responsable: {ownerMap[p.id] ?? "—"} · Gestor: {leaderMap[p.id] ?? "—"}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#9CA3AF", border: "1px dashed #E5E7EB", borderRadius: 16, background: "white" }}>
          No tienes proyectos registrados aún.
        </div>
      )}
    </div>
  );
}
