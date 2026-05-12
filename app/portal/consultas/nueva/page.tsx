"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const AREAS = [
  { value: "aviacion",              label: "Aviación y Regulatorio" },
  { value: "contratacion_publica",  label: "Contratación Pública" },
  { value: "laboral",               label: "Laboral y Seguridad Social" },
  { value: "ma_energia",            label: "M&A y Energía" },
  { value: "propiedad_intelectual", label: "Propiedad Intelectual" },
  { value: "datos_personales",      label: "Protección de Datos Personales" },
  { value: "tax_finance",           label: "Tax and Finance" },
  { value: "tecnologia",            label: "Tecnología y Telecomunicaciones" },
];

const URGENCIES = [
  { value: "baja",    label: "Baja",    sub: "sin plazo inmediato", multiplier: 0.8 },
  { value: "media",   label: "Media",   sub: "respuesta en días",   multiplier: 1.0 },
  { value: "alta",    label: "Alta",    sub: "respuesta urgente",   multiplier: 1.5 },
  { value: "critica", label: "Crítica", sub: "riesgo inmediato",    multiplier: 2.0 },
];

const URGENCY_MULTIPLIER: Record<string, number> = { baja: 0.8, media: 1.0, alta: 1.5, critica: 2.0 };

const COMPLEXITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  simple:                { label: "Simple",            color: "#059669", icon: "💬" },
  media:                 { label: "Media",             color: "#D97706", icon: "📋" },
  compleja:              { label: "Compleja",          color: "#DC2626", icon: "📊" },
  cotizacion_manual:     { label: "Cotización manual", color: "#7C3AED", icon: "📝" },
  requiere_reunion:      { label: "Requiere reunión",  color: "#2563EB", icon: "📅" },
  requiere_socio_senior: { label: "Socio senior",      color: "#9D174D", icon: "👤" },
};

type Preview = {
  complexity: string;
  estimated_credits: number;
  estimated_fee: number;
  estimated_sla_hours: number;
  confidence: string;
  note: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function NuevaConsultaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [urgency, setUrgency] = useState("media");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounced AI preview — fires when form has enough data
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!title || !area || description.length < 20) {
      setPreview(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/consultations/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, area, urgency, description }),
        });
        if (res.ok) setPreview(await res.json());
      } catch { /* silent */ } finally {
        setPreviewLoading(false);
      }
    }, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, area, urgency, description]);

  const valid = title.trim().length > 5 && area && description.trim().length > 20 && accepted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), area, urgency, description: description.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al enviar");
      const data = await res.json();
      router.push(`/portal/consultas/${data.id}?nuevo=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  const needsManualQuote = preview && ["cotizacion_manual", "requiere_reunion", "requiere_socio_senior"].includes(preview.complexity);
  const complexityInfo = preview ? COMPLEXITY_CONFIG[preview.complexity] : null;
  const urgMult = URGENCY_MULTIPLIER[urgency] ?? 1;
  const adjCredits = preview ? Math.max(1, Math.ceil(preview.estimated_credits * urgMult)) : 0;
  const adjFee     = preview ? Math.round(preview.estimated_fee * urgMult) : 0;
  const urgencyLabel = URGENCIES.find(u => u.value === urgency)?.label ?? urgency;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1">
          ← Volver
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nueva consulta</h1>
        <p className="text-sm text-gray-400 mt-0.5">El equipo Spingarn la revisará y clasificará. Recibirás una estimación antes de autorizar cualquier honorario.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Título */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Título <span className="text-red-500">*</span>
          </label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Revisión de contrato con proveedor internacional"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 bg-white"
            maxLength={200} required />
        </div>

        {/* Área */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Área <span className="text-red-500">*</span>
          </label>
          <select value={area} onChange={e => setArea(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-200" required>
            <option value="">Selecciona un área…</option>
            {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        {/* Urgencia */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Urgencia</label>
          <div className="grid grid-cols-4 gap-2">
            {URGENCIES.map(u => (
              <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
                className="text-center px-3 py-2.5 rounded-xl border text-sm transition-all"
                style={urgency === u.value
                  ? { borderColor: "#C8007A", background: "#FFF0F8", color: "#C8007A", fontWeight: 600 }
                  : { borderColor: "#E5E7EB", background: "white", color: "#374151" }}>
                <span className="block font-semibold text-xs">{u.label}</span>
                <span className="text-[10px] opacity-60">{u.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
            placeholder="Describe tu situación con detalle: contexto, documentos disponibles, lo que necesitas resolver, plazos relevantes…"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none leading-relaxed" required />
          <p className="text-xs text-gray-400 mt-1">{description.length} caracteres · mínimo 20</p>
        </div>

        {/* Documentos adjuntos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Documentos adjuntos <span className="text-gray-400 font-normal">(opcional)</span></label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-all"
          >
            <input ref={fileRef} type="file" multiple className="hidden"
              onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-500">Arrastra archivos aquí o <span style={{ color: "#C8007A" }} className="font-semibold">selecciona</span></p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes · máx. 10 MB por archivo</p>
          </div>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-50 text-xs text-gray-700">
                  <span className="truncate max-w-[80%]">📄 {f.name}</span>
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AI Preview */}
        {(previewLoading || preview) && (
          <div className="rounded-xl border overflow-hidden transition-all"
            style={{ borderColor: complexityInfo ? `${complexityInfo.color}40` : "#E5E7EB" }}>
            <div className="px-4 py-3 flex items-center gap-2 border-b"
              style={{ background: complexityInfo ? `${complexityInfo.color}08` : "#F9FAFB", borderColor: complexityInfo ? `${complexityInfo.color}20` : "#E5E7EB" }}>
              <span className="text-sm">✨</span>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Estimación automática</p>
              {previewLoading && <span className="ml-auto text-xs text-gray-400 animate-pulse">Analizando…</span>}
              {preview && !previewLoading && (
                <span className="ml-auto text-[10px] text-gray-400">
                  Confianza {preview.confidence}
                </span>
              )}
            </div>

            {previewLoading && !preview && (
              <div className="px-4 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                </div>
              </div>
            )}

            {preview && (
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{complexityInfo?.icon}</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: complexityInfo?.color }}>
                      {complexityInfo?.label ?? preview.complexity}
                    </p>
                    <p className="text-xs text-gray-500">{preview.note}</p>
                  </div>
                </div>
                {!needsManualQuote && (
                  <div className="pt-3 border-t border-gray-50 space-y-2">
                    {urgMult !== 1 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
                        <span>⚡</span>
                        <span>Urgencia <strong>{urgencyLabel}</strong>: ×{urgMult} sobre base — se aplica recargo de prioridad</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Honorario estimado</p>
                        <p className="text-sm font-bold text-gray-900">{fmt(adjFee)}</p>
                        {urgMult !== 1 && <p className="text-[10px] text-gray-300 line-through">{fmt(preview.estimated_fee)}</p>}
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Créditos</p>
                        <p className="text-sm font-bold text-gray-900">{adjCredits} crédito{adjCredits !== 1 ? "s" : ""}</p>
                        {urgMult !== 1 && <p className="text-[10px] text-gray-300 line-through">{preview.estimated_credits} cr</p>}
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Respuesta est.</p>
                        <p className="text-sm font-bold text-gray-900">{preview.estimated_sla_hours}h</p>
                      </div>
                    </div>
                  </div>
                )}
                {needsManualQuote && (
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-50">
                    Esta consulta requiere evaluación personalizada. El equipo te contactará con una propuesta de honorarios antes de iniciar.
                  </p>
                )}
                <p className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-50">
                  Estimación asistida por IA · sujeta a verificación por el equipo consultor asignado · no genera compromiso de pago.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Aviso importante</p>
          <p className="text-sm text-amber-800 leading-relaxed mb-3">
            Al enviar esta consulta, usted acepta que Spingarn revise la solicitud y clasifique su complejidad. <strong>La estimación mostrada es referencial</strong> y deberá ser verificada por el equipo consultor. En caso de requerir trabajo facturable, <strong>se solicitará su aprobación expresa antes de ejecutar cualquier servicio.</strong>
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: "#C8007A" }} />
            <span className="text-sm text-amber-800 font-medium">He leído y acepto los términos anteriores</span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={!valid || loading}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: "#C8007A" }}>
            {loading ? "Enviando…" : "Enviar consulta"}
          </button>
        </div>
      </form>
    </div>
  );
}
