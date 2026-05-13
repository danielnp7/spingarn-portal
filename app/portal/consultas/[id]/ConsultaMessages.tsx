"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type MsgFile = { name: string; url: string; size: number; type: string; signedUrl: string | null };
type Message = {
  id: string; sender_type: "hub" | "client"; sender_name: string | null;
  content: string | null; files: MsgFile[]; created_at: string;
  read_by_hub_at: string | null;
};

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx"].includes(ext)) return "📊";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼";
  return "📎";
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("es-EC", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ConsultaMessages({ consultationId }: { consultationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/consultations/${consultationId}/messages`);
    if (res.ok) {
      const data: Message[] = await res.json();
      setMessages(data);
      setUnreadCount(data.filter(m => m.sender_type === "hub" && !m.read_by_hub_at).length);
    }
    setLoading(false);
  }, [consultationId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Open panel automatically if there are unread hub messages
  useEffect(() => {
    if (!loading && unreadCount > 0) setOpen(true);
  }, [loading, unreadCount]);

  async function send() {
    if (!content.trim() && files.length === 0) return;
    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("content", content.trim());
      for (const f of files) fd.append("files", f);
      const res = await fetch(`/api/consultations/${consultationId}/messages`, { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json(); setError(j.error ?? "Error al enviar"); return; }
      setContent("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } finally {
      setSending(false);
    }
  }

  const hubMessages = messages.filter(m => m.sender_type === "hub");
  const hasAnyMessage = messages.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header — collapsible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FFF0F8" }}>
            <span className="text-base">💬</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Mensajes del equipo Spingarn</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? "Cargando…" : hubMessages.length > 0
                ? `${hubMessages.length} solicitud${hubMessages.length !== 1 ? "es" : ""} de información`
                : "Sin mensajes aún"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "#C8007A" }}>
              {unreadCount} nuevo{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {/* Thread */}
          {!hasAnyMessage ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              El equipo Spingarn aún no ha enviado solicitudes de información.
            </div>
          ) : (
            <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
              {messages.map(msg => {
                const isHub = msg.sender_type === "hub";
                return (
                  <div key={msg.id} className={`flex ${isHub ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 space-y-2 ${
                      isHub
                        ? "text-gray-800 rounded-bl-sm border border-gray-200 bg-gray-50"
                        : "text-white rounded-br-sm"
                    }`}
                    style={isHub ? {} : { background: "#C8007A" }}>

                      {/* Header */}
                      <div className={`flex items-center gap-2 text-[10px] font-semibold ${isHub ? "text-gray-400" : "text-pink-200"}`}>
                        {isHub && <span className="text-[11px]">🏢</span>}
                        <span>{isHub ? (msg.sender_name ?? "Equipo Spingarn") : "Tú"}</span>
                        <span>·</span>
                        <span>{fmtTime(msg.created_at)}</span>
                        {isHub && (
                          <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: "#FFF0F8", color: "#C8007A" }}>
                            Solicitud de información
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      {msg.content && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {/* Files */}
                      {msg.files.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {msg.files.map((f, i) => (
                            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
                              isHub ? "bg-white border border-gray-200" : "bg-pink-700/30"
                            }`}>
                              <span>{fileIcon(f.name)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{f.name}</p>
                                <p className={`text-[10px] ${isHub ? "text-gray-400" : "text-pink-200"}`}>{fmtBytes(f.size)}</p>
                              </div>
                              {f.signedUrl && (
                                <a href={f.signedUrl} target="_blank" rel="noreferrer"
                                  className={`flex-shrink-0 font-semibold hover:underline ${isHub ? "text-pink-600" : "text-pink-200"}`}>
                                  Descargar
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Reply compose */}
          <div className="border-t border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500">Tu respuesta</p>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                    <span>{fileIcon(f.name)}</span>
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 ml-1">✕</button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
              rows={3}
              placeholder="Escribe tu respuesta o información solicitada… (Cmd+Enter para enviar)"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none outline-none leading-relaxed"
              style={{ boxShadow: "none" }}
              onFocus={e => e.target.style.borderColor = "#C8007A"}
              onBlur={e => e.target.style.borderColor = "#E5E7EB"}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                📎 Adjuntar archivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => {
                  const newFiles = Array.from(e.target.files ?? []);
                  setFiles(prev => [...prev, ...newFiles]);
                }}
              />
              <button
                onClick={send}
                disabled={sending || (!content.trim() && files.length === 0)}
                className="ml-auto px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: "#C8007A" }}
              >
                {sending ? "Enviando…" : "Enviar respuesta"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              El equipo Spingarn recibirá tu respuesta y los archivos adjuntos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
