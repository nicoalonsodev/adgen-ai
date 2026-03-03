/**
 * Overlay Effects Module
 *
 * Provides gradient overlays to improve text readability
 * and visual composition in advertisements.
 *
 * Features:
 * - Side gradient overlays (left/right)
 * - Customizable strength and coverage
 */

import type { SKRSContext2D } from "@napi-rs/canvas";

/* ── Types ── */

export type OverlaySide = "left" | "right";

export interface SideGradientOptions {
  /** Gradient strength/opacity (default: 0.55) */
  strength?: number;
  /** Coverage as percentage of canvas width (default: 0.5) */
  coverage?: number;
}

/* ── Side Gradient Overlay ── */

/**
 * Draws a gradient overlay from one side of the canvas toward the center.
 * Useful for improving text readability on that side.
 *
 * @param ctx - Canvas 2D rendering context
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param side - Which side to apply gradient from ("left" | "right")
 * @param opts - Gradient options
 */
export function drawSideGradientOverlay(
  ctx: SKRSContext2D,
  canvasWidth: number,
  canvasHeight: number,
  side: OverlaySide,
  opts: SideGradientOptions = {}
): void {
  const { strength = 0.55, coverage = 0.5 } = opts;

  const overlayWidth = canvasWidth * coverage;

  ctx.save();

  let gradient: CanvasGradient;

  if (side === "left") {
    gradient = ctx.createLinearGradient(0, 0, overlayWidth, 0);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, overlayWidth, canvasHeight);
  } else {
    // right side
    const startX = canvasWidth - overlayWidth;
    gradient = ctx.createLinearGradient(canvasWidth, 0, startX, 0);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(startX, 0, overlayWidth, canvasHeight);
  }

  ctx.restore();
}

/* ── Dual Side Gradient ── */

/**
 * Draws gradient overlays on both sides of the canvas.
 * Useful for centering focus on the middle of the image.
 *
 * @param ctx - Canvas 2D rendering context
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param opts - Gradient options
 */
export function drawDualSideGradientOverlay(
  ctx: SKRSContext2D,
  canvasWidth: number,
  canvasHeight: number,
  opts: SideGradientOptions = {}
): void {
  const dualOpts = { ...opts, coverage: opts.coverage ?? 0.35 };
  drawSideGradientOverlay(ctx, canvasWidth, canvasHeight, "left", dualOpts);
  drawSideGradientOverlay(ctx, canvasWidth, canvasHeight, "right", dualOpts);
}

/* ── Bottom Gradient Overlay ── */

export interface BottomGradientOptions {
  /** Gradient strength/opacity (default: 0.50) */
  strength?: number;
  /** Coverage as percentage of canvas height (default: 0.4) */
  coverage?: number;
}

/**
 * Draws a gradient overlay from the bottom of the canvas upward.
 * Useful for improving text readability at the bottom.
 *
 * @param ctx - Canvas 2D rendering context
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param opts - Gradient options
 */
export function drawBottomGradientOverlay(
  ctx: SKRSContext2D,
  canvasWidth: number,
  canvasHeight: number,
  opts: BottomGradientOptions = {}
): void {
  const { strength = 0.50, coverage = 0.4 } = opts;

  const overlayHeight = canvasHeight * coverage;
  const startY = canvasHeight - overlayHeight;

  ctx.save();

  const gradient = ctx.createLinearGradient(0, canvasHeight, 0, startY);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, startY, canvasWidth, overlayHeight);

  ctx.restore();
}
