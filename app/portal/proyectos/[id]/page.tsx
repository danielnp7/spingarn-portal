import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STEPS = [
  { key: "propuesta", label: "Propuesta" },
  { key: "aprobado", label: "Aprobado" },
  { key: "en_ejecucion", label: "En Ejecución" },
  { key: "entregado", label: "Entregado" },
  { key: "cerrado", label: "Finalizado" },
];

function getStepIdx(status: string) {
  const idx = STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
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

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const [{ data: p }, { data: milestones }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, description, client_notes, value, billed, collected, start_date, deadline, leader_id, assigned_to, owner:profiles!owner_id(name), area:areas(name)")
      .eq("id", id)
      .eq("client_id", profile.client_id)
      .single(),
    supabase
      .from("milestones")
      .select("id, title, description, due_date, status, order")
      .eq("project_id", id)
      .order("order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!p) notFound();

  type Milestone = { id: string; title: string; description?: string; due_date?: string; status: string; order: number };
  const milestoneList: Milestone[] = (milestones ?? []) as Milestone[];

  // Resolve gestor (leader_id → assigned_to) and responsable (owner)
  const gestorId = (p as typeof p & { leader_id?: string; assigned_to?: string }).leader_id
    ?? (p as typeof p & { assigned_to?: string }).assigned_to;
  let gestorName = "—";
  if (gestorId) {
    const { data: g } = await supabase.from("profiles").select("name").eq("id", gestorId).single();
    if (g) gestorName = g.name;
  }

  const stepIdx = getStepIdx(p.status);
  const ownerName = (p.owner as { name?: string } | null)?.name ?? "—";
  const area = (p.area as { name?: string } | null)?.name ?? "—";
  const pending = Math.max(0, (p.billed ?? 0) - (p.collected ?? 0));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/portal/proyectos" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        ← Volver a proyectos
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{p.name}</h1>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusColor(p.status)}`}>
            {statusLabel(p.status)}
          </span>
        </div>
        <p className="text-sm text-gray-400">{area} · Responsable: {ownerName} · Gestor: {gestorName}</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Progreso del Proyecto</h2>
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex flex-col items-center flex-1 gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i < stepIdx ? "border-[#C8007A] bg-[#C8007A] text-white"
                : i === stepIdx ? "border-[#C8007A] bg-white text-[#C8007A]"
                : "border-gray-200 bg-white text-gray-300"
              }`}>
                {i < stepIdx ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${i <= stepIdx ? "text-[#C8007A]" : "text-gray-300"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%`, background: "#C8007A" }}
          />
        </div>
      </div>

      {/* Dates & Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Información del Proyecto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Fecha de inicio</p>
            <p className="text-sm font-medium text-gray-900">{fmtDate(p.start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Entrega estimada</p>
            <p className="text-sm font-medium text-gray-900">{fmtDate(p.deadline)}</p>
          </div>
        </div>
      </div>

      {/* Milestones */}
      {milestoneList.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Hitos del Proyecto</h2>
          <ol className="space-y-3">
            {milestoneList.map((m, i) => {
              const done = m.status === "completado";
              const inProgress = m.status === "en_progreso";
              return (
                <li key={m.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
                    done        ? "border-[#C8007A] bg-[#C8007A] text-white"
                    : inProgress ? "border-[#C8007A] bg-white text-[#C8007A]"
                    : "border-gray-200 bg-white text-gray-300"
                  }`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${done ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {m.title}
                      </p>
                      {m.due_date && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(m.due_date)}</span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                    )}
                    {inProgress && (
                      <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">En progreso</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Financials */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Resumen Financiero</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 p-3 rounded-xl" style={{ background: "#FFF0F8" }}>
            <p className="text-xs mb-0.5" style={{ color: "#A3005F" }}>Valor del Proyecto</p>
            <p className="text-2xl font-bold" style={{ color: "#C8007A" }}>{fmt(p.value ?? 0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-400 mb-0.5">Facturado</p>
            <p className="text-lg font-semibold text-gray-800">{fmt(p.billed ?? 0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50">
            <p className="text-xs text-gray-400 mb-0.5">Pagado</p>
            <p className="text-lg font-semibold text-green-700">{fmt(p.collected ?? 0)}</p>
          </div>
          {pending > 0 && (
            <div className="col-span-2 p-3 rounded-xl bg-amber-50">
              <p className="text-xs text-gray-400 mb-0.5">Pendiente de pago</p>
              <p className="text-lg font-semibold text-amber-700">{fmt(pending)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Client comments */}
      {(p as typeof p & { client_notes?: string }).client_notes && (
        <div className="rounded-2xl p-6 border" style={{ background: "#FFF0F8", borderColor: "#FFD6EE" }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: "#7D0049" }}>Actualización de tu asesor</h2>
          <p className="text-sm text-gray-700">{(p as typeof p & { client_notes?: string }).client_notes}</p>
        </div>
      )}
    </div>
  );
}
