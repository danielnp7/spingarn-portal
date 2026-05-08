import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    propuesta: "bg-gray-100 text-gray-600",
    aprobado: "bg-blue-100 text-blue-700",
    en_ejecucion: "bg-amber-100 text-amber-700",
    entregado: "bg-green-100 text-green-700",
    cerrado: "bg-gray-100 text-gray-500",
    cancelado: "bg-red-100 text-red-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Vencido", color: "#EF4444", bg: "#FEF2F2" };
  if (diff === 0) return { label: "Hoy", color: "#D97706", bg: "#FFFBEB" };
  if (diff <= 7) return { label: `En ${diff} días`, color: "#D97706", bg: "#FFFBEB" };
  return { label: `En ${diff} días`, color: "#16A34A", bg: "#F0FDF4" };
}

export default async function PortalHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("name, client_id").eq("id", user.id).single();
  if (!profile?.client_id) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium text-gray-600 mb-2">Tu cuenta no está vinculada a ninguna empresa.</p>
        <p className="text-sm">Contacta a tu asesor de Spingarn para activar tu portal.</p>
      </div>
    );
  }

  const [
    { data: client },
    { data: projects },
    { data: invoices },
  ] = await Promise.all([
    supabase.from("clients").select("name, industry").eq("id", profile.client_id).single(),
    supabase
      .from("projects")
      .select("id, name, status, start_date, deadline, value, billed, collected, client_notes, owner:profiles!owner_id(name)")
      .eq("client_id", profile.client_id)
      .not("status", "in", "(cerrado,cancelado)")
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, amount, status, due_date")
      .eq("client_id", profile.client_id)
      .not("status", "in", "(cobrada,cancelada)"),
  ]);

  // Fetch gestor names
  const gestorMap: Record<string, string> = {};
  if (projects && projects.length > 0) {
    const { data: raw } = await supabase.from("projects").select("id, leader_id, assigned_to").in("id", projects.map(p => p.id));
    const ids = [...new Set((raw ?? []).flatMap(p => [p.leader_id, p.assigned_to].filter(Boolean)))] as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      const byId = Object.fromEntries((profs ?? []).map(p => [p.id, p.name]));
      (raw ?? []).forEach(p => { const id = p.leader_id ?? p.assigned_to; if (id && byId[id]) gestorMap[p.id] = byId[id]; });
    }
  }

  // Fetch ALL pending milestones for all active projects
  type Milestone = { id: string; title: string; due_date: string | null; status: string; project_id: string };
  type MilestonesByProject = Record<string, Milestone[]>;
  let milestonesByProject: MilestonesByProject = {};

  if (projects && projects.length > 0) {
    const { data: milestones } = await supabase
      .from("milestones")
      .select("id, title, due_date, status, project_id")
      .in("project_id", projects.map(p => p.id))
      .neq("status", "completado")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (milestones) {
      for (const m of milestones as Milestone[]) {
        if (!milestonesByProject[m.project_id]) milestonesByProject[m.project_id] = [];
        milestonesByProject[m.project_id].push(m);
      }
    }
  }

  // Stats
  const activeCount    = (projects ?? []).filter(p => ["aprobado", "en_ejecucion"].includes(p.status)).length;
  const totalValue     = (projects ?? []).reduce((s, p) => s + (p.value ?? 0), 0);
  const pendingAmount  = (invoices ?? []).reduce((s, i) => s + (i.amount ?? 0), 0);
  const overdueCount   = (invoices ?? []).filter(i => i.due_date && new Date(i.due_date) < new Date()).length;

  const STEP_KEYS = ["propuesta", "aprobado", "en_ejecucion", "entregado", "cerrado"];
  const STEPS_LEN = 5;

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #C8007A 0%, #7D0049 100%)" }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%, -30%)" }} />
        <p className="text-sm mb-1" style={{ color: "#FFD6EE" }}>Bienvenido al portal de</p>
        <h1 className="text-2xl font-bold mb-1">{client?.name}</h1>
        <p className="text-sm" style={{ color: "#FFD6EE" }}>{profile.name} · {client?.industry ?? "Cliente Spingarn"}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Proyectos activos" value={activeCount} icon="🗂" accent="#C8007A" />
        <StatCard label="Total invertido" value={fmt(totalValue)} icon="💰" accent="#7D0049" small />
        <StatCard
          label="Saldo pendiente"
          value={fmt(pendingAmount)}
          icon={overdueCount > 0 ? "⚠" : "📋"}
          accent={overdueCount > 0 ? "#EF4444" : "#D97706"}
          small
          alert={overdueCount > 0 ? `${overdueCount} vencida${overdueCount > 1 ? "s" : ""}` : undefined}
        />
        <StatCard label="En ejecución" value={(projects ?? []).filter(p => p.status === "en_ejecucion").length} icon="⚙" accent="#2563EB" />
      </div>

      {/* Main content — two columns on desktop */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Projects — full width rows, each with side cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Proyectos en curso</h2>
            <Link href="/portal/proyectos" className="text-xs hover:underline" style={{ color: "#C8007A" }}>Ver todos →</Link>
          </div>
          {(projects ?? []).length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-dashed border-gray-200">
              <p>No hay proyectos activos.</p>
              <Link href="/portal/solicitudes" className="text-sm hover:underline mt-2 inline-block" style={{ color: "#C8007A" }}>
                Solicitar un servicio →
              </Link>
            </div>
          ) : (
            (projects ?? []).slice(0, 5).map(p => {
              const stepIdx = Math.max(0, STEP_KEYS.indexOf(p.status));
              const pct = (stepIdx / (STEPS_LEN - 1)) * 100;
              const ownerName = (p.owner as { name?: string } | null)?.name ?? "—";
              const pMilestones = milestonesByProject[p.id] ?? [];

              return (
                <div key={p.id} className="grid sm:grid-cols-5 gap-3 items-start">

                  {/* Project card — 3/5 */}
                  <Link href={`/portal/proyectos/${p.id}`} className="sm:col-span-3 block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-pink-100 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Responsable: <span className="text-gray-600">{ownerName}</span>
                          {p.deadline && <span> · Entrega: <span className="text-gray-600">{fmtDate(p.deadline)}</span></span>}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColor(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#C8007A" }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      {["Propuesta", "Aprobado", "Ejecución", "Entregado", "Finalizado"].map((s, i) => (
                        <span key={s} className="text-[9px]" style={{ color: i <= stepIdx ? "#C8007A" : "#D1D5DB" }}>{s}</span>
                      ))}
                    </div>
                    {p.client_notes && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2">
                        <span className="text-sm flex-shrink-0">💬</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold mb-0.5" style={{ color: "#C8007A" }}>Mensaje de tu asesor</p>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{p.client_notes}</p>
                          <span className="text-xs font-medium mt-0.5 inline-block" style={{ color: "#C8007A" }}>Ver completo →</span>
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Milestones card — 2/5 */}
                  <div className="sm:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">🎯 Hitos pendientes</p>
                    {pMilestones.length === 0 ? (
                      <p className="text-xs text-gray-300 italic">Sin hitos registrados</p>
                    ) : (
                      <ul className="space-y-2">
                        {pMilestones.map(m => {
                          const urgency = m.due_date ? daysUntil(m.due_date) : null;
                          return (
                            <li key={m.id} className="flex items-start justify-between gap-2">
                              <span className="text-xs text-gray-700 leading-relaxed">{m.title}</span>
                              {m.due_date && urgency && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap" style={{ color: urgency.color, background: urgency.bg }}>
                                  {fmtDate(m.due_date)}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Right sidebar — 1/3 */}
        <div className="space-y-4">

          {/* Pending invoice alert */}
          {pendingAmount > 0 && (
            <div className={`rounded-xl border p-4 ${overdueCount > 0 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${overdueCount > 0 ? "text-red-600" : "text-amber-700"}`}>
                {overdueCount > 0 ? "⚠ Factura vencida" : "📋 Saldo pendiente"}
              </p>
              <p className={`text-xl font-bold ${overdueCount > 0 ? "text-red-700" : "text-amber-700"}`}>{fmt(pendingAmount)}</p>
              <p className="text-xs mt-1 text-gray-500">
                {(invoices ?? []).length} factura{(invoices ?? []).length !== 1 ? "s" : ""} pendiente{(invoices ?? []).length !== 1 ? "s" : ""}
                {overdueCount > 0 && ` · ${overdueCount} vencida${overdueCount > 1 ? "s" : ""}`}
              </p>
            </div>
          )}

          {/* Quick access */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Acceso rápido</p>
            <div className="flex flex-col gap-2">
              {[
                { href: "/portal/facturas",    icon: "🧾", label: "Mis Facturas",       sub: "Estado de pagos" },
                { href: "/portal/reunion",     icon: "📅", label: "Agendar Reunión",    sub: "Hablar con tu asesor" },
                { href: "/portal/documentos",  icon: "🔒", label: "Mis Documentos",     sub: "Archivos cifrados" },
                { href: "/portal/solicitudes", icon: "📋", label: "Solicitar Servicio", sub: "Nuevo requerimiento" },
                { href: "/portal/servicios",   icon: "💼", label: "Nuestros Servicios", sub: "Todo lo que hacemos" },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-pink-200 hover:shadow-sm transition-all">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.sub}</p>
                  </div>
                  <span className="ml-auto text-gray-300 text-xs">→</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent, small, alert }: {
  label: string; value: string | number; icon: string;
  accent: string; small?: boolean; alert?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        {alert && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">{alert}</span>
        )}
      </div>
      <p className={`font-bold text-gray-900 ${small ? "text-lg" : "text-2xl"}`} style={{ color: accent }}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
