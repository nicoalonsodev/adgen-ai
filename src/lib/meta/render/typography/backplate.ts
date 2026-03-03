/**
 * Backplate Drawing – Typography Engine V2
 *
 * Draws soft gradient backplates behind text for improved legibility.
 * Backplates are subtle and blend with the background.
 */

import type { SKRSContext2D } from "@napi-rs/canvas";
import type { Rect } from "./luminance";
import type { TextMode } from "./textMode";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface BackplateOptions {
  /** Expand rect by this amount (default: 30px) */
  padding?: number;
  /** Alpha at center (default: 0.25) */
  centerAlpha?: number;
  /** Edge alpha (default: 0) */
  edgeAlpha?: number;
  /** Whether to use radial gradient (default: false = linear) */
  radial?: boolean;
}

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════ */

/** Backplate colors by mode */
const BACKPLATE_COLORS = {
  DARK_TEXT: {
    // Light/ivory backplate for dark text
    base: "255, 253, 248",     // Warm off-white
    centerAlpha: 0.28,
    edgeAlpha: 0,
  },
  LIGHT_TEXT: {
    // Dark/charcoal backplate for light text
    base: "15, 18, 22",        // Near black
    centerAlpha: 0.32,
    edgeAlpha: 0,
  },
} as const;

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Draw a soft gradient backplate behind text.
 *
 * Creates a subtle, feathered background that improves text legibility
 * without creating hard edges or a "box" look.
 *
 * @param ctx - Canvas 2D context
 * @param rect - Rectangle where text will be drawn
 * @param mode - Text mode (determines backplate color)
 * @param options - Optional configuration
 *
 * @example
 * drawBackplate(ctx, { x: 560, y: 300, w: 440, h: 200 }, "DARK_TEXT");
 */
export function drawBackplate(
  ctx: SKRSContext2D,
  rect: Rect,
  mode: TextMode,
  options: BackplateOptions = {}
): void {
  const {
    padding = 30,
    centerAlpha,
    edgeAlpha = 0,
    radial = false,
  } = options;

  const colors = BACKPLATE_COLORS[mode];
  const alpha = centerAlpha ?? colors.centerAlpha;

  // Expand rect by padding
  const expandedRect = {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  };

  ctx.save();

  if (radial) {
    drawRadialBackplate(ctx, expandedRect, colors.base, alpha, edgeAlpha);
  } else {
    drawLinearBackplate(ctx, expandedRect, colors.base, alpha, edgeAlpha);
  }

  ctx.restore();
}

/**
 * Draw a horizontal direction-aware backplate.
 * Use when text is on left or right side of canvas.
 */
export function drawDirectionalBackplate(
  ctx: SKRSContext2D,
  rect: Rect,
  mode: TextMode,
  direction: "left" | "right",
  options: BackplateOptions = {}
): void {
  const {
    padding = 30,
    centerAlpha,
    edgeAlpha = 0,
  } = options;

  const colors = BACKPLATE_COLORS[mode];
  const alpha = centerAlpha ?? colors.centerAlpha;

  // Expand rect
  const expandedRect = {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  };

  ctx.save();

  // Create gradient that fades from text side outward
  let gradient: CanvasGradient;

  if (direction === "right") {
    // Text on right: fade from right to left
    gradient = ctx.createLinearGradient(
      expandedRect.x + expandedRect.w,
      expandedRect.y,
      expandedRect.x - padding,
      expandedRect.y
    );
  } else {
    // Text on left: fade from left to right
    gradient = ctx.createLinearGradient(
      expandedRect.x,
      expandedRect.y,
      expandedRect.x + expandedRect.w + padding,
      expandedRect.y
    );
  }

  // Core area (solid-ish)
  gradient.addColorStop(0, `rgba(${colors.base}, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(${colors.base}, ${alpha * 0.8})`);
  // Feathered edge
  gradient.addColorStop(0.85, `rgba(${colors.base}, ${alpha * 0.3})`);
  gradient.addColorStop(1, `rgba(${colors.base}, ${edgeAlpha})`);

  // Also add vertical fade
  const vertGradient = ctx.createLinearGradient(
    expandedRect.x,
    expandedRect.y,
    expandedRect.x,
    expandedRect.y + expandedRect.h
  );
  vertGradient.addColorStop(0, `rgba(${colors.base}, 0)`);
  vertGradient.addColorStop(0.1, `rgba(${colors.base}, ${alpha * 0.5})`);
  vertGradient.addColorStop(0.9, `rgba(${colors.base}, ${alpha * 0.5})`);
  vertGradient.addColorStop(1, `rgba(${colors.base}, 0)`);

  // Draw horizontal gradient
  ctx.fillStyle = gradient;
  ctx.fillRect(expandedRect.x, expandedRect.y, expandedRect.w, expandedRect.h);

  // Blend with vertical fade using multiply-like effect
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = vertGradient;
  ctx.fillRect(expandedRect.x, expandedRect.y, expandedRect.w, expandedRect.h);

  ctx.restore();
}

/* ════════════════════════════════════════════════════════════════
   INTERNAL HELPERS
════════════════════════════════════════════════════════════════ */

/**
 * Draw linear gradient backplate (default).
 * Fades from center outward in all directions.
 */
function drawLinearBackplate(
  ctx: SKRSContext2D,
  rect: Rect,
  colorBase: string,
  centerAlpha: number,
  edgeAlpha: number
): void {
  const { x, y, w, h } = rect;

  // Vertical gradient (main fade)
  const vGradient = ctx.createLinearGradient(x, y, x, y + h);
  vGradient.addColorStop(0, `rgba(${colorBase}, ${edgeAlpha})`);
  vGradient.addColorStop(0.15, `rgba(${colorBase}, ${centerAlpha * 0.6})`);
  vGradient.addColorStop(0.3, `rgba(${colorBase}, ${centerAlpha})`);
  vGradient.addColorStop(0.7, `rgba(${colorBase}, ${centerAlpha})`);
  vGradient.addColorStop(0.85, `rgba(${colorBase}, ${centerAlpha * 0.6})`);
  vGradient.addColorStop(1, `rgba(${colorBase}, ${edgeAlpha})`);

  ctx.fillStyle = vGradient;
  ctx.fillRect(x, y, w, h);

  // Horizontal soft edges
  const edgeWidth = Math.min(60, w * 0.15);

  // Left edge fade
  const leftGradient = ctx.createLinearGradient(x, y, x + edgeWidth, y);
  leftGradient.addColorStop(0, `rgba(${colorBase}, 0)`);
  leftGradient.addColorStop(1, `rgba(${colorBase}, 0)`);

  ctx.globalCompositeOperation = "destination-out";
  const fadeGradient = ctx.createLinearGradient(x, y, x + edgeWidth, y);
  fadeGradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  fadeGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = fadeGradient;
  ctx.fillRect(x, y, edgeWidth, h);

  // Right edge fade
  const rightGradient = ctx.createLinearGradient(x + w - edgeWidth, y, x + w, y);
  rightGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  rightGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.fillStyle = rightGradient;
  ctx.fillRect(x + w - edgeWidth, y, edgeWidth, h);

  ctx.globalCompositeOperation = "source-over";
}

/**
 * Draw radial gradient backplate.
 * Creates an oval glow centered on the rect.
 */
function drawRadialBackplate(
  ctx: SKRSContext2D,
  rect: Rect,
  colorBase: string,
  centerAlpha: number,
  edgeAlpha: number
): void {
  const { x, y, w, h } = rect;

  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radiusX = w / 2;
  const radiusY = h / 2;
  const maxRadius = Math.max(radiusX, radiusY);

  // Create radial gradient (circular)
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    maxRadius
  );

  gradient.addColorStop(0, `rgba(${colorBase}, ${centerAlpha})`);
  gradient.addColorStop(0.5, `rgba(${colorBase}, ${centerAlpha * 0.7})`);
  gradient.addColorStop(0.8, `rgba(${colorBase}, ${centerAlpha * 0.3})`);
  gradient.addColorStop(1, `rgba(${colorBase}, ${edgeAlpha})`);

  // Draw ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

/* ════════════════════════════════════════════════════════════════
   UTILITY
════════════════════════════════════════════════════════════════ */

/**
 * Expand a rect by a given amount in all directions.
 */
export function expandRect(rect: Rect, amount: number): Rect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + amount * 2,
    h: rect.h + amount * 2,
  };
}

/**
 * Clamp a rect to canvas bounds.
 */
export function clampRectToCanvas(
  rect: Rect,
  canvasW: number,
  canvasH: number
): Rect {
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  const w = Math.min(rect.w, canvasW - x);
  const h = Math.min(rect.h, canvasH - y);
  return { x, y, w, h };
}
