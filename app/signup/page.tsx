"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]           = useState("");
  const [company, setCompany]     = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim() || password.length < 8) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), company: company.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear cuenta"); setLoading(false); return; }
      router.push("/portal?nuevo=1");
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  }

  const valid = name.trim().length > 1 && company.trim().length > 1 && email.includes("@") && password.length >= 8;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #1a0010 0%, #2d0020 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center">
            <span className="text-white font-bold text-3xl tracking-tight">Spingarn</span>
            <span className="text-xs font-medium tracking-widest uppercase mt-1" style={{ color: "#C8007A" }}>
              Integrated Business Consulting
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #C8007A08 0%, transparent 100%)" }}>
            <h1 className="text-xl font-bold text-gray-900">Crear cuenta</h1>
            <p className="text-sm text-gray-400 mt-0.5">Accede a todos los servicios Spingarn desde tu portal</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre completo</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ej: María García"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                required autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Empresa</label>
              <input
                type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder="Ej: Mi Empresa S.A."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Correo electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                minLength={8} required
              />
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-amber-500 mt-1">Mínimo 8 caracteres</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={!valid || loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 mt-2"
              style={{ background: "#C8007A" }}
            >
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Al registrarte aceptas los{" "}
              <span className="underline cursor-pointer" style={{ color: "#C8007A" }}>términos de servicio</span>{" "}
              y la{" "}
              <span className="underline cursor-pointer" style={{ color: "#C8007A" }}>política de privacidad</span>{" "}
              de Spingarn.
            </p>
          </form>

          <div className="px-8 pb-6 text-center">
            <p className="text-sm text-gray-400">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: "#C8007A" }}>
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
