/**
 * LayoutSpec Schema
 * 
 * Defines the JSON contract for AI-generated layout specifications.
 * The AI analyzes the background and suggests product placement, 
 * text blocks, and overlays - but does NOT render text or edit pixels.
 */

import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

export const DEFAULT_CANVAS_WIDTH = 1080;
export const DEFAULT_CANVAS_HEIGHT = 1350;
export const DEFAULT_SAFE_MARGIN = 64;
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 1.4;
export const MIN_CONFIDENCE = 0.55;

/* ═══════════════════════════════════════════════════════════════
   SHADOW SCHEMAS
═══════════════════════════════════════════════════════════════ */

export const DropShadowSchema = z.object({
  enabled: z.boolean().default(true),
  blur: z.number().min(0).max(100).default(20),
  opacity: z.number().min(0).max(1).default(0.3),
  offsetX: z.number().min(-100).max(100).default(0),
  offsetY: z.number().min(-100).max(100).default(10),
  color: z.string().default("rgba(0,0,0,0.5)"),
});

export const ContactShadowSchema = z.object({
  enabled: z.boolean().default(false),
  blur: z.number().min(0).max(50).default(15),
  opacity: z.number().min(0).max(1).default(0.4),
  width: z.number().min(0).max(1).default(0.8), // relative to product width
  height: z.number().min(0).max(1).default(0.15), // relative to product height
  offsetY: z.number().min(-50).max(100).default(5),
});

export const ProductShadowSchema = z.object({
  drop: DropShadowSchema.optional(),
  contact: ContactShadowSchema.optional(),
});

/* ═══════════════════════════════════════════════════════════════
   PRODUCT PLACEMENT
═══════════════════════════════════════════════════════════════ */

export const ProductAnchorEnum = z.enum([
  "floor",
  "table",
  "bottom_center",
  "center",
  "center_left",
  "center_right",
  "top_center",
  "floating",
  "custom",
]);

export const ProductPlacementSchema = z.object({
  anchor: ProductAnchorEnum.default("bottom_center"),
  x: z.number().min(0).describe("Top-left X coordinate of product bounding box"),
  y: z.number().min(0).describe("Top-left Y coordinate of product bounding box"),
  width: z.number().min(1).describe("Final rendered width of product"),
  height: z.number().min(1).describe("Final rendered height of product"),
  scale: z.number().min(MIN_SCALE).max(MAX_SCALE).default(0.7),
  rotation: z.number().min(-45).max(45).default(0),
  shadow: ProductShadowSchema.optional(),
});

/* ═══════════════════════════════════════════════════════════════
   OVERLAY SCHEMAS (for text legibility)
═══════════════════════════════════════════════════════════════ */

export const OverlayTypeEnum = z.enum(["linearGradient", "solid", "blurRegion"]);
export const GradientDirectionEnum = z.enum(["top", "bottom", "left", "right"]);

export const OverlaySchema = z.object({
  type: OverlayTypeEnum,
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1),
  h: z.number().min(1),
  opacity: z.number().min(0).max(1).default(0.5),
  color: z.string().optional().default("rgba(0,0,0,0.5)"),
  direction: GradientDirectionEnum.optional(),
  blur: z.number().min(0).max(50).optional(), // for blurRegion
});

/* ═══════════════════════════════════════════════════════════════
   TEXT BLOCK SCHEMAS
═══════════════════════════════════════════════════════════════ */

export const TextBlockIdEnum = z.enum(["headline", "subheadline", "cta", "badge", "disclaimer"]);
export const TextAlignEnum = z.enum(["left", "center", "right"]);
export const TextBackgroundTypeEnum = z.enum(["none", "pill", "box"]);

export const TextBackgroundSchema = z.object({
  type: TextBackgroundTypeEnum.default("none"),
  color: z.string().default("rgba(0,0,0,0.7)"),
  radius: z.number().min(0).max(50).default(8),
  padding: z.number().min(0).max(32).default(12),
  opacity: z.number().min(0).max(1).default(0.8),
});

export const TextBlockSchema = z.object({
  id: TextBlockIdEnum,
  content: z.string().optional(), // Filled later from copy input
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1).describe("Max width of text block"),
  h: z.number().min(1).describe("Max height of text block"),
  align: TextAlignEnum.default("left"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFFFFF"),
  fontFamily: z.string().default("Inter"),
  fontWeight: z.enum(["normal", "bold", "400", "500", "600", "700", "800", "900"]).default("700"),
  fontSize: z.number().min(12).max(200).default(48),
  maxLines: z.number().min(1).max(10).default(2),
  lineHeight: z.number().min(0.8).max(2).default(1.2),
  letterSpacing: z.number().min(-0.1).max(0.3).default(0),
  textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).default("none"),
  background: TextBackgroundSchema.optional(),
});

/* ═══════════════════════════════════════════════════════════════
   CANVAS & SAFE AREA
═══════════════════════════════════════════════════════════════ */

export const CanvasSchema = z.object({
  width: z.number().min(100).max(4096).default(DEFAULT_CANVAS_WIDTH),
  height: z.number().min(100).max(4096).default(DEFAULT_CANVAS_HEIGHT),
});

export const SafeAreaSchema = z.object({
  margin: z.number().min(0).max(200).default(DEFAULT_SAFE_MARGIN),
});

/* ═══════════════════════════════════════════════════════════════
   MAIN LAYOUT SPEC
═══════════════════════════════════════════════════════════════ */

export const LayoutSpecSchema = z.object({
  version: z.literal("1").default("1"),
  canvas: CanvasSchema,
  safeArea: SafeAreaSchema,
  product: ProductPlacementSchema,
  overlays: z.array(OverlaySchema).max(3).default([]),
  textBlocks: z.array(TextBlockSchema).max(5).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  rationale: z.string().max(500).default(""),
  warnings: z.array(z.string()).default([]),
});

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export type LayoutSpec = z.infer<typeof LayoutSpecSchema>;
export type ProductPlacement = z.infer<typeof ProductPlacementSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type Overlay = z.infer<typeof OverlaySchema>;
export type ProductAnchor = z.infer<typeof ProductAnchorEnum>;
export type TextBlockId = z.infer<typeof TextBlockIdEnum>;
export type DropShadow = z.infer<typeof DropShadowSchema>;
export type ContactShadow = z.infer<typeof ContactShadowSchema>;

/* ═══════════════════════════════════════════════════════════════
   PRESET LAYOUTS (fallback when AI fails or confidence < threshold)
═══════════════════════════════════════════════════════════════ */

export const PRESET_LAYOUTS: Record<string, Omit<LayoutSpec, "confidence" | "rationale" | "warnings">> = {
  // Product bottom center, text top left
  "SPLIT_LEFT": {
    version: "1",
    canvas: { width: 1080, height: 1350 },
    safeArea: { margin: 64 },
    product: {
      anchor: "bottom_center",
      x: 290,
      y: 650,
      width: 500,
      height: 600,
      scale: 0.7,
      rotation: 0,
      shadow: {
        drop: { enabled: true, blur: 25, opacity: 0.35, offsetX: 0, offsetY: 15, color: "rgba(0,0,0,0.4)" },
        contact: { enabled: true, blur: 20, opacity: 0.3, width: 0.7, height: 0.1, offsetY: 5 },
      },
    },
    overlays: [
      { type: "linearGradient", x: 0, y: 0, w: 500, h: 600, opacity: 0.6, direction: "right", color: "rgba(0,0,0,0.7)" },
    ],
    textBlocks: [
      { id: "headline", x: 64, y: 150, w: 450, h: 200, align: "left", color: "#FFFFFF", fontFamily: "Inter", fontWeight: "800", fontSize: 64, maxLines: 3, lineHeight: 1.1, letterSpacing: -0.02, textTransform: "none" },
      { id: "subheadline", x: 64, y: 380, w: 400, h: 100, align: "left", color: "#E5E5E5", fontFamily: "Inter", fontWeight: "500", fontSize: 28, maxLines: 2, lineHeight: 1.3, letterSpacing: 0, textTransform: "none" },
      { id: "cta", x: 64, y: 520, w: 200, h: 56, align: "center", color: "#FFFFFF", fontFamily: "Inter", fontWeight: "700", fontSize: 20, maxLines: 1, lineHeight: 1, letterSpacing: 0.02, textTransform: "none", background: { type: "pill", color: "#2563EB", radius: 28, padding: 16, opacity: 1 } },
    ],
  },

  // Product left, text right
  "SPLIT_RIGHT": {
    version: "1",
    canvas: { width: 1080, height: 1350 },
    safeArea: { margin: 64 },
    product: {
      anchor: "center_left",
      x: 64,
      y: 400,
      width: 450,
      height: 550,
      scale: 0.65,
      rotation: 0,
      shadow: {
        drop: { enabled: true, blur: 20, opacity: 0.3, offsetX: 0, offsetY: 10, color: "rgba(0,0,0,0.4)" },
      },
    },
    overlays: [
      { type: "linearGradient", x: 580, y: 0, w: 500, h: 1350, opacity: 0.5, direction: "left", color: "rgba(0,0,0,0.6)" },
    ],
    textBlocks: [
      { id: "headline", x: 580, y: 300, w: 436, h: 200, align: "left", color: "#FFFFFF", fontFamily: "Inter", fontWeight: "800", fontSize: 56, maxLines: 4, lineHeight: 1.1, letterSpacing: -0.02, textTransform: "none" },
      { id: "subheadline", x: 580, y: 530, w: 400, h: 100, align: "left", color: "#D4D4D4", fontFamily: "Inter", fontWeight: "500", fontSize: 26, maxLines: 2, lineHeight: 1.3, letterSpacing: 0, textTransform: "none" },
      { id: "cta", x: 580, y: 680, w: 200, h: 56, align: "center", color: "#FFFFFF", fontFamily: "Inter", fontWeight: "700", fontSize: 20, maxLines: 1, lineHeight: 1, letterSpacing: 0.02, textTransform: "none", background: { type: "pill", color: "#16A34A", radius: 28, padding: 16, opacity: 1 } },
    ],
  },

  // Hero product center, text overlay bottom
  "HERO_CENTER": {
    version: "1",
    canvas: { width: 1080, height: 1350 },
    safeArea: { margin: 64 },
    product: {
      anchor: "center",
      x: 190,
      y: 200,
      width: 700,
      height: 750,
      scale: 0.85,
      rotation: 0,
      shadow: {
        drop: { enabled: true, blur: 30, opacity: 0.4, offsetX: 0, offsetY: 20, color: "rgba(0,0,0,0.5)" },
        contact: { enabled: true, blur: 25, opacity: 0.35, width: 0.6, height: 0.08, offsetY: 8 },
      },
    },
    overlays: [
      { type: "linearGradient", x: 0, y: 950, w: 1080, h: 400, opacity: 0.85, direction: "top", color: "rgba(0,0,0,0.9)" },
    ],
    textBlocks: [
      { id: "headline", x: 64, y: 1020, w: 952, h: 120, align: "center", color: "#FFFFFF", fontFamily: "Inter", fontWeight: "800", fontSize: 52, maxLines: 2, lineHeight: 1.1, letterSpacing: -0.02, textTransform: "none" },
      { id: "subheadline", x: 140, y: 1160, w: 800, h: 60, align: "center", color: "#D4D4D4", fontFamily: "Inter", fontWeight: "500", fontSize: 24, maxLines: 2, lineHeight: 1.2, letterSpacing: 0, textTransform: "none" },
      { id: "cta", x: 390, y: 1250, w: 300, h: 56, align: "center", color: "#FFFFFF", fontFamily: "Inter", fontWeight: "700", fontSize: 20, maxLines: 1, lineHeight: 1, letterSpacing: 0.02, textTransform: "none", background: { type: "pill", color: "#DC2626", radius: 28, padding: 16, opacity: 1 } },
    ],
  },
};

export function getPresetLayout(name: keyof typeof PRESET_LAYOUTS): LayoutSpec {
  const preset = PRESET_LAYOUTS[name];
  if (!preset) {
    throw new Error(`Unknown preset layout: ${name}`);
  }
  return {
    ...preset,
    confidence: 1.0, // Presets are always high confidence
    rationale: `Using preset layout: ${name}`,
    warnings: [],
  };
}

export function getDefaultPreset(): LayoutSpec {
  return getPresetLayout("SPLIT_LEFT");
}
