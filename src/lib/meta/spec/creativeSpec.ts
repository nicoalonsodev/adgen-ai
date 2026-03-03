/**
 * CreativeSpec – Central Contract for Template Engine V1
 *
 * All templates consume this spec. The spec is built AFTER:
 * - AI generates copy
 * - Rules select template + style
 * - AI generates background (text-free)
 *
 * This file contains:
 * - Zod schemas for validation
 * - TypeScript types
 * - Normalize/sanitize utilities
 */

import { z } from "zod";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS & CONSTRAINTS
════════════════════════════════════════════════════════════════ */

export const CONSTRAINTS = {
  headline: { maxChars: 38 },
  subheadline: { maxChars: 55 },
  badgeText: { maxChars: 10 },
  stickerText: { maxChars: 18 },
  quote: { maxChars: 60 },
  author: { maxChars: 18 },
  disclaimer: { maxChars: 50 },
} as const;

export const TEMPLATE_IDS = [
  "T_SPLIT_EDITORIAL_V1",
  "T_BADGE_OFFER_V1",
  "T_BEFORE_AFTER_V1",
  "T_QUOTE_TESTIMONIAL_V1",
  // New templates for creative mode system
  "T_LIFESTYLE_HERO_V1",
  "T_NARRATIVE_HERO_V1",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const STYLE_PACK_IDS = [
  "EDITORIAL_SOFT",
  "CLINICAL_CLEAN",
  "BOLD_PROMO",
] as const;

export type StylePackId = (typeof STYLE_PACK_IDS)[number];

export const OFFER_TYPES = ["PERCENT", "BUNDLE", "FREE_SHIP"] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const PROOF_TYPES = ["BEFORE_AFTER", "QUOTE"] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

/* ════════════════════════════════════════════════════════════════
   ZOD SCHEMAS
════════════════════════════════════════════════════════════════ */

/**
 * Product info
 */
export const ProductSchema = z.object({
  name: z.string().min(1),
  imageSrc: z.string().min(1).startsWith("data:image/"),
  logoSrc: z.string().startsWith("data:image/").optional(),
});

/**
 * Offer (discount, bundle, free shipping)
 */
export const OfferSchema = z.object({
  active: z.boolean(),
  type: z.enum(OFFER_TYPES),
  value: z.string().optional(), // e.g., "50", "3x2"
  label: z.string().max(CONSTRAINTS.badgeText.maxChars).optional(), // e.g., "50% OFF"
});

/**
 * Claims (headline, subheadline, disclaimer)
 */
export const ClaimsSchema = z.object({
  headline: z.string().max(CONSTRAINTS.headline.maxChars),
  subheadline: z.string().max(CONSTRAINTS.subheadline.maxChars).optional(),
  disclaimer: z.string().max(CONSTRAINTS.disclaimer.maxChars).optional(),
});

/**
 * CTA
 */
export const CtaSchema = z.object({
  label: z.string().min(1).default("Conocé más"),
});

/**
 * Proof - Before/After or Quote/Testimonial
 */
export const ProofBeforeAfterSchema = z.object({
  type: z.literal("BEFORE_AFTER"),
  day1Label: z.string().default("Día 1"),
  day30Label: z.string().default("Día 30"),
  caption: z.string().max(CONSTRAINTS.subheadline.maxChars).optional(),
});

export const ProofQuoteSchema = z.object({
  type: z.literal("QUOTE"),
  quote: z.string().max(CONSTRAINTS.quote.maxChars),
  author: z.string().max(CONSTRAINTS.author.maxChars).optional(),
});

export const ProofSchema = z.discriminatedUnion("type", [
  ProofBeforeAfterSchema,
  ProofQuoteSchema,
]);

/**
 * Style configuration
 */
export const StyleSchema = z.object({
  packId: z.enum(STYLE_PACK_IDS),
});

/**
 * Layout configuration
 */
export const LayoutSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
});

/**
 * Background (AI-generated, no text)
 */
export const BackgroundSchema = z.object({
  imageSrc: z.string().min(1).startsWith("data:image/"),
});

/**
 * Sticker (urgency, promo)
 */
export const StickerSchema = z.object({
  text: z.string().max(CONSTRAINTS.stickerText.maxChars),
});

/**
 * Art Direction (visual layout and styling)
 * Controls product position, scale, lighting, depth, and energy
 */
export const LAYOUT_DIRECTIONS = [
  "LEFT_DOMINANT",
  "RIGHT_DOMINANT",
  "CENTER_HERO",
  "BOTTOM_ANCHOR",
  "ZOOM_DETAIL",
] as const;

export const LIGHT_DIRECTIONS = ["LEFT", "RIGHT", "TOP"] as const;

export const DEPTH_MODES = ["FLAT", "RADIAL", "SURFACE", "TEXTURED"] as const;

export const ENERGIES = ["CALM", "BOLD"] as const;

export const ArtDirectionSchema = z.object({
  layout: z.enum(LAYOUT_DIRECTIONS),
  productScale: z.number().min(0.45).max(0.75),
  lightDirection: z.enum(LIGHT_DIRECTIONS),
  depthMode: z.enum(DEPTH_MODES),
  energy: z.enum(ENERGIES),
});

export type ArtDirection = z.infer<typeof ArtDirectionSchema>;

/**
 * Scene Plan (contextual scene for visual depth)
 */
export const SCENE_TYPES = [
  "MORNING_KITCHEN",
  "WORK_DESK",
  "TRAVEL_MODE",
  "COZY_HOME",
] as const;

export const SCENE_SURFACES = ["WOOD", "MARBLE", "DESK", "NEUTRAL"] as const;

export const SCENE_LIGHTS = ["LEFT_WINDOW", "RIGHT_WINDOW", "SOFT_TOP"] as const;

export const FOREGROUND_ELEMENTS = ["BLUR_MATE", "NONE"] as const;

export const SCENE_MOODS = ["CALM", "WARM", "CLEAN"] as const;

export const ScenePlanSchema = z.object({
  sceneType: z.enum(SCENE_TYPES),
  surface: z.enum(SCENE_SURFACES),
  light: z.enum(SCENE_LIGHTS),
  foregroundElement: z.enum(FOREGROUND_ELEMENTS),
  mood: z.enum(SCENE_MOODS),
});

export type ScenePlanSpec = z.infer<typeof ScenePlanSchema>;

/* ═══════════════════════════════════════════════════════════════
   CREATIVE MODE FIELDS
═══════════════════════════════════════════════════════════════ */

/**
 * Creative mode for pipeline (clean, lifestyle, narrative)
 */
export const CREATIVE_MODES = ["clean", "lifestyle", "narrative"] as const;
export type CreativeMode = (typeof CREATIVE_MODES)[number];

/**
 * Typography plan (algorithmic, from light zone analysis)
 */
export const TypographyPlanSpecSchema = z.object({
  textColor: z.enum(["dark", "light"]),
  primaryHex: z.string(),
  secondaryHex: z.string(),
  shadow: z.object({
    enabled: z.boolean(),
    color: z.string().optional(),
    blur: z.number().optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
  }),
  overlayGradient: z.object({
    enabled: z.boolean(),
    direction: z.enum(["top", "bottom", "left", "right"]).optional(),
    opacity: z.number().optional(),
    color: z.string().optional(),
  }),
  alignment: z.enum(["left", "center", "right"]),
  position: z.enum([
    "top_left",
    "top_center",
    "top_right",
    "bottom_left",
    "bottom_center",
    "bottom_right",
    "middle_left",
    "middle_right",
  ]),
  useBackplate: z.boolean(),
});

export type TypographyPlanSpec = z.infer<typeof TypographyPlanSpecSchema>;

/**
 * Narrative angle (for narrative mode)
 */
export const NarrativeAngleSpecSchema = z.object({
  angle_type: z.enum([
    "routine",
    "transformation",
    "moment",
    "lifestyle",
    "benefit_focus",
    "social_proof",
  ]),
  emotional_trigger: z.enum([
    "desire",
    "fear_of_loss",
    "aspiration",
    "comfort",
    "urgency",
    "curiosity",
  ]),
  time_of_day: z.enum(["morning", "afternoon", "evening", "night", "any"]),
  visual_focus: z.enum(["product", "result", "context", "emotion"]),
  tag_label: z.string().max(20).optional(),
});

export type NarrativeAngleSpec = z.infer<typeof NarrativeAngleSpecSchema>;

/* ═══════════════════════════════════════════════════════════════
   MAIN CREATIVE SPEC SCHEMA
═══════════════════════════════════════════════════════════════ */

export const CreativeSpecSchema = z.object({
  product: ProductSchema,
  offer: OfferSchema.optional(),
  claims: ClaimsSchema,
  cta: CtaSchema,
  proof: ProofSchema.optional(),
  sticker: StickerSchema.optional(),
  style: StyleSchema,
  layout: LayoutSchema,
  bg: BackgroundSchema,
  artDirection: ArtDirectionSchema.optional(),
  scenePlan: ScenePlanSchema.optional(),
  // New fields for creative mode system
  creativeMode: z.enum(CREATIVE_MODES).optional(),
  typographyPlan: TypographyPlanSpecSchema.optional(),
  narrativeAngle: NarrativeAngleSpecSchema.optional(),
});

export type CreativeSpec = z.infer<typeof CreativeSpecSchema>;

/* ═══════════════════════════════════════════════════════════════
   PARTIAL SPEC (for building step by step)
═══════════════════════════════════════════════════════════════ */

export const PartialSpecSchema = CreativeSpecSchema.partial();
export type PartialSpec = z.infer<typeof PartialSpecSchema>;

/* ════════════════════════════════════════════════════════════════
   NORMALIZE / SANITIZE UTILITIES
════════════════════════════════════════════════════════════════ */

/**
 * Characters to strip from copy text
 */
const STRIP_CHARS = /[★☆♦♠♣♥◆●○□■▪▫◯◊◉※✓✔✕✖✗✘⚡💥🔥]/g;

/**
 * Normalize whitespace: trim + collapse multiple spaces
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Strip weird symbols that can break rendering
 */
export function stripSymbols(text: string): string {
  return text.replace(STRIP_CHARS, "").trim();
}

/**
 * Title case (first letter of each word uppercase)
 */
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Truncate text to maxChars, adding ellipsis if needed
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + "…";
}

/**
 * Full sanitization pipeline for a text field
 */
export function sanitizeText(
  text: string,
  maxChars: number,
  options?: { titleCase?: boolean }
): string {
  let result = normalizeWhitespace(text);
  result = stripSymbols(result);
  if (options?.titleCase) {
    result = toTitleCase(result);
  }
  result = truncateText(result, maxChars);
  return result;
}

/**
 * Sanitize entire claims object
 */
export function sanitizeClaims(claims: {
  headline: string;
  subheadline?: string;
  disclaimer?: string;
}): z.infer<typeof ClaimsSchema> {
  return {
    headline: sanitizeText(claims.headline, CONSTRAINTS.headline.maxChars),
    subheadline: claims.subheadline
      ? sanitizeText(claims.subheadline, CONSTRAINTS.subheadline.maxChars)
      : undefined,
    disclaimer: claims.disclaimer
      ? sanitizeText(claims.disclaimer, CONSTRAINTS.disclaimer.maxChars)
      : undefined,
  };
}

/**
 * Sanitize offer label
 */
export function sanitizeOfferLabel(label: string): string {
  return sanitizeText(label, CONSTRAINTS.badgeText.maxChars).toUpperCase();
}

/**
 * Sanitize sticker text
 */
export function sanitizeStickerText(text: string): string {
  return sanitizeText(text, CONSTRAINTS.stickerText.maxChars);
}

/**
 * Sanitize quote
 */
export function sanitizeQuote(quote: string): string {
  return sanitizeText(quote, CONSTRAINTS.quote.maxChars);
}

/**
 * Sanitize author
 */
export function sanitizeAuthor(author: string): string {
  return sanitizeText(author, CONSTRAINTS.author.maxChars);
}

/* ════════════════════════════════════════════════════════════════
   VALIDATION HELPER
════════════════════════════════════════════════════════════════ */

export interface ValidationResult {
  success: boolean;
  spec?: CreativeSpec;
  errors?: z.ZodIssue[];
}

/**
 * Validate a raw object against CreativeSpec schema
 */
export function validateCreativeSpec(raw: unknown): ValidationResult {
  const result = CreativeSpecSchema.safeParse(raw);
  if (result.success) {
    return { success: true, spec: result.data };
  }
  return { success: false, errors: result.error.issues };
}

/* ════════════════════════════════════════════════════════════════
   COPY VARIANT EXTENDED (from AI)
════════════════════════════════════════════════════════════════ */

/**
 * Extended copy variant schema - what AI returns after generation
 */
export const CopyVariantExtendedSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  badgeText: z.string().optional(), // e.g., "50% OFF"
  stickerText: z.string().optional(), // e.g., "Tiempo limitado"
  proofType: z.enum(PROOF_TYPES).optional(),
  quote: z.string().optional(),
  author: z.string().optional(),
  proofCaption: z.string().optional(), // for BEFORE_AFTER
});

export type CopyVariantExtended = z.infer<typeof CopyVariantExtendedSchema>;
