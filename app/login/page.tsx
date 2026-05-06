"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-violet-50 to-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-violet-900 tracking-tight">Spingarn</h1>
          <p className="text-violet-500 text-xs font-medium tracking-widest uppercase mt-1">
            Integrated Business Consulting
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-violet-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
              <p className="text-gray-500 text-sm">
                Enviamos un enlace de acceso a <span className="font-medium text-gray-700">{email}</span>.
                <br />Haz clic en el enlace para ingresar.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="mt-6 text-sm text-violet-600 hover:underline"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Bienvenido</h2>
              <p className="text-gray-400 text-sm mb-6">Ingresa tu correo para acceder a tu portal</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar enlace de acceso"}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-6">
                Sin contraseñas. Acceso seguro por correo.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Necesitas ayuda? Escríbenos a{" "}
          <a href="mailto:hub@spingarn.ec" className="text-violet-500 hover:underline">hub@spingarn.ec</a>
        </p>
      </div>
    </div>
  );
}
