"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content: "Hola, soy tu asesor virtual de Spingarn. Estoy aquí para ayudarte a identificar oportunidades para tu empresa y responder cualquier pregunta sobre nuestros servicios. ¿En qué puedo ayudarte hoy?",
};

export default function PortalChatbot() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([WELCOME]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [leadReady, setLeadReady] = useState(false);
  const [sent, setSent]           = useState(false);
  const [sendingLead, setSendingLead] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.text) {
        setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
        if (data.leadReady) setLeadReady(true);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Hubo un problema al conectar. Por favor intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitLead() {
    setSendingLead(true);
    try {
      await fetch("/api/portal-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: messages }),
      });
      setSent(true);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Tu consulta ha sido enviada a nuestro equipo. Un asesor se pondrá en contacto contigo a la brevedad. ¡Gracias!",
      }]);
      setLeadReady(false);
    } catch {
      setSendingLead(false);
    }
  }

  const hasConversation = messages.length > 1;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{ background: "#C8007A" }}
        aria-label="Abrir asesor virtual"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-gray-100 bg-white">

          {/* Header */}
          <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: "#C8007A" }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Asesor Spingarn</p>
              <p className="text-xs" style={{ color: "#FFD6EE" }}>Consultor virtual · en línea</p>
            </div>
            {hasConversation && !sent && (
              <button
                onClick={submitLead}
                disabled={sendingLead}
                title="Enviar consulta a mi asesor"
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/20 text-white hover:bg-white/30 transition disabled:opacity-50"
              >
                {sendingLead ? "Enviando…" : "Contactar"}
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`} style={m.role === "user" ? { background: "#C8007A" } : {}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Lead CTA banner */}
          {leadReady && !sent && (
            <div className="px-4 py-2.5 border-t" style={{ background: "#FFF0F8", borderColor: "#FFD6EE" }}>
              <p className="text-xs mb-2" style={{ color: "#7D0049" }}>
                Un asesor puede darte seguimiento personalizado sobre este tema.
              </p>
              <button
                onClick={submitLead}
                disabled={sendingLead}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "#C8007A" }}
              >
                {sendingLead ? "Enviando consulta…" : "Enviar a mi asesor →"}
              </button>
            </div>
          )}

          {/* Input */}
          {!sent && (
            <div className="px-3 py-3 border-t border-gray-100 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Escribe tu pregunta..."
                disabled={loading}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 bg-gray-50"
                style={{ "--tw-ring-color": "#C8007A" } as React.CSSProperties}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                style={{ background: "#C8007A" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
