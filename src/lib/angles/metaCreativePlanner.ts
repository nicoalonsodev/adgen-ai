import { MetaAngle } from "./metaAngles";
import { META_ANGLE_DEFINITIONS, MetaAngleDefinition } from "./metaAngleDefinitions";

// ============================================================================
// ENUMS Y TIPOS
// ============================================================================

/**
 * Layout presets para composición visual del copy
 */
export enum LayoutPreset {
  /** Keyword grande neón + hook secundario */
  A_NEON_KEYWORD = "A_NEON_KEYWORD",
  /** Solo hook grande, impacto directo */
  B_HOOK_ONLY = "B_HOOK_ONLY",
  /** Badge/sticker con oferta o beneficio */
  C_BADGE = "C_BADGE",
  /** Split screen con texto en ambos lados */
  D_SPLIT = "D_SPLIT",
}

/**
 * Look presets para estilo visual/color
 */
export enum LookPreset {
  /** Neón cyber punk, colores vibrantes */
  NEON_CYBER = "NEON_CYBER",
  /** Azul premium profesional */
  PREMIUM_BLUE = "PREMIUM_BLUE",
  /** Blanco y negro dramático */
  NOIR = "NOIR",
  /** Tonos cálidos y terrosos */
  WARM_GRIT = "WARM_GRIT",
  /** Estudio limpio, fondo neutro */
  CLEAN_STUDIO = "CLEAN_STUDIO",
}

export interface CreativePlan {
  angleId: MetaAngle;
  hook: string;
  keyword: string | null;
  subtitle: string | null;
  layoutPreset: LayoutPreset;
  lookPreset: LookPreset;
  visualHints: string[];
  variantIndex: number;
  seed: number;
}

export interface BuildCreativePlanInput {
  businessName: string;
  productName?: string;
  mainBenefit?: string;
  mainPain?: string;
  discount?: string;
  angleId: MetaAngle;
  seed: number; // 0-39 para 40 variantes
}

// ============================================================================
// GENERADOR DETERMINÍSTICO (SEEDED RANDOM)
// ============================================================================

/**
 * Generador de números pseudo-aleatorios basado en seed
 * Usa algoritmo mulberry32 para determinismo
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Selecciona un elemento de un array basado en seed
 */
function selectFromArray<T>(array: T[], random: () => number): T {
  const index = Math.floor(random() * array.length);
  return array[index];
}

/**
 * Selecciona múltiples elementos únicos de un array
 */
function selectMultipleFromArray<T>(array: T[], count: number, random: () => number): T[] {
  const shuffled = [...array].sort(() => random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

// ============================================================================
// MAPEOS DE LAYOUTS Y LOOKS
// ============================================================================

const LAYOUT_PRESETS = Object.values(LayoutPreset);
const LOOK_PRESETS = Object.values(LookPreset);

/**
 * Mapeo de look presets a instrucciones de color
 */
export const LOOK_PRESET_DESCRIPTIONS: Record<LookPreset, string> = {
  [LookPreset.NEON_CYBER]:
    "Neon cyberpunk aesthetic with vibrant cyan, magenta and electric blue accents. Dark background with glowing text effects.",
  [LookPreset.PREMIUM_BLUE]:
    "Premium professional blue tones. Deep navy and royal blue with subtle gold or white accents. Elegant and trustworthy.",
  [LookPreset.NOIR]:
    "Dramatic black and white with high contrast. Deep shadows and bright highlights. Sophisticated and timeless.",
  [LookPreset.WARM_GRIT]:
    "Warm earthy tones with orange, amber and brown. Textured gritty look with film grain. Authentic and organic feel.",
  [LookPreset.CLEAN_STUDIO]:
    "Clean studio look with neutral background. Bright even lighting. Modern minimalist professional aesthetic.",
};

/**
 * Mapeo de layout presets a instrucciones de composición
 */
export const LAYOUT_PRESET_DESCRIPTIONS: Record<LayoutPreset, string> = {
  [LayoutPreset.A_NEON_KEYWORD]:
    "Large glowing keyword in center with neon effect. Hook text smaller below. Bold typography dominates.",
  [LayoutPreset.B_HOOK_ONLY]:
    "Single powerful hook text large and centered. Maximum impact, minimal distraction. Hero typography.",
  [LayoutPreset.C_BADGE]:
    "Badge or sticker style element containing the offer/benefit. Angled or circular badge design with bold text inside.",
  [LayoutPreset.D_SPLIT]:
    "Split composition with text on one side. Visual balance between image and text areas. Modern editorial layout.",
};

// ============================================================================
// PROCESAMIENTO DE TEMPLATES
// ============================================================================

/**
 * Variables disponibles para reemplazar en templates
 */
interface TemplateVariables {
  pain: string;
  desire: string;
  benefit: string;
  product: string;
  brand: string;
  discount: string;
  number: string;
  percent: string;
  time: string;
  feature: string;
  result: string;
  identity: string;
  emotion: string;
  lifestyle: string;
  authority: string;
  season: string;
  event: string;
  occasion: string;
  theme: string;
  problem: string;
  solution: string;
  myth: string;
  topic: string;
  name: string;
  us: string;
  them: string;
  days: string;
  amount: string;
}

/**
 * Genera variables por defecto basadas en el input del negocio
 */
function generateTemplateVariables(input: BuildCreativePlanInput): TemplateVariables {
  const productOrBrand = input.productName || input.businessName;
  const benefit = input.mainBenefit || "resultados increíbles";
  const pain = input.mainPain || "problemas";
  const discount = input.discount || "20%";

  return {
    pain: pain,
    desire: benefit,
    benefit: benefit,
    product: productOrBrand,
    brand: input.businessName,
    discount: discount,
    number: "1000+",
    percent: discount.replace("%", ""),
    time: "24hs",
    feature: "tecnología avanzada",
    result: benefit,
    identity: "la mejor versión de vos",
    emotion: "felicidad",
    lifestyle: "viven al máximo",
    authority: "expertos",
    season: "temporada",
    event: "hot sale",
    occasion: "el día especial",
    theme: "ofertas",
    problem: pain,
    solution: benefit,
    myth: "que no funciona",
    topic: productOrBrand,
    name: productOrBrand,
    us: productOrBrand,
    them: "la competencia",
    days: "30",
    amount: "$5000",
  };
}

/**
 * Procesa un template reemplazando variables
 */
function processTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Reemplazar todas las variables {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    result = result.replace(regex, value);
  }

  return result;
}

// ============================================================================
// FUNCIÓN PRINCIPAL: buildCreativePlan
// ============================================================================

/**
 * Construye un plan de creativo determinístico basado en seed
 *
 * @param input - Datos del negocio y configuración
 * @returns Plan completo para generar el creativo
 */
export function buildCreativePlan(input: BuildCreativePlanInput): CreativePlan {
  const random = seededRandom(input.seed * 12345 + 67890); // Seed transformada para variedad
  
  // Validar que el angleId existe en las definiciones
  const definition = META_ANGLE_DEFINITIONS[input.angleId];
  if (!definition) {
    throw new Error(`Invalid angleId "${input.angleId}". Valid angles: ${Object.keys(META_ANGLE_DEFINITIONS).join(", ")}`);
  }
  
  const variables = generateTemplateVariables(input);

  // Seleccionar hook
  const hookTemplate = selectFromArray(definition.hookTemplates, random);
  const hook = processTemplate(hookTemplate, variables);

  // Seleccionar keyword (puede ser null para algunos layouts)
  let keyword: string | null = null;
  if (definition.keywordTemplates && definition.keywordTemplates.length > 0) {
    // 70% probabilidad de incluir keyword
    if (random() < 0.7) {
      keyword = selectFromArray(definition.keywordTemplates, random);
    }
  }

  // Seleccionar subtitle (puede ser null)
  let subtitle: string | null = null;
  if (definition.subtitleTemplates && definition.subtitleTemplates.length > 0) {
    // 60% probabilidad de incluir subtitle
    if (random() < 0.6) {
      subtitle = selectFromArray(definition.subtitleTemplates, random);
    }
  }

  // Seleccionar layout preset
  const layoutPreset = selectFromArray(LAYOUT_PRESETS, random);

  // Seleccionar look preset
  const lookPreset = selectFromArray(LOOK_PRESETS, random);

  // Seleccionar visual hints (2-4)
  const hintCount = 2 + Math.floor(random() * 3);
  const visualHints = selectMultipleFromArray(definition.visualPromptHints, hintCount, random);

  return {
    angleId: input.angleId,
    hook,
    keyword,
    subtitle,
    layoutPreset,
    lookPreset,
    visualHints,
    variantIndex: input.seed,
    seed: input.seed,
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Genera planes para múltiples variantes de un mismo ángulo
 */
export function buildMultipleCreativePlans(
  baseInput: Omit<BuildCreativePlanInput, "seed">,
  count: number = 5
): CreativePlan[] {
  const plans: CreativePlan[] = [];

  for (let i = 0; i < count; i++) {
    plans.push(
      buildCreativePlan({
        ...baseInput,
        seed: i,
      })
    );
  }

  return plans;
}

/**
 * Genera planes para todos los ángulos con una variante cada uno
 */
export function buildPlansForAllAngles(
  baseInput: Omit<BuildCreativePlanInput, "seed" | "angleId">
): CreativePlan[] {
  const allAngles = Object.keys(META_ANGLE_DEFINITIONS) as MetaAngle[];
  const plans: CreativePlan[] = [];

  allAngles.forEach((angleId, index) => {
    plans.push(
      buildCreativePlan({
        ...baseInput,
        angleId,
        seed: index,
      })
    );
  });

  return plans;
}

/**
 * Construye el prompt visual completo para una imagen
 */
export function buildVisualPromptFromPlan(plan: CreativePlan): string {
  const lookDesc = LOOK_PRESET_DESCRIPTIONS[plan.lookPreset];
  const layoutDesc = LAYOUT_PRESET_DESCRIPTIONS[plan.layoutPreset];
  const hintsText = plan.visualHints.join(". ");

  return `
Visual Style: ${lookDesc}

Composition: ${layoutDesc}

Scene Elements: ${hintsText}

Text to render:
- Main Hook: "${plan.hook}"
${plan.keyword ? `- Keyword: "${plan.keyword}"` : ""}
${plan.subtitle ? `- Subtitle: "${plan.subtitle}"` : ""}
  `.trim();
}

/**
 * Obtiene la descripción del ángulo para contexto
 */
export function getAngleContext(angleId: MetaAngle): {
  label: string;
  description: string;
  copyGuidelines: string[];
  visualGuidelines: string[];
} {
  const def = META_ANGLE_DEFINITIONS[angleId];
  return {
    label: def.label,
    description: def.description,
    copyGuidelines: def.copyGuidelines,
    visualGuidelines: def.visualGuidelines,
  };
}
