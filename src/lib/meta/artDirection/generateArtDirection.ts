/**
 * Art Direction Matrix v1
 * 
 * Generates deterministic art direction parameters based on variant index.
 * All rotations are reproducible - no random values.
 */

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export type LayoutDirection =
  | "LEFT_DOMINANT"
  | "RIGHT_DOMINANT"
  | "CENTER_HERO"
  | "BOTTOM_ANCHOR"
  | "ZOOM_DETAIL";

export type LightDirection = "LEFT" | "RIGHT" | "TOP";

export type DepthMode = "FLAT" | "RADIAL" | "SURFACE" | "TEXTURED";

export type Energy = "CALM" | "BOLD";

export type ArtDirection = {
  layout: LayoutDirection;
  productScale: number; // 0.45 – 0.75
  lightDirection: LightDirection;
  depthMode: DepthMode;
  energy: Energy;
};

/* ════════════════════════════════════════════════════════════════
   ROTATION ARRAYS
════════════════════════════════════════════════════════════════ */

const LAYOUTS: readonly LayoutDirection[] = [
  "LEFT_DOMINANT",
  "RIGHT_DOMINANT",
  "CENTER_HERO",
  "BOTTOM_ANCHOR",
  "ZOOM_DETAIL",
] as const;

const PRODUCT_SCALES: readonly number[] = [0.5, 0.6, 0.7] as const;

const LIGHT_DIRECTIONS: readonly LightDirection[] = [
  "LEFT",
  "RIGHT",
  "TOP",
] as const;

const DEPTH_MODES: readonly DepthMode[] = [
  "FLAT",
  "RADIAL",
  "SURFACE",
  "TEXTURED",
] as const;

const ENERGIES: readonly Energy[] = ["CALM", "BOLD"] as const;

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Generate deterministic art direction based on variant index.
 * 
 * @param index - Variant index (0-based)
 * @returns ArtDirection object with all visual parameters
 * 
 * @example
 * generateArtDirection(0) // => { layout: "LEFT_DOMINANT", productScale: 0.5, ... }
 * generateArtDirection(1) // => { layout: "RIGHT_DOMINANT", productScale: 0.6, ... }
 */
export function generateArtDirection(index: number): ArtDirection {
  // Ensure index is non-negative
  const i = Math.abs(Math.floor(index));

  return {
    layout: LAYOUTS[i % LAYOUTS.length],
    productScale: PRODUCT_SCALES[i % PRODUCT_SCALES.length],
    lightDirection: LIGHT_DIRECTIONS[i % LIGHT_DIRECTIONS.length],
    depthMode: DEPTH_MODES[i % DEPTH_MODES.length],
    energy: ENERGIES[i % ENERGIES.length],
  };
}

/* ════════════════════════════════════════════════════════════════
   LAYOUT POSITIONING HELPERS
════════════════════════════════════════════════════════════════ */

type LayoutPosition = {
  x: number;      // center X as fraction of canvas width (0-1)
  y: number;      // center Y as fraction of canvas height (0-1)
  anchorX: number; // -1 = left edge, 0 = center, 1 = right edge
  anchorY: number; // -1 = top edge, 0 = center, 1 = bottom edge
};

/**
 * Get product position based on layout direction.
 * Returns normalized coordinates (0-1 range).
 */
export function getLayoutPosition(layout: LayoutDirection): LayoutPosition {
  switch (layout) {
    case "LEFT_DOMINANT":
      return { x: 0.35, y: 0.5, anchorX: 0, anchorY: 0 };
    case "RIGHT_DOMINANT":
      return { x: 0.65, y: 0.5, anchorX: 0, anchorY: 0 };
    case "CENTER_HERO":
      return { x: 0.5, y: 0.45, anchorX: 0, anchorY: 0 };
    case "BOTTOM_ANCHOR":
      return { x: 0.5, y: 0.7, anchorX: 0, anchorY: 0.5 };
    case "ZOOM_DETAIL":
      return { x: 0.5, y: 0.5, anchorX: 0, anchorY: 0 };
    default:
      return { x: 0.5, y: 0.5, anchorX: 0, anchorY: 0 };
  }
}

/* ════════════════════════════════════════════════════════════════
   SHADOW HELPERS
════════════════════════════════════════════════════════════════ */

type ShadowParams = {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
};

/**
 * Get shadow parameters based on light direction and energy.
 */
export function getShadowParams(
  lightDirection: LightDirection,
  energy: Energy
): ShadowParams {
  const baseBlur = energy === "CALM" ? 30 : 50;
  const baseOffset = energy === "CALM" ? 8 : 15;
  const alpha = energy === "CALM" ? 0.15 : 0.25;

  switch (lightDirection) {
    case "LEFT":
      // Light from left = shadow falls to right
      return {
        offsetX: baseOffset,
        offsetY: baseOffset * 0.5,
        blur: baseBlur,
        color: `rgba(0, 0, 0, ${alpha})`,
      };
    case "RIGHT":
      // Light from right = shadow falls to left
      return {
        offsetX: -baseOffset,
        offsetY: baseOffset * 0.5,
        blur: baseBlur,
        color: `rgba(0, 0, 0, ${alpha})`,
      };
    case "TOP":
      // Light from top = shadow falls down
      return {
        offsetX: 0,
        offsetY: baseOffset,
        blur: baseBlur,
        color: `rgba(0, 0, 0, ${alpha})`,
      };
    default:
      return {
        offsetX: 0,
        offsetY: baseOffset,
        blur: baseBlur,
        color: `rgba(0, 0, 0, ${alpha})`,
      };
  }
}

/* ════════════════════════════════════════════════════════════════
   DEPTH MODE PROMPT MODIFIERS
════════════════════════════════════════════════════════════════ */

/**
 * Get prompt suffix for background generation based on depth mode.
 */
export function getDepthModePrompt(depthMode: DepthMode): string {
  switch (depthMode) {
    case "FLAT":
      return "clean gradient background, smooth transitions, minimal depth";
    case "RADIAL":
      return "soft radial light focus behind product, subtle glow effect, centered luminosity";
    case "SURFACE":
      return "subtle surface plane, soft horizon line, gentle ground shadow";
    case "TEXTURED":
      return "subtle organic texture, fine grain, delicate material feel";
    default:
      return "";
  }
}

/* ════════════════════════════════════════════════════════════════
   EXPORTS
════════════════════════════════════════════════════════════════ */

export const ART_DIRECTION_CONSTANTS = {
  LAYOUTS,
  PRODUCT_SCALES,
  LIGHT_DIRECTIONS,
  DEPTH_MODES,
  ENERGIES,
} as const;
