/**
 * Preset Types
 * 
 * Defines the structure for layout presets.
 * Presets use RELATIVE positioning (percentages) so they adapt to different canvas sizes.
 * NO AI - pure parametric layouts.
 */

import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

export const PRESET_SAFE_PADDING_DEFAULT = 72;
export const MIN_PRODUCT_SCALE = 0.30;
export const MAX_PRODUCT_SCALE = 0.45;

/* ═══════════════════════════════════════════════════════════════
   RELATIVE ZONE (percentages 0-100)
═══════════════════════════════════════════════════════════════ */

/**
 * Zone defined in percentages relative to canvas.
 * x: 0 = left edge, 100 = right edge
 * y: 0 = top edge, 100 = bottom edge
 */
export const RelativeZoneSchema = z.object({
  x: z.number().min(0).max(100).describe("Left edge as % of canvas width"),
  y: z.number().min(0).max(100).describe("Top edge as % of canvas height"),
  w: z.number().min(0).max(100).describe("Width as % of canvas width"),
  h: z.number().min(0).max(100).describe("Height as % of canvas height"),
});

export type RelativeZone = z.infer<typeof RelativeZoneSchema>;

/* ═══════════════════════════════════════════════════════════════
   PRODUCT CONFIG
═══════════════════════════════════════════════════════════════ */

export const ProductAnchorPresetSchema = z.enum([
  "left_center",
  "right_center",
  "center",
  "bottom_center",
  "bottom_left",
  "bottom_right",
]);

export const ProductPresetConfigSchema = z.object({
  /** Anchor determines general placement intent */
  anchor: ProductAnchorPresetSchema,
  /** Zone where product should be placed (percentages) */
  zone: RelativeZoneSchema,
  /** Min/max scale as fraction of canvas height (0.30 = 30% of canvas height) */
  scaleRange: z.object({
    min: z.number().min(0.1).max(1).default(MIN_PRODUCT_SCALE),
    max: z.number().min(0.1).max(1).default(MAX_PRODUCT_SCALE),
  }),
  /** Shadow preset */
  shadow: z.object({
    drop: z.object({
      enabled: z.boolean().default(true),
      blur: z.number().min(0).max(100).default(25),
      opacity: z.number().min(0).max(1).default(0.35),
      offsetY: z.number().min(0).max(50).default(15),
    }),
    contact: z.object({
      enabled: z.boolean().default(true),
      blur: z.number().min(0).max(50).default(20),
      opacity: z.number().min(0).max(1).default(0.3),
    }),
  }),
});

export type ProductPresetConfig = z.infer<typeof ProductPresetConfigSchema>;

/* ═══════════════════════════════════════════════════════════════
   TEXT BLOCK CONFIG
═══════════════════════════════════════════════════════════════ */

export const TextBlockIdSchema = z.enum([
  "headline",
  "subheadline",
  "cta",
  "badge",
  "disclaimer",
]);

export const TextBlockPresetConfigSchema = z.object({
  id: TextBlockIdSchema,
  /** Zone where text should be rendered (percentages) */
  zone: RelativeZoneSchema,
  /** Text alignment */
  align: z.enum(["left", "center", "right"]).default("left"),
  /** Base font size in px (will shrink if text doesn't fit) */
  baseFontSize: z.number().min(12).max(200).default(48),
  /** Max lines before truncation */
  maxLines: z.number().min(1).max(10).default(2),
  /** Auto-shrink factor (0.5 = can shrink to 50% of baseFontSize) */
  autoShrinkMin: z.number().min(0.3).max(1).default(0.6),
  /** Line height multiplier */
  lineHeight: z.number().min(0.8).max(2).default(1.2),
  /** Font weight */
  fontWeight: z.enum(["400", "500", "600", "700", "800", "900"]).default("700"),
  /** Font family */
  fontFamily: z.string().default("Inter"),
  /** Text color (hex) */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFFFFF"),
  /** Letter spacing */
  letterSpacing: z.number().min(-0.1).max(0.3).default(0),
  /** Text transform */
  textTransform: z.enum(["none", "uppercase", "lowercase"]).default("none"),
});

export type TextBlockPresetConfig = z.infer<typeof TextBlockPresetConfigSchema>;

/* ═══════════════════════════════════════════════════════════════
   BADGE CONFIG (special text with background)
═══════════════════════════════════════════════════════════════ */

export const BadgePresetConfigSchema = z.object({
  id: z.literal("badge"),
  /** Zone where badge should appear (percentages) */
  zone: RelativeZoneSchema,
  /** Position within zone */
  position: z.enum(["left", "center", "right"]).default("center"),
  /** Badge style */
  style: z.object({
    type: z.enum(["pill", "box"]).default("pill"),
    backgroundColor: z.string().default("#2563EB"),
    textColor: z.string().default("#FFFFFF"),
    borderRadius: z.number().min(0).max(50).default(24),
    paddingX: z.number().min(8).max(48).default(24),
    paddingY: z.number().min(4).max(24).default(12),
  }),
  /** Font settings */
  font: z.object({
    size: z.number().min(12).max(48).default(18),
    weight: z.enum(["500", "600", "700", "800"]).default("700"),
    family: z.string().default("Inter"),
    letterSpacing: z.number().min(0).max(0.2).default(0.02),
    textTransform: z.enum(["none", "uppercase"]).default("uppercase"),
  }),
  /** Auto-fit to content */
  autoFit: z.boolean().default(true),
});

export type BadgePresetConfig = z.infer<typeof BadgePresetConfigSchema>;

/* ═══════════════════════════════════════════════════════════════
   OVERLAY CONFIG
═══════════════════════════════════════════════════════════════ */

export const OverlayPresetConfigSchema = z.object({
  type: z.enum(["linearGradient", "solid"]),
  /** Zone for overlay (percentages) */
  zone: RelativeZoneSchema,
  /** For gradients */
  direction: z.enum(["top", "bottom", "left", "right"]).optional(),
  /** Overlay strength (opacity) */
  strength: z.number().min(0).max(1).default(0.15),
  /** Color */
  color: z.string().default("rgba(0,0,0,1)"),
});

export type OverlayPresetConfig = z.infer<typeof OverlayPresetConfigSchema>;

/* ═══════════════════════════════════════════════════════════════
   ASPECT RATIO VARIANT
═══════════════════════════════════════════════════════════════ */

export const AspectRatioSchema = z.enum(["4:5", "1:1", "9:16", "16:9"]);

export const AspectRatioVariantSchema = z.object({
  aspectRatio: AspectRatioSchema,
  canvasWidth: z.number().min(100).max(4096),
  canvasHeight: z.number().min(100).max(4096),
  /** Override zones for this aspect ratio */
  overrides: z.object({
    product: z.object({ zone: RelativeZoneSchema }).optional(),
    textBlocks: z.array(z.object({
      id: TextBlockIdSchema,
      zone: RelativeZoneSchema.partial(),
      baseFontSize: z.number().optional(),
    })).optional(),
    badge: z.object({ zone: RelativeZoneSchema.partial() }).optional(),
  }).optional(),
});

export type AspectRatioVariant = z.infer<typeof AspectRatioVariantSchema>;

/* ═══════════════════════════════════════════════════════════════
   MAIN PRESET SCHEMA
═══════════════════════════════════════════════════════════════ */

export const PresetSchema = z.object({
  /** Unique preset ID */
  id: z.string(),
  /** Display name */
  name: z.string(),
  /** Description */
  description: z.string(),
  /** Version */
  version: z.string().default("1.0.0"),
  /** Tags for filtering */
  tags: z.array(z.string()).default([]),
  /** What aspect ratios this preset supports */
  supports: z.array(AspectRatioSchema).default(["4:5"]),
  
  /** Safe padding from edges (px) */
  safePadding: z.number().min(0).max(200).default(PRESET_SAFE_PADDING_DEFAULT),
  
  /** Product placement config */
  product: ProductPresetConfigSchema,
  
  /** Text blocks config */
  textBlocks: z.array(TextBlockPresetConfigSchema).default([]),
  
  /** Badge config (optional) */
  badge: BadgePresetConfigSchema.optional(),
  
  /** Overlay configs */
  overlays: z.array(OverlayPresetConfigSchema).default([]),
  
  /** Aspect ratio variants with overrides */
  variants: z.array(AspectRatioVariantSchema).optional(),
});

export type Preset = z.infer<typeof PresetSchema>;

/* ═══════════════════════════════════════════════════════════════
   PRESET METADATA (for UI listing)
═══════════════════════════════════════════════════════════════ */

export interface PresetMetadata {
  id: string;
  name: string;
  description: string;
  tags: string[];
  supports: string[];
  version: string;
}
