import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import DeleteConsultationButton from "./DeleteConsultationButton";

export const dynamic = "force-dynamic";

type Consultation = {
  id: string; title: string; area: string; urgency: string; status: string;
  complexity: string | null; estimated_fee: number | null; estimated_credits: number | null;
  estimated_sla_hours: number | null; created_at: string; approved_at: string | null;
};

const AREA_LABELS: Record<string, string> = {
  legal: "Legal", tributaria: "Tributaria", financiera: "Financiera",
  ma: "M&A", cumplimiento: "Cumplimiento", estrategia: "Estrategia", otro: "General",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:                    { label: "Borrador",           color: "#6B7280", bg: "#F9FAFB" },
  submitted:                { label: "Enviada",            color: "#2563EB", bg: "#EFF6FF" },
  classified:               { label: "Clasificada",        color: "#7C3AED", bg: "#F5F3FF" },
  pending_client_approval:  { label: "Requiere tu aprobación", color: "#D97706", bg: "#FFFBEB" },
  approved:                 { label: "Aprobada",           color: "#059669", bg: "#ECFDF5" },
  in_progress:              { label: "En progreso",        color: "#C8007A", bg: "#FFF0F8" },
  internal_review:          { label: "En revisión",        color: "#7C3AED", bg: "#F5F3FF" },
  partner_review:           { label: "Revisión socio",     color: "#7C3AED", bg: "#F5F3FF" },
  answered:                 { label: "Respondida",         color: "#059669", bg: "#ECFDF5" },
  closed:                   { label: "Cerrada",            color: "#6B7280", bg: "#F9FAFB" },
  cancelled:                { label: "Cancelada",          color: "#EF4444", bg: "#FEF2F2" },
  requires_extra_approval:  { label: "Aprobación adicional", color: "#D97706", bg: "#FFFBEB" },
};

const COMPLEXITY_CONFIG: Record<string, { label: string; color: string }> = {
  simple:               { label: "Simple",           color: "#059669" },
  media:                { label: "Media",             color: "#D97706" },
  compleja:             { label: "Compleja",          color: "#DC2626" },
  cotizacion_manual:    { label: "Cotización manual", color: "#7C3AED" },
  requiere_reunion:     { label: "Requiere reunión",  color: "#2563EB" },
  requiere_socio_senior:{ label: "Socio senior",      color: "#9D174D" },
};

const URGENCY_DOT: Record<string, string> = {
  baja: "#9CA3AF", media: "#D97706", alta: "#EF4444", critica: "#7C2D12",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ConsultasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const admin = (() => {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
    return createAdmin(url, key);
  })();

  const [{ data: consultations }, { data: wallet }] = await Promise.all([
    admin.from("consultations").select("*").eq("client_id", profile.client_id).order("created_at", { ascending: false }),
    admin.from("client_wallet").select("*").eq("client_id", profile.client_id).maybeSingle(),
  ]);

  const all = (consultations ?? []) as Consultation[];
  const pendingApproval = all.filter(c => c.status === "pending_client_approval");
  const active = all.filter(c => ["approved", "in_progress", "internal_review", "partner_review"].includes(c.status));
  const answered = all.filter(c => c.status === "answered");
  const closed = all.filter(c => c.status === "closed");
  const cancelled = all.filter(c => c.status === "cancelled");
  const availableCredits = (wallet?.balance_credits ?? 0) - (wallet?.reserved_credits ?? 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Consultas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Seguimiento de todas tus consultas profesionales</p>
        </div>
        <Link
          href="/portal/consultas/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "#C8007A" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva consulta
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pendiente aprobación", value: pendingApproval.length, accent: "#D97706", bg: "#FFFBEB", icon: "⏳" },
          { label: "En progreso",          value: active.length,          accent: "#C8007A", bg: "#FFF0F8", icon: "⚙️" },
          { label: "Respondidas",          value: answered.length,        accent: "#059669", bg: "#ECFDF5", icon: "✅" },
          { label: "Créditos disponibles", value: availableCredits,       accent: "#7C3AED", bg: "#F5F3FF", icon: "💎" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4" style={{ background: s.bg, borderColor: `${s.accent}22` }}>
            <span className="text-lg">{s.icon}</span>
            <p className="text-2xl font-bold mt-1" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending approval — highlighted section */}
      {pendingApproval.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Requieren tu aprobación
          </p>
          <div className="space-y-3">
            {pendingApproval.map(c => <ConsultationCard key={c.id} c={c} highlight />)}
          </div>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">En progreso</p>
          <div className="space-y-3">
            {active.map(c => <ConsultationCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Answered */}
      {answered.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Respondidas</p>
          <div className="space-y-3">
            {answered.map(c => <ConsultationCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Closed */}
      {closed.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Cerradas</p>
          <div className="space-y-3">
            {closed.map(c => <ConsultationCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Cancelled — with delete option */}
      {cancelled.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-400 mb-3">Canceladas</p>
          <div className="space-y-3">
            {cancelled.map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ConsultationCard c={c} />
                </div>
                <DeleteConsultationButton id={c.id} title={c.title} />
              </div>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-base font-semibold text-gray-700 mb-1">Aún no tienes consultas</p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            Envía tu primera consulta y recibe una respuesta formal del equipo Spingarn.
          </p>
          <Link href="/portal/consultas/nueva" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#C8007A" }}>
            Crear primera consulta →
          </Link>
        </div>
      )}
    </div>
  );
}

function ConsultationCard({ c, highlight }: { c: Consultation; highlight?: boolean }) {
  const status = STATUS_CONFIG[c.status] ?? { label: c.status, color: "#6B7280", bg: "#F9FAFB" };
  const complexity = c.complexity ? COMPLEXITY_CONFIG[c.complexity] : null;

  return (
    <Link
      href={`/portal/consultas/${c.id}`}
      className={`block bg-white rounded-xl border p-4 hover:shadow-md transition-all group ${highlight ? "border-amber-200 shadow-sm" : "border-gray-100"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {AREA_LABELS[c.area] ?? c.area}
            </span>
            {complexity && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: complexity.color, background: `${complexity.color}15` }}>
                {complexity.label}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: URGENCY_DOT[c.urgency] ?? "#9CA3AF" }} />
              Urgencia {c.urgency}
            </span>
          </div>
          <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-pink-700 transition-colors">{c.title}</p>
          <p className="text-xs text-gray-400 mt-1">{fmtDate(c.created_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: status.color, background: status.bg }}>
            {status.label}
          </span>
          {c.estimated_fee != null && c.estimated_credits != null && (
            <p className="text-xs text-gray-400">
              {fmt(c.estimated_fee)} · {c.estimated_credits} crédito{c.estimated_credits !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
      {highlight && (
        <div className="mt-3 pt-3 border-t border-amber-100 flex items-center gap-2">
          <span className="text-amber-500 text-xs font-semibold">Aprueba o rechaza para continuar →</span>
        </div>
      )}
    </Link>
  );
}
