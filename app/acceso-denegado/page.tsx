import Link from "next/link";

export default function AccesoDenegadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #FFF0F8 0%, #FAFAFA 60%, #fff 100%)" }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#FFF0F8" }}>
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso solo para clientes</h1>
        <p className="text-sm text-gray-500 mb-6">
          Este portal está destinado a los clientes de Spingarn.<br />
          Si eres del equipo, accede desde el Hub.
        </p>
        <Link
          href="https://hub.spingarn.ec"
          className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#C8007A" }}
        >
          Ir al Hub →
        </Link>
      </div>
    </div>
  );
}
