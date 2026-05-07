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
  if (["pdf"].includes(ext)) return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx"].includes(ext)) return "📊";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜";
  return "📎";
}

function displayName(raw: string) {
  // Strip the timestamp prefix added on upload (e.g. "1746123456789_archivo.pdf")
  return raw.replace(/^\d+_/, "");
}

export default function DocumentosPage() {
  const [files, setFiles]       = useState<FileEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

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
      setUploadPct(80);
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
    setDownloading(file.id ?? file.name);
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
    } catch {
      setError("Error de conexión.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dropRef.current?.classList.remove("border-pink-400", "bg-pink-50");
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="space-y-6">

      {/* Privacy banner — always visible */}
      <div className="rounded-2xl border p-4 flex gap-3" style={{ background: "#FFF0F8", borderColor: "#FFD6EE" }}>
        <span className="text-xl flex-shrink-0">🔒</span>
        <div className="space-y-1">
          <p className="text-sm font-semibold" style={{ color: "#7D0049" }}>
            Zona de documentos privados y protegidos
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "#9B0060" }}>
            Todos los archivos se almacenan <strong>cifrados en reposo (AES-256)</strong> y se transmiten bajo{" "}
            <strong>protocolo TLS 1.3</strong>. El acceso está restringido exclusivamente a tu empresa mediante
            credenciales únicas. Ningún otro cliente, ni personal no autorizado de la firma, puede visualizar
            o descargar tus documentos.
          </p>
          <p className="text-xs font-medium mt-1.5 pt-1.5 border-t" style={{ color: "#C8007A", borderColor: "#FFD6EE" }}>
            Custodio de datos: <strong>Spingarn Integrated Business Consulting</strong> · Cumplimiento LOPDP Ecuador ·
            Política de Privacidad disponible en <strong>Nuestros Servicios → Protección de Datos</strong>
          </p>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Documentos</h1>
        <p className="text-gray-400 text-sm mt-1">Entregables, contratos y archivos compartidos por tu equipo Spingarn.</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess("")} className="ml-3 text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {/* Upload zone */}
      <div
        ref={dropRef}
        onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add("border-pink-400", "bg-pink-50"); }}
        onDragLeave={() => dropRef.current?.classList.remove("border-pink-400", "bg-pink-50")}
        onDrop={onDrop}
        className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center transition-colors cursor-pointer"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        />
        {uploading ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-600">Subiendo archivo…</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadPct}%`, background: "#C8007A" }} />
            </div>
          </div>
        ) : (
          <>
            <p className="text-3xl mb-2">📁</p>
            <p className="text-sm font-medium text-gray-700">Arrastra un archivo aquí o <span style={{ color: "#C8007A" }}>haz click para seleccionar</span></p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes · Máximo 20 MB</p>
          </>
        )}
      </div>

      {/* File list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Archivos ({files.length})</h2>
          <button onClick={loadFiles} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">↻ Actualizar</button>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Cargando archivos…</div>
        ) : files.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-2xl mb-2">📂</p>
            <p className="text-sm text-gray-400">No hay archivos aún.</p>
            <p className="text-xs text-gray-300 mt-1">Tu equipo Spingarn subirá aquí los entregables de tus proyectos.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {files.map(file => (
              <li key={file.id ?? file.name} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                <span className="text-xl flex-shrink-0">{fileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName(file.name)}</p>
                  <p className="text-xs text-gray-400">
                    {file.metadata?.size ? fmt(file.metadata.size) : ""}
                    {file.created_at ? ` · ${fmtDate(file.created_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.id}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: "#C8007A" }}
                  >
                    {downloading === file.id ? "…" : "Descargar"}
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="text-xs px-2 py-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-300">
        Los enlaces de descarga son de uso único y expiran en 60 minutos por seguridad.
      </p>
    </div>
  );
}
