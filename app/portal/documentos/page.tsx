"use client";
import { useState, useEffect, useRef } from "react";

type FileEntry = {
  name: string;
  id: string;
  metadata?: { size?: number; mimetype?: string };
  created_at?: string;
};

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: "📄", color: "#EF4444", bg: "#FEF2F2" };
  if (["doc", "docx"].includes(ext)) return { icon: "📝", color: "#2563EB", bg: "#EFF6FF" };
  if (["xls", "xlsx"].includes(ext)) return { icon: "📊", color: "#16A34A", bg: "#F0FDF4" };
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return { icon: "🖼", color: "#9333EA", bg: "#F5F3FF" };
  if (["zip", "rar", "7z"].includes(ext)) return { icon: "🗜", color: "#D97706", bg: "#FFFBEB" };
  if (["ppt", "pptx"].includes(ext)) return { icon: "📑", color: "#EA580C", bg: "#FFF7ED" };
  return { icon: "📎", color: "#6B7280", bg: "#F9FAFB" };
}

function displayName(raw: string) {
  return raw.replace(/^\d+_/, "");
}

export default function DocumentosPage() {
  const [files, setFiles]           = useState<FileEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const [dragOver, setDragOver]     = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal-documents");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      setError("No se pudo cargar la lista de archivos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFiles(); }, []);

  async function handleUpload(file: File) {
    if (uploading) return;
    setError(""); setSuccess("");
    setUploading(true); setUploadPct(10);
    const form = new FormData();
    form.append("file", file);
    try {
      setUploadPct(40);
      const res = await fetch("/api/portal-documents", { method: "POST", body: form });
      setUploadPct(85);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al subir"); return; }
      setUploadPct(100);
      setSuccess(`"${file.name}" subido correctamente.`);
      await loadFiles();
    } catch {
      setError("Error de conexión al subir el archivo.");
    } finally {
      setUploading(false); setUploadPct(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(file: FileEntry) {
    setDownloading(file.name);
    try {
      const res = await fetch(`/api/portal-documents/download?path=${encodeURIComponent(file.name)}`);
      const data = await res.json();
      if (!res.ok || !data.url) { setError(data.error ?? "Error al descargar"); return; }
      window.open(data.url, "_blank");
    } catch {
      setError("Error al generar el enlace de descarga.");
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(file: FileEntry) {
    if (!confirm(`¿Eliminar "${displayName(file.name)}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch("/api/portal-documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.name }),
      });
      if (res.ok) { setSuccess("Archivo eliminado."); await loadFiles(); }
      else { const d = await res.json(); setError(d.error ?? "Error al eliminar"); }
    } catch { setError("Error de conexión."); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Documentos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Entregables, contratos y archivos de tus proyectos</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "#C8007A" }}
        >
          <span>↑</span> Subir archivo
        </button>
        <input ref={inputRef} type="file" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
      </div>

      {/* Privacy banner */}
      <div className="rounded-2xl border p-4 flex gap-3" style={{ background: "#FFF0F8", borderColor: "#FFD6EE" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base" style={{ background: "#C8007A" }}>
          <span style={{ filter: "invert(1)" }}>🔒</span>
        </div>
        <div className="space-y-1 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#C8007A" }}>
            Zona de privacidad garantizada
          </p>
          <p className="text-xs leading-relaxed text-gray-600">
            Tus archivos están <strong>cifrados en reposo (AES-256)</strong> y protegidos en tránsito con <strong>TLS 1.3</strong>.
            El acceso está restringido exclusivamente a tu empresa. Ningún otro cliente ni personal no autorizado
            puede visualizar o descargar tus documentos. Los enlaces de descarga expiran en <strong>60 minutos</strong>.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {["🏛 Custodio: Spingarn Integrated Business Consulting", "📋 Cumplimiento LOPDP Ecuador", "🔐 Acceso exclusivo por empresa"].map(t => (
              <span key={t} className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#FFD6EE", color: "#7D0049" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={() => setError("")} className="ml-3 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess("")} className="ml-3 text-green-400 hover:text-green-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm px-5 py-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Subiendo archivo…</span>
            <span className="text-gray-400">{uploadPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadPct}%`, background: "#C8007A" }} />
          </div>
        </div>
      )}

      {/* Drop zone — only when no files or as upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? "#C8007A" : "#E5E7EB",
          background: dragOver ? "#FFF0F8" : "white",
        }}
      >
        <div className="text-3xl mb-2">{dragOver ? "📥" : "📁"}</div>
        <p className="text-sm font-medium text-gray-600">
          {dragOver ? "Suelta el archivo aquí" : <>Arrastra un archivo o <span style={{ color: "#C8007A" }}>haz click para seleccionar</ span></>}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes, ZIP · Máximo 20 MB</p>
      </div>

      {/* File list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          Cargando archivos…
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-3xl mb-3">📂</p>
          <p className="text-sm font-medium text-gray-600">No hay documentos aún</p>
          <p className="text-xs text-gray-400 mt-1">Tu equipo Spingarn subirá aquí los entregables de tus proyectos, o puedes subir archivos tú mismo.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{files.length} archivo{files.length !== 1 ? "s" : ""}</p>
            <button onClick={loadFiles} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">↻ Actualizar</button>
          </div>
          <ul className="divide-y divide-gray-50">
            {files.map(file => {
              const { icon, color, bg } = fileIcon(file.name);
              const name = displayName(file.name);
              return (
                <li key={file.id ?? file.name} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: bg }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {file.metadata?.size ? fmt(file.metadata.size) : ""}
                      {file.created_at ? ` · ${fmtDate(file.created_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.name}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: color }}
                    >
                      {downloading === file.name ? "…" : "↓ Descargar"}
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition text-sm"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
