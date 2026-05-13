import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import ApprovalPanel from "./ApprovalPanel";
import ConsultaMessages from "./ConsultaMessages";

export const dynamic = "force-dynamic";

const AREA_LABELS: Record<string, string> = {
  aviacion:              "Aviación y Regulatorio",
  contratacion_publica:  "Contratación Pública",
  laboral:               "Laboral y Seguridad Social",
  ma_energia:            "M&A y Energía",
  propiedad_intelectual: "Propiedad Intelectual",
  datos_personales:      "Protección de Datos Personales",
  tax_finance:           "Tax and Finance",
  tecnologia:            "Tecnología y Telecomunicaciones",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; description: string }> = {
  draft:                   { label: "Borrador",           color: "#6B7280", bg: "#F9FAFB", description: "Consulta en borrador." },
  submitted:               { label: "Enviada",            color: "#2563EB", bg: "#EFF6FF", description: "Tu consulta fue recibida. El equipo Spingarn la está revisando y clasificando." },
  classified:              { label: "Clasificada",        color: "#7C3AED", bg: "#F5F3FF", description: "Tu consulta fue clasificada. Estamos preparando la propuesta de honorarios." },
  pending_client_approval: { label: "Pendiente de aprobación", color: "#D97706", bg: "#FFFBEB", description: "Revisa la clasificación y autoriza el trabajo para que el equipo pueda comenzar." },
  approved:                { label: "Aprobada",           color: "#059669", bg: "#ECFDF5", description: "Tu aprobación fue registrada. El equipo ha sido notificado y comenzará a trabajar." },
  in_progress:             { label: "En progreso",        color: "#C8007A", bg: "#FFF0F8", description: "El equipo Spingarn está trabajando en tu consulta." },
  internal_review:         { label: "En revisión interna", color: "#7C3AED", bg: "#F5F3FF", description: "La respuesta está siendo revisada internamente." },
  partner_review:          { label: "Revisión de socio",  color: "#7C3AED", bg: "#F5F3FF", description: "El socio a cargo está revisando la respuesta final." },
  answered:                { label: "Respondida",         color: "#059669", bg: "#ECFDF5", description: "Tu consulta fue respondida. Revisa la respuesta formal del equipo." },
  closed:                  { label: "Cerrada",            color: "#6B7280", bg: "#F9FAFB", description: "Consulta finalizada y archivada." },
  cancelled:               { label: "Cancelada",          color: "#EF4444", bg: "#FEF2F2", description: "Esta consulta fue cancelada." },
  requires_extra_approval: { label: "Aprobación adicional", color: "#D97706", bg: "#FFFBEB", description: "El trabajo ejecutado superó el estimado original. Se requiere tu aprobación adicional." },
};

const COMPLEXITY_LABELS: Record<string, string> = {
  simple: "Simple", media: "Media", compleja: "Compleja",
  cotizacion_manual: "Cotización manual", requiere_reunion: "Requiere reunión",
  requiere_socio_senior: "Requiere socio senior",
};

const URGENCY_LABELS: Record<string, string> = {
  baja: "Baja", media: "Media", alta: "Alta", critica: "Crítica",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_RANK: Record<string, number> = {
  submitted: 0, classified: 1, pending_client_approval: 2,
  approved: 3, in_progress: 4, internal_review: 5,
  partner_review: 6, answered: 7, closed: 8,
};

const TIMELINE_STEPS = [
  { label: "Recibida",    minRank: 0 },
  { label: "Clasificada", minRank: 1 },
  { label: "Aprobada",    minRank: 3 },
  { label: "En progreso", minRank: 4 },
  { label: "Respondida",  minRank: 7 },
];

export default async function ConsultaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("client_id, name").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const admin = (() => {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s/g, "");
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");
    return createAdmin(url, key);
  })();

  const { data: consultation } = await admin
    .from("consultations")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.client_id)
    .single();

  if (!consultation) redirect("/portal/consultas");

  const [{ data: approvals }, { data: response }, { data: wallet }] = await Promise.all([
    admin.from("consultation_approvals").select("*").eq("consultation_id", id).order("approved_at", { ascending: false }),
    admin.from("consultation_responses").select("*").eq("consultation_id", id).eq("status", "sent").maybeSingle(),
    admin.from("client_wallet").select("*").eq("client_id", profile.client_id).maybeSingle(),
  ]);

  const status = STATUS_CONFIG[consultation.status] ?? { label: consultation.status, color: "#6B7280", bg: "#F9FAFB", description: "" };
  const currentRank = STATUS_RANK[consultation.status] ?? 0;
  const isCancelled = consultation.status === "cancelled";

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Back + header */}
      <div>
        <Link href="/portal/consultas" className="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1 w-fit">
          ← Mis consultas
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {AREA_LABELS[consultation.area] ?? consultation.area}
              </span>
              <span className="text-xs text-gray-400">Urgencia {URGENCY_LABELS[consultation.urgency] ?? consultation.urgency}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">{fmtDate(consultation.created_at)}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{consultation.title}</h1>
          </div>
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ color: status.color, background: status.bg }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Timeline progress (not for cancelled) */}
      {!isCancelled && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-0">
            {TIMELINE_STEPS.map((step, idx) => {
              const done = currentRank >= step.minRank;
              const lineActive = idx < TIMELINE_STEPS.length - 1 && currentRank >= TIMELINE_STEPS[idx + 1].minRank;
              const last = idx === TIMELINE_STEPS.length - 1;
              return (
                <div key={step.label} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                      style={done
                        ? { background: "#C8007A", borderColor: "#C8007A", color: "white" }
                        : { background: "white", borderColor: "#E5E7EB", color: "#9CA3AF" }
                      }>
                      {done ? "✓" : idx + 1}
                    </div>
                    <p className="text-[9px] mt-1 text-center whitespace-nowrap font-medium"
                      style={{ color: done ? "#C8007A" : "#9CA3AF" }}>
                      {step.label}
                    </p>
                  </div>
                  {!last && (
                    <div className="flex-1 h-0.5 mx-1 mb-4" style={{ background: lineActive ? "#C8007A" : "#E5E7EB" }} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">{status.description}</p>
        </div>
      )}

      {/* Approval panel (interactive client component) */}
      {consultation.status === "pending_client_approval" && (
        <ApprovalPanel
          consultationId={id}
          title={consultation.title}
          complexity={consultation.complexity}
          estimatedFee={consultation.estimated_fee}
          estimatedCredits={consultation.estimated_credits}
          estimatedHours={consultation.estimated_hours}
          estimatedSlaHours={consultation.estimated_sla_hours}
          classificationNote={consultation.classification_note}
          walletBalance={(wallet?.balance_credits ?? 0) - (wallet?.reserved_credits ?? 0)}
          creditUnitUsd={wallet?.credit_unit_usd ?? 75}
        />
      )}

      {/* Formal response */}
      {response && (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-green-100" style={{ background: "#ECFDF5" }}>
            <p className="text-sm font-bold text-green-800 flex items-center gap-2">
              <span>✅</span> Respuesta formal del equipo Spingarn
            </p>
          </div>
          <div className="p-5 space-y-4">
            {response.executive_summary && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Resumen ejecutivo</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response.executive_summary}</p>
              </div>
            )}
            {response.technical_analysis && (
              <div className="pt-4 border-t border-gray-50">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Análisis técnico</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response.technical_analysis}</p>
              </div>
            )}
            {response.risks && (
              <div className="pt-4 border-t border-gray-50">
                <p className="text-xs font-bold uppercase tracking-wide text-red-400 mb-2">⚠ Riesgos identificados</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response.risks}</p>
              </div>
            )}
            {response.recommendation && (
              <div className="pt-4 border-t border-gray-50">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Recomendación</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response.recommendation}</p>
              </div>
            )}
            {response.next_steps && (
              <div className="pt-4 border-t border-gray-50">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Próximos pasos sugeridos</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response.next_steps}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consultation detail */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Descripción de la consulta</p>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{consultation.description}</p>
      </div>

      {/* Classification info */}
      {consultation.complexity && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Clasificación del equipo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Complejidad",  value: COMPLEXITY_LABELS[consultation.complexity] ?? consultation.complexity },
              { label: "Honorario est.", value: consultation.estimated_fee != null ? fmt(consultation.estimated_fee) : "—" },
              { label: "Créditos est.", value: consultation.estimated_credits != null ? `${consultation.estimated_credits} crédito${consultation.estimated_credits !== 1 ? "s" : ""}` : "—" },
              { label: "SLA est.",     value: consultation.estimated_sla_hours != null ? `${consultation.estimated_sla_hours}h` : "—" },
            ].map(d => (
              <div key={d.label}>
                <p className="text-xs text-gray-400 mb-0.5">{d.label}</p>
                <p className="text-sm font-semibold text-gray-800">{d.value}</p>
              </div>
            ))}
          </div>
          {consultation.classification_note && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">Nota del clasificador</p>
              <p className="text-xs text-gray-600 leading-relaxed">{consultation.classification_note}</p>
              <p className="text-[10px] text-gray-400 mt-2 italic">
                Esta clasificación fue generada con asistencia de IA y será verificada por el equipo consultor asignado.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Attachments uploaded with consultation */}
      {Array.isArray(consultation.attachments) && consultation.attachments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Archivos adjuntos</p>
          <div className="space-y-2">
            {(consultation.attachments as { name: string; url: string; size: number; type: string }[]).map((f, i) => {
              const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
              const icon = ext === "pdf" ? "📄" : ["doc","docx"].includes(ext) ? "📝" : ["xls","xlsx"].includes(ext) ? "📊" : ["jpg","jpeg","png","webp"].includes(ext) ? "🖼" : "📎";
              const sizeStr = f.size < 1048576 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / 1048576).toFixed(1)} MB`;
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-gray-700">{f.name}</p>
                    <p className="text-xs text-gray-400">{sizeStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Internal messaging */}
      <ConsultaMessages consultationId={id} />

      {/* Approval history */}
      {(approvals ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Historial de aprobaciones</p>
          <div className="space-y-3">
            {(approvals ?? []).map((a: { id: string; approval_type: string; credits_used: number | null; notes: string | null; approved_at: string }) => {
              const approvalLabel =
                a.approval_type === "credits" ? `Aprobado con ${a.credits_used} crédito${a.credits_used !== 1 ? "s" : ""}` :
                a.approval_type === "payment" ? "Aprobado con pago directo" :
                a.approval_type === "quote_request" ? "Solicitó cotización formal" :
                a.approval_type === "cancel" ? "Consulta cancelada" : "Aprobación adicional";
              return (
                <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{approvalLabel}</p>
                    {a.notes && <p className="text-xs text-gray-400 mt-0.5">{a.notes}</p>}
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(a.approved_at).toLocaleDateString("es-EC", { day: "numeric", month: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
