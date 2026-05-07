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

  const { data: client } = await supabase.from("clients").select("name, industry").eq("id", profile.client_id).single();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, start_date, client_notes, owner:profiles!owner_id(name)")
    .eq("client_id", profile.client_id)
    .not("status", "in", "(cerrado,cancelado)")
    .order("created_at", { ascending: false });

  // Resolve gestor names
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

  const activeCount = projects?.filter(p => ["aprobado", "en_ejecucion"].includes(p.status)).length ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #C8007A 0%, #7D0049 100%)" }}>
        <p className="text-sm mb-1" style={{ color: "#FFD6EE" }}>Bienvenido al portal de</p>
        <h1 className="text-2xl font-bold mb-1">{client?.name}</h1>
        <p className="text-sm" style={{ color: "#FFD6EE" }}>{profile.name} · {client?.industry ?? "Cliente Spingarn"}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Proyectos activos", value: activeCount, color: "#C8007A" },
          { label: "En ejecución", value: projects?.filter(p => p.status === "en_ejecucion").length ?? 0, color: "#F59E0B" },
          { label: "Proyectos totales", value: projects?.length ?? 0, color: "#1A1A1A" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Proyectos en curso</h2>
          <Link href="/portal/proyectos" className="text-xs hover:underline" style={{ color: "#C8007A" }}>Ver todos →</Link>
        </div>
        <div className="space-y-3">
          {(projects ?? []).slice(0, 5).map(p => {
            const STEP_KEYS = ["propuesta", "aprobado", "en_ejecucion", "entregado", "cerrado"];
            const STEPS = ["Propuesta", "Aprobado", "En Ejecución", "Entregado", "Finalizado"];
            const stepIdx = Math.max(0, STEP_KEYS.indexOf(p.status));
            const pct = (stepIdx / (STEPS.length - 1)) * 100;
            const ownerName = (p.owner as { name?: string } | null)?.name ?? "—";
            const gestorName = gestorMap[p.id] ?? "—";
            return (
              <Link key={p.id} href={`/portal/proyectos/${p.id}`} style={{ display: "block", textDecoration: "none" }}>
                <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #F3F4F6", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: "#111827", fontSize: 14, margin: 0 }}>{p.name}</p>
                      <p style={{ color: "#9CA3AF", fontSize: 11, margin: "3px 0 0" }}>
                        Responsable: <strong style={{ color: "#6B7280" }}>{ownerName}</strong>
                        <span style={{ marginLeft: 10 }}>Gestor: <strong style={{ color: "#6B7280" }}>{gestorName}</strong></span>
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`} style={{ flexShrink: 0 }}>
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#C8007A", borderRadius: 99 }} />
                  </div>
                </div>
              </Link>
            );
          })}
          {(projects ?? []).length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-dashed border-gray-200">
              <p>No hay proyectos activos en este momento.</p>
              <Link href="/portal/solicitudes" className="text-sm hover:underline mt-2 inline-block" style={{ color: "#C8007A" }}>
                ¿Tienes un nuevo requerimiento? Solicítalo aquí →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Acceso rápido</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/portal/documentos"
            className="rounded-xl p-5 border hover:shadow-md transition-all flex items-start gap-3"
            style={{ background: "#FFF0F8", borderColor: "#FFD6EE" }}>
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-semibold text-sm mb-0.5" style={{ color: "#7D0049" }}>Mis Documentos</p>
              <p className="text-xs" style={{ color: "#A3005F" }}>Archivos cifrados y acceso exclusivo a tu empresa.</p>
            </div>
          </Link>
          <Link href="/portal/solicitudes"
            className="rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all flex items-start gap-3 bg-white">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-sm text-gray-800 mb-0.5">Solicitar Servicio</p>
              <p className="text-xs text-gray-500">Envíanos un requerimiento y tu asesor lo atenderá.</p>
            </div>
          </Link>
          <Link href="/portal/servicios"
            className="rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all flex items-start gap-3 bg-white">
            <span className="text-2xl">💼</span>
            <div>
              <p className="font-semibold text-sm text-gray-800 mb-0.5">Nuestros Servicios</p>
              <p className="text-xs text-gray-500">Descubre todo lo que Spingarn puede hacer por ti.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
