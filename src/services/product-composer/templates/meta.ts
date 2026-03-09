/**
 * Template Metadata — FUENTE ÚNICA DE VERDAD
 *
 * Este archivo es importado tanto por el backend (index.ts / composeWithTemplateBeta)
 * como por el frontend (fabrica-de-contenido/page.tsx).
 *
 * Para agregar o modificar una plantilla:
 *   1. Editar TEMPLATE_META_LIST aquí
 *   2. Agregar el buildLayout en index.ts (solo si es una plantilla nueva)
 */

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  /** Emoji icon for UI display */
  icon?: string;
  /** UI tag/badge (e.g. "Premium", "Giveaway") */
  tag?: string | null;
  /** Whether this template is visible in the UI (default: true) */
  active?: boolean;
  /** Aspect ratios supported (e.g. "1:1", "4:5", "9:16") */
  supportedRatios: string[];
  /** Where the text copy renders in the layout */
  copyZone: "right" | "left" | "top" | "bottom" | "center" | "none" | "full";
  /**
   * Zone constraint passed to PRODUCT_IA.
   * Only set this when it intentionally differs from copyZone.
   * Defaults to copyZone when absent.
   */
  productIAZone?: "right" | "left" | "top" | "bottom" | "center" | "full";
  /**
   * Copy fields that OpenAI must generate for this template.
   * Sent as `templateSchema` in the GENERATE_COPY request.
   * Examples: ["headline", "subheadline", "badge", "productPrompt"]
   */
  copySchema: string[];
  /** true = runs PRODUCT_IA even without a product photo (person/scene templates) */
  requiresSceneGeneration: boolean;
  /** true = can be used in sequence / carousel mode */
  supportsSequence?: boolean;
  /** true = no product layer at all (e.g. sorteo-giveaway) */
  noProductLayer?: boolean;
  /** true = scene includes person holding the product (persona-producto) */
  sceneWithProduct?: boolean;
  /**
   * true = the generated scene should cover the ENTIRE canvas (full-bleed),
   * instead of being confined to the opposite side of the copyZone.
   * The prompt will instruct the model to keep the headline/logo areas
   * readable (no face/body directly behind text) but allow the scene
   * to extend underneath the overlay.
   * Designed for templates like bebas-urgencia-top where a dark overlay
   * ensures text legibility over the full-bleed scene.
   */
  sceneFullBleed?: boolean;
  /**
   * true = expandSceneBrief will describe ONLY the person (appearance, pose,
   * expression, clothing) without any environment/setting details.
   * Use on templates where the background is pre-generated and must not be
   * overridden by scene environment descriptions (e.g. dark studio backgrounds).
   */
  personOnly?: boolean;
  /**
   * true = when this template falls through to Flujo D (product injection),
   * the prompt intentionally describes a person in the scene.
   * Enables ABSOLUTE_RULES_ANATOMY in buildProductIAPrompt.
   * Never set on product-only templates.
   */
  personScene?: boolean;
  /**
   * true = for sceneWithProduct templates: generate a generic/unbranded product clone via
   * generateGenericProduct before passing it to Gemini. The clone looks more natural when held.
   */
  useGenericProductClone?: boolean;
  /** true = skip logo overlay (the layout has no space for it) */
  noLogo?: boolean;
  /** Position of the logo overlay (default: "left") */
  logoPosition?: "left" | "center";
  /** true = use Sharp split-comparison product placement (no Gemini needed) */
  splitComparison?: boolean;
  /** Business category IDs recommended for this template */
  recommendedFor: string[];
  /** Background prompt sent to Gemini */
  defaultBackgroundPrompt: string;
  /**
   * Background prompt for dark mode (colorMode: "dark").
   * Replaces defaultBackgroundPrompt when the task is rendered in dark mode.
   */
  darkBackgroundPrompt?: string;
  /**
   * Category-specific background prompts. Keyed by business category ID (e.g. "belleza-cosmetica").
   * When set and the user's business category matches a key, this prompt overrides defaultBackgroundPrompt.
   */
  categoryBackgroundPrompts?: Partial<Record<string, string>>;
  /**
   * true = sends defaultBackgroundPrompt (or the matched categoryBackgroundPrompt) to Gemini as-is,
   * no role wrapper or rules. Use when the template has a precise, self-contained prompt.
   */
  rawBackgroundPrompt?: boolean;
  /** Product/scene prompt sent to Gemini (fallback if OpenAI doesn't generate one) */
  defaultProductPrompt?: string;
  /**
   * true = sends defaultProductPrompt to Gemini as-is, no role wrapper or rules.
   * Use when the template has a precise, self-contained prompt.
   */
  rawProductPrompt?: boolean;
  /**
   * Hint sent to the copy-generation LLM (OpenAI) explaining the template's visual
   * structure, field constraints, and how to write each copy field.
   * Centralised here so every prompt-related config lives in one file.
   */
  templateHint?: string;
  /**
   * After Gemini composites the product, re-overlay the original product PNG at this
   * exact position using Sharp to restore sharpness that Gemini tends to blur.
   * Use for templates where the product must stay razor-sharp (e.g. macro-texture backgrounds).
   */
  sharpProductOverlay?: {
    /** Product width as fraction of canvas width (e.g. 0.13 = 13%) */
    sizePct: number;
    /** Center X (0–1, 0.5 = horizontal center) */
    centerX: number;
    /** Center Y (0–1, 0.5 = vertical center) */
    centerY: number;
    /** Clockwise rotation in degrees (default 0) */
    rotation?: number;
  };
  /**
   * true = use Pipeline V2 (creative-brief-driven generation) for this template.
   * V2 flow: generateCreativeBrief (OpenAI) → generateGeminiPrompts → generateBackground → generateScene.
   * When false/undefined, the template uses the legacy V1 pipeline.
   */
  pipelineV2?: boolean;
}

export const TEMPLATE_META_LIST: TemplateMetadata[] = [
  {
    id: "classic-editorial-right",
    name: "Classic Editorial",
    icon: "🖼️",
    tag: null,
    active: true,
    description:
      "Fondo full-bleed, copy en columna derecha, badge pill al fondo.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "right",
    copySchema: [
      "title",
      "headline",
      "subheadline",
      "badge",
      "bullets",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    personScene: false,
    recommendedFor: [
      "belleza-cosmetica",
      "moda-indumentaria",
      "joyeria-accesorios",
      "hogar-deco",
      "salud-bienestar",
    ],
    defaultBackgroundPrompt:
      "Fondo minimalista con pared lisa de textura suave, tipo estudio fotográfico premium. Iluminación natural lateral desde ventana fuera de cuadro, sombras diagonales orgánicas y difusas sobre la pared. Sin objetos, sin texto, sin personas, sin productos. Fondo claro con profundidad sutil, sensación de calma y cuidado personal.",
    darkBackgroundPrompt:
      "Fondo minimalista con pared lisa de textura suave, tipo estudio fotográfico premium. Iluminación dramática lateral tenue desde ventana fuera de cuadro, sombras profundas y envolventes. Sin objetos, sin texto, sin personas, sin productos. Fondo muy oscuro — tonos carbón, negro cálido o azul medianoche — con profundidad sutil y sensación de lujo y sofisticación.",
    rawBackgroundPrompt: true,
    defaultProductPrompt: `Edit the image adding a photorealistic human hand emerging from the LEFT or BOTTOM-LEFT edge, staying within the LEFT 45% of the canvas. The hand holds the product with a natural grip — fingers curled with realistic compression against the product surface. Render anatomically accurate skin with visible pores, knuckles, tendons and subtle veins. Apply subsurface scattering on fingertips. Lighting must match the scene exactly: same light direction, color temperature and intensity. Add natural contact shadows between hand and product. No compositing artifacts, halos or color fringing. The product must be fully visible, upright and legible.`,
    templateHint: `TEMPLATE HINT for classic-editorial-right:
  This template has the product on the LEFT and copy on the RIGHT.
  - title: 3-5 keywords separated by " · ", max 50 chars.
    Use ingredients, attributes or brand values.
    Example: "Colágeno · Ácido Hialurónico · Vitamina C"
  - headline: short emotional phrase, max 6 words, ends with period.
    Must connect emotionally. Example: "La piel habla cuando la cuidás."
  - subheadline: 1-2 benefit sentences, max 120 chars, specific and direct.
  - badge: short offer in pill format, max 35 chars.
    Example: "60% OFF en la segunda unidad"
  - bullets: array of 3 concrete benefits with relevant emoji, max 40 chars each.
  - productPrompt: product held by a hand emerging from the LEFT or bottom-left,
    leaving the right half completely clean for text.`,
  },
  {
    id: "promo-urgencia-bottom",
    name: "Promo Urgencia",
    icon: "⚡",
    tag: null,
    active: false,
    description:
      "Layout de oferta centrado, copy en franja inferior, producto arriba",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "bottom",
    copySchema: ["badge", "headline", "cta", "backgroundColorHint"],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    recommendedFor: [
      "belleza-cosmetica",
      "alimentos-bebidas",
      "moda-indumentaria",
      "fitness-deporte",
      "tecnologia",
    ],
    defaultBackgroundPrompt:
      "Fondo liso y uniforme, superficie completamente homogénea, sin texturas llamativas. Iluminación suave y envolvente, sin sombras duras. Sin objetos, sin texto, sin personas. Fondo muy claro. Estilo ciclorama fotográfico minimalista y limpio.",

    defaultProductPrompt:
      "Integrate the product being held by an elegant hand emerging from below-center of the frame, within the TOP 58% of the canvas. The product should feel premium and desirable. Fully visible, no cropping.",
    templateHint: `TEMPLATE HINT for promo-urgencia-bottom:
  This template has the product in the TOP zone and offer copy at the BOTTOM.
  - badge: the MOST impactful offer, shown prominently at top of copy zone.
    Max 30 chars. This is the first thing read. Example: "60% OFF HOY"
  - headline: short emotional centered phrase, max 6 words, ends with period.
    Example: "Recupera la firmeza que amás."
  - cta: direct call to action, max 20 chars.
    Example: "¡Compra Ahora!" or "Quiero el mío"
  - productPrompt: product held by a hand in the TOP CENTER of the image,
    fully visible, leaving the bottom 40% completely clear for text.`,
  },
  {
    id: "hero-center-bottom",
    name: "Hero Center",
    icon: "🎯",
    tag: "Combo / Lanzamiento",
    active: true,
    description:
      "Título arriba, producto centrado con IA, oferta grande abajo. Ideal para combos, lanzamientos y promociones especiales.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "center",
    personScene: false,
    copySchema: [
      "title",
      "headline",
      "subheadline",
      "badge",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    recommendedFor: [
      "belleza-cosmetica",
      "moda-indumentaria",
      "turismo-viajes",
      "gastronomia",
      "mascotas",
    ],
    defaultBackgroundPrompt:
      "Fondo satinado suave con textura sedosa muy sutil. Iluminación difusa y envolvente, reflejos suaves. Sin objetos, sin texto, sin personas. Estilo fotografía de estudio de lujo, fondo claro con sensación de suavidad.",
    defaultProductPrompt:
      "Integrate the product being held by an elegant hand from below-center, placed in the CENTER zone between 22% and 68% from top. IMPORTANT: the product must be SMALL — scale it down so it occupies at most 30% of the canvas width. Leave generous negative space around it. Premium product photography style, soft lighting matching the background.",
    templateHint: `TEMPLATE HINT for hero-center-bottom:
- title: short product or combo name, max 40 chars, can use · separator. Example: "DERMA Lisse · Reafirmante"
  Do NOT repeat the full product description. Keep it elegant and brief.
- headline: the BIG offer in large bold text, max 35 chars.
  Example: "50% OFF + ENVÍO GRATIS"
  Keep it SHORT — this renders very large on screen.
- subheadline: one sentence describing the product benefit, max 100 chars
- badge: a DIFFERENT secondary offer or payment info, max 30 chars.
  Must be different from headline.
  Example: "3 cuotas sin interés" or "Envío gratis hoy"`,
  },
  {
    id: "headline-top-left",
    name: "Headline Top",
    icon: "📰",
    tag: "Premium",
    active: false,
    description:
      "Headline grande arriba, producto centrado abajo. Debes generar plataforma luxure con profundidad para ubicar el producto. Ideal para lanzamientos y productos premium.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "bottom",
    copySchema: [
      "headline",
      "subheadline",
      "disclaimer",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    recommendedFor: [
      "belleza-cosmetica",
      "servicios-profesionales",
      "educacion-cursos",
      "salud-estetica-clinica",
      "bienes-raices",
    ],
    defaultBackgroundPrompt:
      "Fondo liso, superficie uniforme tipo ciclorama. Iluminación natural suave y difusa, sin sombras dramáticas. Sin texturas, sin objetos, sin texto, sin personas. Fondo claro. Minimalista y limpio, ideal para tipografía oscura.",
    defaultProductPrompt:
      "You are a luxury product photographer. Integrate the product using ONE of these two approaches — choose whichever feels most natural and premium for this product:\n\nOPTION A — Hand hold: An elegant, well-manicured hand holds the product from below, emerging naturally within the BOTTOM 65% of the canvas. The hand should feel graceful and intentional.\n\nOPTION B — Surface placement: The product rests on a beautiful surface (marble, light wood, soft fabric, or frosted glass) within the BOTTOM 65% of the canvas. Add a subtle shadow and perhaps a soft reflection. The surface should complement the background colors.\n\nEither way: luxury editorial photography style, soft natural lighting, the product fully visible and label legible, no cropping. The TOP 35% must remain completely clean.",
    templateHint: `TEMPLATE HINT for headline-top-left:
  Large headline at top-center, product with hand in the bottom center.
  - headline: bold emotional statement, max 7 words, ends with period.
    Large font — keep it SHORT. Example: "Firmeza visible para tu piel."
  - subheadline: one specific benefit line, max 80 chars.
    Example: "Ideal para piernas, glúteos y abdomen."
  - disclaimer: short social-proof line, max 45 chars.
    Start with "✓ " or "★ " then a trust signal using real numbers if available.
    Example: "✓ +12.000 mujeres ya lo usan" or "★ +8.000 clientas satisfechas"
  - productPrompt: product held by an elegant hand from below-center,
    product fully visible, top 35% of image completely clean for headline text.`,
  },
  {
    id: "pain-point-left",
    name: "Punto de Dolor",
    icon: "😟",
    tag: "Awareness",
    active: true,
    description:
      "Copy del dolor a la izquierda, persona/escena a la derecha generada con IA. Ideal para contenido de awareness.",
    supportedRatios: ["1:1"],
    copyZone: "left",
    copySchema: [
      "headline",
      "subheadline",
      "badge",
      "backgroundColorHint",
      "sceneAction",
    ],
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "fitness-deporte",
      "servicios-profesionales",
      "educacion-cursos",
      "salud-estetica-clinica",
    ],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y uniforme. Sin sombras fuertes, sin texturas llamativas. Ambiente cotidiano y realista. Sin objetos, sin texto. Estilo lifestyle natural y auténtico, fondo claro que no compita con la tipografía oscura.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person in a natural candid lifestyle moment on the RIGHT side of the image. The LEFT 50% must remain completely clean. Authentic, documentary feel.",
    templateHint: `TEMPLATE HINT for pain-point-left:
  This template is for AWARENESS content — it exposes a pain point
  or problem the audience experiences related to the SPECIFIC PRODUCT
  being advertised.
  NEVER use generic beauty or skin examples.
  Always base the pain point on the actual product and audience.

  - headline: A bold statement about a REAL PROBLEM the target audience
    has that the product solves. Must be specific to the product category.
    Max 8 words.

    If product is binoculars: "La visión borrosa arruina tu aventura."
    If product is a cream: "Las estrías aparecen sin aviso."
    If product is a supplement: "El cansancio te frena cada día."
    ALWAYS adapt to the actual product.

  - subheadline: Expands the specific problem. Max 80 chars.
    Must be relevant to the product being advertised.

  - badge: Soft CTA or intriguing question. Max 30 chars.

  - backgroundColorHint: Very light pale tone. Max 8 words.

  - sceneAction: Describe a REAL PERSON experiencing the pain point
    specific to this product. Must match the headline.
    Person on RIGHT side, LEFT 50% completely clean.

    If product is binoculars: "Person squinting trying to see something
    far away, hand shielding eyes from sun, outdoors"
    If product is a cream: "Woman looking at her skin with concern"
    ALWAYS adapt the scene to the actual product and pain point.`,
  },
  {
    id: "comparacion-split",
    name: "Comparación",
    icon: "⚖️",
    tag: "Vs Competencia",
    active: true,
    description:
      "Izquierda: tu producto real. Derecha: versión genérica/inferior. Estilo 'US VS THEM' con fondo bicolor y puntos de comparación numerados.",
    supportedRatios: ["1:1"],
    copyZone: "full",
    copySchema: [
      "headline",
      "badge",
      "columnTitle",
      "competitionTitle",
      "bullets",
      "competitionBullets",
      "backgroundColorHint",
      "primaryColor",
    ],
    requiresSceneGeneration: false,
    splitComparison: true,
    recommendedFor: [
      "belleza-cosmetica",
      "tecnologia",
      "salud-bienestar",
      "fitness-deporte",
      "servicios-profesionales",
    ],
    defaultBackgroundPrompt:
      "Fondo completamente liso, sin texturas llamativas. Iluminación suave y uniforme sin sombras. Sin objetos, sin texto, sin personas, sin manos. Fondo claro. Ambiente minimalista premium.",
    defaultProductPrompt: "",
    templateHint: `TEMPLATE HINT for comparacion-split:
  This template is a "US VS THEM" style comparison.
  YOUR product is on the LEFT (warm brown background).
  COMPETITION is on the RIGHT (lighter beige background).
  A big centered title at top, column labels below, then 4 numbered comparison points.

  - headline: the main comparison title, bold and punchy. Max 30 chars, uppercase.
    Examples: "NOSOTROS VS ELLOS", "TU MARCA VS EL RESTO", "LO REAL VS LO BARATO"
    Must contain "VS" or a comparison concept.

  - badge: top offer or claim pill, max 40 chars. Optional.
    Example: "3 cuotas sin interés + envío gratis"

  - columnTitle: YOUR product/brand name, short, max 20 chars, uppercase.
    This is the LEFT column label on the brown side.
    Example: "MEENO" or "DERMALISSE" or "NOSOTROS"

  - competitionTitle: generic competition label, max 20 chars, uppercase.
    This is the RIGHT column label on the beige side.
    Example: "ELLOS" or "CREMA COMÚN" or "OTRAS MARCAS"

  - bullets: array of exactly 4 YOUR PRODUCT benefits.
    NO emojis, NO ✓ symbols — they are added automatically.
    Focus on specific, provable benefits. Max 40 chars each.
    Example: ["100% natural e ingredientes vegetales", "Resultados permanentes comprobados",
              "Sin efectos secundarios", "Garantía de devolución 90 días"]

  - competitionBullets: array of exactly 4 COMPETITION weaknesses.
    NO emojis, NO ✗ symbols — they are added automatically.
    Realistic and recognizable, not exaggerated. Max 40 chars each.
    Example: ["Químicos agresivos", "Resultados temporales",
              "Posibles efectos secundarios", "Sin garantía de devolución"]`,
  },
  {
    id: "comparacion-split-ia",
    name: "Comparación con Escena",
    icon: "⚖️",
    tag: "Vs Competencia + IA",
    active: false,
    description:
      "Izquierda: versión genérica/inferior del producto (✗). Derecha: tu producto real (✓). La IA duplica tu producto degradado a la izquierda con overlays semitransparentes.",
    supportedRatios: ["1:1"],
    copyZone: "full",
    copySchema: [
      "title",
      "headline",
      "subheadline",
      "badge",
      "bullets",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "fitness-deporte",
      "salud-estetica-clinica",
      "servicios-profesionales",
    ],
    defaultBackgroundPrompt:
      "Fondo completamente liso, sin texturas llamativas. Iluminación suave y uniforme sin sombras. Sin objetos, sin texto, sin personas, sin manos. Fondo claro. Ambiente minimalista premium.",
    defaultProductPrompt:
      "Studio packshot photography with LEVITATING products. You receive a beige background and a product image.\n\nYou must create TWO copies of the product, both FLOATING in mid-air:\n\n1) RIGHT SIDE (center at 72% x, 38% y): The ORIGINAL product. Full color, vibrant, sharp, premium lighting. Slightly larger. This is the hero. The product floats naturally with a soft shadow directly beneath it on the ground.\n\n2) LEFT SIDE (center at 28% x, 38% y): A DEGRADED copy of the same product. Apply these effects: almost completely grayscale/heavily desaturated, reduced contrast and sharpness, faded dull washed out appearance, about 75% the size of the right product, also floating with a softer more diffuse shadow beneath.\n\nCRITICAL STYLE: This is LEVITATING product photography. Both products float in the air above the surface. There is EMPTY SPACE between the product and the ground. A soft drop shadow appears on the surface below each product.\n\nPROHIBITED: hands, fingers, arms, people, holders, stands, pedestals. Products float by themselves.",
  },
  {
    id: "sorteo-giveaway-center",
    name: "Sorteo / Giveaway",
    icon: "🎁",
    tag: "Giveaway",
    active: true,
    description:
      "Foto con personas full-bleed generada en el background, copy centrado en capas encima. Headline enorme uppercase, línea script italic debajo, badge de premios y CTA de colaboración al pie. Ideal para sorteos, giveaways y activaciones con influencers.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "center",
    copySchema: [
      "title",
      "headline",
      "subheadline",
      "badge",
      "bullets",
      "backgroundPrompt",
    ],
    requiresSceneGeneration: false,
    noProductLayer: true,
    logoPosition: "center",
    supportsSequence: false,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "moda-indumentaria",
      "salud-estetica-clinica",
      "gastronomia",
      "mascotas",
    ],
    defaultBackgroundPrompt:
      "Warm authentic lifestyle photo of two people — a mother and daughter or two close women — sharing a tender moment together, wearing soft white robes or towels, smiling naturally at each other or at a gift they are holding, this gift must be the product. Full-bleed scene, fills the entire canvas. Lighting warm and soft, cinematic quality. Slightly darker in the center-bottom area to ensure white text readability. No text, no logos, no products visible. Photorealistic, emotional and genuine, not stock-photo generic.",
    defaultProductPrompt: "",
    templateHint: `TEMPLATE HINT for sorteo-giveaway-center:
  This template places emotional lifestyle copy OVER a full-bleed photo generated as the background.
  There is NO product layer — the background IS the scene. Copy is layered on top.

  CRITICAL: The backgroundPrompt is the most important field.
  It will be sent directly to an image generation AI to create the background photo.
  It MUST be in English, photorealistic, and adapted to the brand and product being sold.
  The scene should feel emotionally connected to the product category.

  - title: brand name only. VERY SHORT — max 20 chars. Example: "GALÉNICA" or "DERMA LISSE"

  - headline: 1 word only, all uppercase. This renders ENORMOUS.
    Example: "SORTEO" or "GIVEAWAY" or "REGALO"
    NEVER more than 2 words.

  - subheadline: max 4 words, poetic and emotional, NO punctuation.
    Renders in italic script style. Example: "Día de la madre" or "Para las que más amás"

  - badge: prize highlight, max 35 chars. Example: "6 PREMIOS / 6 GANADORAS"

  - bullets: array with exactly 1 item — collaboration/CTA footer.
    Example: ["Junto a @saludybellezaconsciente"] — max 45 chars.

  - backgroundPrompt: REQUIRED. English. Full cinematic background scene description.
    MUST be adapted to the product category. Rules:
    • Include real people in a genuine emotional moment (2 women, mother/daughter, friends)
    • Scene must relate to the product: skincare → spa/bathroom ritual; food → kitchen/table;
      fitness → outdoors/gym; jewelry → elegant event; pets → park/home with pet
    • Full-bleed, fills the entire canvas
    • Warm soft cinematic lighting
    • Slightly darker/moodier in center-bottom area for white text readability
    • No text, no logos, no visible product labels
    • Photorealistic, NOT stock-photo generic — genuine and emotional

    Examples by category:
    Skincare/beauty: "Two women in soft white robes sharing a skincare moment in a bright bathroom, one applying serum, warm golden lighting, cinematic, full canvas, darker center for text overlay"
    Food/gastronomy: "Mother and daughter cooking together in a warm sunlit kitchen, laughing, ingredients on counter, cinematic warm lighting, full canvas, slightly darker center"
    Fitness: "Two women on a sunny outdoor trail celebrating after a run, hugging and laughing, energetic and genuine, cinematic lighting, full canvas"
    Pets: "Young woman lying on grass with her golden dog, both looking happy, soft afternoon light, full canvas, emotional and genuine"`,
  },
  {
    id: "antes-despues",
    name: "Antes vs Después",
    icon: "📅",
    tag: "Transformación",
    active: true,
    description:
      "Split Day 1 vs Day X: izquierda problemas (fondo blanco), derecha resultados (fondo amarillo/color), producto grande centrado abajo cruzando ambas columnas.",
    supportedRatios: ["1:1"],
    copyZone: "full",
    copySchema: [
      "badge",
      "columnTitle",
      "competitionTitle",
      "bullets",
      "competitionBullets",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    noLogo: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "fitness-deporte",
      "salud-estetica-clinica",
      "alimentos-bebidas",
    ],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro, sin texturas llamativas. Iluminación suave y uniforme sin sombras. Sin objetos, sin texto, sin personas, sin manos. Ambiente minimalista premium.",
    defaultProductPrompt:
      "Integrate the product CENTERED at the BOTTOM of the canvas, occupying roughly 50-60% width. The product must span across the center of the image. Place it in the BOTTOM 40% zone. Studio product photography, clean white/light background behind the product, soft shadow beneath. The product must be fully visible, no hands, no cropping. Premium clean look. Tienes prohibido modificar el background, solo debes agregar el producto en la zona indicada.",
    templateHint: `TEMPLATE HINT for antes-despues:
  This template is a "Before & After" / "Day 1 vs Day X" style split comparison.
  LEFT side (white background): the BEFORE state — problems, pain, symptoms.
  RIGHT side (yellow background): the AFTER state — results, benefits, transformation.
  The product is placed LARGE at the bottom center, spanning both columns.

  IMPORTANT: This is NOT a competition comparison. It shows the SAME PERSON's journey
  from BEFORE using the product to AFTER using it over time.

  - competitionTitle: the BEFORE label. Short, uppercase. Max 15 chars.
    Examples: "DÍA 1", "ANTES", "SIN TRATAMIENTO"
    This is the LEFT column header.

  - columnTitle: the AFTER label. Short, uppercase. Max 15 chars.
    Examples: "DÍA 90", "DESPUÉS", "CON [BRAND]"
    This is the RIGHT column header.

  - competitionBullets: array of exactly 3-4 BEFORE problems/symptoms.
    NO emojis, NO bullet symbols — they are added automatically.
    Realistic problems the target audience recognizes. Max 45 chars each.
    Example: ["Manchas y puntos negros", "Sobreproducción de grasa", "Desequilibrio hormonal"]

  - bullets: array of exactly 3-4 AFTER results/benefits.
    NO emojis, NO bullet symbols — they are added automatically.
    Specific, positive, measurable results. Use **bold** for key words.
    Max 45 chars each.
    Example: ["Manchas reducidas un 99%", "Regulación del sebo facial", "Equilibrio hormonal visible"]

  - badge: optional bottom CTA or guarantee. Max 35 chars.
    Example: "Garantía de satisfacción 90 días" or "Envío gratis a todo el país"

  - backgroundColorHint: very light/neutral tone. Max 8 words. The layout
    already has white left + yellow right, so this is for the base background.
    Example: "blanco puro y limpio"`,
  },
  {
    id: "beneficios-producto",
    name: "Beneficios Producto",
    icon: "✨",
    tag: "Beneficios",
    active: true,
    description:
      "Producto hero grande a la izquierda, 4 beneficios con pills a la derecha. Fondo gris oscuro, estilo profesional y limpio.",
    supportedRatios: ["1:1"],
    copyZone: "right",
    copySchema: [
      "headline",
      "subheadline",
      "badge",
      "bullets",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "alimentos-bebidas",
      "fitness-deporte",
      "tecnologia",
      "hogar-deco",
    ],
    defaultBackgroundPrompt:
      "Fondo color gris medio uniforme (#7A7A7A). En la zona centro-izquierda del canvas, dibujar un GRAN CÍRCULO o ARCO decorativo semitransparente de color gris más claro (#9A9A9A, opacidad ~30%), con un diámetro de aproximadamente 65% del canvas. Este arco debe estar parcialmente detrás de donde irá el producto (centro-izquierda). Iluminación suave y envolvente estilo estudio fotográfico premium. Sin objetos, sin texto, sin personas, sin manos, sin productos. Solo el fondo gris con el arco decorativo sutil. Estilo minimalista profesional tipo BODY TALES.",
    rawBackgroundPrompt: true,
    defaultProductPrompt:
      "This is an IMAGE EDITING task, NOT image generation. The original background must be preserved exactly as provided — do not replace, recolor, or regenerate it under any circumstances. ONLY perform these actions: 1. Extract the existing product from the image 2. Reposition it to the LEFT of the canvas (horizontal center at ~22%) 3. Scale it so it occupies ~48% canvas width and ~70% canvas height 4. Tilt it slightly for dynamism 5. Add a soft shadow beneath matching the scene lighting. DO NOT touch anything else. The background, text, colors, textures, and all existing graphic elements must remain 100% unchanged. The RIGHT 50% of the canvas stays completely clean — do not add anything there. Product must be fully opaque, fully visible, never cropped or faded. No people, no hands, no new elements.",
    templateHint: `TEMPLATE HINT for beneficios-producto:
  HIGH-IMPACT design. PRODUCT on the LEFT (large hero), RIGHT side has a BIG BOLD HEADLINE
  (displayed in UPPERCASE, renders very large — wraps to 2 lines) + 4 KEY BENEFITS.

  The headline is the VISUAL ANCHOR of the creative — it renders at ~73px.
  Think of it like a magazine cover headline: bold, punchy, emotional.

  CRITICAL RULES:
  - Do NOT add any prefix to bullets (no ●, no •, no ▸, no -, no →). The template adds "—" automatically.
  - Keep bullets SHORT — max 20 chars each. 3-4 words max.
  - headline renders UPPERCASE and VERY LARGE — it will wrap to 2 lines if > 12 chars. That is DESIRED.

  - headline: emotional product claim. 12-25 chars. Will render UPPERCASE and HUGE.
    Ideally 2-4 words that wrap naturally to 2 lines.
    Example: "Piel que se renueva" or "Firmeza visible" or "Hidratación que dura"
    The headline IS the hero — make it powerful and emotional.

  - subheadline: 1 short benefit sentence. Max 45 chars. 1 line only.
    Example: "Fórmula de reparación con ácido hialurónico"

  - bullets: array of exactly 4 CORE BENEFITS. Max 20 chars each.
    NO emojis, NO bullet prefixes — just the benefit text.
    Example: ["Previene sequedad", "Reduce arrugas", "Textura uniforme", "Piel más suave"]

  - badge: bottom CTA pill (displayed with lime/electric accent color). Max 30 chars.
    Make it action-oriented or an irresistible offer.
    Example: "60% OFF en segunda unidad" or "Ver producto"

  - backgroundColorHint: medium gray tone. Max 5 words.
    Example: "gris medio estudio"`,
  },
  {
    id: "razones-producto",
    name: "Razones Producto",
    icon: "🎯",
    tag: "Razones",
    active: true,
    description:
      "Producto CENTRADO con 4 beneficios distribuidos alrededor (esquinas). Fondo cálido durazno/crema. Estilo BODY TALES 'Reasons to use'.",
    supportedRatios: ["1:1"],
    copyZone: "center",
    copySchema: [
      "title",
      "headline",
      "subheadline",
      "badge",
      "bullets",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    personScene: false,
    rawProductPrompt: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "alimentos-bebidas",
      "fitness-deporte",
      "tecnologia",
      "hogar-deco",
    ],
    defaultBackgroundPrompt:
      "Fondo liso uniforme, completamente plano. SIN gradientes, SIN brillos, SIN reflejos, SIN texturas visibles. Iluminación suave y envolvente. Sin objetos, sin texto, sin personas, sin manos, sin productos. Solo un bloque de color sólido y plano. Fondo claro. Estilo minimalista premium tipo BODY TALES.",
    // NOTE: Las líneas conectoras se dibujan por código (JS), no por Gemini
    defaultProductPrompt:
      "Place the product in the CENTER of the canvas, perfectly centered both horizontally and vertically. The product should be LARGE, occupying roughly 40% width and 50% height. Studio product photography style, soft warm lighting from all sides. The product must feel premium, three-dimensional with subtle shadow beneath. No hands, no people. No dramatic lighting. Do NOT draw any connector lines, arrows, or annotations — these are added automatically.",
    templateHint: `TEMPLATE HINT for razones-producto:
  BODY TALES "Reasons to start using" style infographic.
  Product centered and large. 4 benefit labels arranged around it (2 left, 2 right),
  connected to the product by deterministic SVG horizontal lines with dots — do NOT mention
  connector lines in productPrompt, they are added automatically by the template.

  TOP: brand name (left) + headline intro in italic (center, line 1) + product name bold (center, line 2).
  Product name gets a decorative underline added automatically.
  BOTTOM-LEFT: website URL or CTA.
  Warm peach/cream background.

  CRITICAL RULES:
  - Do NOT add any prefix to bullets (no ●, no •, no ▸, no -). Just the text.
  - Keep bullets SHORT — max 22 chars each, ideally 2-3 words.
  - Do NOT include connector lines or dots in productPrompt — these are handled by SVG.

  - title: brand name shown top-left. Max 30 chars.
    Example: "BODY TALES" or "DermaLisse"

  - headline: short intro phrase before the product name, line 1. Max 35 chars.
    Example: "Razones para empezar a usar" or "Por qué elegir"
    Displayed in italic, centered.

  - subheadline: the PRODUCT NAME or category, line 2. Max 30 chars.
    Example: "Niacinamide" or "Crema Reafirmante"
    Displayed bold and large, with automatic underline decoration.

  - bullets: array of exactly 4 KEY BENEFITS. Short, max 22 chars each.
    NO emojis, NO bullet prefixes — just plain text. 2-3 words ideal.
    Example: ["Piel más radiante", "Reduce marcas", "Minimiza poros", "Controla oleosidad"]

  - badge: website URL or CTA shown bottom-left. Max 35 chars.
    Example: "www.bodytales.in" or "www.mibrand.com"

  - backgroundColorHint: warm peach/cream tone. Max 5 words.
    Example: "durazno cálido suave"`,
  },
  {
    id: "editorial-lifestyle-left",
    name: "Editorial Izquierda",
    icon: "📸",
    tag: "Editorial",
    active: true,
    description:
      "Headline enorme a la izquierda, persona/escena lifestyle a la derecha generada por IA. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1"],
    copyZone: "left",
    copySchema: [
      "headline",
      "subheadline",
      "badge",
      "backgroundColorHint",
      "sceneAction",
      "textSide",
    ],
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "moda-indumentaria",
      "salud-estetica-clinica",
      "fitness-deporte",
      "servicios-profesionales",
    ],
    rawBackgroundPrompt: true,
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y envolvente, tipo estudio editorial. Sin sombras duras, sin texturas llamativas. Sin objetos, sin texto, sin personas. Estilo fotografía editorial de revista de belleza, fondo claro y limpio.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up or medium shot — in a beauty/lifestyle moment on the RIGHT side of the image. Editorial beauty photography: glowing skin, natural makeup, confident expression. The LEFT 48% must remain completely clean for text. Soft natural lighting, cinematic quality. No logos, no text.",
    templateHint: `TEMPLATE HINT for editorial-lifestyle-left:
  This template is a PURE EDITORIAL layout — NO product. Inspired by "Every Skin Tells a Story" beauty ads.
  A person/scene fills one half; the text (headline + subheadline) fills the other half.

  YOU MUST DECIDE which side the text goes on — choose the option that feels most natural
  for the content and creates the best visual balance.

  The person is generated automatically by PRODUCT_IA (sceneMode).

  CRITICAL RULES:
  - This is editorial brand content, NOT product advertising.
  - headline should be poetic, emotional, brand-voice. 3-6 words per line, up to 5 lines.
  - subheadline is a softer complementary phrase.
  - NO product mentions in headline or subheadline.

  - textSide: REQUIRED. Must be exactly "left" or "right". You decide based on what feels best.
    "left" → text on left, person on right.
    "right" → text on right, person on left.
    Vary between creatives — don't always pick the same side.
    Example: "left" or "right"

  - headline: big emotional brand claim. Poetic and impactful. Max 50 chars.
    Example: "Every Skin Tells a Story." or "Tu piel merece brillar."
    Appears HUGE on the chosen side.

  - subheadline: complementary phrase, softer tone. Max 60 chars.
    Example: "We Just Help It Glow." or "Nosotros solo la ayudamos."

  - badge: optional URL or brand tagline. Max 30 chars.
    Example: "www.mybrand.com"

  - backgroundColorHint: light cream, white, soft neutral. Max 5 words.
    Example: "crema claro casi blanco"

  - sceneAction: describe the person/scene. Be specific about pose, expression, lighting.
    The person fills the side OPPOSITE to textSide.
    Example: "Close-up of woman's face in profile, eyes closed, glowing skin, serene smile, soft warm light"`,
  },
  {
    id: "editorial-lifestyle-right",
    name: "Editorial Derecha",
    icon: "📸",
    tag: "Editorial",
    active: false,
    description:
      "Persona/escena lifestyle a la izquierda generada por IA, headline enorme a la derecha. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1"],
    copyZone: "right",
    copySchema: [
      "headline",
      "subheadline",
      "badge",
      "backgroundColorHint",
      "sceneAction",
      "textSide",
    ],
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "moda-indumentaria",
      "salud-estetica-clinica",
      "fitness-deporte",
      "servicios-profesionales",
    ],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y envolvente, tipo estudio editorial. Sin sombras duras, sin texturas llamativas. Sin objetos, sin texto, sin personas. Estilo fotografía editorial de revista de belleza, fondo claro y limpio.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up or medium shot — in a beauty/lifestyle moment on the LEFT side of the image. Editorial beauty photography: glowing skin, natural makeup, confident expression. The RIGHT 48% must remain completely clean for text. Soft natural lighting, cinematic quality. No logos, no text.",
    templateHint: `TEMPLATE HINT for editorial-lifestyle-right:
  This template is a PURE EDITORIAL layout — NO product. Mirror of editorial-lifestyle-left.
  A person/scene is generated by AI on the LEFT side. Text goes on the RIGHT.

  CRITICAL RULES:
  - This is editorial brand content, NOT product advertising.
  - headline should be poetic, emotional, brand-voice. Up to 5 lines.
  - NO product mentions.

  - headline: big emotional brand claim. Max 50 chars.
    Example: "Confiá en tu piel." or "Beauty Starts Within."

  - subheadline: complementary phrase, softer tone. Max 60 chars.
    Example: "Cada día es una nueva oportunidad."

  - badge: optional URL or brand tagline. Max 30 chars.

  - backgroundColorHint: light cream, white, soft neutral. Max 5 words.

  - sceneAction: describe the person/scene for the LEFT side. Be specific about pose, expression, lighting.
    Example: "Medium shot of woman touching her face gently, radiant skin, natural makeup, warm studio light"
    The person MUST stay on the LEFT side only.`,
  },
  {
    id: "editorial-lifestyle-bottom",
    name: "Editorial Abajo",
    icon: "📸",
    tag: "Editorial",
    active: false,
    description:
      "Escena lifestyle full-bleed, headline enorme blanco en la mitad inferior con gradiente oscuro. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "bottom",
    copySchema: [
      "headline",
      "subheadline",
      "badge",
      "backgroundColorHint",
      "sceneAction",
    ],
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "moda-indumentaria",
      "salud-estetica-clinica",
      "fitness-deporte",
      "servicios-profesionales",
    ],
    defaultBackgroundPrompt:
      "Fondo neutro suave y claro. Iluminación envolvente tipo estudio. Sin objetos, sin texto, sin personas. Limpio y minimalista.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up beauty portrait, looking up or to the side — filling most of the canvas. Editorial beauty photography: glowing skin, natural makeup, confident and serene expression. The person should be centered or slightly above center. Full-bleed, cinematic quality. Soft warm lighting. No logos, no text.",
    templateHint: `TEMPLATE HINT for editorial-lifestyle-bottom:
  This template is a PURE EDITORIAL layout — NO product. Full-bleed lifestyle scene with
  a BIG white headline at the BOTTOM over a dark gradient.

  The person fills the entire canvas. Text is WHITE over a dark gradient at the bottom.

  CRITICAL RULES:
  - This is editorial brand content, NOT product advertising.
  - headline should be emotional and impactful. White text on dark gradient.
  - Keep it concise — max 3 lines.

  - headline: big emotional brand claim. Max 40 chars.
    Example: "Brillá con confianza." or "Your Glow, Your Rules."

  - subheadline: softer complementary phrase. Max 60 chars.
    Example: "Descubrí tu mejor versión."

  - badge: optional URL or brand tagline. Max 30 chars.

  - backgroundColorHint: not very relevant here (scene is full-bleed). Max 5 words.
    Example: "neutro cálido"

  - sceneAction: describe the person for the FULL canvas. Close-up works best.
    Example: "Close-up beauty portrait, woman looking up with closed eyes, glowing dewy skin, natural light from above"
    The person should fill the frame.`,
  },
  {
    id: "editorial-lifestyle-top",
    name: "Editorial Arriba",
    icon: "📸",
    tag: "Editorial",
    active: false,
    description:
      "Headline enorme blanco arriba con gradiente oscuro, escena lifestyle full-bleed abajo. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "center",
    copySchema: [
      "headline",
      "subheadline",
      "badge",
      "backgroundColorHint",
      "sceneAction",
    ],
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "moda-indumentaria",
      "salud-estetica-clinica",
      "fitness-deporte",
      "servicios-profesionales",
    ],
    defaultBackgroundPrompt:
      "Fondo neutro suave y claro. Iluminación envolvente tipo estudio. Sin objetos, sin texto, sin personas. Limpio y minimalista.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up beauty portrait or medium shot from below — filling the lower 65% of the canvas. Editorial beauty photography: glowing skin, natural makeup, confident expression. The top 35% should have darker tones or the person's hair/silhouette for text overlay. Full-bleed, cinematic quality. Soft warm lighting. No logos, no text.",
    templateHint: `TEMPLATE HINT for editorial-lifestyle-top:
  This template is a PURE EDITORIAL layout — NO product. Full-bleed lifestyle scene with
  a BIG white headline at the TOP over a dark gradient.

  The person fills the lower portion. Text is WHITE over a dark gradient at the top.

  CRITICAL RULES:
  - This is editorial brand content, NOT product advertising.
  - headline should be emotional and impactful. White text on dark gradient.
  - Keep it concise — max 3 lines.

  - headline: big emotional brand claim. Max 40 chars.
    Example: "Sentite única." or "Confidence Is Beautiful."

  - subheadline: softer complementary phrase. Max 60 chars.
    Example: "Tu piel cuenta tu historia."

  - badge: optional tagline at top-left. Max 30 chars.
    Example: "www.mybrand.com"

  - backgroundColorHint: not very relevant here (scene is full-bleed). Max 5 words.
    Example: "neutro cálido"

  - sceneAction: describe the person. The person should fill the lower 65% of the canvas.
    Example: "Medium shot from below, woman with confident gaze, radiant skin, hair flowing, warm golden light"
    Top area should be darker/hair for text overlay.`,
  },
  {
    id: "editorial-center-top",
    name: "Editorial Centrado",
    icon: "📸",
    tag: "Editorial",
    active: true,
    description:
      "Headline y subheadline centrados en la parte superior, persona con producto ocupa el ancho completo inferior. Estilo editorial beauty premium.",
    supportedRatios: ["1:1"],
    copyZone: "top",
    copySchema: [
      "title",
      "headline",
      "subheadline",
      "badge",
      "bullets",
      "productPrompt",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: true,
    sceneWithProduct: true,
    personScene: true,
    useGenericProductClone: true,
    supportsSequence: false,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "moda-indumentaria",
      "salud-estetica-clinica",
      "fitness-deporte",
      "servicios-profesionales",
    ],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y envolvente, tipo estudio editorial. Sin sombras duras, sin texturas llamativas. Sin objetos, sin texto, sin personas. Estilo fotografía editorial de revista de belleza, fondo claro y limpio.",
    defaultProductPrompt:
      "BOTTOM 40% OF CANVAS ONLY — no person or object may appear in the top 60%. Generate a real person in a warm lifestyle setting naturally holding or using this product. The person must span the FULL WIDTH of the canvas from the left edge to the right edge. Head at approximately 55–65% from the top of the canvas. Warm natural lighting, editorial quality, candid and genuine feel. Do not erase or modify any existing text or graphic elements already present in the image.",
    templateHint: `TEMPLATE HINT for editorial-center-top:
  This is an editorial lifestyle ad. The TOP 40% is a CLEAN LIGHT PANEL with centered headline + subheadline (dark text).
  The BOTTOM 60% shows a real person naturally using or holding THIS SPECIFIC PRODUCT, spanning the FULL canvas width.

  - headline: bold centered claim about this product. Max 7 words, emotional.
    Examples: "La piel que siempre quisiste tener." / "Más energía. Menos esfuerzo."

  - subheadline: 1 sentence with specific product benefit. Max 90 chars.
    Example: "Fórmula con colágeno marino y ácido hialurónico para resultados reales."

  - badge: optional brand tagline or short offer. Max 30 chars.

  - title: 3-5 product keywords separated by ' · '. Max 40 chars.
    Example: "Colágeno · Vitamina C · Reafirmante"

  - bullets: 3 short benefits with emoji, max 35 chars each.

  - productPrompt: REQUIRED. English. Self-contained image generation prompt.
    MANDATORY STRUCTURE:
    1. "BOTTOM 40% OF CANVAS ONLY — no person or object may appear in the top 60%."
    2. 1-2 real people naturally using or holding this product. Authentic lifestyle moment.
    3. "Person spans the FULL WIDTH of the canvas, left to right edge. Head at 55–65% from top."
    4. Environment matching the product category (bathroom → skincare, kitchen → food, gym → fitness).
    5. "Warm natural lighting, editorial quality, candid feel."
    6. "Do not erase or modify any existing text or graphic elements already present in the image."
    Example (skincare): "BOTTOM 40% OF CANVAS ONLY — no person or object in the top 60%. A woman in her 30s in a bright bathroom smiling while applying face cream, the product tube visible in her hands. Person spans full canvas width. Head at 58% from top. Warm morning light, editorial quality, candid. Do not erase or modify any existing text or graphic elements already present in the image."`,
  },
  {
    id: "producto-beneficios-vertical",
    name: "Beneficios Vertical",
    icon: "⚡",
    tag: "Vertical",
    active: true,
    description:
      "Layout BODY TALES: dos columnas, izquierda lavanda pastel con 4 beneficios y círculos-icono SVG, derecha azul-gris oscuro con producto grande y nombre. Barra de títulos de columna y marca arriba. Ideal para 1:1 y 4:5.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "left",
    copySchema: [
      "title",
      "headline",
      "columnTitle",
      "competitionTitle",
      "badge",
      "bullets",
      "backgroundColorHint",
    ],
    requiresSceneGeneration: false,
    rawProductPrompt: true,
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "alimentos-bebidas",
      "fitness-deporte",
      "tecnologia",
      "hogar-deco",
      "salud-estetica-clinica",
    ],
    defaultBackgroundPrompt:
      "Fondo completamente liso dividido en dos mitades verticales iguales (50/50). Mitad izquierda color lavanda pastel suave claro (#C8CEE8), uniforme y liso. Mitad derecha color azul-gris oscuro apagado (#6B7394), uniforme y liso. NO usar iluminación dramática, NO usar brillos, NO usar reflejos, NO usar gradientes. Ambas mitades deben ser completamente planas y uniformes. Sin texturas, sin objetos, sin texto, sin personas, sin manos, sin productos. Solo dos bloques de color plano lado a lado.",
    defaultProductPrompt: `This is an IMAGE EDITING task, NOT image generation.
Preserve the original background exactly as-is — do not replace,
recolor, whiten, or regenerate it under any circumstance.

ONLY perform these actions:
1. Extract the existing product from its current position
2. Reposition it to the RIGHT side, horizontal center at ~76%
3. Scale it to fill most of the right half of the canvas
4. Tilt it slightly for dynamism
5. Add a subtle shadow beneath, consistent with existing scene lighting

HARD BOUNDARIES:
- LEFT 56% of canvas = completely untouched, no product edge, no shadow, nothing
- Product stays strictly within the rightmost 44% of the canvas
- Product must be fully opaque and fully visible — never cropped or faded

DO NOT modify the background, text, colors, textures,
or any existing graphic element. No people, no hands, no new elements.`,
    templateHint: `TEMPLATE HINT for producto-beneficios-vertical:
  "Body Tales — What do you want / What you need" split layout.
  A rounded card sits centered on a soft lavender canvas.
  BRAND NAME appears ABOVE the card. WEBSITE URL appears BELOW.
  Inside the card: LEFT column = user desires (lavender), RIGHT column = product solution (blue-gray).
  Header bar shows two column titles. 4 circle+checkmark icons on the left. Product large on right.

  The product is placed by PRODUCT_IA on the RIGHT (copyZone=left). The LEFT 56% stays completely clean.

  CRITICAL RULES:
  - Do NOT add prefixes to bullets (no ●, no •, no -, no →). The template adds checkmark icons.
  - Keep bullets SHORT — max 30 chars each. Plain text, no emojis.
  - columnTitle and competitionTitle should be short and punchy (max 22 chars).

  - title: brand name displayed ABOVE the card, centered. Max 35 chars.
    Example: "BODY TALES" or "Laboratorio Skincare"

  - columnTitle: left column header — expresses the USER DESIRE. Max 22 chars.
    Example: "Lo que querés" or "What you want"

  - competitionTitle: right column header — expresses the SOLUTION. Max 22 chars.
    Example: "Lo que necesitás" or "What you need"

  - bullets: array of exactly 4 USER DESIRES or PROBLEMS. Short, max 30 chars each.
    No emojis, no prefixes. Think of what the customer wants to achieve.
    Example: ["Natural Hair Colour", "Slowed Greying", "Strengthened Hair", "Better Texture"]

  - headline: product name or short claim shown BELOW the product image, inside the card. Max 35 chars.
    Example: "Anti Grey Hair Serum" or "Suero Revitalizante"

  - badge: website URL shown BELOW the card. Max 40 chars.
    Example: "www.bodytales.in" or "www.marca.com.ar"

  - backgroundColorHint: ignored — template uses a fixed soft lavender background.`,
  },
  {
    id: "producto-hero-top",
    name: "Hero Editorial",
    icon: "🌊",
    tag: "Hero",
    active: true,
    description:
      "Producto hero en la parte superior, nombre de marca y tagline al pie. Fondo fotográfico suave con gradiente. Estilo editorial beauty premium.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "top",
    personScene: false,
    copySchema: ["headline", "subheadline", "disclaimer", "backgroundPrompt"],
    // Text goes at BOTTOM, but PRODUCT_IA should place the product in CENTER
    productIAZone: "center",
    requiresSceneGeneration: false,
    recommendedFor: [
      "belleza-cosmetica",
      "moda-indumentaria",
      "salud-bienestar",
      "hogar-deco",
      "alimentos-bebidas",
    ],
    rawBackgroundPrompt: true,
    rawProductPrompt: true,
    defaultBackgroundPrompt:
      "Minimalist premium studio background. Very clean neutral surface with ultra-soft, barely visible texture. Soft diffused studio lighting, elegant and photographic. No text, no people, no products, no logos.",
    categoryBackgroundPrompts: {
      "belleza-cosmetica": `You are a background image generation expert for premium skincare advertising.

TASK: Generate a full-bleed macro photography background. Before generating, 
analyze the product being advertised and AUTO-SELECT the most fitting color 
palette, texture ingredient, and mood from the system below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECTION SYSTEM — match by product type:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IF product contains → Vitamin C / Niacinamide / Brightening / Glow:
  COLOR_BASE: warm ivory + golden amber
  COLOR_ACCENT: soft turmeric glow
  TEXTURE: luminous vitamin serum and lightweight oil strokes
  MICRO_DETAIL: tiny suspended vitamin micro-spheres beneath surface
  SHIMMER: warm gold iridescent edge on one stroke
  MOOD: warm clinical luxury

IF product contains → Hyaluronic Acid / Hydration / Cooling / Gel:
  COLOR_BASE: pale sky blue + icy mint
  COLOR_ACCENT: pearl white
  TEXTURE: cooling hyaluronic gel strokes, flat and fluid like chilled glass
  MICRO_DETAIL: micro-bubble texture like chilled water on skin + ultra-subtle 
  linen grain on matte background
  SHIMMER: faint lavender-mint iridescent edge on one stroke
  MOOD: icy Korean skincare editorial

IF product contains → Collagen / Rose / Lifting / Firming:
  COLOR_BASE: blush rose + warm peach
  COLOR_ACCENT: soft champagne
  TEXTURE: rich collagen cream and rose extract strokes, thick yet smooth 
  like whipped cream, semi-opaque with satin sheen
  MICRO_DETAIL: fine rose petal veining beneath surface
  SHIMMER: warm pink iridescent edge on one stroke
  MOOD: Parisian luxury skincare

IF product contains → Retinol / Peptides / Anti-age / Repair:
  COLOR_BASE: cool pearl white + soft champagne
  COLOR_ACCENT: whisper gold
  TEXTURE: ultra-smooth peptide serum strokes, thin and fluid
  MICRO_DETAIL: fine silk-like protein threads barely visible beneath
  SHIMMER: faint silver iridescent edge on one stroke
  MOOD: ice-cold clinical luxury

IF product contains → SPF / Sunscreen / Solar / UV:
  COLOR_BASE: clean white + soft warm yellow
  COLOR_ACCENT: light sand beige
  TEXTURE: lightweight fluid sunscreen strokes, very thin and watery
  MICRO_DETAIL: ultra-fine sand micro-grain on matte background
  SHIMMER: golden-white light flare edge on one stroke
  MOOD: clean outdoor clinical

IF product contains → Retinol / AHA / BHA / Exfoliant / Acids:
  COLOR_BASE: deep ivory + warm ecru
  COLOR_ACCENT: translucent gold
  TEXTURE: fine exfoliating serum strokes with crystalline clarity
  MICRO_DETAIL: fine suspended crystal micro-particles beneath surface
  SHIMMER: gold-to-white iridescent edge on one stroke
  MOOD: clinical premium apothecary

IF product contains → CBD / Botanical / Natural / Organic / Herbal:
  COLOR_BASE: sage green + warm linen
  COLOR_ACCENT: soft moss white
  TEXTURE: botanical extract and plant oil strokes, organic and fluid
  MICRO_DETAIL: ultra-fine dried botanical fiber texture beneath surface
  SHIMMER: muted olive-gold iridescent edge on one stroke
  MOOD: clean clinical organic

IF product contains → Caffeine / Eye / Depuff / Dark circles:
  COLOR_BASE: cool lavender + soft grey-blue
  COLOR_ACCENT: icy lilac white
  TEXTURE: ultra-light eye serum strokes, extremely thin and watery
  MICRO_DETAIL: fine silk micro-weave texture on matte background
  SHIMMER: soft violet-silver iridescent edge on one stroke
  MOOD: spa clinical minimal

IF no match → DEFAULT:
  COLOR_BASE: neutral pearl white + soft warm grey
  COLOR_ACCENT: whisper ivory
  TEXTURE: ultra-smooth serum strokes, thin and fluid
  MICRO_DETAIL: barely visible fine linen grain
  SHIMMER: faint silver-white iridescent edge on one stroke
  MOOD: premium minimalist studio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGE GENERATION INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Using the auto-selected values above, generate the following scene:

Extreme close-up macro photography of [TEXTURE] on a soft matte surface in 
[COLOR_BASE] and [COLOR_ACCENT]. Exactly 2–3 broad sweeping diagonal strokes 
across the frame — thin, flat and fluid, semi-transparent with a high-gloss 
wet sheen. [MICRO_DETAIL] texture subtly visible beneath the strokes. Wide open 
breathing space between strokes — large areas of matte background visible. 
One stroke catches [SHIMMER]. 

Lighting: strong beauty soft-box from upper-left, casting long elegant specular 
highlights across the gel surface. Secondary very soft fill light from lower-right 
at 15% intensity. Overall feeling: bright, airy, spacious.

[MOOD] aesthetic. Full-bleed composition, no cropping. 

Ultra high resolution photorealistic macro photography, 4K, premium skincare 
brand editorial. No text, no people, no products, no logos, no hands.`,
      "salud-bienestar":
        "Extreme close-up macro photography of SMOOTH COSMETIC CREAM AND GEL TEXTURES on a soft surface tinted with the BRAND'S PRIMARY COLOR (use a pastel/muted version of it). Only 2-3 broad, THIN cream strokes flowing diagonally across the frame — NOT many small strokes, just a FEW large elegant ones with lots of breathing space between them. The cream textures are tinted with a lighter shade of the brand's primary color and white, semi-transparent, with a glossy wet surface. The strokes must be FLAT and SMOOTH — like thin layers of gel spread evenly with a spatula, NOT thick chunky impasto or heavy 3D relief. Very minimal surface variation, gentle soft edges. Subtle specular highlights but the overall surface should feel SLEEK and FLUID. Large areas of the brand-colored background are visible between the few cream strokes, giving the composition an airy, open feel. Lighting is bright, soft, and diffused — studio beauty lighting. Ultra high resolution, photorealistic macro photography, 4K, premium skincare brand aesthetic. No text, no people, no products, no logos.",
      "salud-estetica-clinica":
        "Extreme close-up macro photography of SMOOTH COSMETIC CREAM AND GEL TEXTURES on a soft surface tinted with the BRAND'S PRIMARY COLOR (use a pastel/muted version of it). Only 2-3 broad, THIN cream strokes flowing diagonally across the frame — NOT many small strokes, just a FEW large elegant ones with lots of breathing space between them. The cream textures are tinted with a lighter shade of the brand's primary color and white, semi-transparent, with a glossy wet surface. The strokes must be FLAT and SMOOTH — like thin layers of gel spread evenly with a spatula, NOT thick chunky impasto or heavy 3D relief. Very minimal surface variation, gentle soft edges. Subtle specular highlights but the overall surface should feel SLEEK and FLUID. Large areas of the brand-colored background are visible between the few cream strokes, giving the composition an airy, open feel. Lighting is bright, soft, and diffused — studio beauty lighting. Ultra high resolution, photorealistic macro photography, 4K, premium skincare brand aesthetic. No text, no people, no products, no logos.",
    },
    defaultProductPrompt: `Integrate the product into the scene with PHOTOREALISTIC studio photography quality.

CRITICAL — LABEL PRESERVATION:
- The product label, text, logo, colors and design must remain 100% identical to the 
  original. Do NOT alter, blur, distort, translate or reinterpret any text on the label.
- Do NOT change bottle shape, cap color, or material finish.
- Treat the product as a locked photographic object — only lighting and shadow interact 
  with it, never its surface design.

POSITION & ANGLE:
- Place product slightly LEFT of center, tilted 8–12 degrees clockwise.
- Product occupies 15–18% of canvas width. 
- Vertically between 35% and 75% from top.

SHADOW SYSTEM — Natural & Grounded:
- Contact shadow: very soft, dark only at the base contact point (3–4px equivalent), 
  fading to nothing within half the product width. Natural penumbra, not dramatic.
- Cast shadow: follows the scene light direction, LENGTH equal to 0.6x product height 
  (short, not elongated). Opacity 18–25% max. Feathered gaussian edges.
- NO hard shadows. NO exaggerated long dramatic shadows.
- The shadow should feel like a cloudy-day outdoor light or large soft-box studio — 
  soft, close, grounded.

LIGHT INTEGRATION:
- Identify the dominant light direction from the background and match it exactly.
- Add a subtle specular highlight on the product's upper curved surface.
- Very faint background color bounce light on the product's shadow side (opacity 10–15%).

SHARPNESS: Product razor-sharp at all times. Zero blur, zero softening, zero glow.
No hands, no people. Photorealistic. 4K.`,
    templateHint: `TEMPLATE HINT for producto-hero-top:
  This is a HERO EDITORIAL layout. The product is CENTERED in the canvas (middle zone).
  Brand name + tagline appear at the TOP. A short disclaimer line sits at the BOTTOM.
  Inspired by minimalist beauty brands like Blume. Clean, photographic, premium aesthetic.

  Layout:
  - TOP 0–22%: headline (brand name, large bold) + subheadline (tagline, thin spaced) — text only
  - CENTER 22–78%: product hero (generated by PRODUCT_IA) — large, centered, main focus
  - BOTTOM 87–95%: disclaimer (small optional line)

  - headline: the brand or product name, displayed LARGE at the top-center.
    Max 10 chars. This is the primary visual anchor above the product.
    Examples: "BLUME", "DERMA PRO", "GLOW LAB", "SÉRUM VITAL"

  - subheadline: a concise benefit or product line descriptor, thin and spaced.
    Max 30 chars, wide letter-spacing. Sits just below the headline.
    Examples: "SOOTHE & HYDRATE", "ANTI-EDAD INTENSIVO", "BRILLO NATURAL"

  - disclaimer: optional short punchy line at the very bottom, small text.
    Max 50 chars.
    Examples: "CALM YOUR SKIN. BOOST YOUR BARRIER.", "RESULTADOS DESDE LA PRIMERA SEMANA.", "TU PIEL LO MERECE."

  - backgroundPrompt: A self-contained English image generation prompt for an aesthetic
    minimalist macro/close-up background RELATED TO THE PRODUCT AND BUSINESS CATEGORY.
    ALWAYS: full-bleed, no text, no people, no products, no logos. Ultra high resolution
    photorealistic photography, 4K, premium brand aesthetic. ~250-350 characters.

    Match the style to the product category:
    - Skincare / Cosmetics / Beauty: extreme close-up macro of SMOOTH cream, gel or serum
      textures on a soft pastel surface. Only 2-3 broad thin flat strokes, semi-transparent
      with glossy wet surface. Soft diffused studio lighting.
    - Food & Beverages / Nutrition: macro photography of natural ingredients related to the
      product (herbs, spices, fruits, powders, grains) arranged beautifully on a clean
      neutral surface. Warm editorial lighting.
    - Fitness / Sports: close-up premium texture of sports fabric, rubber, or equipment
      surface relevant to the product. Clean studio lighting, minimal and bold.
    - Fashion / Accessories / Jewelry: extreme close-up of premium material or fabric
      texture related to the product. Elegant, editorial, soft lighting.
    - Health / Wellness / Supplements: soft organic textures — stone, cotton, dried
      botanicals, powder — neutral calming palette, spa-like minimal aesthetic.
    - Tech / Electronics: clean brushed metal, glass or matte surface texture. Modern,
      minimal, premium studio lighting.
    - Home / Deco: soft interior material — linen, marble, polished wood — warm clean
      editorial style. Natural diffused lighting.`,
  },
  {
    id: "testimonio-review",
    name: "Testimonio Review",
    icon: "⭐",
    tag: "Social Proof",
    active: false,
    description:
      "Layout testimonial: 5 estrellas de rating arriba, cita grande centrada, nombre del testimoniante, y persona generada por IA en la mitad inferior. Fondo sólido de color. Ideal para social proof / reviews.",
    supportedRatios: ["9:16", "4:5", "1:1"],
    copyZone: "top",
    copySchema: ["headline", "badge", "backgroundColorHint", "sceneAction"],
    requiresSceneGeneration: true,
    logoPosition: "center",
    recommendedFor: [
      "belleza-cosmetica",
      "salud-bienestar",
      "alimentos-bebidas",
      "fitness-deporte",
      "salud-estetica-clinica",
      "hogar-deco",
    ],
    defaultBackgroundPrompt:
      "Fondo liso uniforme de un solo color, completamente plano. SIN gradientes, SIN texturas, SIN objetos, SIN personas. Solo un bloque de color sólido usando el color primario de la marca. Minimalista y limpio.",
    defaultProductPrompt:
      "Do NOT show any product. Generate ONLY a real person — visible from the CHEST UP — positioned STRICTLY in the BOTTOM 45% of the canvas. The person's HEAD must be at approximately 55% from the top, NEVER higher. The TOP 50% MUST remain COMPLETELY EMPTY solid color. Person CENTERED horizontally. Happy, confident smile. Solid colored background matching the rest. Natural beauty photography, warm lighting. No logos, no text. Do NOT erase or modify any existing text or stars.",
    templateHint: `TEMPLATE HINT for testimonio-review:
  This is a TESTIMONIAL / REVIEW layout with a person generated by AI.
  5 star rating icons at the top (auto-generated SVG, do NOT mention stars in text).
  Big centered quote text in the middle, attribution name below.
  A real person (generated by sceneAction) fills ONLY the BOTTOM 45% of the canvas.
  The TOP 50% is reserved for text — the person must NOT appear there.

  Solid pastel background color (pink, peach, lavender, etc.).

  CRITICAL RULES:
  - Do NOT include quotation marks in the headline — the template adds them automatically.
  - Do NOT include star emojis or rating numbers — the template renders 5 SVG stars.
  - Keep the quote natural and authentic-sounding.
  - The badge is the person's FIRST NAME only.
  - The quote should be SHORT — max 80 chars, ideally 2-3 lines. Shorter is better.

  - headline: the testimonial quote. Natural, authentic voice. Max 80 chars.
    Example: "I definitely feel a difference in my skin and nails."
    Example: "Mi piel cambió por completo en 2 semanas."

  - badge: the person's first name. Max 15 chars.
    Example: "Cheryl" or "María"

  - backgroundColorHint: pastel/soft color for the background. Max 5 words.
    Example: "rosa suave pastel" or "durazno claro"

  - sceneAction: describe the person for AI generation. Person fills BOTTOM 45% ONLY.
    MUST specify: gender, expression, clothing. Person should look happy/confident.
    CRITICAL: Specify that the person is visible from CHEST UP, centered horizontally,
    and their HEAD is at about 55% from the top. The top half stays empty.
    Example: "Smiling woman with long dark hair, visible from chest up, centered, looking slightly to the right, white t-shirt, warm natural lighting, clean solid pink background. Head at 55% from top."
    Example: "Hombre joven sonriente, barba corta, remera blanca, visible desde el pecho, fondo sólido celeste. Cabeza a 55% desde arriba."`,
  },
  {
    id: "persona-producto-left",
    name: "Persona con Producto",
    icon: "🧍",
    tag: "Lifestyle Ad",
    active: true,
    description:
      "Persona sosteniendo el producto a la derecha, claim grande y CTA a la izquierda. Gradiente oscuro lateral para texto blanco. Estilo lifestyle brand ad (Huel, Nike, etc.).",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "left",
    copySchema: [
      "badge",
      "headline",
      "subheadline",
      "title",
      "backgroundPrompt",
      "productPrompt",
    ],
    requiresSceneGeneration: true,
    sceneWithProduct: true,
    personScene: true,
    supportsSequence: true,
    recommendedFor: [
      "belleza-cosmetica",
      "alimentos-bebidas",
      "fitness-deporte",
      "salud-bienestar",
      "moda-indumentaria",
      "tecnologia",
    ],
    defaultBackgroundPrompt:
      "Soft blurred modern office or studio interior. Natural light streaming from a window on the right side. Warm neutral tones — light beige walls, soft shadows, clean environment. Shallow depth of field bokeh effect. No people, no text, no logos, no products. Background only, suitable for person compositing on the right half.",
    defaultProductPrompt:
      "Editorial beauty photograph of a woman, late 20s to early 40s, standing on the RIGHT side of the canvas only, visible from head to knee. Varied facial features, not conventionally perfect, natural facial asymmetry, subtle ethnic or regional character — not a generic stock photo face. Casual everyday clothing in neutral or warm tones, naturally fitted, with realistic fabric folds — any top that feels authentic and unpretentious. Relaxed pose, weight shifted to one hip, slight lean forward, one shoulder subtly lower than the other. Head turned 10-15 degrees toward camera, NOT full frontal. She holds the product with one hand at chest height, product occupies at least 15% of her body height, label fully visible and facing camera directly, thumb visible on side of product, natural finger curl, not a staged grip. Other hand resting at side or lightly touching collarbone. Half smile with slightly raised corners, relaxed jaw, direct eye contact. Shot on 85mm f/1.8 lens, soft natural window light from the upper left, warm bokeh background with light falloff toward edges. Visible skin texture with subtle pores, slight undereye variation. Realistic hair with 2-3 flyaways near temples, natural volume variation, not perfectly styled. You can't edit the Left half of canvas",
    rawProductPrompt: true,
    templateHint: `TEMPLATE HINT for persona-producto-left:
  This is a Huel/Nike-style lifestyle brand ad. Person with product on the RIGHT, large claim + CTA on the LEFT.
  Dark gradient covers the left half for white text readability.

  ⚡ COHERENCE IS MANDATORY: backgroundPrompt and productPrompt MUST describe the SAME location,
  lighting, and atmosphere. First decide the scene setting based on the product and angle (outdoor trail,
  gym, bathroom, kitchen, etc.), then write backgroundPrompt as the empty environment and productPrompt
  as the person+product IN THAT EXACT SAME environment. They must feel like the same photo shoot.

  - badge: brand name or short tagline at TOP-LEFT. Max 30 chars.
    Example: "Huel®" or "DermaLisse™" or "NutriBoost"

  - headline: the BIG claim — bold statement about the product benefit. Max 8 words. No period needed.
    This renders very large. Examples:
    "Fast, complete, plant-based nutrition."
    "La piel que siempre quisiste tener."
    "Firmeza visible desde la primera semana."

  - subheadline: 1-2 supporting sentences that expand the headline. Max 47 chars.
    Example: "Fórmula intensiva con colágeno marino y vitamina C para resultados reales."

  - title: CTA BUTTON TEXT ONLY — this renders as a clickable pill button. Max 15 chars.
    OVERRIDE: Do NOT generate keywords separated by "·" — that format is for other templates, NOT here.
    Must be a complete action phrase (verb + complement). No dots, no separators.
    Examples: "Quiero el mío" / "Shop Now" / "Probalo gratis" / "Comprá ahora" / "Ver la oferta"

  - backgroundPrompt: ENGLISH REQUIRED. The background scene environment WITHOUT any person or product.
    Shallow depth of field, no people, no products, no text, no logos.
    The setting must match the product category and the angle's emotional tone.
    Examples:
    Hiking boots → "A sunlit mountain trail at golden hour, pine trees blurred in soft bokeh, earthy soil and rocks, warm natural light, no people, no products"
    Protein shake → "Modern gym interior, metal weights rack, rubber flooring, large windows with warm light, shallow depth of field, no people, no products"
    Skincare cream → "Bright minimalist bathroom, white marble surface, soft morning window light, warm steam ambiance, no people, no products"
    Running shoes → "Empty urban street at sunrise, blurred city lights bokeh, warm golden fog, wet asphalt, no people, no products"

  - productPrompt: ENGLISH REQUIRED. Full-body or head-to-waist person WITH the product on the RIGHT side.
    OVERRIDE: Do NOT generate a disembodied hand — always show a COMPLETE PERSON, visible from head to at least mid-torso.
    MUST place the person in THE SAME SETTING described in backgroundPrompt — same location, lighting, atmosphere.
    Person on RIGHT 52% only. LEFT 48% MUST remain COMPLETELY CLEAN — no arm, no shadow crossing the center.
    Specify: person's age range, style, expression, clothing, and how they hold or use the product.
    The person must be ACTIVELY HOLDING or WEARING/USING the product — clearly visible in their hands or on their body.
    Examples:
    Hiking boots → "A confident woman in her 30s in hiking gear, full body visible, standing on a mountain trail holding hiking boots at chest height with both hands, warm golden light, right side of canvas only, left half completely clean"
    Protein shake → "Athletic man in his 20s in workout clothes, head to torso visible, in a gym holding a protein shake bottle at chest height, genuine smile, right side of canvas only, left half completely clean"
    Running shoes → "Young woman in athletic wear, full body visible, running on an urban street at sunrise, wearing the running shoes, right side of canvas only, left half completely clean"`,
  },
  {
    id: "persona-hero-bottom",
    name: "Lifestyle Hero",
    icon: "👥",
    tag: "Lifestyle Group",
    active: true,
    description:
      "Panel blanco superior con logo, headline y subheadline centrados. Escena lifestyle full-bleed inferior con persona(s) y producto. Estilo Huel, Nike. CTA al pie.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "top",
    copySchema: ["headline", "subheadline", "title", "productPrompt"],
    requiresSceneGeneration: true,
    sceneWithProduct: true,
    personScene: true,
    logoPosition: "center",
    supportsSequence: false,
    recommendedFor: [
      "alimentos-bebidas",
      "fitness-deporte",
      "salud-bienestar",
      "belleza-cosmetica",
      "moda-indumentaria",
      "tecnologia",
    ],
    defaultBackgroundPrompt:
      "Warm, inviting modern interior — kitchen, open living space, or studio with large windows. Soft natural light from the side, warm neutral tones (light wood, cream walls). Slightly blurred background with shallow depth of field bokeh. No people, no text, no logos, no products visible. Clean, premium lifestyle brand aesthetic.",
    rawBackgroundPrompt: true,
    rawProductPrompt: true,
    defaultProductPrompt:
      "You receive TWO images: (1) the background — which already has a WHITE PANEL covering the TOP 42% of the canvas containing brand text and logo, all finalized; (2) the product photo to integrate.\n\nYOUR TASK: Generate a LIFESTYLE SCENE in the BOTTOM portion of the canvas showing 2-3 real people naturally using or holding this specific product. The white top panel and its text are PRE-RENDERED and must remain 100% intact.\n\nCRITICAL ZONE RULE — ABSOLUTE AND NON-NEGOTIABLE:\n- Your working area is STRICTLY the BOTTOM 58% of the image (below the white panel boundary).\n- The TOP 42% MUST remain exactly as the background — completely untouched.\n- NO person's head, hair, shoulders, arms, hands, or any body part may appear above the 42% line from the top.\n- If a person would be too tall, show them from the torso down — but keep ALL body parts strictly below the white panel boundary.\n- Cast NO shadows into the white panel area.\n\nSCENE COMPOSITION:\n- 2-3 real, diverse people authentically using, holding, or enjoying this product in a natural lifestyle moment.\n- Choose a setting that genuinely matches the product's world: kitchen or café for food/drink, gym or outdoors for fitness, bathroom or vanity for beauty, home office for tech.\n- The product must be clearly visible and recognizable — in someone's hands or actively in use.\n- Warm, cinematic, natural lighting. Candid and genuine — never stock-photo stiff.\n- Wide, full-bleed composition filling the entire bottom zone from edge to edge.\n\nABSOLUTE PROHIBITIONS:\n- Do NOT let any person, object, or shadow enter the top 40% of the canvas.\n- Do NOT erase, modify, fade, blur, or overlay the white panel or its text in any way.\n- Do NOT add text, logos, watermarks, badges, or graphic decorations of any kind.",
    templateHint: `TEMPLATE HINT for persona-hero-bottom:
  This is a Huel-style lifestyle brand ad. The top 42% is a WHITE PANEL with centered text (dark color).
  The bottom 58% is a full-bleed lifestyle scene with people holding/using THIS SPECIFIC PRODUCT.
  Everything is centered — no left/right split. The brand logo is placed automatically at the top center — do NOT generate a badge field.

  - headline: the BIG centered claim about THIS PRODUCT. Max 8 words.
    Write a bold, specific claim that matches the product's category and benefit.
    Examples for a protein shake: "Fast, complete, plant-based nutrition."
    Examples for a skincare: "Glowing skin starts here."
    Examples for a supplement: "La energía que necesitás, cuando la necesitás."

  - subheadline: 1-2 sentences that reinforce the headline with a specific product benefit. Max 45 chars.
    Must relate directly to what this product does for the user.
    Example for protein: "Fórmula completa con 26 vitaminas."
    Example for skincare: "Hidratación profunda con vitamina C."

  - title: CTA button text (pill at the bottom of the scene). Max 14 chars.
    Example: "Shop Now" or "Quiero el mío" or "Empezá hoy" or "Ver producto"

  - productPrompt: This prompt goes DIRECTLY to an image generation AI. Write it as a self-contained image generation prompt.
    MANDATORY STRUCTURE — always include all of these in this order:
    1. ZONE RULE: Start with "BOTTOM 55% OF CANVAS ONLY — no person, no object, no shadow may appear in the top 45%."
    2. SCENE: 2-3 real-looking diverse people naturally using or holding this SPECIFIC PRODUCT. Authentic lifestyle context that matches the product.
    3. SETTING: Choose the environment that makes sense for the product (kitchen/café for food, gym/outdoors for fitness, bathroom/vanity for beauty, home for wellness).
    4. LIGHTING: Warm, cinematic, natural light. Candid feel — not stock-photo stiff.
    5. DO NOT MODIFY EXISTING TEXT: "Do not erase or modify any existing text or graphic elements already present in the image."
    Full example for face cream: "BOTTOM 55% OF CANVAS ONLY — no person, no object, no shadow may appear in the top 45%. Two women in their 30s in a bright minimalist bathroom, laughing while applying the face cream to their cheeks, the product tube clearly visible in one woman's hand. Warm daylight from a window, clean and fresh feel, authentic and candid. Do not erase or modify any existing text or graphic elements already present in the image."
    Full example for protein shake: "BOTTOM 55% OF CANVAS ONLY — no person, no object, no shadow may appear in the top 45%. Three diverse athletes in a gym locker room after a workout, smiling and holding up the protein shake bottles, the product label facing the camera. Natural warm lighting, energetic and authentic, not stock-photo stiff. Do not erase or modify any existing text or graphic elements already present in the image."`,
  },
  {
    id: "bebas-urgencia-top",
    name: "Urgencia Bebas Neue",
    icon: "🔥",
    tag: "Urgencia",
    active: true,
    pipelineV2: true,
    description:
      "Escena de urgencia full-bleed, headline enorme en Bebas Neue, overlay oscuro. Un solo titular potente, sin producto. Logo arriba a la izquierda.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "top",
    copySchema: ["headline", "backgroundColorHint", "sceneAction"],
    requiresSceneGeneration: true,
    personScene: true,
    sceneFullBleed: true,
    personOnly: true,
    supportsSequence: false,
    recommendedFor: [
      "servicios-profesionales",
      "tecnologia",
      "fitness-deporte",
      "salud-bienestar",
      "belleza-cosmetica",
    ],
    defaultBackgroundPrompt:
      `"Minimalist dark studio interior. Cinematic, editorial, sophisticated darkness. Film photography aesthetic."`,
    rawBackgroundPrompt: true,
    categoryBackgroundPrompts: {
      "belleza-cosmetica":
        `"Minimalist dark studio interior. Cinematic, editorial, sophisticated darkness. Film photography aesthetic."`,
      "fitness-deporte":
        "Dark premium gym interior, charcoal and black rubber flooring, dim dramatic spotlights from above creating pools of light, heavy shadows, no equipment in frame, atmospheric and cinematic. No people, no products, no text.",
      "servicios-profesionales":
        "Minimalist dark office interior, near-black walls, a single warm desk lamp glow barely visible off-frame, long dramatic shadows, matte textures. Sophisticated and cinematic. No people, no products, no text.",
      tecnologia:
        "Dark minimal studio, charcoal walls with subtle cool undertone, a single soft blue-tinted light from the side casting elegant shadows, clean and cinematic. No people, no products, no text.",
      "salud-bienestar":
        "Serene dark spa-like interior, deep charcoal stone or concrete walls, warm amber candle-like ambient light barely illuminating the edges, soft and moody. No people, no products, no text. Cinematic wellness aesthetic.",
    },
    defaultProductPrompt:
      "Do NOT show any product. Generate a REAL PERSON in a quiet, elegant PAIN-POINT moment — editorial, cinematic, sophisticated. A professional person, late 20s to early 40s, experiencing a moment of genuine frustration or exhaustion: eyes closed with one hand resting gently on their forehead, or chin resting on clasped hands with a distant troubled gaze, or sitting upright with arms loosely crossed and eyes looking downward. The expression conveys quiet overwhelm — composed but emotionally honest, not theatrical. The person is well-dressed in smart-casual or business attire — clean, fitted clothing with subtle fabric texture. They fill most of the frame from upper chest to just above the head. Centered horizontally in the canvas. LIGHTING: single soft key light from above-left or side window, creating sculpted shadows and depth on the face and clothing. Deep dark background, no clutter, no screens, no props. Photorealistic editorial photography, shallow depth of field, cinematic film quality. No logos, no text, no products.",
    rawProductPrompt: false,
    templateHint: `TEMPLATE HINT for bebas-urgencia-top:
  This is a PAIN-POINT / URGENCY layout. Full-bleed elegant portrait of a person in a quiet moment of struggle.
  A single HUGE headline in Bebas Neue (condensed display font) dominates the top of the image.
  Dark overlay over the scene makes the white headline text pop. Logo auto-rendered top-left.

  ONE HEADLINE ONLY — that is the only text field rendered.

  CRITICAL RULES:
  - headline is the ONLY text rendered. Do NOT generate subheadline, badge, bullets, or CTA.
  - Write a single, punchy pain-point question or statement. ALL CAPS is handled automatically.
  - Maximum 8 words. Shorter is stronger. Every word must earn its place.
  - Speak directly to the reader's most felt frustration in this niche.
  - End with "?" for questions or "." for statements. No ellipsis.

  - headline: single powerful pain-point claim, max 8 words, max 55 chars, min 5 words and min 40 chars.
    Adapt the pain point to the business niche:

    Servicios profesionales / Educación / Tecnología:
    "¿Hart@ de tutoriales que no te llevan a nada?"
    "¿Cansado de ver cómo tu competencia crece?"
    "Más horas de trabajo, menos dinero en el bolsillo."

    Belleza / Estética / Bienestar:
    "¿Seguís probando productos sin ver resultados reales?"
    "Tu rutina de cuidado no debería costarte tanto esfuerzo."
    "¿Cuándo fue la última vez que te sentiste bien con tu piel?"

    Fitness / Deporte / Salud:
    "Entrenás duro y el cuerpo no responde. ¿Por qué?"
    "¿Meses en el gym y el cambio que esperabas no llega?"
    "El cansancio que sentís no es normal. Hay una solución."

    Alimentación / Gastronomía:
    "¿Hartos de pagar caro por algo que no te nutre?"
    "Comer bien no debería ser tan complicado."

  - backgroundColorHint: ignored — template uses a fixed dark cinematic background.

  - sceneAction: optional override describing the person and environment.
    Keep it elegant — no chaos, no clutter, no screens. Focused emotional portrait.
    Adapt the setting to the niche: bathroom for beauty, gym for fitness, office for services.
    Example (servicios): "Professional woman in her 30s, eyes closed with hand on forehead, dark minimal office background, single side light, cinematic"
    Example (belleza): "Woman in her late 20s seated at a dark vanity, chin resting on clasped hands, troubled gaze, warm soft side light, editorial beauty"
    Example (fitness): "Athletic man in his 30s, seated on a dark gym bench, elbows on knees, head bowed, single overhead spotlight, cinematic"`,
  },
];

/** Helper: get metadata for a single template ID */
export function getTemplateMeta(id: string): TemplateMetadata | undefined {
  return TEMPLATE_META_LIST.find((t) => t.id === id);
}
