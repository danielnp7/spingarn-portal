import Anthropic from "@anthropic-ai/sdk";

// Current-year legal facts that change annually — verified 2025
// Mapped to portal council agent IDs
export const AGENT_LEGAL_FACTS: Record<string, string> = {
  laboral: `DATOS VIGENTES 2025 — LABORAL:
- SBU 2025: USD 460 mensales (Acuerdo Ministerial MDT, vigente 1-ene-2025)
- Aportación IESS empleado: 9.45% del sueldo
- Aportación IESS empleador: 12.15% (incluye seguro riesgos del trabajo)
- Décimo tercero: pago hasta 24 de diciembre o proporcional mensual
- Décimo cuarto: Sierra/Oriente agosto; Costa/Galápagos marzo; o proporcional mensual
- Fondos de reserva: 8.33% desde el 13° mes — pago IESS o empleador
- Participación utilidades: 15% utilidades líquidas (10% trabajadores + 5% cargas familiares)
- Vacaciones: 15 días anuales + 1 día adicional por año adicional (máx. 30 días)
- Indemnización despido intempestivo: 1 mes SBU por año de servicio (primera anualidad = SBU completo, Art. 188 CT)
- Desahucio: 25% de última remuneración por año de servicio (Art. 185 CT)
- Contrato temporal a plazo fijo: máx. 2 años, renovable una sola vez (Art. 17 CT)
- Teletrabajo: regulado por Acuerdo Ministerial MDT-2020-181 y reformas 2022-2023
- Cuota discapacidad: 4% de nómina (para empleadores con 25+ trabajadores, Art. 42 numeral 33 CT)`,

  corporativo: `DATOS VIGENTES 2025 — CORPORATIVO/M&A:
- SCPM notificación fusiones: cuando facturación supere 100,000 SBU o activos combinados superen 200,000 SBU (SBU 2025: $460)
- SCVS: fusiones deben publicarse en diario de amplia circulación; plazo oposición acreedores 30 días
- Aumento de capital SCVS: resolución aprobatoria + inscripción Registro Mercantil
- COPCI: contratos de inversión con estabilidad tributaria hasta 15 años (Art. 26 COPCI)
- Arbitraje internacional: CIADI, CCI, CAM (Centro Arbitraje CCQ y CCG)
- Sector eléctrico: ARCERNNR (fusión ARCONEL+ARCH, vigente desde 2019)
- Contratos petroleo: modelo Petroecuador prestación servicios (actualizado 2021)
- Ley de Minería: concesión 25 años renovables; regalía mínima 3-8% según volúmenes
- Energías renovables: PPA — Ministerio de Energía autoriza; ARCERNNR aprueba tarifas
- Regalías mineras anticipadas: 0-12% (Reglamento Minero)`,

  tributario: `DATOS VIGENTES 2025 — TRIBUTARIO:
- IVA: tarifa general 15% (Ley Orgánica Eficiencia Económica Ecuatoriana, R.O. 436 del 31-ene-2024; prorrogada 2025)
- IVA tarifa 0%: bienes canasta básica, medicamentos, insumos agrícolas (Art. 55 LRTI)
- ISD: 5% sobre transferencias al exterior (Ley OFEEE 2024)
- Impuesto a la Renta sociedades: 25% (más 3% si distribuyen a paraísos fiscales)
- Anticipo IR: 0.2% patrimonio + 0.2% costos/gastos + 0.4% activo total + 0.4% ingresos gravables
- SBU para cálculo exenciones: USD 460 (2025)
- Prescripción tributaria: 3 años (declaración presentada) / 6 años (no declarada) / 10 años (defraudación)
- Multas mora: interés tasa activa referencial BCE (verificar mensualmente)
- Recargo por omisión de declaración: 20% del IR causado
- Plazo declaración IR sociedades: hasta 30 de abril del año siguiente (según 9° dígito RUC)
- Facturación electrónica: obligatoria para todos los contribuyentes (NAC-DGERCGC15-00000284 y posteriores)`,

  financiero: `DATOS VIGENTES 2025 — FINANCIERO/NIIF:
- NIIF PYMES: aplicación obligatoria para compañías que no estén en mercado de valores y tengan activos < $4M o ingresos < $5M (verificar resolución SCVS vigente)
- NIIF completas: obligatorias para cotizadas, bancos, aseguradoras, y grandes empresas (activos > $4M o ingresos > $5M)
- Tasa pasiva referencial BCE may-2025: verificar en https://www.bce.fin.ec/tasas-de-interes/
- Tasa activa referencial BCE may-2025: verificar en https://www.bce.fin.ec/tasas-de-interes/
- Tasas máximas BCE por segmento: verificar resolución BCE vigente (cambian mensualmente)
- COSEDE: cobertura depósitos hasta USD 32,000 por depositante por institución (verificar)
- ISD deducible en IR: solo el pagado en importaciones de materias primas, insumos y bienes de capital (Art. 139 LRTI)
- Subcapitalización: deuda con partes relacionadas no puede exceder 3x el patrimonio (LRTI)`,

  aviacion: `DATOS VIGENTES 2025 — AVIACIÓN CIVIL:
- DGAC: autoridad aeronáutica civil del Ecuador — Decreto Supremo 435
- COA (Certificado Operador Aéreo): renovación anual; supervisión DGAC continua
- Drones/RPAS: Resolución DGAC-2019-050-DIR; zonas restringidas TCA; seguro obligatorio USD 50,000
- Convenio de Montreal (1999): ratificado por Ecuador — responsabilidad transportista internacional
- DGR IATA: edición vigente 2025 obligatoria para mercancías peligrosas
- Concesiones aeroportuarias: CORPAQ (Quito), GAO concesión privada (Guayaquil), municipios en regionales
- RPAS comerciales: autorización DGAC + licencia piloto remoto + seguro
- Licencias personal aeronáutico: RDAC Parte 61 y 65; examen DGAC; vigencia según tipo`,

  contratacion_publica: `DATOS VIGENTES 2025 — CONTRATACIÓN PÚBLICA:
- Umbrales 2025: publicados anualmente por SERCOP en resolución — verificar resolución SERCOP vigente para montos exactos
- Herramienta USHAY: obligatoria para todos los procedimientos electrónicos desde 2023
- Garantía fiel cumplimiento: 5% del valor del contrato
- Garantía buen uso anticipo: igual al monto del anticipo recibido
- Preferencia MIPYMES: 10% adicional sobre oferta base en evaluación
- Plazo firma contrato: 15 días desde notificación de adjudicación
- Reforma LOSNCP 2024: Ley Orgánica Reformatoria LOSNCP (verificar R.O. reciente para cambios específicos)
- Catálogo electrónico: adquisición directa hasta montos establecidos sin proceso competitivo
- Inhabilitación RUP: por incumplimiento, resolución ejecutoriada o deuda tributaria firme`,

  propiedad_intelectual: `DATOS VIGENTES 2025 — PROPIEDAD INTELECTUAL:
- SENADI: registro online en portal.senadi.gob.ec; reemplazó al IEPI
- Clases Niza: 12a edición 2023 (45 clases, vigente en Ecuador)
- Tiempo estimado registro marca: 6-8 meses sin oposición; hasta 14-18 meses con oposición
- Plazo oposición: 30 días hábiles desde publicación en Gaceta de Propiedad Intelectual
- Duración marca registrada: 10 años renovables (Decisión 486 CAN)
- Patente invención: 20 años desde presentación, no renovable
- Software: protegido como obra literaria bajo derechos de autor — NO patentable en Ecuador (Código INGENIOS Art. 120)
- Secreto empresarial: Decisión 486 CAN Arts. 260-266 — requiere medidas razonables de confidencialidad
- Dominio .ec: AEPROVI — renovación anual; disputas vía UDREC
- Derechos de autor: 70 años post-muerte del autor (Art. 115 Código INGENIOS)`,

  datos_tecnologia: `DATOS VIGENTES 2025 — DATOS PERSONALES Y TECNOLOGÍA:
- LOPDP: vigencia plena desde 26 de mayo de 2023 (18 meses tras publicación R.O. 459 de 26-may-2021)
- Autoridad: Superintendencia de Protección de Datos Personales (SPDP) — autónoma desde 2024
- Reglamento LOPDP: Decreto Ejecutivo 1170 (2024)
- DPO: obligatorio para instituciones públicas, empresas que traten datos sensibles a gran escala, o >50,000 titulares/año
- Notificación brechas: 72 horas a SPDP + notificar titulares sin dilación indebida
- Sanción máxima: 1% facturación anual (hasta USD 1,000,000) para empresas grandes con datos sensibles
- Datos sensibles: consentimiento EXPLÍCITO obligatorio (salud, biometría, origen racial, vida sexual)
- Derechos ARCO+: respuesta en 15 días hábiles + prórroga 15 días; recurso ante SPDP
- ARCOTEL: autoriza títulos habilitantes telecomunicaciones bajo LOT (2015)
- Firma electrónica: entidades acreditadas BCE, Security Data, ANF Ecuador (vigencia 2 años)
- IA y decisiones automatizadas: derecho a no ser objeto de decisión puramente automatizada (Art. 26 LOPDP)`,
};

// Official source URLs per agent area for live fetching
const AGENT_FETCH_SOURCES: Record<string, { url: string; label: string }[]> = {
  laboral:              [{ url: "https://www.trabajo.gob.ec/normativa-legal/", label: "Normativa Ministerio del Trabajo" }],
  corporativo:          [{ url: "https://www.supercias.gob.ec/portalscvs/", label: "Superintendencia de Compañías (SCVS)" }],
  tributario:           [{ url: "https://www.sri.gob.ec/normativa-vigente", label: "Normativa SRI vigente" }],
  financiero:           [{ url: "https://www.bce.fin.ec/tasas-de-interes/", label: "Tasas de interés BCE" }],
  aviacion:             [{ url: "https://www.aviacion.gob.ec/regulaciones-aeronauticas-del-ecuador-rae/", label: "Regulaciones DGAC" }],
  contratacion_publica: [{ url: "https://www.sercop.gob.ec/normativa/", label: "Normativa SERCOP" }],
  propiedad_intelectual:[{ url: "https://www.senadi.gob.ec/normativa/", label: "Normativa SENADI" }],
  datos_tecnologia:     [{ url: "https://www.arcotel.gob.ec/resoluciones/", label: "Resoluciones ARCOTEL" }],
};

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SpingarnLegalBot/1.0; legal research)",
        "Accept": "text/html,application/xhtml+xml,text/plain",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 20000);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{3,}/g, "\n")
    .trim()
    .slice(0, 8000);
}

async function extractRelevantSnippets(
  anthropic: Anthropic,
  rawText: string,
  sourceLabel: string,
  query: string,
): Promise<string | null> {
  if (!rawText.trim()) return null;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{
        role: "user",
        content: `Del contenido de "${sourceLabel}", extrae SOLO los fragmentos relevantes para: "${query}". Si no hay contenido relevante, responde NADA. Máximo 250 palabras, texto plano.\n\nCONTENIDO:\n${rawText.slice(0, 4000)}`,
      }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (text === "NADA" || text.length < 20) return null;
    return `[${sourceLabel}]\n${text}`;
  } catch {
    return null;
  }
}

export async function buildAgentLegalBlock(
  agentId: string,
  caseDescription: string,
  anthropic: Anthropic,
): Promise<string> {
  const facts = AGENT_LEGAL_FACTS[agentId] ?? "";
  const sources = AGENT_FETCH_SOURCES[agentId] ?? [];
  const query = caseDescription.slice(0, 200);

  // Try live fetch for the primary source
  let liveSnippet: string | null = null;
  if (sources.length > 0) {
    try {
      const { url, label } = sources[0];
      const html = await fetchWithTimeout(url, 4000);
      if (html) {
        const text = stripHtml(html);
        if (text.length > 100) {
          liveSnippet = await extractRelevantSnippets(anthropic, text, label, query);
        }
      }
    } catch {
      // silent fail
    }
  }

  const parts: string[] = [];
  if (facts) parts.push(facts);
  if (liveSnippet) {
    parts.push(`EXTRACTO FUENTE OFICIAL (consultado ${new Date().toISOString().split("T")[0]}):\n${liveSnippet}`);
  }

  if (parts.length === 0) return "";
  return `\n\n---\nDATOS LEGALES VIGENTES 2025 (verificados — tienen precedencia sobre conocimiento de entrenamiento cuando haya conflicto de fechas o cifras)\n\n${parts.join("\n\n")}\n---`;
}
