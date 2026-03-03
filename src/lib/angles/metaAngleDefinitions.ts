import { MetaAngle } from "./metaAngles";

export interface MetaAngleDefinition {
  id: MetaAngle;
  label: string;
  description: string;
  whenToUse: string;
  copyGuidelines: string[];
  visualGuidelines: string[];
  // Templates para variación de creativos
  hookTemplates: string[];
  subtitleTemplates?: string[];
  keywordTemplates?: string[];
  visualPromptHints: string[];
}

export const META_ANGLE_DEFINITIONS: Record<MetaAngle, MetaAngleDefinition> = {
  // ============================================================================
  // PAIN - Dolor / Frustración
  // ============================================================================
  pain: {
    id: "pain",
    label: "Dolor / Frustración",
    description: "Enfoca en el problema principal que sufre el usuario.",
    whenToUse: "Cuando el problema es claro y genera fricción diaria.",
    copyGuidelines: [
      "Hablar del problema antes de mencionar el producto",
      "Usar lenguaje empático",
      "Evitar exageraciones",
    ],
    visualGuidelines: [
      "Situación cotidiana frustrante",
      "Expresiones humanas reales",
      "Contraste antes/después implícito",
    ],
    hookTemplates: [
      "¿CANSADO DE {{pain}}?",
      "BASTA DE {{pain}}",
      "{{pain}} NUNCA MÁS",
      "EL FIN DE {{pain}}",
      "ESTO TERMINA HOY",
      "¿OTRO DÍA CON {{pain}}?",
      "LA SOLUCIÓN A {{pain}}",
      "ADIÓS A {{pain}}",
    ],
    subtitleTemplates: [
      "Descubrí la solución definitiva",
      "Miles ya lo resolvieron",
      "La respuesta que buscabas",
      "No sufras más innecesariamente",
    ],
    keywordTemplates: ["SOLUCIÓN", "ALIVIO", "CAMBIO", "FIN"],
    visualPromptHints: [
      "Person showing frustration expression, hands on head",
      "Split composition: frustrated vs relieved",
      "Dark moody lighting transitioning to bright",
      "Visual metaphor of problem dissolving",
      "Before state showing struggle",
    ],
  },

  // ============================================================================
  // DESIRE - Deseo / Aspiración
  // ============================================================================
  desire: {
    id: "desire",
    label: "Deseo / Aspiración",
    description: "Apela a lo que el usuario quiere ser o lograr.",
    whenToUse: "Cuando el producto mejora status, estilo de vida o identidad.",
    copyGuidelines: [
      "Hablar del resultado deseado",
      "Usar visualización futura",
      "Lenguaje aspiracional pero creíble",
    ],
    visualGuidelines: [
      "Lifestyle aspiracional",
      "Ambientes limpios y luminosos",
      "Personas disfrutando el resultado",
    ],
    hookTemplates: [
      "IMAGINA {{desire}}",
      "VOS TAMBIÉN PODÉS",
      "HACELO REALIDAD",
      "TU MOMENTO ES AHORA",
      "ALCANZÁ {{desire}}",
      "LLEGÓ TU OPORTUNIDAD",
      "EL CAMBIO EMPIEZA HOY",
      "CONVERTITE EN {{identity}}",
    ],
    subtitleTemplates: [
      "El primer paso hacia tu meta",
      "Lo que siempre soñaste",
      "Tu mejor versión te espera",
      "Diseñado para vos",
    ],
    keywordTemplates: ["SUEÑO", "META", "LOGRO", "ÉXITO"],
    visualPromptHints: [
      "Aspirational lifestyle scene with warm lighting",
      "Person achieving a goal, triumphant pose",
      "Golden hour lighting, success atmosphere",
      "Dreamy bokeh with subject in focus",
      "Vision board aesthetic, multiple aspirations",
    ],
  },

  // ============================================================================
  // BEFORE_AFTER - Antes / Después
  // ============================================================================
  before_after: {
    id: "before_after",
    label: "Antes / Después",
    description: "Muestra la transformación clara del problema al resultado.",
    whenToUse: "Cuando el cambio es visible y medible.",
    copyGuidelines: [
      "Mostrar el contraste claro",
      "Enfatizar la mejora",
      "Usar comparativas",
    ],
    visualGuidelines: [
      "Split antes/después",
      "Transformación evidente",
      "Métrica de mejora visible",
    ],
    hookTemplates: [
      "DE ESTO A ESTO",
      "LA TRANSFORMACIÓN",
      "ANTES VS DESPUÉS",
      "EL CAMBIO ES REAL",
      "30 DÍAS DESPUÉS",
      "MIRÁ LA DIFERENCIA",
      "ASÍ EMPECÉ",
      "HOY SOY OTRO",
    ],
    subtitleTemplates: [
      "Resultados que hablan solos",
      "Sin filtros, sin mentiras",
      "La prueba está a la vista",
      "Tu transformación empieza hoy",
    ],
    keywordTemplates: ["CAMBIO", "TRANSFORMACIÓN", "EVOLUCIÓN", "RESULTADO"],
    visualPromptHints: [
      "Split screen before/after comparison",
      "Timeline progression visualization",
      "Side by side transformation",
      "Progress bar or percentage overlay area",
      "Dramatic lighting shift left to right",
    ],
  },

  // ============================================================================
  // SOCIAL_PROOF - Prueba Social
  // ============================================================================
  social_proof: {
    id: "social_proof",
    label: "Prueba Social",
    description: "Apela a la validación de otros usuarios o expertos.",
    whenToUse: "Cuando tienes testimonios o datos de usuarios satisfechos.",
    copyGuidelines: [
      "Incluir números o porcentajes",
      "Citar fuentes creíbles",
      "Usar testimonios auténticos",
    ],
    visualGuidelines: [
      "Testimonios de usuarios",
      "Logos de clientes conocidos",
      "Métricas y números",
    ],
    hookTemplates: [
      "+{{number}} CLIENTES FELICES",
      "MILES YA LO ELIGIERON",
      "EL FAVORITO DE TODOS",
      "{{number}}% LO RECOMIENDAN",
      "MIRÁ LO QUE DICEN",
      "ELEGIDO POR EXPERTOS",
      "LA COMUNIDAD HABLA",
      "#1 EN SU CATEGORÍA",
    ],
    subtitleTemplates: [
      "Sumate a los que ya confían",
      "No estás solo en esto",
      "Miles no pueden estar equivocados",
      "Testimonios reales",
    ],
    keywordTemplates: ["CONFIANZA", "ELEGIDO", "RECOMENDADO", "PROBADO"],
    visualPromptHints: [
      "Multiple happy customers collage style",
      "Star ratings and review elements area",
      "Crowd or community gathering",
      "Testimonial quote bubble space",
      "Trust badges and certification area",
    ],
  },

  // ============================================================================
  // AUTHORITY - Autoridad
  // ============================================================================
  authority: {
    id: "authority",
    label: "Autoridad",
    description: "Posiciona el producto como líder o respaldado por expertos.",
    whenToUse: "Cuando tienes credenciales, awards o reconocimiento.",
    copyGuidelines: [
      "Mencionar expertos o certificaciones",
      "Destacar logros",
      "Usar terminología profesional",
    ],
    visualGuidelines: [
      "Expertos en acción",
      "Certificaciones visibles",
      "Ambientes profesionales",
    ],
    hookTemplates: [
      "RESPALDADO POR EXPERTOS",
      "CERTIFICACIÓN OFICIAL",
      "LÍDER EN SU RUBRO",
      "AVALADO POR {{authority}}",
      "LA ELECCIÓN PROFESIONAL",
      "AWARD WINNING",
      "TECNOLOGÍA DE PUNTA",
      "ESTÁNDAR DE EXCELENCIA",
    ],
    subtitleTemplates: [
      "Calidad garantizada por expertos",
      "El respaldo que necesitás",
      "Certificación internacional",
      "Reconocido mundialmente",
    ],
    keywordTemplates: ["EXPERTO", "CERTIFICADO", "LÍDER", "AVALADO"],
    visualPromptHints: [
      "Professional environment, expert at work",
      "Certification badge or seal prominent",
      "Award trophy or recognition",
      "Laboratory or professional setting",
      "Expert portrait with credentials",
    ],
  },

  // ============================================================================
  // SCARCITY - Escasez
  // ============================================================================
  scarcity: {
    id: "scarcity",
    label: "Escasez",
    description: "Crea urgencia mediante disponibilidad limitada.",
    whenToUse: "Cuando realmente hay inventario limitado o oferta temporal.",
    copyGuidelines: [
      "Ser honesto sobre limitaciones",
      "Crear FOMO sin engañar",
      "Especificar el límite",
    ],
    visualGuidelines: [
      "Contador regresivo",
      "Stock visual limitado",
      "Indicadores de disponibilidad",
    ],
    hookTemplates: [
      "ÚLTIMAS UNIDADES",
      "QUEDAN SOLO {{number}}",
      "STOCK LIMITADO",
      "SE AGOTAN RÁPIDO",
      "NO TE QUEDES SIN EL TUYO",
      "EDICIÓN LIMITADA",
      "CASI AGOTADO",
      "ÚLTIMOS DISPONIBLES",
    ],
    subtitleTemplates: [
      "No esperes a que se agote",
      "La demanda supera el stock",
      "Reservá el tuyo ahora",
      "Producción limitada",
    ],
    keywordTemplates: ["ÚLTIMOS", "LIMITADO", "EXCLUSIVO", "AGOTÁNDOSE"],
    visualPromptHints: [
      "Low stock visualization, few items remaining",
      "Exclusive limited edition badge",
      "Countdown timer area",
      "Almost sold out indicator",
      "VIP or exclusive access theme",
    ],
  },

  // ============================================================================
  // URGENCY - Urgencia
  // ============================================================================
  urgency: {
    id: "urgency",
    label: "Urgencia",
    description: "Motiva a la compra inmediata mediante presión temporal.",
    whenToUse: "Cuando hay oferta por tiempo limitado.",
    copyGuidelines: [
      "Incluir fecha/hora límite",
      "Usar palabras de acción",
      "Crear sensación de oportunidad",
    ],
    visualGuidelines: [
      "Reloj o timer visible",
      "Colores que generen urgencia",
      "Botón de CTA prominente",
    ],
    hookTemplates: [
      "SOLO POR HOY",
      "TERMINA EN {{time}}",
      "ÚLTIMA OPORTUNIDAD",
      "NO DEJES PASAR ESTO",
      "OFERTA FLASH",
      "SOLO 24 HORAS",
      "AHORA O NUNCA",
      "EL TIEMPO SE ACABA",
    ],
    subtitleTemplates: [
      "La oferta expira pronto",
      "No habrá segunda oportunidad",
      "Actuá antes de que termine",
      "El mejor momento es ahora",
    ],
    keywordTemplates: ["HOY", "AHORA", "YA", "ÚLTIMAS"],
    visualPromptHints: [
      "Dramatic countdown timer area",
      "Clock or hourglass visual metaphor",
      "Red/orange urgency color accents",
      "Flash sale lightning bolt",
      "Deadline approaching visual",
    ],
  },

  // ============================================================================
  // DEAL_SAVINGS - Descuento / Ahorro
  // ============================================================================
  deal_savings: {
    id: "deal_savings",
    label: "Descuento / Ahorro",
    description: "Resalta el valor económico y ahorro para el usuario.",
    whenToUse: "Cuando hay descuento o precio especial.",
    copyGuidelines: [
      "Mostrar ahorro neto",
      "Comparar con precio original",
      "Usar símbolos de dinero",
    ],
    visualGuidelines: [
      "% de descuento destacado",
      "Precio tachado",
      "Etiqueta de oferta",
    ],
    hookTemplates: [
      "{{percent}}% OFF",
      "AHORRÁ {{amount}}",
      "PRECIO ESPECIAL",
      "OFERTA IRRESISTIBLE",
      "DESCUENTO EXCLUSIVO",
      "MEJOR PRECIO GARANTIZADO",
      "SÚPER PROMO",
      "LIQUIDACIÓN TOTAL",
    ],
    subtitleTemplates: [
      "El mejor precio del año",
      "Ahorro real, sin trucos",
      "Comparalo y comprobalo",
      "Precio único e irrepetible",
    ],
    keywordTemplates: ["PROMO", "OFERTA", "DESCUENTO", "AHORRO"],
    visualPromptHints: [
      "Sale tag or price slash visual",
      "Percentage off badge prominent",
      "Money savings visualization",
      "Crossed out original price area",
      "Deal of the day badge",
    ],
  },

  // ============================================================================
  // SIMPLICITY - Simplicidad
  // ============================================================================
  simplicity: {
    id: "simplicity",
    label: "Simplicidad",
    description: "Enfatiza lo fácil, rápido y sin complicaciones.",
    whenToUse: "Cuando el producto destaca por facilidad de uso.",
    copyGuidelines: [
      "Usar palabras simples",
      "Explicar en 3 pasos o menos",
      "Evitar jerga técnica",
    ],
    visualGuidelines: [
      "Interfaces limpias",
      "Pocos elementos visuales",
      "Diagrama de pasos simples",
    ],
    hookTemplates: [
      "ASÍ DE FÁCIL",
      "EN 3 SIMPLES PASOS",
      "SIN COMPLICACIONES",
      "PLUG AND PLAY",
      "CERO ESFUERZO",
      "SIMPLE Y EFECTIVO",
      "FACILÍSIMO",
      "LISTO EN MINUTOS",
    ],
    subtitleTemplates: [
      "Sin curva de aprendizaje",
      "Cualquiera puede hacerlo",
      "La simplicidad es poder",
      "Diseñado para ser fácil",
    ],
    keywordTemplates: ["FÁCIL", "SIMPLE", "RÁPIDO", "LISTO"],
    visualPromptHints: [
      "Clean minimal composition",
      "Step by step visual guide area",
      "One-click or easy action metaphor",
      "Uncluttered background",
      "Simple icon or diagram space",
    ],
  },

  // ============================================================================
  // SPEED - Rapidez
  // ============================================================================
  speed: {
    id: "speed",
    label: "Rapidez",
    description: "Resalta la velocidad y eficiencia del producto.",
    whenToUse: "Cuando el tiempo es factor crítico.",
    copyGuidelines: [
      "Incluir tiempos específicos",
      "Usar palabras de movimiento",
      "Comparar velocidad",
    ],
    visualGuidelines: [
      "Motion graphics",
      "Símbolos de rapidez",
      "Líneas dinámicas",
    ],
    hookTemplates: [
      "EN SOLO {{time}}",
      "RESULTADOS INMEDIATOS",
      "VELOCIDAD MÁXIMA",
      "EXPRESS",
      "SIN ESPERAR",
      "AL INSTANTE",
      "ULTRA RÁPIDO",
      "LISTO YA",
    ],
    subtitleTemplates: [
      "El tiempo es oro",
      "Sin demoras innecesarias",
      "Velocidad que impresiona",
      "Rápido como debería ser",
    ],
    keywordTemplates: ["RÁPIDO", "EXPRESS", "INMEDIATO", "YA"],
    visualPromptHints: [
      "Motion blur speed lines",
      "Stopwatch or timer visual",
      "Fast forward arrows",
      "Lightning bolt speed symbol",
      "Racing dynamic composition",
    ],
  },

  // ============================================================================
  // GUARANTEE - Garantía
  // ============================================================================
  guarantee: {
    id: "guarantee",
    label: "Garantía",
    description: "Elimina riesgo mediante garantías o políticas de retorno.",
    whenToUse: "Cuando hay garantía, devolución o satisfacción asegurada.",
    copyGuidelines: [
      "Ser específico con términos",
      "Usar lenguaje que inspire confianza",
      "Mencionar facilidad del proceso",
    ],
    visualGuidelines: [
      "Sello de garantía",
      "Escudo de protección",
      "Check de aprobación",
    ],
    hookTemplates: [
      "100% GARANTIZADO",
      "SATISFACCIÓN O DEVOLUCIÓN",
      "SIN RIESGO",
      "GARANTÍA TOTAL",
      "{{days}} DÍAS PARA PROBAR",
      "TE DEVOLVEMOS EL DINERO",
      "COMPRA SEGURA",
      "CONFIANZA TOTAL",
    ],
    subtitleTemplates: [
      "Tu inversión está protegida",
      "Sin preguntas, sin problemas",
      "La tranquilidad que merecés",
      "Probalo sin compromiso",
    ],
    keywordTemplates: ["GARANTÍA", "SEGURO", "PROTEGIDO", "CONFIANZA"],
    visualPromptHints: [
      "Shield or protection badge",
      "Guarantee seal prominent",
      "Checkmark approval symbol",
      "Money back badge",
      "Trust and security icons area",
    ],
  },

  // ============================================================================
  // OBJECTION - Anticipar Objeción
  // ============================================================================
  objection: {
    id: "objection",
    label: "Anticipar Objeción",
    description: "Aborda y responde objeciones comunes del cliente.",
    whenToUse: "Cuando hay barreras comunes para la compra.",
    copyGuidelines: [
      "Reconocer la preocupación",
      "Responder con datos",
      "Proporcionar solución",
    ],
    visualGuidelines: [
      "Pregunta y respuesta visual",
      "Antes/después de objeción",
      "Comparativa clara",
    ],
    hookTemplates: [
      "¿PENSÁS QUE ES CARO?",
      "¿CREÉS QUE NO FUNCIONA?",
      "LO QUE NADIE TE CUENTA",
      "LA VERDAD SOBRE {{topic}}",
      "¿TENÉS DUDAS?",
      "RESPUESTAS CLARAS",
      "SIN LETRA CHICA",
      "TRANSPARENCIA TOTAL",
    ],
    subtitleTemplates: [
      "Te lo explicamos todo",
      "Sin sorpresas ocultas",
      "La información que necesitás",
      "Preguntas frecuentes resueltas",
    ],
    keywordTemplates: ["VERDAD", "RESPUESTA", "CLARO", "HONESTO"],
    visualPromptHints: [
      "Question mark transforming to checkmark",
      "Myth vs fact comparison",
      "Clear explanation visual",
      "Transparency window metaphor",
      "FAQ or info graphic style",
    ],
  },

  // ============================================================================
  // LIFESTYLE - Estilo de Vida
  // ============================================================================
  lifestyle: {
    id: "lifestyle",
    label: "Estilo de Vida",
    description: "Posiciona el producto como parte de un estilo de vida deseado.",
    whenToUse: "Cuando el producto refleja identidad o valores.",
    copyGuidelines: [
      "Describir el contexto de vida",
      "Usar aspiracional pero real",
      "Conectar emocionalmente",
    ],
    visualGuidelines: [
      "Contexto de vida cotidiana",
      "Personas relatable",
      "Ambiente que inspira",
    ],
    hookTemplates: [
      "PARA QUIENES {{lifestyle}}",
      "TU ESTILO, TU ELECCIÓN",
      "VIVILO A TU MANERA",
      "DISEÑADO PARA VOS",
      "PARTE DE TU DÍA",
      "ACOMPAÑÁNDOTE SIEMPRE",
      "TU COMPAÑERO IDEAL",
      "HECHO PARA TU VIDA",
    ],
    subtitleTemplates: [
      "Se adapta a tu ritmo",
      "Porque entendemos cómo vivís",
      "Para cada momento del día",
      "Tu estilo de vida merece esto",
    ],
    keywordTemplates: ["VIDA", "ESTILO", "LIBERTAD", "TUYO"],
    visualPromptHints: [
      "Lifestyle scene with product naturally integrated",
      "Daily routine moment capture",
      "Authentic real-life context",
      "Person enjoying their lifestyle",
      "Morning routine or daily ritual",
    ],
  },

  // ============================================================================
  // UGC - User Generated Content
  // ============================================================================
  ugc: {
    id: "ugc",
    label: "User Generated Content",
    description: "Utiliza contenido creado por usuarios reales.",
    whenToUse: "Cuando tienes videos o fotos auténticas de usuarios.",
    copyGuidelines: [
      "Mantener autenticidad",
      "Evitar sobreedición",
      "Resaltar testimonios reales",
    ],
    visualGuidelines: [
      "Videos de usuario sin filtro",
      "Fotos casuales de clientes",
      "Testimonios en primera persona",
    ],
    hookTemplates: [
      "USUARIOS REALES",
      "SIN FILTROS",
      "ASÍ LO USAN",
      "TESTIMONIOS REALES",
      "LA GENTE HABLA",
      "EXPERIENCIAS REALES",
      "MIRÁ CÓMO LO USAN",
      "OPINIONES GENUINAS",
    ],
    subtitleTemplates: [
      "Contenido 100% auténtico",
      "Lo que dicen nuestros clientes",
      "Sin actores, sin guiones",
      "Experiencias compartidas",
    ],
    keywordTemplates: ["REAL", "AUTÉNTICO", "GENUINO", "VERDADERO"],
    visualPromptHints: [
      "User-generated content aesthetic, casual photo",
      "Selfie style with product",
      "Phone screenshot or social media style",
      "Authentic unfiltered moment",
      "Review or unboxing aesthetic",
    ],
  },

  // ============================================================================
  // COMPARISON - Comparación
  // ============================================================================
  comparison: {
    id: "comparison",
    label: "Comparación",
    description: "Compara el producto con competidores o alternativas.",
    whenToUse: "Cuando el producto es superior en características o precio.",
    copyGuidelines: [
      "Ser honesto en comparativa",
      "Destacar diferencias clave",
      "Usar datos verificables",
    ],
    visualGuidelines: [
      "Tabla comparativa",
      "Lado a lado visual",
      "Checkmarks y X",
    ],
    hookTemplates: [
      "VS LA COMPETENCIA",
      "¿POR QUÉ ELEGIRNOS?",
      "LA DIFERENCIA ES CLARA",
      "COMPARALO VOS MISMO",
      "{{us}} VS {{them}}",
      "SUPERAMOS A TODOS",
      "EL MEJOR EN SU CLASE",
      "SIN COMPETENCIA",
    ],
    subtitleTemplates: [
      "Los números no mienten",
      "Compará y decidí",
      "La diferencia que importa",
      "Superior en todo sentido",
    ],
    keywordTemplates: ["MEJOR", "SUPERIOR", "GANADOR", "TOP"],
    visualPromptHints: [
      "Side by side comparison layout",
      "Checkmark vs X comparison",
      "Winner podium or trophy",
      "Comparison chart area",
      "This vs that visual split",
    ],
  },

  // ============================================================================
  // FEATURE_FOCUS - Enfoque en Características
  // ============================================================================
  feature_focus: {
    id: "feature_focus",
    label: "Enfoque en Características",
    description: "Destaca características específicas y funcionalidades.",
    whenToUse: "Cuando el producto tiene características únicas o avanzadas.",
    copyGuidelines: [
      "Explicar cada característica",
      "Beneficio de cada feature",
      "Lenguaje técnico preciso",
    ],
    visualGuidelines: [
      "Iconos de características",
      "Demostraciones de features",
      "Listado visual de capacidades",
    ],
    hookTemplates: [
      "TECNOLOGÍA {{feature}}",
      "INCLUYE {{feature}}",
      "CON {{feature}} INTEGRADO",
      "NUEVO: {{feature}}",
      "FUNCIONES PREMIUM",
      "TODO LO QUE NECESITÁS",
      "EQUIPADO CON LO MEJOR",
      "CARACTERÍSTICAS TOP",
    ],
    subtitleTemplates: [
      "Cada detalle pensado",
      "Funciones que marcan la diferencia",
      "Tecnología de última generación",
      "Lo que otros no tienen",
    ],
    keywordTemplates: ["TECH", "PRO", "PLUS", "MAX"],
    visualPromptHints: [
      "Product feature callout style",
      "Technical diagram aesthetic",
      "Specs and features icons",
      "Close-up detail shot",
      "Feature highlight with pointer",
    ],
  },

  // ============================================================================
  // BENEFIT_FOCUS - Enfoque en Beneficios
  // ============================================================================
  benefit_focus: {
    id: "benefit_focus",
    label: "Enfoque en Beneficios",
    description: "Enfatiza los beneficios y resultados para el usuario.",
    whenToUse: "Cuando el beneficio es más importante que la característica.",
    copyGuidelines: [
      "Traducir features a beneficios",
      "Enfocarse en resultados",
      "Lenguaje del cliente",
    ],
    visualGuidelines: [
      "Resultados en acción",
      "Transformación visible",
      "Personas disfrutando beneficios",
    ],
    hookTemplates: [
      "{{benefit}} GARANTIZADO",
      "LOGRÁ {{benefit}}",
      "MÁS {{benefit}} PARA VOS",
      "EL BENEFICIO: {{benefit}}",
      "LO QUE VAS A OBTENER",
      "RESULTADOS QUE SE VEN",
      "TU BENEFICIO REAL",
      "POR QUÉ LO NECESITÁS",
    ],
    subtitleTemplates: [
      "El beneficio que buscabas",
      "Resultados desde el día uno",
      "Lo que realmente importa",
      "Tu ganancia, no promesas",
    ],
    keywordTemplates: ["BENEFICIO", "RESULTADO", "LOGRO", "GANANCIA"],
    visualPromptHints: [
      "Person enjoying the benefit",
      "Result visualization",
      "Benefit in action scene",
      "Happy outcome moment",
      "Achievement unlocked aesthetic",
    ],
  },

  // ============================================================================
  // FEAR_OF_MISSING_OUT - Miedo a Perderse
  // ============================================================================
  fear_of_missing_out: {
    id: "fear_of_missing_out",
    label: "Miedo a Perderse",
    description: "Crea FOMO destacando lo que otros ya están obteniendo.",
    whenToUse: "Cuando quieres motivar acción por miedo a quedarse atrás.",
    copyGuidelines: [
      "Mostrar que otros ya lo usan",
      "Enfatizar oportunidad limitada",
      "Usar lenguaje de exclusividad",
    ],
    visualGuidelines: [
      "Grupo de personas disfrutando",
      "Indicadores de popularidad",
      "Disponibilidad limitada visible",
    ],
    hookTemplates: [
      "TODOS YA LO TIENEN",
      "¿VOS TODAVÍA NO?",
      "NO TE QUEDES AFUERA",
      "EL MOMENTO ES AHORA",
      "LO QUE TE ESTÁS PERDIENDO",
      "SUMATE A LA TENDENCIA",
      "NO SEAS EL ÚLTIMO",
      "YA ES VIRAL",
    ],
    subtitleTemplates: [
      "Miles ya lo están disfrutando",
      "La oportunidad no espera",
      "Sumate antes de que sea tarde",
      "Lo que todos comentan",
    ],
    keywordTemplates: ["VIRAL", "TENDENCIA", "HOT", "AHORA"],
    visualPromptHints: [
      "Group of people enjoying product",
      "Viral trending indicator",
      "Crowd excitement scene",
      "Exclusive club or community vibe",
      "Missing out visualization",
    ],
  },

  // ============================================================================
  // STATUS_IDENTITY - Status e Identidad
  // ============================================================================
  status_identity: {
    id: "status_identity",
    label: "Status e Identidad",
    description: "Apela al deseo de mejorar estatus social o identidad.",
    whenToUse: "Cuando el producto mejora la percepción de status.",
    copyGuidelines: [
      "Conectar con aspiraciones",
      "Usar símbolos de status",
      "Lenguaje aspiracional",
    ],
    visualGuidelines: [
      "Personas en contextos de estatus",
      "Productos de lujo o premium",
      "Ambientes exclusivos",
    ],
    hookTemplates: [
      "PARA QUIENES EXIGEN MÁS",
      "ELEVÁ TU NIVEL",
      "EXCLUSIVO PARA VOS",
      "EL ESTÁNDAR MÁS ALTO",
      "ELEGIDO POR LÍDERES",
      "DISTINCIÓN ABSOLUTA",
      "PARA LOS QUE SABEN",
      "CLASE APARTE",
    ],
    subtitleTemplates: [
      "Porque merecés lo mejor",
      "Tu status lo refleja",
      "Para quienes no se conforman",
      "El lujo de ser vos",
    ],
    keywordTemplates: ["ÉLITE", "VIP", "PREMIUM", "EXCLUSIVO"],
    visualPromptHints: [
      "Luxury environment setting",
      "Premium lifestyle scene",
      "VIP exclusive atmosphere",
      "High-end aesthetic details",
      "Status symbols subtly present",
    ],
  },

  // ============================================================================
  // SEASONAL - Estacional
  // ============================================================================
  seasonal: {
    id: "seasonal",
    label: "Estacional",
    description: "Aprovecha momentos estacionales o eventos especiales.",
    whenToUse: "En épocas festivas, cambio de temporada o eventos específicos.",
    copyGuidelines: [
      "Mencionar la época o evento",
      "Crear relevancia temporal",
      "Conectar con tradiciones",
    ],
    visualGuidelines: [
      "Elementos temáticos estacionales",
      "Colores de la temporada",
      "Referencias de eventos",
    ],
    hookTemplates: [
      "ESPECIAL {{season}}",
      "LLEGÓ LA TEMPORADA",
      "CELEBRÁ CON NOSOTROS",
      "{{event}} SALE",
      "IDEAL PARA {{occasion}}",
      "LA ÉPOCA PERFECTA",
      "TEMPORADA DE {{theme}}",
      "FESTEJÁ ACOMPAÑADO",
    ],
    subtitleTemplates: [
      "La mejor época para esto",
      "Aprovechá la temporada",
      "Celebrá como merecés",
      "El momento ideal llegó",
    ],
    keywordTemplates: ["TEMPORADA", "ESPECIAL", "FESTIVO", "ÉPOCA"],
    visualPromptHints: [
      "Seasonal theme elements",
      "Holiday or celebration mood",
      "Seasonal color palette",
      "Time-specific atmospheric lighting",
      "Festive decorative elements subtle",
    ],
  },

  // ============================================================================
  // GIFT - Regalo
  // ============================================================================
  gift: {
    id: "gift",
    label: "Regalo",
    description: "Posiciona el producto como regalo ideal.",
    whenToUse: "Cuando es época de regalos o compra para otros.",
    copyGuidelines: [
      "Enfatizar perfección del regalo",
      "Mencionar satisfacción del receptor",
      "Incluir opciones de empaque",
    ],
    visualGuidelines: [
      "Producto empaquetado hermosamente",
      "Personas compartiendo regalos",
      "Emociones positivas al recibir",
    ],
    hookTemplates: [
      "EL REGALO PERFECTO",
      "SORPRENDÉ A ALGUIEN",
      "REGALÁ {{emotion}}",
      "PARA ESA PERSONA ESPECIAL",
      "HACÉ FELIZ A ALGUIEN",
      "EL DETALLE QUE IMPORTA",
      "REGALO INOLVIDABLE",
      "LO QUE TODOS QUIEREN",
    ],
    subtitleTemplates: [
      "El detalle que marca la diferencia",
      "Regalá con sentido",
      "Para los que más querés",
      "Un regalo que emociona",
    ],
    keywordTemplates: ["REGALO", "SORPRESA", "ESPECIAL", "AMOR"],
    visualPromptHints: [
      "Gift wrapped product beautiful",
      "Giving moment emotional",
      "Present box with ribbon",
      "Joy of receiving gift",
      "Gift card or voucher aesthetic",
    ],
  },

  // ============================================================================
  // PROBLEM_SOLUTION - Problema / Solución
  // ============================================================================
  problem_solution: {
    id: "problem_solution",
    label: "Problema / Solución",
    description: "Presenta claramente un problema y su solución directa.",
    whenToUse: "Cuando hay un problema específico con solución clara.",
    copyGuidelines: [
      "Definir el problema claramente",
      "Presentar la solución de forma directa",
      "Mostrar el resultado esperado",
    ],
    visualGuidelines: [
      "Contraste problema vs solución",
      "Proceso de resolución",
      "Resultado final positivo",
    ],
    hookTemplates: [
      "¿PROBLEMA? SOLUCIONADO",
      "DE {{problem}} A {{solution}}",
      "LA SOLUCIÓN EXISTE",
      "ASÍ SE RESUELVE",
      "ENCONTRAMOS LA FORMA",
      "EL PROBLEMA TERMINA ACÁ",
      "SOLUCIÓN DEFINITIVA",
      "RESOLVÉ {{problem}} HOY",
    ],
    subtitleTemplates: [
      "El problema tiene solución",
      "Más fácil de lo que pensás",
      "Ya no es un problema",
      "La respuesta que buscabas",
    ],
    keywordTemplates: ["SOLUCIÓN", "RESUELTO", "LISTO", "HECHO"],
    visualPromptHints: [
      "Problem to solution visual journey",
      "Before problem after solution split",
      "Solution lightbulb moment",
      "Puzzle piece fitting",
      "Knot untying metaphor",
    ],
  },

  // ============================================================================
  // MYTH_BUSTING - Destrucción de Mitos
  // ============================================================================
  myth_busting: {
    id: "myth_busting",
    label: "Destrucción de Mitos",
    description: "Desmiente creencias erróneas sobre el producto o categoría.",
    whenToUse: "Cuando hay mitos o malentendidos que frenan la compra.",
    copyGuidelines: [
      "Identificar el mito común",
      "Desmentirlo con hechos",
      "Educar sin ser condescendiente",
    ],
    visualGuidelines: [
      "Contradicción visual clara",
      "Verdad revelada",
      "Datos comparativos",
    ],
    hookTemplates: [
      "MITO: {{myth}}",
      "LO QUE TE MINTIERON",
      "LA VERDAD DETRÁS DE",
      "CREÍAS QUE {{myth}}",
      "DESTRUYENDO MITOS",
      "DATO REAL",
      "NO ES LO QUE PENSÁS",
      "LA REALIDAD ES OTRA",
    ],
    subtitleTemplates: [
      "Te contamos la verdad",
      "Datos que no conocías",
      "Información verificada",
      "La ciencia dice otra cosa",
    ],
    keywordTemplates: ["VERDAD", "MITO", "FALSO", "REAL"],
    visualPromptHints: [
      "Myth crossed out, truth revealed",
      "Fact vs fiction comparison",
      "Revelación or unveiling moment",
      "Scientific proof aesthetic",
      "Stamp of truth or verification",
    ],
  },

  // ============================================================================
  // RESULTS - Resultados
  // ============================================================================
  results: {
    id: "results",
    label: "Resultados",
    description: "Muestra resultados concretos y medibles del producto.",
    whenToUse: "Cuando tienes datos de resultados verificables.",
    copyGuidelines: [
      "Usar números específicos",
      "Mostrar timeframes",
      "Incluir testimonios de resultados",
    ],
    visualGuidelines: [
      "Gráficos de progreso",
      "Métricas visuales",
      "Antes/después con datos",
    ],
    hookTemplates: [
      "{{percent}}% DE MEJORA",
      "RESULTADOS EN {{time}}",
      "{{number}} LOGROS COMPROBADOS",
      "ASÍ SON LOS RESULTADOS",
      "NÚMEROS QUE HABLAN",
      "PROBADO Y MEDIDO",
      "RESULTADOS GARANTIZADOS",
      "LA PRUEBA ESTÁ",
    ],
    subtitleTemplates: [
      "Resultados reales, sin trucos",
      "Medible y comprobable",
      "Los números no mienten",
      "Tu resultado puede ser este",
    ],
    keywordTemplates: ["RESULTADO", "ÉXITO", "LOGRO", "PRUEBA"],
    visualPromptHints: [
      "Progress chart or graph",
      "Results dashboard aesthetic",
      "Achievement metrics display",
      "Before after with numbers",
      "Success indicator visualization",
    ],
  },

  // ============================================================================
  // BUNDLE - Pack / Combo
  // ============================================================================
  bundle: {
    id: "bundle",
    label: "Pack / Combo",
    description: "Ofrece múltiples productos o servicios juntos.",
    whenToUse: "Cuando hay packs o combos con mejor valor.",
    copyGuidelines: [
      "Listar lo que incluye",
      "Mostrar ahorro del combo",
      "Destacar el valor total",
    ],
    visualGuidelines: [
      "Todos los productos juntos",
      "Valor total visible",
      "Etiqueta de pack",
    ],
    hookTemplates: [
      "PACK COMPLETO",
      "TODO INCLUIDO",
      "COMBO {{name}}",
      "{{number}} EN 1",
      "LLEVATE TODO",
      "BUNDLE ESPECIAL",
      "KIT COMPLETO",
      "PACK AHORRO",
    ],
    subtitleTemplates: [
      "Todo lo que necesitás junto",
      "Mejor valor, más productos",
      "El combo ideal",
      "Ahorrá comprando junto",
    ],
    keywordTemplates: ["PACK", "COMBO", "KIT", "BUNDLE"],
    visualPromptHints: [
      "Multiple products arranged together",
      "Bundle package visualization",
      "Value stack visual",
      "All-in-one package aesthetic",
      "Products grouped with savings tag",
    ],
  },

  // ============================================================================
  // PREMIUM - Premium
  // ============================================================================
  premium: {
    id: "premium",
    label: "Premium",
    description: "Posiciona el producto como de alta gama.",
    whenToUse: "Cuando el producto destaca por calidad superior.",
    copyGuidelines: [
      "Usar lenguaje de lujo",
      "Destacar materiales y procesos",
      "Enfatizar exclusividad",
    ],
    visualGuidelines: [
      "Estética de lujo",
      "Materiales premium visibles",
      "Iluminación sofisticada",
    ],
    hookTemplates: [
      "CALIDAD PREMIUM",
      "EXPERIENCIA DE LUJO",
      "LO MEJOR EN SU CLASE",
      "DISEÑO SUPERIOR",
      "PARA CONOCEDORES",
      "EXCELENCIA TOTAL",
      "NIVEL SUPERIOR",
      "ELITE COLLECTION",
    ],
    subtitleTemplates: [
      "Porque merecés lo mejor",
      "Calidad que se nota",
      "Diferencia premium",
      "Cuando solo lo mejor alcanza",
    ],
    keywordTemplates: ["PREMIUM", "LUJO", "ÉLITE", "TOP"],
    visualPromptHints: [
      "Luxury aesthetic dark and gold",
      "Premium material close-up texture",
      "High-end studio lighting",
      "Exclusive VIP atmosphere",
      "Sophisticated minimal composition",
    ],
  },

  // ============================================================================
  // ECO - Ecológico / Sustentable
  // ============================================================================
  eco: {
    id: "eco",
    label: "Ecológico / Sustentable",
    description: "Destaca características ecológicas y sustentables.",
    whenToUse: "Cuando el producto tiene beneficios ambientales.",
    copyGuidelines: [
      "Ser específico con claims eco",
      "Evitar greenwashing",
      "Mencionar certificaciones",
    ],
    visualGuidelines: [
      "Naturaleza y verde",
      "Materiales reciclados",
      "Simbolismo sustentable",
    ],
    hookTemplates: [
      "100% SUSTENTABLE",
      "CUIDAMOS EL PLANETA",
      "ECO FRIENDLY",
      "RECICLADO Y RECICLABLE",
      "HUELLA CERO",
      "NATURALEZA PURA",
      "CONSCIENTE AMBIENTAL",
      "VERDE POR ELECCIÓN",
    ],
    subtitleTemplates: [
      "Tu elección importa",
      "Por un futuro mejor",
      "Sustentable de verdad",
      "Cuidando lo que amamos",
    ],
    keywordTemplates: ["ECO", "VERDE", "NATURAL", "SUSTENTABLE"],
    visualPromptHints: [
      "Nature and greenery integration",
      "Eco-friendly materials visible",
      "Sustainable packaging",
      "Earth and nature tones",
      "Recycling or eco certification badge area",
    ],
  },

  // ============================================================================
  // COMFORT - Comodidad
  // ============================================================================
  comfort: {
    id: "comfort",
    label: "Comodidad",
    description: "Enfatiza la comodidad y bienestar del producto.",
    whenToUse: "Cuando el confort es un diferencial clave.",
    copyGuidelines: [
      "Describir sensaciones",
      "Usar lenguaje sensorial",
      "Conectar con bienestar",
    ],
    visualGuidelines: [
      "Personas relajadas",
      "Texturas suaves",
      "Ambientes acogedores",
    ],
    hookTemplates: [
      "CONFORT ABSOLUTO",
      "COMODIDAD EXTREMA",
      "SENTITE COMO EN CASA",
      "BIENESTAR TOTAL",
      "RELAX GARANTIZADO",
      "SUAVIDAD PREMIUM",
      "COMO UNA NUBE",
      "TU MOMENTO DE PAZ",
    ],
    subtitleTemplates: [
      "El confort que merecés",
      "Diseñado para tu bienestar",
      "Comodidad sin compromisos",
      "Tu espacio de relax",
    ],
    keywordTemplates: ["CONFORT", "RELAX", "PAZ", "SUAVE"],
    visualPromptHints: [
      "Person in comfortable relaxed pose",
      "Soft texture close-up",
      "Cozy warm atmosphere",
      "Relaxation and wellness scene",
      "Comfortable lifestyle moment",
    ],
  },

  // ============================================================================
  // PERFORMANCE - Rendimiento
  // ============================================================================
  performance: {
    id: "performance",
    label: "Rendimiento",
    description: "Destaca el alto rendimiento y performance del producto.",
    whenToUse: "Cuando el rendimiento es factor decisivo.",
    copyGuidelines: [
      "Usar métricas de rendimiento",
      "Comparar performance",
      "Lenguaje técnico cuando aplique",
    ],
    visualGuidelines: [
      "Dinamismo y acción",
      "Métricas de velocidad",
      "Producto en uso extremo",
    ],
    hookTemplates: [
      "MÁXIMO RENDIMIENTO",
      "PERFORMANCE EXTREMA",
      "SUPERA LÍMITES",
      "POTENCIA TOTAL",
      "ALTO DESEMPEÑO",
      "RENDIMIENTO SUPERIOR",
      "PODER SIN LÍMITES",
      "VELOCIDAD MÁXIMA",
    ],
    subtitleTemplates: [
      "Para los que exigen más",
      "Rendimiento que se nota",
      "Supera expectativas",
      "El poder está en tus manos",
    ],
    keywordTemplates: ["POWER", "MAX", "PRO", "TURBO"],
    visualPromptHints: [
      "Dynamic action shot",
      "Speed and motion blur",
      "Performance metrics display area",
      "Extreme use scenario",
      "Power and energy visualization",
    ],
  },

  // ============================================================================
  // MINIMAL - Minimalismo
  // ============================================================================
  minimal: {
    id: "minimal",
    label: "Minimalismo",
    description: "Destaca la esencia y lo fundamental del producto.",
    whenToUse: "Cuando el producto sobresale por su diseño o lo básico.",
    copyGuidelines: [
      "Menos es más",
      "Enfatizar esencia",
      "Eliminar lo innecesario",
    ],
    visualGuidelines: [
      "Espacios en blanco",
      "Diseño limpio",
      "Colores limitados",
    ],
    hookTemplates: [
      "SIMPLE. PERFECTO.",
      "MENOS ES MÁS",
      "ESENCIA PURA",
      "SIN EXCESOS",
      "LO ESENCIAL",
      "DISEÑO MINIMALISTA",
      "PUREZA TOTAL",
      "SOLO LO NECESARIO",
    ],
    subtitleTemplates: [
      "La belleza de lo simple",
      "Diseño en su estado puro",
      "Sin distracciones",
      "Elegancia minimalista",
    ],
    keywordTemplates: ["PURO", "ESENCIA", "SIMPLE", "CLEAN"],
    visualPromptHints: [
      "Clean minimal white space",
      "Single product hero shot",
      "Monochromatic color scheme",
      "Geometric simple shapes",
      "Zen-like peaceful composition",
    ],
  },
};

// Helper para obtener una definición con fallback
export function getAngleDefinition(angleId: MetaAngle): MetaAngleDefinition {
  return META_ANGLE_DEFINITIONS[angleId];
}

// Helper para obtener todos los IDs de ángulos
export function getAllAngleIds(): MetaAngle[] {
  return Object.keys(META_ANGLE_DEFINITIONS) as MetaAngle[];
}
