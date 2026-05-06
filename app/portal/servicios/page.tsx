export default function ServiciosPage() {
  const services = [
    {
      area: "Consultoría Financiera",
      icon: "📊",
      description: "Asesoría estratégica en finanzas corporativas, análisis financiero y optimización de recursos.",
      services: [
        "Análisis y planificación financiera",
        "Estructuración de deuda y capital",
        "Valoración de empresas",
        "Gestión de riesgos financieros",
      ],
    },
    {
      area: "Consultoría General",
      icon: "💼",
      description: "Acompañamiento integral en la gestión y estrategia de tu empresa.",
      services: [
        "Diagnóstico organizacional",
        "Diseño de estrategia corporativa",
        "Optimización de procesos",
        "Transformación y cambio organizacional",
      ],
    },
    {
      area: "Comercio Exterior",
      icon: "🌐",
      description: "Asesoría en operaciones de importación, exportación y regulación aduanera.",
      services: [
        "Clasificación arancelaria",
        "Trámites de importación y exportación",
        "Cumplimiento regulatorio aduanero",
        "Optimización de costos logísticos",
      ],
    },
    {
      area: "Inversiones",
      icon: "📈",
      description: "Estructuración y análisis de oportunidades de inversión para maximizar el retorno.",
      services: [
        "Evaluación de proyectos de inversión",
        "Due diligence financiero",
        "Estructuración de portafolios",
        "Asesoría en fusiones y adquisiciones",
      ],
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
          <div key={s.area} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{s.icon}</span>
              <h2 className="font-semibold text-gray-900 text-sm">{s.area}</h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">{s.description}</p>
            <ul className="space-y-1.5">
              {s.services.map(sv => (
                <li key={sv} className="text-xs text-gray-500 flex items-start gap-2">
                  <span className="mt-0.5" style={{ color: "#C8007A" }}>·</span>
                  {sv}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 text-white text-center" style={{ background: "linear-gradient(135deg, #C8007A 0%, #7D0049 100%)" }}>
        <h2 className="font-bold text-lg mb-2">¿Necesitas algo específico?</h2>
        <p className="text-sm mb-4" style={{ color: "#FFD6EE" }}>Nuestro equipo puede atender requerimientos a medida.</p>
        <a href="/portal/solicitudes"
          className="inline-block px-6 py-2.5 bg-white rounded-xl text-sm font-semibold hover:bg-pink-50 transition"
          style={{ color: "#C8007A" }}>
          Hacer una solicitud →
        </a>
      </div>
    </div>
  );
}
