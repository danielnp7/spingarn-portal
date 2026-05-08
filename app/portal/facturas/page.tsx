import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

type InvoiceStatus = "pendiente" | "enviada" | "vencida" | "cobrada" | "cancelada";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  pendiente: { label: "Pendiente",   color: "#D97706", bg: "#FFFBEB" },
  enviada:   { label: "Enviada",     color: "#2563EB", bg: "#EFF6FF" },
  vencida:   { label: "Vencida",     color: "#DC2626", bg: "#FEF2F2" },
  cobrada:   { label: "Pagada",      color: "#16A34A", bg: "#F0FDF4" },
  cancelada: { label: "Cancelada",   color: "#9CA3AF", bg: "#F9FAFB" },
};

function daysUntil(d: string): string | null {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `Vencida hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`;
  if (diff === 0) return "Vence hoy";
  if (diff <= 7) return `Vence en ${diff} día${diff !== 1 ? "s" : ""}`;
  return null;
}

export default async function FacturasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("name, client_id").eq("id", user.id).single();
  if (!profile?.client_id) redirect("/portal");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount, status, due_date, paid_amount, iva_rate, retencion_ir_pct, retencion_iva_pct")
    .eq("client_id", profile.client_id)
    .order("due_date", { ascending: false });

  const all = invoices ?? [];

  const pending   = all.filter(i => ["pendiente", "enviada"].includes(i.status));
  const overdue   = all.filter(i => i.status === "vencida");
  const paid      = all.filter(i => i.status === "cobrada");

  const totalPending  = pending.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalOverdue  = overdue.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalPaid     = paid.reduce((s, i) => s + (i.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Facturas</h1>
        <p className="text-gray-400 text-sm mt-1">Historial de facturación y estado de pagos con Spingarn.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Por cobrar"
          amount={totalPending}
          count={pending.length}
          color="#D97706"
          bg="#FFFBEB"
          icon="📋"
        />
        <SummaryCard
          label="Facturas vencidas"
          amount={totalOverdue}
          count={overdue.length}
          color="#DC2626"
          bg="#FEF2F2"
          icon="⚠️"
        />
        <SummaryCard
          label="Total pagado"
          amount={totalPaid}
          count={paid.length}
          color="#16A34A"
          bg="#F0FDF4"
          icon="✅"
        />
      </div>

      {/* Alert for overdue */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
          <span className="text-red-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">
              Tienes {overdue.length} factura{overdue.length !== 1 ? "s" : ""} vencida{overdue.length !== 1 ? "s" : ""} por {fmt(totalOverdue)}
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              Por favor contáctanos para regularizar tu situación o escríbenos a tu asesor directamente.
            </p>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📄</p>
          <p className="font-medium text-gray-600">No hay facturas registradas</p>
          <p className="text-sm mt-1">Cuando se emita tu primera factura aparecerá aquí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="col-span-2">Estado</div>
            <div className="col-span-2">Vencimiento</div>
            <div className="col-span-3 text-right">Monto</div>
            <div className="col-span-3 text-right">Pagado</div>
            <div className="col-span-2 text-right">Saldo</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {all.map((inv, idx) => {
              const cfg = STATUS_CONFIG[(inv.status as InvoiceStatus)] ?? STATUS_CONFIG.pendiente;
              const amount   = inv.amount ?? 0;
              const paidAmt  = inv.paid_amount ?? 0;
              const balance  = Math.max(0, amount - paidAmt);
              const warning  = inv.due_date && ["pendiente", "enviada", "vencida"].includes(inv.status)
                ? daysUntil(inv.due_date)
                : null;

              return (
                <div key={inv.id}
                  className="grid grid-cols-12 gap-2 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
                >
                  {/* Status */}
                  <div className="col-span-2">
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Due date + warning */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-700">{fmtDate(inv.due_date)}</p>
                    {warning && (
                      <p className="text-[10px] mt-0.5 font-medium"
                        style={{ color: inv.status === "vencida" ? "#DC2626" : "#D97706" }}>
                        {warning}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="col-span-3 text-right">
                    <p className="text-sm font-semibold text-gray-900">{fmt(amount)}</p>
                    {inv.iva_rate && inv.iva_rate > 0 && (
                      <p className="text-[10px] text-gray-400">IVA {inv.iva_rate}%</p>
                    )}
                  </div>

                  {/* Paid */}
                  <div className="col-span-3 text-right">
                    <p className="text-sm text-gray-600">{fmt(paidAmt)}</p>
                  </div>

                  {/* Balance */}
                  <div className="col-span-2 text-right">
                    <p
                      className="text-sm font-bold"
                      style={{ color: balance > 0 ? (inv.status === "vencida" ? "#DC2626" : "#D97706") : "#16A34A" }}
                    >
                      {fmt(balance)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer totals */}
          <div className="grid grid-cols-12 gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
            <div className="col-span-4 text-xs font-semibold text-gray-500">
              {all.length} factura{all.length !== 1 ? "s" : ""} en total
            </div>
            <div className="col-span-3 text-right">
              <p className="text-xs text-gray-400">Total facturado</p>
              <p className="text-sm font-bold text-gray-900">{fmt(all.reduce((s, i) => s + (i.amount ?? 0), 0))}</p>
            </div>
            <div className="col-span-3 text-right">
              <p className="text-xs text-gray-400">Total cobrado</p>
              <p className="text-sm font-bold text-gray-900">{fmt(all.reduce((s, i) => s + (i.paid_amount ?? 0), 0))}</p>
            </div>
            <div className="col-span-2 text-right">
              <p className="text-xs text-gray-400">Saldo total</p>
              <p className="text-sm font-bold" style={{ color: "#D97706" }}>
                {fmt(all.reduce((s, i) => s + Math.max(0, (i.amount ?? 0) - (i.paid_amount ?? 0)), 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        <strong>¿Tienes dudas sobre una factura?</strong> Comunícate directamente con tu asesor o escríbenos a{" "}
        <a href="mailto:contacto@spingarn.ec" className="underline">contacto@spingarn.ec</a>.
      </div>
    </div>
  );
}

function SummaryCard({ label, amount, count, color, bg, icon }: {
  label: string; amount: number; count: number; color: string; bg: string; icon: string;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color, background: bg }}>
          {count} factura{count !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{fmt(amount)}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
