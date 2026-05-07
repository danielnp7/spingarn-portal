export default function ServiciosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuestros Servicios</h1>
        <p className="text-gray-400 text-sm mt-1">Cobertura integral para las necesidades de tu empresa.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">

        <ServiceCard
          icon="📊"
          title="Valoración de Negocios"
          description="Determinamos el valor económico de tu empresa con rigor técnico y respaldo pericial, para fusiones, adquisiciones, sucesiones, litigios o reportes regulatorios."
          items={[
            "Flujo de caja descontado (DCF) y múltiplos de mercado",
            "Valoración de activos intangibles y marcas",
            "Informes periciales certificados ante la SCVS",
            "Due diligence de valor pre-transacción",
            "Valoración para M&A y restructuraciones",
          ]}
        />

        <ServiceCard
          icon="🔁"
          title="Precios de Transferencia"
          description="Aseguramos el cumplimiento de la normativa ecuatoriana e internacional sobre operaciones entre partes relacionadas, minimizando riesgos tributarios."
          items={[
            "Estudio integral de precios de transferencia",
            "Análisis de comparables y documentación soporte",
            "Consulta previa y acuerdos anticipados con el SRI",
            "Estrategia fiscal intercompany para grupos corporativos",
            "Defensa técnica ante fiscalizaciones y auditorías",
          ]}
        />

        <ServiceCard
          icon="🏗"
          title="Estructuración Financiera"
          description="Diseñamos estructuras de financiamiento a la medida de tu proyecto: deuda, capital o esquemas mixtos, con modelación financiera de alto rigor."
          items={[
            "Modelación financiera y proyecciones presupuestarias",
            "Estructuración de deuda bancaria y mercado de valores",
            "Conexión con capital privado y fondos de inversión",
            "Evaluación integral de proyectos de inversión",
            "Planes de negocio con análisis financiero estratégico",
          ]}
        />

        <ServiceCard
          icon="🤖"
          title="Optimización Operativa con IA"
          description="Automatizamos procesos repetitivos con agentes de inteligencia artificial, reduciendo hasta un 70% el tiempo manual en operaciones clave de tu empresa."
          items={[
            "Automatización de flujos con n8n, Make y agentes IA",
            "Procesamiento automático de documentos y datos",
            "Integración entre sistemas sin desarrollo a medida",
            "Reportes ejecutivos generados automáticamente",
          ]}
        />

        <ServiceCard
          icon="📈"
          title="Inteligencia de Datos"
          description="Convertimos tus datos en inteligencia de negocio: dashboards ejecutivos, modelos predictivos y análisis estratégico en tiempo real."
          items={[
            "Dashboards ejecutivos personalizados",
            "Modelos predictivos de demanda y rentabilidad",
            "Consolidación de fuentes de datos heterogéneas",
            "KPIs y alertas configuradas a tu negocio",
          ]}
        />

        <ServiceCard
          icon="🚀"
          title="Transformación Digital"
          description="Acompañamos la digitalización completa de tu empresa en cuatro fases estructuradas: Diagnóstico, Diseño, Implementación con IA y Escala."
          items={[
            "Diagnóstico y mapeo de procesos actuales",
            "Diseño de arquitectura digital a medida",
            "Implementación con IA y herramientas NoCode",
            "Escala y mejora continua post-implementación",
          ]}
        />

        <ServiceCard
          icon="🧾"
          title="Impuestos"
          description="Asesoría tributaria integral: cumplimiento local, planificación fiscal estratégica y defensa ante la administración tributaria."
          items={[
            "Declaraciones y cumplimiento mensual y anual",
            "Planificación tributaria preventiva",
            "International tax y convenios de doble tributación",
            "Defensa ante el SRI y Tribunal Fiscal",
            "Clasificación arancelaria y regímenes aduaneros",
          ]}
        />

        <ServiceCard
          icon="🏦"
          title="Corporativo & Bancario"
          description="Asesoría en derecho societario, operaciones de M&A y contratos bancarios para empresas en cualquier etapa de su desarrollo."
          items={[
            "Constitución, reforma de estatutos y juntas de accionistas",
            "Due diligence jurídico y cierre de adquisiciones",
            "Contratos de crédito, garantías y operaciones financieras",
            "Negociaciones estratégicas y contratos complejos",
          ]}
        />

        <ServiceCard
          icon="🔒"
          title="Protección de Datos Personales"
          description="Cumplimiento de la Ley Orgánica de Protección de Datos Personales (LOPDP) y estándares internacionales de privacidad."
          items={[
            "Diagnóstico y mapeo de flujos de datos personales",
            "Redacción de políticas de privacidad y avisos de consentimiento",
            "Adecuación integral a la LOPDP",
            "DPO externalizado y capacitación corporativa",
          ]}
        />

        <ServiceCard
          icon="🏛"
          title="Derecho Administrativo"
          description="Representación ante el Estado en contratación pública, infraestructura y procesos regulatorios."
          items={[
            "Licitaciones, SERCOP y ejecución de contratos públicos",
            "Recursos ante entidades públicas y procesos coactivos",
            "Proyectos de infraestructura y habilitaciones",
            "Regulatorio ante ARCOTEL, ARCSA, AMDATU y otros",
          ]}
        />

        <ServiceCard
          icon="⚡"
          title="Competencia"
          description="Asesoría en derecho antimonopolio, control de concentraciones y programas de compliance competitivo."
          items={[
            "Defensa ante la SCPM por abuso de posición dominante",
            "Notificación y aprobación de fusiones y adquisiciones",
            "Programas de compliance antimonopolio",
          ]}
        />

        <ServiceCard
          icon="⚖"
          title="Civil & Resolución de Controversias"
          description="Litigio civil, arbitraje y mediación para la resolución eficiente de conflictos contractuales y comerciales."
          items={[
            "Mediación con mediadores acreditados",
            "Arbitraje ante la CAM, ICC y otros centros",
            "Demandas y defensas en litigio contractual",
            "Cobros y ejecución de sentencias y laudos",
          ]}
        />

        <ServiceCard
          icon="⛽"
          title="Energía"
          description="Consultoría jurídica especializada en el sector energético: hidrocarburos, minería y energías renovables."
          items={[
            "Contratos de concesión y transporte de hidrocarburos",
            "Proyectos eólicos, solares e hidráulicos",
            "Bloques petroleros, rondas de licitación y contratos de asociación",
            "Concesiones mineras y obligaciones ambientales",
          ]}
        />

        <ServiceCard
          icon="👷"
          title="Laboral"
          description="Gestión integral de relaciones laborales: cumplimiento normativo, asesoría preventiva y defensa en litigios."
          items={[
            "Inspecciones del MRL, actas de finiquito y mediación",
            "Defensa en tribunales laborales y casación",
            "Contratos, reglamentos internos y desvinculaciones",
          ]}
        />

        <ServiceCard
          icon="💡"
          title="Propiedad Intelectual"
          description="Protección y gestión de activos intangibles: marcas, patentes, derechos de autor y franquicias."
          items={[
            "Registro, vigilancia y defensa de marcas ante el SENADI",
            "Solicitudes de patentes, modelos de utilidad y diseños",
            "Acciones de nulidad, oposición y cancelación",
            "Contratos de licencia, franquicia y know-how",
          ]}
        />

        <ServiceCard
          icon="🌐"
          title="Comercio Exterior & Aduanas"
          description="Asesoría completa en importación, exportación, trade compliance y regímenes aduaneros especiales."
          items={[
            "Impugnación de aforos y sanciones del SENAE",
            "Zonas francas, ZEDE, draw-back y regímenes especiales",
            "Programas de cumplimiento para importadores y exportadores",
            "Certificación como Operador Económico Autorizado (OEA)",
          ]}
        />

        <ServiceCard
          icon="🔬"
          title="Transferencia de Tecnología"
          description="Estructuración de acuerdos de I+D+i, vigilancia tecnológica y contratos de licenciamiento de tecnología."
          items={[
            "Contratos de investigación, desarrollo e innovación",
            "Monitoreo de patentes y tendencias tecnológicas",
            "Análisis de libertad de operación (FTO)",
            "Transferencia y licenciamiento de software y datos",
          ]}
        />

        <ServiceCard
          icon="✅"
          title="Compliance"
          description="Gobierno corporativo y programas de cumplimiento para prevención de lavado de activos, corrupción y riesgos regulatorios."
          items={[
            "Due diligence de integridad de socios y proveedores",
            "Códigos de ética, canales de denuncia y matrices de riesgo",
            "Prevención de lavado de activos y anticorrupción",
            "Talleres y capacitaciones corporativas",
          ]}
        />

        <ServiceCard
          icon="🤝"
          title="APP & Concesiones"
          description="Estructuración y participación en proyectos de alianza público-privada e iniciativas de concesión de servicios."
          items={[
            "Presentación de propuestas de APP ante el Estado",
            "Licitaciones de concesión y delegación de servicios",
            "Diseño financiero-jurídico de proyectos APP",
          ]}
        />

        <ServiceCard
          icon="✈"
          title="Aviación, Movilidad & Turismo"
          description="Asesoría regulatoria en transporte aéreo, movilidad y sector turístico y hotelero."
          items={[
            "Permisos de operación, slots y relaciones con la DGAC",
            "Leasing de aeronaves y contratos de mantenimiento MRO",
            "Cumplimiento aduanero para viajeros y encomiendas",
            "Habilitaciones hoteleras, agencias de viaje y MINTUR",
          ]}
        />

        <a
          href="/portal/solicitudes"
          className="rounded-2xl border-2 bg-white p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          style={{ borderColor: "#C8007A" }}
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💬</span>
              <h2 className="font-semibold text-sm" style={{ color: "#C8007A" }}>¿No encuentras lo que buscas?</h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Nuestra práctica va más allá de lo que cualquier lista puede resumir. Si tienes un reto específico,
              cuéntanoslo: nuestro equipo de asesoría personalizada y enfoque 360° analizará tu caso y te
              presentará la solución más adecuada.
            </p>
          </div>
          <span className="mt-4 inline-block text-sm font-semibold" style={{ color: "#C8007A" }}>
            Hacer una solicitud →
          </span>
        </a>

      </div>
    </div>
  );
}

function ServiceCard({ icon, title, description, items }: {
  icon: string; title: string; description: string; items: string[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item} className="text-xs text-gray-500 flex items-start gap-2">
            <span className="mt-0.5" style={{ color: "#C8007A" }}>·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
