"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef } from "react";
import { usePushSubscription } from "@/lib/hooks/usePushSubscription";

const NAV = [
  { href: "/portal",               label: "Inicio" },
  { href: "/portal/proyectos",     label: "Mis Proyectos" },
  { href: "/portal/consultas",     label: "Mis Consultas" },
  { href: "/portal/facturas",      label: "Facturas" },
  { href: "/portal/mis-reuniones", label: "Mis Reuniones" },
  { href: "/portal/documentos",    label: "Documentos" },
  { href: "/portal/reunion",       label: "Agendar Reunión" },
  { href: "/portal/servicios",     label: "Nuestros Servicios" },
  { href: "/portal/planes",        label: "✨ Planes" },
];

const LS_MEETINGS_KEY = "portal_meetings_last_seen";

export default function PortalNav({
  userName, clientName, userId,
}: {
  userName: string; clientName: string; userId: string;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const bellRef  = useRef<HTMLButtonElement>(null);

  const { permission, error: pushError, loading: pushLoading, requestAndSubscribe } = usePushSubscription(!!userId);

  // Per-nav badges
  const [badges, setBadges] = useState<Record<string, number>>({});
  // Bell: any unread advisor response (aceptada / rechazada / contrapropuesta)
  const [bellCount, setBellCount] = useState(0);

  // Mark meetings as seen when visiting the page
  useEffect(() => {
    if (pathname === "/portal/mis-reuniones") {
      localStorage.setItem(LS_MEETINGS_KEY, new Date().toISOString());
      setBellCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    // 1. Meetings that need client action (contrapropuesta)
    supabase
      .from("meeting_requests")
      .select("id", { count: "exact", head: true })
      .eq("client_user_id", userId)
      .eq("status", "contrapropuesta")
      .then(({ count }) => {
        setBadges(prev => ({ ...prev, "/portal/mis-reuniones": count ?? 0 }));
      });

    // 2. Consultas pendientes de aprobación
    supabase
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .single()
      .then(({ data: prof }) => {
        if (!prof?.client_id) return;
        supabase
          .from("consultations")
          .select("id", { count: "exact", head: true })
          .eq("client_id", prof.client_id)
          .eq("status", "pending_client_approval")
          .then(({ count }) => {
            setBadges(prev => ({ ...prev, "/portal/consultas": count ?? 0 }));
          });
      });

    // 3. Overdue invoices badge on Facturas
    // We need client_id — fetch profile first
    supabase
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .single()
      .then(({ data: prof }) => {
        if (!prof?.client_id) return;
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("client_id", prof.client_id)
          .eq("status", "vencida")
          .then(({ count }) => {
            setBadges(prev => ({ ...prev, "/portal/facturas": count ?? 0 }));
          });
      });

    // 4. Bell: responses (aceptada / rechazada / contrapropuesta) since last seen
    const lastSeen = localStorage.getItem(LS_MEETINGS_KEY) ?? "1970-01-01T00:00:00Z";
    supabase
      .from("meeting_requests")
      .select("id", { count: "exact", head: true })
      .eq("client_user_id", userId)
      .in("status", ["aceptada", "rechazada", "contrapropuesta"])
      .gt("responded_at", lastSeen)
      .then(({ count }) => setBellCount(count ?? 0));
  }, [userId, pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-3 h-14">

        {/* Logo */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="flex flex-col leading-none">
            <span className="font-bold text-gray-900 text-base tracking-tight">Spingarn</span>
            <span className="text-[9px] font-medium tracking-widest uppercase" style={{ color: "#C8007A" }}>Portal</span>
          </div>
          {clientName && (
            <span className="text-[11px] text-gray-400 hidden md:inline border-l border-gray-200 pl-2 truncate max-w-[180px]">/ {clientName}</span>
          )}
        </div>

        {/* Nav items — scrollable with fade */}
        <div className="flex-1 relative overflow-hidden">
          <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {NAV.map(item => {
              const active     = pathname === item.href;
              const badgeCount = active ? 0 : (badges[item.href] ?? 0);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                  style={active ? { background: "#FFF0F8", color: "#C8007A" } : { color: "#6B7280" }}
                >
                  {item.label}
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          {/* Fade-out on right edge */}
          <div className="absolute top-0 right-0 h-full w-6 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, white)" }} />
        </div>

        {/* Right: wallet + bell + user + sign out */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Wallet / Credits — pill button, always visible */}
          <button
            onClick={() => router.push("/portal/wallet")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold transition-all hover:opacity-90 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #C8007A, #7D0049)" }}
            title="Mis Créditos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="hidden sm:inline">Créditos</span>
          </button>

          <button
            ref={bellRef}
            onClick={() => router.push("/portal/mis-reuniones")}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="Notificaciones"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {bellCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                {bellCount}
              </span>
            )}
          </button>

          {/* Push subscribe button (only when not granted/denied) */}
          {permission !== "granted" && permission !== "denied" && (
            <button
              onClick={requestAndSubscribe}
              disabled={pushLoading}
              title={pushLoading ? "Activando..." : "Activar notificaciones"}
              className="relative p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            </button>
          )}

          <span className="text-sm text-gray-500 hidden sm:block">{userName}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            Salir
          </button>
        </div>
      </div>
      {/* Push error toast */}
      {pushError && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-center">
          <p className="text-xs text-amber-700">{pushError.includes("iPhone") || pushError.includes("pantalla") ? "En iPhone: Safari → Compartir → Agregar a pantalla de inicio, luego activa notificaciones" : pushError}</p>
        </div>
      )}
    </header>
  );
}
