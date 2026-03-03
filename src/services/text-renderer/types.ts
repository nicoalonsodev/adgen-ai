/**
 * Text Renderer Types
 *
 * Zod schemas and TypeScript types for deterministic text rendering.
 * NOT AI-generated - uses Canvas/SVG for pixel-perfect typography.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Font & Typography Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const FontWeightSchema = z.enum([
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "normal",
  "bold",
]);

export const TextAlignSchema = z.enum(["left", "center", "right", "justify"]);

export const VerticalAlignSchema = z.enum(["top", "middle", "bottom"]);

export const FontStyleSchema = z.object({
  family: z.string().default("Inter"),
  size: z.number().min(8).max(500).default(48),
  weight: FontWeightSchema.default("700"),
  lineHeight: z.number().min(0.8).max(3).default(1.2),
  letterSpacing: z.number().min(-5).max(20).default(0),
  color: z.string().default("#FFFFFF"),
});

export type FontStyle = z.infer<typeof FontStyleSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Text Effects Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const TextShadowSchema = z.object({
  offsetX: z.number().default(0),
  offsetY: z.number().default(2),
  blur: z.number().min(0).max(100).default(4),
  color: z.string().default("rgba(0,0,0,0.5)"),
});

export const TextStrokeSchema = z.object({
  width: z.number().min(0).max(20).default(0),
  color: z.string().default("#000000"),
});

export const TextGradientSchema = z.object({
  type: z.enum(["linear", "radial"]).default("linear"),
  angle: z.number().min(0).max(360).default(90),
  stops: z.array(
    z.object({
      offset: z.number().min(0).max(1),
      color: z.string(),
    })
  ),
});

export const TextEffectsSchema = z.object({
  shadow: TextShadowSchema.optional(),
  stroke: TextStrokeSchema.optional(),
  gradient: TextGradientSchema.optional(),
  opacity: z.number().min(0).max(1).default(1),
});

export type TextShadow = z.infer<typeof TextShadowSchema>;
export type TextStroke = z.infer<typeof TextStrokeSchema>;
export type TextGradient = z.infer<typeof TextGradientSchema>;
export type TextEffects = z.infer<typeof TextEffectsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Layout & Positioning Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const SafeAreaSchema = z.object({
  top: z.number().min(0).default(0),
  right: z.number().min(0).default(0),
  bottom: z.number().min(0).default(0),
  left: z.number().min(0).default(0),
});

export const TextBoxSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().min(10),
  height: z.number().min(10),
  padding: z.number().min(0).default(0),
});

export const BackgroundBoxSchema = z.object({
  enabled: z.boolean().default(false),
  color: z.string().default("rgba(0,0,0,0.6)"),
  borderRadius: z.number().min(0).default(0),
  padding: z.number().min(0).default(16),
});

export type SafeArea = z.infer<typeof SafeAreaSchema>;
export type TextBox = z.infer<typeof TextBoxSchema>;
export type BackgroundBox = z.infer<typeof BackgroundBoxSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Text Element Schema (single text block)
// ─────────────────────────────────────────────────────────────────────────────

export const TextElementSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  font: FontStyleSchema.optional(),
  effects: TextEffectsSchema.optional(),
  align: TextAlignSchema.default("left"),
  verticalAlign: VerticalAlignSchema.default("top"),
  box: TextBoxSchema,
  background: BackgroundBoxSchema.optional(),
  maxLines: z.number().min(1).max(50).optional(),
  ellipsis: z.boolean().default(true),
  wordWrap: z.boolean().default(true),
});

export type TextElement = z.infer<typeof TextElementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Render Request Schema
// ─────────────────────────────────────────────────────────────────────────────

export const RenderTextRequestSchema = z.object({
  // Canvas size
  width: z.number().min(100).max(4096),
  height: z.number().min(100).max(4096),

  // Background (optional - transparent if not provided)
  backgroundImage: z.string().optional(), // URL or base64
  backgroundColor: z.string().optional(),

  // Safe area for text (margins from edges)
  safeArea: SafeAreaSchema.optional(),

  // Text elements to render
  elements: z.array(TextElementSchema).min(1),

  // Output options
  format: z.enum(["png", "webp", "jpeg"]).default("png"),
  quality: z.number().min(1).max(100).default(95),

  // Auto-contrast: adjust text color based on background luminance
  autoContrast: z.boolean().default(false),

  // Debug mode: draw safe area guides
  debug: z.boolean().default(false),
});

export type RenderTextRequest = z.infer<typeof RenderTextRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Render Result
// ─────────────────────────────────────────────────────────────────────────────

export interface RenderTextResult {
  /**
   * Rendered image buffer
   */
  buffer: Buffer;

  /**
   * MIME type
   */
  mimeType: string;

  /**
   * Image dimensions
   */
  width: number;
  height: number;

  /**
   * Render timing info
   */
  timing: {
    total_ms: number;
    text_layout_ms: number;
    render_ms: number;
    encode_ms: number;
  };

  /**
   * Debug info when debug=true
   */
  debug?: {
    lines: Array<{
      elementId: string;
      lineIndex: number;
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    safeArea: SafeArea;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Renderer Config
// ─────────────────────────────────────────────────────────────────────────────

export interface TextRendererConfig {
  /**
   * Render engine: 'canvas' or 'svg'
   * Canvas: node-canvas for server-side rendering
   * SVG: Sharp composite with SVG text
   */
  engine: "canvas" | "svg";

  /**
   * Path to custom fonts directory
   */
  fontsDir?: string;

  /**
   * Default font family
   */
  defaultFont: string;

  /**
   * Enable metrics collection
   */
  enableMetrics: boolean;
}

export function getTextRendererConfig(): TextRendererConfig {
  return {
    engine: (process.env.TEXT_RENDER_ENGINE as "canvas" | "svg") || "svg",
    fontsDir: process.env.TEXT_FONTS_DIR,
    defaultFont: process.env.TEXT_DEFAULT_FONT || "Inter",
    enableMetrics: process.env.TEXT_ENABLE_METRICS !== "false",
  };
}
