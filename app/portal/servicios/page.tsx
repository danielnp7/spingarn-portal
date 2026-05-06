export default function ServiciosPage() {
  const services = [
    {
      area: "M&A y Energía",
      color: "bg-blue-50 border-blue-200",
      icon: "⚡",
      description: "Asesoría en fusiones, adquisiciones y transacciones del sector energético.",
      services: ["Due diligence legal y financiero", "Estructuración de transacciones", "Negociación y cierre de deals", "Asesoría en energías renovables"],
    },
    {
      area: "Propiedad Intelectual",
      color: "bg-purple-50 border-purple-200",
      icon: "💡",
      description: "Protección y gestión estratégica de activos intelectuales.",
      services: ["Registro de marcas y patentes", "Contratos de licencia", "Defensa ante infracciones", "Valoración de activos intangibles"],
    },
    {
      area: "Aviación y Regulatorio",
      color: "bg-sky-50 border-sky-200",
      icon: "✈️",
      description: "Cumplimiento regulatorio y asesoría en el sector aeronáutico.",
      services: ["Licencias y permisos operativos", "Contratos de arrendamiento de aeronaves", "Cumplimiento DGAC", "Financiamiento aeronáutico"],
    },
    {
      area: "Protección de Datos Personales",
      color: "bg-green-50 border-green-200",
      icon: "🔒",
      description: "Cumplimiento de la Ley Orgánica de Protección de Datos (LOPDP).",
      services: ["Auditorías de privacidad", "Políticas de tratamiento de datos", "DPO externo", "Capacitaciones corporativas"],
    },
    {
      area: "Contratación Pública",
      color: "bg-amber-50 border-amber-200",
      icon: "🏛️",
      description: "Asesoría integral en procesos de contratación con el Estado.",
      services: ["Participación en procesos SERCOP", "Impugnaciones y recursos", "Contratos complementarios", "Auditorías de cumplimiento"],
    },
    {
      area: "Tecnología y Telecomunicaciones",
      color: "bg-indigo-50 border-indigo-200",
      icon: "📡",
      description: "Marco legal para empresas tech y operadores de telecomunicaciones.",
      services: ["Contratos de software y SaaS", "Regulación ARCOTEL", "Ciberseguridad legal", "Comercio electrónico"],
    },
    {
      area: "Laboral y Seguridad Social",
      color: "bg-rose-50 border-rose-200",
      icon: "👥",
      description: "Gestión de relaciones laborales y cumplimiento con el IESS.",
      services: ["Contratos y políticas internas", "Procesos disciplinarios", "Defensa en Inspectoría", "Tercerización y outsourcing"],
    },
    {
      area: "Tax & Finance",
      color: "bg-teal-50 border-teal-200",
      icon: "📊",
      description: "Planificación tributaria y asesoría financiera estratégica.",
      services: ["Planificación fiscal corporativa", "Litigio tributario ante el SRI", "Estructuración financiera", "Consultoría NIIF y contable"],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuestros Servicios</h1>
        <p className="text-gray-400 text-sm mt-1">Cobertura integral para las necesidades de tu empresa.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {services.map(s => (
          <div key={s.area} className={`rounded-2xl border p-5 ${s.color}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{s.icon}</span>
              <h2 className="font-semibold text-gray-900 text-sm">{s.area}</h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">{s.description}</p>
            <ul className="space-y-1.5">
              {s.services.map(sv => (
                <li key={sv} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">·</span>
                  {sv}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-violet-600 rounded-2xl p-6 text-white text-center">
        <h2 className="font-bold text-lg mb-2">¿Necesitas algo específico?</h2>
        <p className="text-violet-200 text-sm mb-4">Nuestro equipo multidisciplinario puede atender requerimientos a medida.</p>
        <a href="/portal/solicitudes"
          className="inline-block px-6 py-2.5 bg-white text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-50 transition">
          Hacer una solicitud →
        </a>
      </div>
    </div>
  );
}
