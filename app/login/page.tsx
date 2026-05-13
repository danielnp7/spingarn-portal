"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    const supabase = createClient();

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Correo o contraseña incorrectos.");
      else router.push("/portal");
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FFF0F8 0%, #FAFAFA 60%, #fff 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image src="/logo.png" alt="Spingarn" width={160} height={56} className="mx-auto object-contain" />
          <p className="text-xs font-medium tracking-widest uppercase mt-3" style={{ color: "#C8007A" }}>
            Portal de Clientes
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF0F8" }}>
                <svg className="w-7 h-7" style={{ color: "#C8007A" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="mt-6 text-sm hover:underline"
                style={{ color: "#C8007A" }}
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Bienvenido</h2>
              <p className="text-gray-400 text-sm mb-6">
                {mode === "password" ? "Ingresa tus credenciales para acceder" : "Ingresa tu correo para recibir un enlace de acceso"}
              </p>

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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none transition"
                    style={{ outline: "none" }}
                    onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
                    onBlur={e => e.target.style.boxShadow = "none"}
                  />
                </div>

                {mode === "password" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none transition"
                      onFocus={e => e.target.style.boxShadow = "0 0 0 2px #C8007A40"}
                      onBlur={e => e.target.style.boxShadow = "none"}
                    />
                  </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  style={{ background: "#C8007A" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#A3005F")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#C8007A")}
                >
                  {loading ? "Ingresando..." : mode === "password" ? "Ingresar" : "Enviar enlace de acceso"}
                </button>
              </form>

              <button
                onClick={() => { setMode(mode === "password" ? "otp" : "password"); setError(""); }}
                className="w-full text-xs hover:underline text-center mt-4"
                style={{ color: "#C8007A" }}
              >
                {mode === "password" ? "Prefiero recibir un enlace por correo" : "Ingresar con contraseña"}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          ¿No tienes cuenta?{" "}
          <a href="/signup" className="font-semibold hover:underline" style={{ color: "#C8007A" }}>Créala gratis</a>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          ¿Necesitas ayuda? Escríbenos a{" "}
          <a href="mailto:hub@spingarn.ec" className="hover:underline" style={{ color: "#C8007A" }}>hub@spingarn.ec</a>
        </p>
      </div>
    </div>
  );
}
