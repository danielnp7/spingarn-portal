export default function ServiciosPage() {
  return (
    <div className="space-y-12">

      {/* Hero */}
      <div className="text-center space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#C8007A" }}>
          Spingarn Integrated Business Consulting
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Nuestras Soluciones</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
          Combinamos experiencia jurídica, consultoría financiera e inteligencia artificial para
          acompañar a tu empresa en cada decisión estratégica.
        </p>
      </div>

      {/* ── PRIORITY: Financial & Advisory ── */}
      <section>
        <SectionLabel icon="★" label="Especialidades Financieras" />
        <div className="grid md:grid-cols-3 gap-5 mt-4">
          <PriorityCard
            tag="Valoración"
            title="Valoración de Negocios"
            description="Determinamos el valor económico de tu empresa con rigor técnico y respaldo pericial, para fusiones, adquisiciones, sucesiones, litigios o reportes regulatorios."
            bullets={[
              "Flujo de caja descontado (DCF) y múltiplos de mercado",
              "Valoración de activos intangibles y marcas",
              "Informes periciales certificados ante la SCVS",
              "Due diligence de valor pre-transacción",
              "Valoración para M&A y restructuraciones",
            ]}
            accent="#C8007A"
          />
          <PriorityCard
            tag="Fiscal Internacional"
            title="Precios de Transferencia"
            description="Aseguramos el cumplimiento de la normativa ecuatoriana e internacional sobre operaciones entre partes relacionadas, minimizando riesgos tributarios."
            bullets={[
              "Estudio integral de precios de transferencia",
              "Análisis de comparables y documentación soporte",
              "Consulta previa y acuerdos anticipados con el SRI",
              "Estrategia fiscal intercompany para grupos corporativos",
              "Defensa técnica ante fiscalizaciones y auditorías",
            ]}
            accent="#9B0060"
          />
          <PriorityCard
            tag="Finanzas Corporativas"
            title="Estructuración Financiera"
            description="Diseñamos estructuras de financiamiento a la medida de tu proyecto: deuda, capital o esquemas mixtos, con modelación financiera de alto rigor."
            bullets={[
              "Modelación financiera y proyecciones presupuestarias",
              "Estructuración de deuda bancaria y mercado de valores",
              "Conexión con capital privado y fondos de inversión",
              "Evaluación integral de proyectos de inversión",
              "Planes de negocio con análisis financiero estratégico",
            ]}
            accent="#7D0049"
          />
        </div>
      </section>

      {/* ── DIGITAL & AI ── */}
      <section>
        <SectionLabel icon="⚡" label="Transformación Digital & IA" />
        <p className="text-xs text-gray-400 mt-1 mb-4">
          Automatizamos y potenciamos tu empresa con las herramientas más avanzadas de inteligencia artificial.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <DigitalCard
            icon="🤖"
            title="Optimización Operativa"
            tagline="Hasta 70% menos tiempo manual"
            description="Identificamos procesos repetitivos en tu operación y los automatizamos con agentes de IA y flujos inteligentes."
            bullets={[
              "Automatización con n8n / Make y agentes IA",
              "Procesamiento automático de documentos y datos",
              "Integración entre sistemas sin desarrollo a medida",
              "Reportes ejecutivos generados automáticamente",
            ]}
            tech={["Claude Code", "GPT-4", "n8n", "Make"]}
          />
          <DigitalCard
            icon="📊"
            title="Inteligencia de Datos"
            tagline="Decisiones basadas en datos"
            description="Convertimos tus datos en inteligencia de negocio: dashboards ejecutivos, modelos predictivos y análisis estratégico en tiempo real."
            bullets={[
              "Dashboards ejecutivos personalizados",
              "Modelos predictivos de demanda y rentabilidad",
              "Consolidación de fuentes de datos heterogéneas",
              "KPIs y alertas configuradas a tu negocio",
            ]}
            tech={["Power BI", "Looker Studio", "Python", "SQL"]}
          />
          <DigitalCard
            icon="🚀"
            title="Transformación Digital"
            tagline="De diagnóstico a escala"
            description="Acompañamos la digitalización completa de tu empresa en cuatro fases estructuradas, con implementación progresiva y sin fricción operativa."
            bullets={[
              "Diagnóstico y mapeo de procesos actuales",
              "Diseño de arquitectura digital a medida",
              "Implementación con IA y herramientas NoCode",
              "Escala y mejora continua post-implementación",
            ]}
            tech={["IA Generativa", "NoCode", "APIs", "Cloud"]}
          />
        </div>
      </section>

      {/* ── LEGAL & ADVISORY ── */}
      <section>
        <SectionLabel icon="⚖" label="Servicios Jurídicos & Consultoría" />
        <p className="text-xs text-gray-400 mt-1 mb-4">
          Cobertura integral en todas las áreas del derecho y la gestión empresarial.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">

          <ServiceAccordion
            icon="🧾"
            title="Impuestos"
            subtitle="Tributación nacional e internacional"
            items={[
              { label: "Tributación local", desc: "Declaraciones, cumplimiento mensual y anual, optimización de carga fiscal." },
              { label: "Estrategia fiscal", desc: "Planificación tributaria preventiva y reestructuración eficiente." },
              { label: "International tax", desc: "Convenios de doble tributación, fiscalidad cross-border y BEPS." },
              { label: "Procesos judiciales", desc: "Defensa en reclamos ante el SRI, Tribunal Fiscal y cortes superiores." },
              { label: "Aduana", desc: "Clasificación arancelaria, regímenes especiales y reclamos aduaneros." },
              { label: "Procesos administrativos", desc: "Recursos de revisión, apelaciones y gestión ante la Administración." },
            ]}
          />

          <ServiceAccordion
            icon="🏦"
            title="Corporativo & Bancario"
            subtitle="Derecho societario, M&A y banca"
            items={[
              { label: "Procesos societarios", desc: "Constitución, reforma de estatutos, juntas de accionistas y fusiones." },
              { label: "Negociaciones", desc: "Diseño y revisión de contratos complejos y negociaciones estratégicas." },
              { label: "M&A", desc: "Due diligence jurídico, estructuración y cierre de adquisiciones y fusiones." },
              { label: "Derecho bancario", desc: "Contratos de crédito, garantías, operaciones financieras reguladas." },
            ]}
          />

          <ServiceAccordion
            icon="🔒"
            title="Protección de Datos Personales"
            subtitle="Cumplimiento LOPDP y privacidad"
            items={[
              { label: "Diagnóstico de privacidad", desc: "Mapeo de flujos de datos personales en tu organización." },
              { label: "Política de privacidad", desc: "Redacción de políticas, avisos y mecanismos de consentimiento." },
              { label: "Cumplimiento LOPDP", desc: "Adecuación a la Ley Orgánica de Protección de Datos Personales." },
              { label: "DPO y asesoría permanente", desc: "Delegado de Protección de Datos externalizado y capacitación." },
            ]}
          />

          <ServiceAccordion
            icon="🏛"
            title="Derecho Administrativo"
            subtitle="Estado, contratos públicos e infraestructura"
            items={[
              { label: "Contratación pública", desc: "Procesos de licitación, SERCOP, y ejecución de contratos con el Estado." },
              { label: "Reclamos administrativos", desc: "Recursos ante entidades públicas y defensa en procedimientos coactivos." },
              { label: "Infraestructura", desc: "Proyectos de infraestructura pública, permisos y habilitaciones." },
              { label: "Regulatorio", desc: "Asesoría ante organismos de control: ARCOTEL, ARCSA, AMDATU, etc." },
            ]}
          />

          <ServiceAccordion
            icon="⚡"
            title="Competencia"
            subtitle="Antimonopolio y compliance competitivo"
            items={[
              { label: "Prácticas anticompetitivas", desc: "Análisis y defensa en investigaciones por abuso de posición dominante." },
              { label: "Control de concentraciones", desc: "Notificación y aprobación de fusiones ante la SCPM." },
              { label: "Compliance antimonopolio", desc: "Programas internos para prevenir infracciones de competencia." },
            ]}
          />

          <ServiceAccordion
            icon="⚖"
            title="Civil & Resolución de Controversias"
            subtitle="Litigio, arbitraje y mediación"
            items={[
              { label: "Mediación", desc: "Solución alternativa de conflictos con mediadores acreditados." },
              { label: "Arbitraje nacional e internacional", desc: "Representación en procesos ante la CAM, ICC y otros centros." },
              { label: "Litigio contractual", desc: "Demandas, defensas y ejecución de contratos civiles y mercantiles." },
              { label: "Cobros y ejecución de sentencias", desc: "Acciones coactivas y ejecución de laudos y sentencias." },
            ]}
          />

          <ServiceAccordion
            icon="⛽"
            title="Energía"
            subtitle="Hidrocarburos, minería y renovables"
            items={[
              { label: "Energía convencional", desc: "Contratos de concesión, operación y transporte de hidrocarburos." },
              { label: "Energía no convencional", desc: "Proyectos eólicos, solares e hidráulicos: permisos y regulación." },
              { label: "Oil & Gas", desc: "Bloques petroleros, rondas de licitación y contratos de asociación." },
              { label: "Minería", desc: "Concesiones mineras, contratos de explotación y obligaciones ambientales." },
            ]}
          />

          <ServiceAccordion
            icon="👷"
            title="Laboral"
            subtitle="Relaciones laborales y gestión del talento"
            items={[
              { label: "Procesos administrativos laborales", desc: "Inspecciones del MRL, actas de finiquito y mediación laboral." },
              { label: "Procesos judiciales", desc: "Defensa en vistas, apelaciones y casación ante tribunales laborales." },
              { label: "Consultoría laboral", desc: "Contratos, reglamentos internos, desvinculaciones y restructuraciones." },
            ]}
          />

          <ServiceAccordion
            icon="💡"
            title="Propiedad Intelectual"
            subtitle="Marcas, patentes y derechos de autor"
            items={[
              { label: "Marcas y denominaciones", desc: "Registro, vigilancia y defensa de marcas ante el IEPI / SENADI." },
              { label: "Patentes e invenciones", desc: "Solicitudes de patentes, modelos de utilidad y diseños industriales." },
              { label: "Recursos judiciales", desc: "Acciones de nulidad, oposición y cancelación de registros." },
              { label: "Franquicias y licencias", desc: "Contratos de licencia, franquicia y transferencia de know-how." },
            ]}
          />

          <ServiceAccordion
            icon="🌐"
            title="Comercio Exterior & Aduanas"
            subtitle="Importación, exportación y trade compliance"
            items={[
              { label: "Reclamos aduaneros", desc: "Impugnación de aforos, sanciones y resoluciones del SENAE." },
              { label: "Regímenes especiales", desc: "Zonas francas, ZEDE, almacenes libres y draw-back." },
              { label: "Trade compliance", desc: "Programas de cumplimiento para importadores y exportadores." },
              { label: "OEA", desc: "Certificación como Operador Económico Autorizado." },
            ]}
          />

          <ServiceAccordion
            icon="🔬"
            title="Transferencia de Tecnología"
            subtitle="I+D+i y vigilancia tecnológica"
            items={[
              { label: "Contratos de I+D+i", desc: "Estructuración de acuerdos de investigación, desarrollo e innovación." },
              { label: "Vigilancia tecnológica", desc: "Monitoreo de tendencias, patentes y competencia tecnológica." },
              { label: "Libertad de operación", desc: "Análisis FTO para evitar infracción de derechos de terceros." },
              { label: "Transferencia y licenciamiento", desc: "Contratos de transferencia de software, datos y tecnología." },
            ]}
          />

          <ServiceAccordion
            icon="✅"
            title="Compliance"
            subtitle="Gobierno corporativo y cumplimiento"
            items={[
              { label: "Due diligence de integridad", desc: "Evaluación de socios, proveedores y clientes bajo estándares FCPA/UK Bribery." },
              { label: "Políticas y manuales", desc: "Diseño de códigos de ética, canales de denuncia y matrices de riesgo." },
              { label: "Asesoría permanente", desc: "Acompañamiento continuo en prevención de lavado de activos y anticorrupción." },
              { label: "Formación corporativa", desc: "Talleres y capacitaciones para equipos directivos y operativos." },
            ]}
          />

          <ServiceAccordion
            icon="🤝"
            title="APP & Concesiones"
            subtitle="Alianzas público-privadas e infraestructura"
            items={[
              { label: "Iniciativas privadas", desc: "Presentación de propuestas de APP ante entidades contratantes." },
              { label: "Procesos de delegación", desc: "Participación en licitaciones de concesión y delegación de servicios." },
              { label: "Estructuración de APP", desc: "Diseño financiero-jurídico de proyectos de asociación público-privada." },
            ]}
          />

          <ServiceAccordion
            icon="✈"
            title="Aviación, Movilidad & Turismo"
            subtitle="Transporte aéreo, terrestre y hospitalidad"
            items={[
              { label: "Regulatorio aéreo", desc: "Permisos de operación, slots, frecuencias y relaciones con la DGAC." },
              { label: "Contratos aeronáuticos", desc: "Leasing de aeronaves, mantenimiento MRO y alianzas codeshare." },
              { label: "Aduanas de viajeros", desc: "Cumplimiento en importación de equipaje, mascotas y encomiendas." },
              { label: "Turismo y hospitalidad", desc: "Habilitaciones hoteleras, agencias de viaje y regulación MINTUR." },
            ]}
          />

        </div>
      </section>

      {/* CTA */}
      <div className="rounded-2xl p-8 text-white text-center" style={{ background: "linear-gradient(135deg, #C8007A 0%, #7D0049 100%)" }}>
        <h2 className="font-bold text-xl mb-2">¿Listo para dar el siguiente paso?</h2>
        <p className="text-sm mb-5" style={{ color: "#FFD6EE" }}>
          Nuestro equipo puede diseñar una solución a la medida de tu empresa o industria.
        </p>
        <a
          href="/portal/solicitudes"
          className="inline-block px-7 py-3 bg-white rounded-xl text-sm font-semibold hover:bg-pink-50 transition"
          style={{ color: "#C8007A" }}
        >
          Hacer una solicitud →
        </a>
      </div>

    </div>
  );
}

/* ── Sub-components ── */

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</h2>
      <div className="flex-1 h-px bg-gray-100 ml-2" />
    </div>
  );
}

function PriorityCard({
  tag, title, description, bullets, accent,
}: {
  tag: string; title: string; description: string; bullets: string[]; accent: string;
}) {
  return (
    <div className="rounded-2xl border-2 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col" style={{ borderColor: accent }}>
      <div className="px-5 py-4 text-white" style={{ background: accent }}>
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{tag}</span>
        <h3 className="font-bold text-base mt-0.5">{title}</h3>
      </div>
      <div className="px-5 py-4 flex-1 flex flex-col gap-3">
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        <ul className="space-y-1.5 flex-1">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="mt-0.5 font-bold flex-shrink-0" style={{ color: accent }}>→</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DigitalCard({
  icon, title, tagline, description, bullets, tech,
}: {
  icon: string; title: string; tagline: string; description: string;
  bullets: string[]; tech: string[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs font-medium mt-0.5" style={{ color: "#C8007A" }}>{tagline}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      <ul className="space-y-1">
        {bullets.map(b => (
          <li key={b} className="flex items-start gap-2 text-xs text-gray-500">
            <span className="mt-0.5 flex-shrink-0" style={{ color: "#C8007A" }}>·</span>
            {b}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
        {tech.map(t => (
          <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50" style={{ color: "#C8007A" }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function ServiceAccordion({
  icon, title, subtitle, items,
}: {
  icon: string; title: string; subtitle: string;
  items: { label: string; desc: string }[];
}) {
  return (
    <details className="group rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:border-pink-200 transition-colors">
      <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none select-none">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <svg
          className="w-4 h-4 text-gray-300 flex-shrink-0 transition-transform group-open:rotate-180"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 pb-4 border-t border-gray-50">
        <ul className="mt-3 space-y-2.5">
          {items.map(item => (
            <li key={item.label} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: "#C8007A" }} />
              <div>
                <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
