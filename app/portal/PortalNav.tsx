"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/portal", label: "Inicio" },
  { href: "/portal/proyectos", label: "Mis Proyectos" },
  { href: "/portal/solicitudes", label: "Solicitar Servicio" },
  { href: "/portal/servicios", label: "Nuestros Servicios" },
];

export default function PortalNav({ userName, clientName, userId }: { userName: string; clientName: string; userId: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-6 h-16">
        {/* Logo */}
        <div className="flex-shrink-0">
          <span className="font-bold text-violet-900 text-lg tracking-tight">Spingarn</span>
          {clientName && (
            <span className="ml-2 text-xs text-gray-400 hidden sm:inline">/ {clientName}</span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === item.href
                  ? "bg-violet-100 text-violet-700"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-gray-500 hidden sm:block">{userName}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
