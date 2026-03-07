/**
 * Product Composer Types
 *
 * All types for the product composition pipeline.
 */

import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════
   PLACEMENT HINT
═══════════════════════════════════════════════════════════════ */

export const PlacementAnchorSchema = z.enum([
  "floor",
  "table",
  "center",
  "bottom_center",
  "bottom_left",
  "bottom_right",
  "top_center",
  "custom",
]);

export type PlacementAnchor = z.infer<typeof PlacementAnchorSchema>;

export const PlacementHintSchema = z.object({
  /** Anchor point for placement */
  anchor: PlacementAnchorSchema.default("bottom_center"),

  /** X position (0-1 normalized, 0.5 = center) */
  x: z.number().min(0).max(1).optional(),

  /** Y position (0-1 normalized, 0 = top, 1 = bottom) */
  y: z.number().min(0).max(1).optional(),

  /** Scale factor (1.0 = fit to max size) */
  scale: z.number().min(0.1).max(3).optional(),

  /** Rotation in degrees */
  rotation: z.number().min(-180).max(180).optional(),

  /** Depth hint for perspective adjustment */
  depth: z.enum(["near", "mid", "far"]).optional(),

  /** Maximum width as fraction of background */
  maxWidthRatio: z.number().min(0.1).max(1).optional(),

  /** Maximum height as fraction of background */
  maxHeightRatio: z.number().min(0.1).max(1).optional(),

  /** Absolute width in pixels (overrides scale) */
  width: z.number().positive().optional(),

  /** Absolute height in pixels (overrides scale) */
  height: z.number().positive().optional(),
});

export type PlacementHint = z.infer<typeof PlacementHintSchema>;

/* ═══════════════════════════════════════════════════════════════
   STYLE OPTIONS
═══════════════════════════════════════════════════════════════ */

export const CompositionStyleSchema = z
  .object({
    /** Shadow configuration */
    shadow: z
      .object({
        enabled: z.boolean().default(true),
        blur: z.number().min(0).max(100).default(20),
        opacity: z.number().min(0).max(1).default(0.3),
        offsetX: z.number().default(0),
        offsetY: z.number().default(10),
        color: z.string().default("rgba(0,0,0,0.5)"),
      })
      .optional(),

    /** Color matching */
    colorMatch: z
      .object({
        enabled: z.boolean().default(true),
        luminanceAdjust: z.boolean().default(true),
        saturationAdjust: z.boolean().default(false),
        strength: z.number().min(0).max(1).default(0.3),
      })
      .optional(),

    /** Edge softening */
    edgeSoften: z
      .object({
        enabled: z.boolean().default(false),
        radius: z.number().min(0).max(20).default(2),
      })
      .optional(),
  })
  .optional();

export type CompositionStyle = z.infer<typeof CompositionStyleSchema>;

/* ═══════════════════════════════════════════════════════════════
   COMPOSE MODE (STANDARD vs AUTO_LAYOUT vs SMART_USAGE_V1 vs PRESET)
═══════════════════════════════════════════════════════════════ */

/**
 * ComposeMode:
 * - STANDARD: Use manual placement parameters (anchor, x, y, scale)
 * - AUTO_LAYOUT: AI analyzes background and proposes optimal layout
 * - SMART_USAGE_V1: Fully automatic pipeline for apply_skin archetype
 * - PRESET: Use a predefined layout template (no AI)
 */
export const ComposeModeSchema = z.enum([
  "STANDARD",
  "AUTO_LAYOUT",
  "SMART_USAGE_V1",
  "PRESET",
  "PRODUCT_IA",
  "TEMPLATE_BETA",
]);
export type ComposeMode = z.infer<typeof ComposeModeSchema>;

/**
 * Copy content for AUTO_LAYOUT mode
 */
export const CopyContentSchema = z.object({
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  cta: z.string().optional(),
  badge: z.string().optional(),
  disclaimer: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  /** comparacion-split: your product/brand name (left column label) */
  columnTitle: z.string().optional(),
  /** comparacion-split: competition label (right column label) */
  competitionTitle: z.string().optional(),
  /** comparacion-split: competition weaknesses (right column bullets) */
  competitionBullets: z.array(z.string()).optional(),
  /** Brand primary color as hex (e.g. "#D4A5A5") — fallback cuando no hay brandColors */
  primaryColor: z.string().optional(),
  /**
   * Paleta completa de la marca (7 colores de coloresMarca[]).
   * Índices: [0] primary, [1] primaryLight, [2] primaryDark, [3] primaryPale,
   *          [4] accent, [5] accentLight, [6] accentDark
   * Tiene prioridad sobre primaryColor si está presente.
   */
  brandColors: z.array(z.string()).optional(),
  /**
   * Modo de color del template.
   * - "light" (default): fondo lifestyle claro, texto oscuro.
   * - "dark": fondo oscuro / overlay denso, texto claro.
   */
  colorMode: z.enum(["light", "dark"]).optional(),
});
export type CopyContent = z.infer<typeof CopyContentSchema>;

/**
 * AUTO_LAYOUT specific options
 */
export const AutoLayoutOptionsSchema = z.object({
  /** Layout style hint for AI */
  layoutHint: z.enum(["minimal", "bold", "elegant", "playful"]).optional(),
  /** Preset name to use instead of AI analysis */
  presetName: z.enum(["SPLIT_LEFT", "SPLIT_RIGHT", "HERO_CENTER"]).optional(),
  /** Force fallback to preset (skip AI analysis) */
  skipAI: z.boolean().default(false),
  /** Render text on the final image */
  renderText: z.boolean().default(true),
  /** Return the LayoutSpec in the response */
  includeLayoutSpec: z.boolean().default(true),
  /** Min confidence threshold (default 0.55) */
  minConfidence: z.number().min(0).max(1).optional(),
});
export type AutoLayoutOptions = z.infer<typeof AutoLayoutOptionsSchema>;

/**
 * SMART_USAGE_V1 specific options
 */
export const SmartUsageOptionsSchema = z.object({
  /** Product name for usage inference */
  productName: z.string(),
  /** Product description for usage inference */
  productDescription: z.string(),
  /** Skip AI inference and use provided usage plan */
  skipInference: z.boolean().default(false),
  /** Pre-computed usage plan (if skipInference) */
  usagePlan: z
    .object({
      archetype: z.literal("apply_skin"),
      primaryEmotion: z.enum(["comfort", "confidence", "relief"]),
      sceneType: z.enum(["bathroom_morning", "bedroom_soft"]),
      camera: z.enum(["medium_close", "closeup"]),
      negativeSpacePreference: z.enum(["top_left", "top_right"]),
      surfaceRequired: z.boolean(),
      interactionRequired: z.boolean(),
    })
    .optional(),
  /** QA threshold (default 0.75) */
  qaThreshold: z.number().min(0).max(1).default(0.75),
  /** Enable auto-repair if QA score is low */
  enableRepair: z.boolean().default(true),
});
export type SmartUsageOptions = z.infer<typeof SmartUsageOptionsSchema>;

/**
 * PRESET specific options
 */
export const PresetOptionsSchema = z.object({
  /** Preset ID to use */
  presetId: z.string(),
  /** Render text on the final image */
  renderText: z.boolean().default(true),
  /** Return the LayoutSpec in the response */
  includeLayoutSpec: z.boolean().default(true),
  /** Aspect ratio override for the output canvas */
  aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]).optional(),
});
export type PresetOptions = z.infer<typeof PresetOptionsSchema>;


/* ═══════════════════════════════════════════════════════════════
   opciones simples (opcionales) para modo PRODUCT_IA:
═══════════════════════════════════════════════════════════════ */
export const ProductIAOptionsSchema = z.object({
  /** Prompt del usuario para la integración (ej: "una mano sosteniendo el producto") */
  prompt: z.string().optional(),

  /** Por defecto queremos copy a la derecha */
copyZone: z.enum(["right", "left", "top", "bottom", "center", "full"]).default("right"),

  /** Si background no es 1080x1350, lo ajustamos */
  forceSize: z.object({
    width: z.number().int().positive().default(1080),
    height: z.number().int().positive().default(1350),
  }).optional(),

  /** Debug extra */
  includeLayoutSpec: z.boolean().default(true),
  skipTextRender: z.boolean().optional(),

  /** When true: skip product injection, generate person/scene instead */
  sceneMode: z.boolean().optional().default(false),
  /** When true: use provided avatarBuffer as the scene (skip Gemini) */
  useAvatarAsScene: z.boolean().optional().default(false),
  /** When true: use pure Sharp compositing (no Gemini) — places product on RIGHT,
   * desaturated faded copy on LEFT. No hands possible. For comparacion-split. */
  splitComparison: z.boolean().optional().default(false),
  /** When true: send the product prompt to Gemini exactly as-is, without any role wrapper or rules */
  rawProductPrompt: z.boolean().optional().default(false),
  /** When true: the Flujo D scene intentionally includes a person (e.g. persona-producto-left without avatar).
   *  Enables ABSOLUTE_RULES_ANATOMY in buildProductIAPrompt. Never set for product-only templates. */
  personScene: z.boolean().optional().default(false),
  /**
   * When true: use avatar as a REFERENCE for the person's appearance and have Gemini
   * generate them holding the product. Requires both avatarBuffer and productBuffer.
   * Used for sceneWithProduct templates (e.g. persona-producto-left).
   */
  avatarSceneWithProduct: z.boolean().optional().default(false),
  /**
   * When true: before passing the product to generateSceneWithAvatarAndProduct,
   * first generate a generic/unbranded clone via generateGenericProduct.
   * The clone looks more natural when held by the person (no visible labels).
   * Used by persona-producto-left.
   */
  useGenericProductClone: z.boolean().optional().default(false),
  /**
   * After Gemini composites the product, re-overlay the original product PNG at this
   * exact position using Sharp to restore sharpness (Gemini tends to over-blur on
   * macro-texture backgrounds like producto-hero-top).
   */
  sharpProductOverlay: z.object({
    /** Product width as fraction of canvas width (e.g. 0.13 = 13%) */
    sizePct: z.number().min(0.01).max(1),
    /** Center X (0–1) */
    centerX: z.number().min(0).max(1),
    /** Center Y (0–1) */
    centerY: z.number().min(0).max(1),
    /** Clockwise rotation in degrees (default 0) */
    rotation: z.number().min(-180).max(180).optional(),
  }).optional(),
  /**
   * When true: the user uploaded a real product image (not the transparent placeholder).
   * In sceneMode, this tells composeWithProductIA to send the product image to Gemini
   * as Image 2 so it uses the real product instead of hallucinating one.
   */
  hasRealProduct: z.boolean().optional().default(false),
});
export type ProductIAOptions = z.infer<typeof ProductIAOptionsSchema>;
/* ═══════════════════════════════════════════════════════════════
   opciones TEMPLATE_BETA: selección de template, tamaño de canvas, etc.
═══════════════════════════════════════════════════════════════ */
export const TemplateBetaOptionsSchema = z.object({
  /** ID del template (default: "classic-editorial-right") */
  templateId: z.string().default("classic-editorial-right"),
  /** Canvas size */
  canvas: z.object({
    width: z.number().int().positive().default(1080),
    height: z.number().int().positive().default(1080),
  }).optional(),
  /** Devolver layoutSpec */
  includeLayoutSpec: z.boolean().default(true),
});
export type TemplateBetaOptions = z.infer<typeof TemplateBetaOptionsSchema>;


/* ═══════════════════════════════════════════════════════════════
   COMPOSE REQUEST
═══════════════════════════════════════════════════════════════ */

export const ComposeRequestSchema = z
  .object({
    /** Compose mode: STANDARD (manual placement) or AUTO_LAYOUT (AI-powered) */
    mode: ComposeModeSchema.default("STANDARD"),

     /** Product IA specific options */
    productIAOptions: ProductIAOptionsSchema.optional(),

     /** Template Beta specific options */
     templateBetaOptions: TemplateBetaOptionsSchema.optional(),

    /** Background image (URL or data URL) */
    backgroundUrl: z.string().optional(),

    /** Background image buffer (alternative to URL) */
    backgroundBuffer: z.instanceof(Buffer).optional(),

    /** Product PNG (URL or data URL) */
    productPngUrl: z.string().optional(),

    /** Product PNG buffer (alternative to URL) */
    productBuffer: z.instanceof(Buffer).optional(),

    /** Avatar buffer for scene templates (skips Gemini scene generation) */
    avatarBuffer: z.instanceof(Buffer).optional(),

    /** Logo image (base64, no data: prefix) for overlay on final creative — fallback/single logo */
    logoBase64: z.string().optional(),

    /** Logo MIME type (e.g., "image/png") */
    logoMimeType: z.string().optional(),

    /** Logo oscuro (base64) — para templates con fondo claro */
    logoDarkBase64: z.string().optional(),
    logoDarkMimeType: z.string().optional(),

    /** Logo claro (base64) — para templates con fondo oscuro */
    logoLightBase64: z.string().optional(),
    logoLightMimeType: z.string().optional(),

    /** Placement configuration (for STANDARD mode) */
    placement: PlacementHintSchema.optional(),

    /** Style options */
    style: CompositionStyleSchema,

    /** Copy content for text rendering (AUTO_LAYOUT mode) */
    copy: CopyContentSchema.optional(),

    /** AUTO_LAYOUT specific options */
    autoLayoutOptions: AutoLayoutOptionsSchema.optional(),

    /** SMART_USAGE_V1 specific options */
    smartUsageOptions: SmartUsageOptionsSchema.optional(),

    /** PRESET specific options */
    presetOptions: PresetOptionsSchema.optional(),

    /** Output format */
    outputFormat: z.enum(["png", "jpeg", "webp"]).default("png"),

    /** JPEG/WebP quality (1-100) */
    quality: z.number().min(1).max(100).default(90),

    /** Random seed for deterministic operations */
    seed: z.number().optional(),

    /** Enable Gemini advanced mode */
    useGeminiEdit: z.boolean().default(false),

    /** Request ID for logging */
    requestId: z.string().optional(),
  })
 .refine((data) => data.backgroundUrl || data.backgroundBuffer, {
  message: "Either backgroundUrl or backgroundBuffer is required",
})
.refine((data) => data.mode === "TEMPLATE_BETA" || data.productPngUrl || data.productBuffer, {
  message: "Either productPngUrl or productBuffer is required",
})

export type ComposeRequest = z.infer<typeof ComposeRequestSchema>;

/* ═══════════════════════════════════════════════════════════════
   COMPOSE RESULT
═══════════════════════════════════════════════════════════════ */

export interface ComposeDebugInfo {
  /** Background dimensions */
  backgroundSize: { width: number; height: number };

  /** Product original dimensions */
  productOriginalSize: { width: number; height: number };

  /** Product final dimensions */
  productFinalSize: { width: number; height: number };

  /** Final placement position */
  placement: { x: number; y: number; width: number; height: number };

  /** Whether Gemini edit was used */
  geminiEditUsed: boolean;

  /** Luminance values */
  luminance?: {
    backgroundArea: number;
    productOriginal: number;
    adjustment: number;
  };
}

export interface ComposeCostInfo {
  /** Gemini API calls */
  geminiCalls: number;

  /** Estimated cost in USD */
  estimatedCostUsd: number;
}

export interface ComposeResult {
  /** Success status */
  success: boolean;

  /** Output image URL (if stored) */
  imageUrl?: string;

  /** Output image buffer */
  buffer?: Buffer;

  /** Output as data URL */
  dataUrl?: string;

  /** Layout spec used (when mode=AUTO_LAYOUT and includeLayoutSpec=true) */
  layoutSpec?: import("./layoutSpec").LayoutSpec;

  /** Whether fallback layout was used */
  fallbackLayoutUsed?: boolean;

  /** Debug information */
  debug?: ComposeDebugInfo;

  /** Cost information */
  cost?: ComposeCostInfo;

  /** Timing metrics */
  timings?: Record<string, number>;

  /** Error message if failed */
  error?: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */

export type ComposerMode = "mvp" | "advanced";

export interface ComposerConfig {
  /** Mode: mvp (local only) or advanced (with Gemini) */
  mode: ComposerMode;

  /** Enable Gemini editing */
  enableGemini: boolean;

  /** Default output format */
  defaultFormat: "png" | "jpeg" | "webp";

  /** Default quality */
  defaultQuality: number;

  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;

  /** Maximum product size ratio */
  maxProductRatio: number;
}

export function getComposerConfig(): ComposerConfig {
  return {
    mode: (process.env.COMPOSER_MODE as ComposerMode) || "mvp",
    enableGemini: process.env.COMPOSER_ENABLE_GEMINI === "true",
    defaultFormat: "png",
    defaultQuality: 90,
    canvasWidth: 1080,
    canvasHeight: 1350,
    maxProductRatio: 0.65,
  };
}
