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
    .select("id, name, status, deadline, client_notes, area:areas(name), owner:profiles!owner_id(name)")
    .eq("client_id", profile.client_id)
    .not("status", "in", "(cerrado,cancelado)")
    .order("created_at", { ascending: false });

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
          {(projects ?? []).slice(0, 5).map(p => (
            <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(p.area as { name?: string } | null)?.name ?? "—"} · Asesor: {(p.owner as { name?: string } | null)?.name?.split(" ")[0] ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {p.deadline && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {new Date(p.deadline).toLocaleDateString("es-EC", { day: "numeric", month: "short" })}
                  </span>
                )}
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                  {statusLabel(p.status)}
                </span>
              </div>
            </div>
          ))}
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

      {/* CTA */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/portal/solicitudes"
          className="rounded-xl p-5 transition-colors group border"
          style={{ background: "#FFF0F8", borderColor: "#FFD6EE" }}>
          <p className="font-semibold mb-1" style={{ color: "#7D0049" }}>Solicitar nuevo servicio</p>
          <p className="text-sm" style={{ color: "#A3005F" }}>Envíanos un requerimiento y tu asesor lo atenderá a la brevedad.</p>
        </Link>
        <Link href="/portal/servicios"
          className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5 transition-colors group">
          <p className="font-semibold text-gray-800 mb-1">Conoce nuestros servicios</p>
          <p className="text-sm text-gray-500">Descubre todo lo que Spingarn puede hacer por tu empresa.</p>
        </Link>
      </div>
    </div>
  );
}
