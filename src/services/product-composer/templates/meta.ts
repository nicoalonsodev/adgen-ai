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
  /** true = runs PRODUCT_IA even without a product photo (person/scene templates) */
  requiresSceneGeneration: boolean;
  /** true = can be used in sequence / carousel mode */
  supportsSequence?: boolean;
  /** true = no product layer at all (e.g. sorteo-giveaway) */
  noProductLayer?: boolean;
  /** true = scene includes person holding the product (persona-producto) */
  sceneWithProduct?: boolean;
  /**
   * true = for sceneWithProduct templates: generate a generic/unbranded product clone via
   * generateGenericProduct before passing it to Gemini. The clone looks more natural when held.
   */
  useGenericProductClone?: boolean;
  /** Business category IDs recommended for this template */
  recommendedFor: string[];
  /** Background prompt sent to Gemini */
  defaultBackgroundPrompt: string;
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
}


export const TEMPLATE_META_LIST: TemplateMetadata[] = [
  {
    id: "classic-editorial-right",
    name: "Classic Editorial",
    icon: "🖼️",
    tag: null,
    active: true,
    description: "Fondo full-bleed, copy en columna derecha, badge pill al fondo.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "right",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "moda-indumentaria", "joyeria-accesorios", "hogar-deco", "salud-bienestar"],
    defaultBackgroundPrompt:
      "Fondo minimalista con pared lisa de textura suave, tipo estudio fotográfico premium. Iluminación natural lateral desde ventana fuera de cuadro, sombras diagonales orgánicas y difusas sobre la pared. Sin objetos, sin texto, sin personas, sin productos. Fondo claro con profundidad sutil, sensación de calma y cuidado personal.",
         rawBackgroundPrompt: true,
    defaultProductPrompt:
      "Integrate the product being held by an elegant hand emerging from the left or bottom-left of the frame. The hand must stay within the LEFT 45% of the canvas. Transmit confidence and care. Lighting must match the background naturally. The product must be fully visible and legible.",
  },
  {
    id: "promo-urgencia-bottom",
    name: "Promo Urgencia",
    icon: "⚡",
    tag: null,
    active: false,
    description: "Layout de oferta centrado, copy en franja inferior, producto arriba",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "bottom",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "alimentos-bebidas", "moda-indumentaria", "fitness-deporte", "tecnologia"],
    defaultBackgroundPrompt:
      "Fondo liso y uniforme, superficie completamente homogénea, sin texturas llamativas. Iluminación suave y envolvente, sin sombras duras. Sin objetos, sin texto, sin personas. Fondo muy claro. Estilo ciclorama fotográfico minimalista y limpio.",
   
    defaultProductPrompt:
      "Integrate the product being held by an elegant hand emerging from below-center of the frame, within the TOP 58% of the canvas. The product should feel premium and desirable. Fully visible, no cropping.",
  },
  {
    id: "hero-center-bottom",
    name: "Hero Center",
    icon: "🎯",
    tag: "Combo / Lanzamiento",
    active: true,
    description: "Título arriba, producto centrado con IA, oferta grande abajo. Ideal para combos, lanzamientos y promociones especiales.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "center",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "moda-indumentaria", "turismo-viajes", "gastronomia", "mascotas"],
    defaultBackgroundPrompt:
      "Fondo satinado suave con textura sedosa muy sutil. Iluminación difusa y envolvente, reflejos suaves. Ambiente premium y femenino. Sin objetos, sin texto, sin personas. Estilo fotografía cosmética de lujo, fondo claro con sensación de suavidad.",
    defaultProductPrompt:
      "Integrate the product being held by an elegant hand from below-center, placed in the CENTER zone between 22% and 68% from top. IMPORTANT: the product must be SMALL — scale it down so it occupies at most 30% of the canvas width. Leave generous negative space around it. Premium product photography style, soft lighting matching the background.",
  },
  {
    id: "headline-top-left",
    name: "Headline Top",
    icon: "📰",
    tag: "Premium",
    active: false,
    description: "Headline grande arriba, producto centrado abajo. Debes generar plataforma luxure con profundidad para ubicar el producto. Ideal para lanzamientos y productos premium.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "bottom",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "servicios-profesionales", "educacion-cursos", "salud-estetica-clinica", "bienes-raices"],
    defaultBackgroundPrompt:
      "Fondo liso, superficie uniforme tipo ciclorama. Iluminación natural suave y difusa, sin sombras dramáticas. Sin texturas, sin objetos, sin texto, sin personas. Fondo claro. Minimalista y limpio, ideal para tipografía oscura.",
    defaultProductPrompt:
      "You are a luxury product photographer. Integrate the product using ONE of these two approaches — choose whichever feels most natural and premium for this product:\n\nOPTION A — Hand hold: An elegant, well-manicured hand holds the product from below, emerging naturally within the BOTTOM 65% of the canvas. The hand should feel graceful and intentional.\n\nOPTION B — Surface placement: The product rests on a beautiful surface (marble, light wood, soft fabric, or frosted glass) within the BOTTOM 65% of the canvas. Add a subtle shadow and perhaps a soft reflection. The surface should complement the background colors.\n\nEither way: luxury editorial photography style, soft natural lighting, the product fully visible and label legible, no cropping. The TOP 35% must remain completely clean.",
  },
  {
    id: "pain-point-left",
    name: "Punto de Dolor",
    icon: "😟",
    tag: "Awareness",
    active: true,
    description: "Copy del dolor a la izquierda, persona/escena a la derecha generada con IA. Ideal para contenido de awareness.",
    supportedRatios: ["1:1"],
    copyZone: "left",
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "fitness-deporte", "servicios-profesionales", "educacion-cursos", "salud-estetica-clinica"],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y uniforme. Sin sombras fuertes, sin texturas llamativas. Ambiente cotidiano y realista. Sin objetos, sin texto. Estilo lifestyle natural y auténtico, fondo claro que no compita con la tipografía oscura.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person in a natural candid lifestyle moment on the RIGHT side of the image. The LEFT 50% must remain completely clean. Authentic, documentary feel.",
  },
  {
    id: "comparacion-split",
    name: "Comparación",
    icon: "⚖️",
    tag: "Vs Competencia",
    active: true,
    description: "Izquierda: tu producto real. Derecha: versión genérica/inferior. Estilo 'US VS THEM' con fondo bicolor y puntos de comparación numerados.",
    supportedRatios: ["1:1"],
    copyZone: "full",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "tecnologia", "salud-bienestar", "fitness-deporte", "servicios-profesionales"],
    defaultBackgroundPrompt:
      "Fondo completamente liso, sin texturas llamativas. Iluminación suave y uniforme sin sombras. Sin objetos, sin texto, sin personas, sin manos. Fondo claro. Ambiente minimalista premium.",
    defaultProductPrompt: "",
  },
  {
    id: "comparacion-split-ia",
    name: "Comparación con Escena",
    icon: "⚖️",
    tag: "Vs Competencia + IA",
    active: false,
    description: "Izquierda: versión genérica/inferior del producto (✗). Derecha: tu producto real (✓). La IA duplica tu producto degradado a la izquierda con overlays semitransparentes.",
    supportedRatios: ["1:1"],
    copyZone: "full",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "fitness-deporte", "salud-estetica-clinica", "servicios-profesionales"],
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
    description: "Foto con personas full-bleed generada en el background, copy centrado en capas encima. Headline enorme uppercase, línea script italic debajo, badge de premios y CTA de colaboración al pie. Ideal para sorteos, giveaways y activaciones con influencers.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "center",
    requiresSceneGeneration: false,
    noProductLayer: true,
    supportsSequence: false,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "moda-indumentaria", "salud-estetica-clinica", "gastronomia", "mascotas"],
    defaultBackgroundPrompt:
      "Warm authentic lifestyle photo of two people — a mother and daughter or two close women — sharing a tender moment together, wearing soft white robes or towels, smiling naturally at each other or at a gift they are holding, this gift must be the product. Full-bleed scene, fills the entire canvas. Lighting warm and soft, cinematic quality. Slightly darker in the center-bottom area to ensure white text readability. No text, no logos, no products visible. Photorealistic, emotional and genuine, not stock-photo generic.",
    defaultProductPrompt: "",
  },
  {
    id: "antes-despues",
    name: "Antes vs Después",
    icon: "📅",
    tag: "Transformación",
    active: true,
    description: "Split Day 1 vs Day X: izquierda problemas (fondo blanco), derecha resultados (fondo amarillo/color), producto grande centrado abajo cruzando ambas columnas.",
    supportedRatios: ["1:1"],
    copyZone: "full",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "fitness-deporte", "salud-estetica-clinica", "alimentos-bebidas"],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro, sin texturas llamativas. Iluminación suave y uniforme sin sombras. Sin objetos, sin texto, sin personas, sin manos. Ambiente minimalista premium.",
    defaultProductPrompt:
      "Integrate the product CENTERED at the BOTTOM of the canvas, occupying roughly 50-60% width. The product must span across the center of the image. Place it in the BOTTOM 40% zone. Studio product photography, clean white/light background behind the product, soft shadow beneath. The product must be fully visible, no hands, no cropping. Premium clean look. Tienes prohibido modificar el background, solo debes agregar el producto en la zona indicada.",
  },
  {
    id: "beneficios-producto",
    name: "Beneficios Producto",
    icon: "✨",
    tag: "Beneficios",
    active: true,
    description: "Producto hero grande a la izquierda, 4 beneficios con pills a la derecha. Fondo gris oscuro, estilo profesional y limpio.",
    supportedRatios: ["1:1"],
    copyZone: "right",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "alimentos-bebidas", "fitness-deporte", "tecnologia", "hogar-deco"],
    defaultBackgroundPrompt:
      "Fondo color gris medio uniforme (#7A7A7A). En la zona centro-izquierda del canvas, dibujar un GRAN CÍRCULO o ARCO decorativo semitransparente de color gris más claro (#9A9A9A, opacidad ~30%), con un diámetro de aproximadamente 65% del canvas. Este arco debe estar parcialmente detrás de donde irá el producto (centro-izquierda). Iluminación suave y envolvente estilo estudio fotográfico premium. Sin objetos, sin texto, sin personas, sin manos, sin productos. Solo el fondo gris con el arco decorativo sutil. Estilo minimalista profesional tipo BODY TALES.",
      rawBackgroundPrompt: true,
    defaultProductPrompt:
      "Place the product on the LEFT side of the canvas, centered around 22% horizontal. The product should be VERY LARGE, occupying roughly 48% of the canvas width and 70% height. Studio product photography style, dramatic soft lighting from the right side highlighting the product shape. The product must feel premium, three-dimensional, with strong depth and presence. Subtle shadow beneath. The RIGHT 50% of the canvas must remain completely clean for text. No hands, no people. The product floats or rests at a slight angle for dynamism.",
  },
  {
    id: "razones-producto",
    name: "Razones Producto",
    icon: "🎯",
    tag: "Razones",
    active: true,
    description: "Producto CENTRADO con 4 beneficios distribuidos alrededor (esquinas). Fondo cálido durazno/crema. Estilo BODY TALES 'Reasons to use'.",
    supportedRatios: ["1:1"],
    copyZone: "center",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "alimentos-bebidas", "fitness-deporte", "tecnologia", "hogar-deco"],
    defaultBackgroundPrompt:
      "Fondo liso uniforme, completamente plano. SIN gradientes, SIN brillos, SIN reflejos, SIN texturas visibles. Iluminación suave y envolvente. Sin objetos, sin texto, sin personas, sin manos, sin productos. Solo un bloque de color sólido y plano. Fondo claro. Estilo minimalista premium tipo BODY TALES.",
    // NOTE: Las líneas conectoras se dibujan por código (JS), no por Gemini
    defaultProductPrompt:
      "Place the product in the CENTER of the canvas, perfectly centered both horizontally and vertically. The product should be LARGE, occupying roughly 40% width and 50% height. Studio product photography style, soft warm lighting from all sides. The product must feel premium, three-dimensional with subtle shadow beneath. No hands, no people. No dramatic lighting. Do NOT draw any connector lines, arrows, or annotations — these are added automatically.",
  },
  {
    id: "editorial-lifestyle-left",
    name: "Editorial Izquierda",
    icon: "📸",
    tag: "Editorial",
    active: true,
    description: "Headline enorme a la izquierda, persona/escena lifestyle a la derecha generada por IA. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1"],
    copyZone: "left",
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "moda-indumentaria", "salud-estetica-clinica", "fitness-deporte", "servicios-profesionales"],
    rawBackgroundPrompt: true,
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y envolvente, tipo estudio editorial. Sin sombras duras, sin texturas llamativas. Sin objetos, sin texto, sin personas. Estilo fotografía editorial de revista de belleza, fondo claro y limpio.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up or medium shot — in a beauty/lifestyle moment on the RIGHT side of the image. Editorial beauty photography: glowing skin, natural makeup, confident expression. The LEFT 48% must remain completely clean for text. Soft natural lighting, cinematic quality. No logos, no text.",
  },
  {
    id: "editorial-lifestyle-right",
    name: "Editorial Derecha",
    icon: "📸",
    tag: "Editorial",
    active: false,
    description: "Persona/escena lifestyle a la izquierda generada por IA, headline enorme a la derecha. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1"],
    copyZone: "right",
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "moda-indumentaria", "salud-estetica-clinica", "fitness-deporte", "servicios-profesionales"],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y envolvente, tipo estudio editorial. Sin sombras duras, sin texturas llamativas. Sin objetos, sin texto, sin personas. Estilo fotografía editorial de revista de belleza, fondo claro y limpio.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up or medium shot — in a beauty/lifestyle moment on the LEFT side of the image. Editorial beauty photography: glowing skin, natural makeup, confident expression. The RIGHT 48% must remain completely clean for text. Soft natural lighting, cinematic quality. No logos, no text.",
  },
  {
    id: "editorial-lifestyle-bottom",
    name: "Editorial Abajo",
    icon: "📸",
    tag: "Editorial",
    active: false,
    description: "Escena lifestyle full-bleed, headline enorme blanco en la mitad inferior con gradiente oscuro. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "bottom",
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "moda-indumentaria", "salud-estetica-clinica", "fitness-deporte", "servicios-profesionales"],
    defaultBackgroundPrompt:
      "Fondo neutro suave y claro. Iluminación envolvente tipo estudio. Sin objetos, sin texto, sin personas. Limpio y minimalista.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up beauty portrait, looking up or to the side — filling most of the canvas. Editorial beauty photography: glowing skin, natural makeup, confident and serene expression. The person should be centered or slightly above center. Full-bleed, cinematic quality. Soft warm lighting. No logos, no text.",
  },
  {
    id: "editorial-lifestyle-top",
    name: "Editorial Arriba",
    icon: "📸",
    tag: "Editorial",
    active: false,
    description: "Headline enorme blanco arriba con gradiente oscuro, escena lifestyle full-bleed abajo. Estilo editorial beauty premium. Sin producto.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "center",
    requiresSceneGeneration: true,
    supportsSequence: true,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "moda-indumentaria", "salud-estetica-clinica", "fitness-deporte", "servicios-profesionales"],
    defaultBackgroundPrompt:
      "Fondo neutro suave y claro. Iluminación envolvente tipo estudio. Sin objetos, sin texto, sin personas. Limpio y minimalista.",
    defaultProductPrompt:
      "Do NOT show any product. Generate a real person — close-up beauty portrait or medium shot from below — filling the lower 65% of the canvas. Editorial beauty photography: glowing skin, natural makeup, confident expression. The top 35% should have darker tones or the person's hair/silhouette for text overlay. Full-bleed, cinematic quality. Soft warm lighting. No logos, no text.",
  },
  {
    id: "editorial-center-top",
    name: "Editorial Centrado",
    icon: "📸",
    tag: "Editorial",
    active: true,
    description: "Headline y subheadline centrados en la parte superior, persona con producto ocupa el ancho completo inferior. Estilo editorial beauty premium.",
    supportedRatios: ["1:1"],
    copyZone: "top",
    requiresSceneGeneration: true,
    sceneWithProduct: true,
    useGenericProductClone: true,
    supportsSequence: false,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "moda-indumentaria", "salud-estetica-clinica", "fitness-deporte", "servicios-profesionales"],
    defaultBackgroundPrompt:
      "Fondo completamente liso y muy claro. Iluminación natural suave y envolvente, tipo estudio editorial. Sin sombras duras, sin texturas llamativas. Sin objetos, sin texto, sin personas. Estilo fotografía editorial de revista de belleza, fondo claro y limpio.",
    defaultProductPrompt:
      "BOTTOM 40% OF CANVAS ONLY — no person or object may appear in the top 60%. Generate a real person in a warm lifestyle setting naturally holding or using this product. The person must span the FULL WIDTH of the canvas from the left edge to the right edge. Head at approximately 55–65% from the top of the canvas. Warm natural lighting, editorial quality, candid and genuine feel. Do not erase or modify any existing text or graphic elements already present in the image.",
  },
  {
    id: "producto-beneficios-vertical",
    name: "Beneficios Vertical",
    icon: "⚡",
    tag: "Vertical",
    active: true,
    description: "Layout BODY TALES: dos columnas, izquierda lavanda pastel con 4 beneficios y círculos-icono SVG, derecha azul-gris oscuro con producto grande y nombre. Barra de títulos de columna y marca arriba. Ideal para 1:1 y 4:5.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "left",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "alimentos-bebidas", "fitness-deporte", "tecnologia", "hogar-deco", "salud-estetica-clinica"],
    defaultBackgroundPrompt:
      "Fondo completamente liso dividido en dos mitades verticales iguales (50/50). Mitad izquierda color lavanda pastel suave claro (#C8CEE8), uniforme y liso. Mitad derecha color azul-gris oscuro apagado (#6B7394), uniforme y liso. NO usar iluminación dramática, NO usar brillos, NO usar reflejos, NO usar gradientes. Ambas mitades deben ser completamente planas y uniformes. Sin texturas, sin objetos, sin texto, sin personas, sin manos, sin productos. Solo dos bloques de color plano lado a lado.",
    defaultProductPrompt:
      "Place the product on the RIGHT side of the canvas, centered around 75-78% horizontal. The product should be VERY LARGE, filling most of the right half. Studio product photography, soft even lighting, clean background. CRITICAL: the LEFT 56% of the canvas must remain COMPLETELY CLEAN — no product edge, no shadow, no label, nothing whatsoever. The product must stay strictly within the rightmost 44% of the canvas. No hands, no people.",
  },
  {
    id: "producto-hero-top",
    name: "Hero Editorial",
    icon: "🌊",
    tag: "Hero",
    active: true,
    description: "Producto hero en la parte superior, nombre de marca y tagline al pie. Fondo fotográfico suave con gradiente. Estilo editorial beauty premium.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "top",
    // Text goes at BOTTOM, but PRODUCT_IA should place the product in CENTER
    productIAZone: "center",
    requiresSceneGeneration: false,
    recommendedFor: ["belleza-cosmetica", "moda-indumentaria", "salud-bienestar", "hogar-deco", "alimentos-bebidas"],
    rawBackgroundPrompt: true,
    defaultBackgroundPrompt:
      "Minimalist premium studio background. Very clean neutral surface with ultra-soft, barely visible texture. Soft diffused studio lighting, elegant and photographic. No text, no people, no products, no logos.",
    categoryBackgroundPrompts: {
      "belleza-cosmetica":
        "Extreme close-up macro photography of SMOOTH COSMETIC CREAM AND GEL TEXTURES on a soft surface tinted with the BRAND'S PRIMARY COLOR (use a pastel/muted version of it). Only 2-3 broad, THIN cream strokes flowing diagonally across the frame — NOT many small strokes, just a FEW large elegant ones with lots of breathing space between them. The cream textures are tinted with a lighter shade of the brand's primary color and white, semi-transparent, with a glossy wet surface. The strokes must be FLAT and SMOOTH — like thin layers of gel spread evenly with a spatula, NOT thick chunky impasto or heavy 3D relief. Very minimal surface variation, gentle soft edges. Subtle specular highlights but the overall surface should feel SLEEK and FLUID. Large areas of the brand-colored background are visible between the few cream strokes, giving the composition an airy, open feel. Lighting is bright, soft, and diffused — studio beauty lighting. Ultra high resolution, photorealistic macro photography, 4K, premium skincare brand aesthetic. No text, no people, no products, no logos.",
      "salud-bienestar":
        "Extreme close-up macro photography of SMOOTH COSMETIC CREAM AND GEL TEXTURES on a soft surface tinted with the BRAND'S PRIMARY COLOR (use a pastel/muted version of it). Only 2-3 broad, THIN cream strokes flowing diagonally across the frame — NOT many small strokes, just a FEW large elegant ones with lots of breathing space between them. The cream textures are tinted with a lighter shade of the brand's primary color and white, semi-transparent, with a glossy wet surface. The strokes must be FLAT and SMOOTH — like thin layers of gel spread evenly with a spatula, NOT thick chunky impasto or heavy 3D relief. Very minimal surface variation, gentle soft edges. Subtle specular highlights but the overall surface should feel SLEEK and FLUID. Large areas of the brand-colored background are visible between the few cream strokes, giving the composition an airy, open feel. Lighting is bright, soft, and diffused — studio beauty lighting. Ultra high resolution, photorealistic macro photography, 4K, premium skincare brand aesthetic. No text, no people, no products, no logos.",
      "salud-estetica-clinica":
        "Extreme close-up macro photography of SMOOTH COSMETIC CREAM AND GEL TEXTURES on a soft surface tinted with the BRAND'S PRIMARY COLOR (use a pastel/muted version of it). Only 2-3 broad, THIN cream strokes flowing diagonally across the frame — NOT many small strokes, just a FEW large elegant ones with lots of breathing space between them. The cream textures are tinted with a lighter shade of the brand's primary color and white, semi-transparent, with a glossy wet surface. The strokes must be FLAT and SMOOTH — like thin layers of gel spread evenly with a spatula, NOT thick chunky impasto or heavy 3D relief. Very minimal surface variation, gentle soft edges. Subtle specular highlights but the overall surface should feel SLEEK and FLUID. Large areas of the brand-colored background are visible between the few cream strokes, giving the composition an airy, open feel. Lighting is bright, soft, and diffused — studio beauty lighting. Ultra high resolution, photorealistic macro photography, 4K, premium skincare brand aesthetic. No text, no people, no products, no logos.",
    },
    defaultProductPrompt:
      "Integrate the product CENTERED horizontally and vertically in the canvas. The product must be SMALL — occupying approximately 13–14% of the canvas width. Position the product strictly between 42% and 80% from the top — the CENTER zone only. CRITICAL: the TOP 30% and BOTTOM 15% of the canvas MUST remain COMPLETELY CLEAN — no product, no shadow, nothing. TILT the product clearly to the RIGHT at approximately 15-20 degrees clockwise rotation — the tilt must be VISIBLE and give a dynamic, editorial feel, like the product is casually leaning. REALISM IS KEY: the product must look like it was physically photographed on this surface — Match lighting and color temperature ONLY. Do not match background blur or softness. The product must remain in perfect focus. Add a natural, realistic CONTACT SHADOW directly beneath the product (soft, diffused, slightly elongated in the light direction) plus a very subtle AMBIENT OCCLUSION where the product base meets the surface. Add faint reflected light from the background color onto the product edges to sell the integration. The product must feel premium and three-dimensional. Soft natural lighting matching the background, clean studio style. No hands, no people. The product is the absolute hero. CRITICAL SHARPNESS RULE: The product must remain razor-sharp and high-resolution. Do NOT apply blur, gaussian blur, softening, glow, diffusion, or haze to the product.",
  },
  {
    id: "testimonio-review",
    name: "Testimonio Review",
    icon: "⭐",
    tag: "Social Proof",
    active: false,
    description: "Layout testimonial: 5 estrellas de rating arriba, cita grande centrada, nombre del testimoniante, y persona generada por IA en la mitad inferior. Fondo sólido de color. Ideal para social proof / reviews.",
    supportedRatios: ["9:16", "4:5", "1:1"],
    copyZone: "top",
    requiresSceneGeneration: true,
    recommendedFor: ["belleza-cosmetica", "salud-bienestar", "alimentos-bebidas", "fitness-deporte", "salud-estetica-clinica", "hogar-deco"],
    defaultBackgroundPrompt:
      "Fondo liso uniforme de un solo color, completamente plano. SIN gradientes, SIN texturas, SIN objetos, SIN personas. Solo un bloque de color sólido usando el color primario de la marca. Minimalista y limpio.",
    defaultProductPrompt:
      "Do NOT show any product. Generate ONLY a real person — visible from the CHEST UP — positioned STRICTLY in the BOTTOM 45% of the canvas. The person's HEAD must be at approximately 55% from the top, NEVER higher. The TOP 50% MUST remain COMPLETELY EMPTY solid color. Person CENTERED horizontally. Happy, confident smile. Solid colored background matching the rest. Natural beauty photography, warm lighting. No logos, no text. Do NOT erase or modify any existing text or stars.",
  },
  {
    id: "persona-producto-left",
    name: "Persona con Producto",
    icon: "🧍",
    tag: "Lifestyle Ad",
    active: true,
    description: "Persona sosteniendo el producto a la derecha, claim grande y CTA a la izquierda. Gradiente oscuro lateral para texto blanco. Estilo lifestyle brand ad (Huel, Nike, etc.).",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "left",
    requiresSceneGeneration: true,
    sceneWithProduct: true,
    supportsSequence: true,
    recommendedFor: ["belleza-cosmetica", "alimentos-bebidas", "fitness-deporte", "salud-bienestar", "moda-indumentaria", "tecnologia"],
    defaultBackgroundPrompt:
      "Soft blurred modern office or studio interior. Natural light streaming from a window on the right side. Warm neutral tones — light beige walls, soft shadows, clean environment. Shallow depth of field bokeh effect. No people, no text, no logos, no products. Background only, suitable for person compositing on the right half.",
    defaultProductPrompt:
      "A natural, confident person on the RIGHT side of the canvas, visible from head to knee. They are actively using or applying the product from Image 2: one hand holds the product at chest height while the other hand applies or touches their skin naturally, OR they present the product directly to camera with both hands. Product label must be clearly visible. Warm genuine expression. Natural light matching the background. right side of canvas only, left half completely clean.",
    rawProductPrompt: true,
  },
  {
    id: "persona-hero-bottom",
    name: "Lifestyle Hero",
    icon: "👥",
    tag: "Lifestyle Group",
    active: true,
    description: "Panel blanco superior con logo, headline y subheadline centrados. Escena lifestyle full-bleed inferior con persona(s) y producto. Estilo Huel, Nike. CTA al pie.",
    supportedRatios: ["1:1", "4:5"],
    copyZone: "top",
    requiresSceneGeneration: true,
    sceneWithProduct: true,
    supportsSequence: false,


    recommendedFor: ["alimentos-bebidas", "fitness-deporte", "salud-bienestar", "belleza-cosmetica", "moda-indumentaria", "tecnologia"],
    defaultBackgroundPrompt:
      "Warm, inviting modern interior — kitchen, open living space, or studio with large windows. Soft natural light from the side, warm neutral tones (light wood, cream walls). Slightly blurred background with shallow depth of field bokeh. No people, no text, no logos, no products visible. Clean, premium lifestyle brand aesthetic.",
    rawBackgroundPrompt: true,
    rawProductPrompt: true,
    defaultProductPrompt:
      "You receive TWO images: (1) the background — which already has a WHITE PANEL covering the TOP 42% of the canvas containing brand text and logo, all finalized; (2) the product photo to integrate.\n\nYOUR TASK: Generate a LIFESTYLE SCENE in the BOTTOM portion of the canvas showing 2-3 real people naturally using or holding this specific product. The white top panel and its text are PRE-RENDERED and must remain 100% intact.\n\nCRITICAL ZONE RULE — ABSOLUTE AND NON-NEGOTIABLE:\n- Your working area is STRICTLY the BOTTOM 58% of the image (below the white panel boundary).\n- The TOP 42% MUST remain exactly as the background — completely untouched.\n- NO person's head, hair, shoulders, arms, hands, or any body part may appear above the 42% line from the top.\n- If a person would be too tall, show them from the torso down — but keep ALL body parts strictly below the white panel boundary.\n- Cast NO shadows into the white panel area.\n\nSCENE COMPOSITION:\n- 2-3 real, diverse people authentically using, holding, or enjoying this product in a natural lifestyle moment.\n- Choose a setting that genuinely matches the product's world: kitchen or café for food/drink, gym or outdoors for fitness, bathroom or vanity for beauty, home office for tech.\n- The product must be clearly visible and recognizable — in someone's hands or actively in use.\n- Warm, cinematic, natural lighting. Candid and genuine — never stock-photo stiff.\n- Wide, full-bleed composition filling the entire bottom zone from edge to edge.\n\nABSOLUTE PROHIBITIONS:\n- Do NOT let any person, object, or shadow enter the top 40% of the canvas.\n- Do NOT erase, modify, fade, blur, or overlay the white panel or its text in any way.\n- Do NOT add text, logos, watermarks, badges, or graphic decorations of any kind.",


  },
];


/** Helper: get metadata for a single template ID */
export function getTemplateMeta(id: string): TemplateMetadata | undefined {
  return TEMPLATE_META_LIST.find((t) => t.id === id);
}



