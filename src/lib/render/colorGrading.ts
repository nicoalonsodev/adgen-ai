/**
 * Color Grading Module
 *
 * Provides subtle post-processing effects to unify the visual look
 * of rendered advertisements.
 *
 * Features:
 * - Subtle overlay for depth/cohesion
 * - Optional vignette effect
 */

import type { SKRSContext2D } from "@napi-rs/canvas";

/* ── Types ── */

export interface ColorGradeOptions {
  /** Overlay opacity (default: 0.05) */
  overlayOpacity?: number;
  /** Enable vignette effect (default: false) */
  vignette?: boolean;
  /** Vignette intensity (default: 0.15) */
  vignetteIntensity?: number;
}

/* ── Color Grade ── */

/**
 * Applies a subtle color grade overlay to the canvas.
 * Should be called AFTER all content is drawn but typically
 * the text should remain unaffected (call before text if desired).
 *
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param opts - Color grade options
 */
export function applyColorGrade(
  ctx: SKRSContext2D,
  width: number,
  height: number,
  opts: ColorGradeOptions = {}
): void {
  const {
    overlayOpacity = 0.05,
    vignette = false,
    vignetteIntensity = 0.15,
  } = opts;

  ctx.save();

  // Apply subtle overlay for depth/cohesion
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
  ctx.fillRect(0, 0, width, height);

  // Reset composite operation
  ctx.globalCompositeOperation = "source-over";

  // Optional vignette
  if (vignette) {
    applyVignette(ctx, width, height, vignetteIntensity);
  }

  ctx.restore();
}

/* ── Vignette ── */

/**
 * Applies a subtle vignette effect (darker corners).
 *
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param intensity - Vignette darkness (0-1, default: 0.15)
 */
export function applyVignette(
  ctx: SKRSContext2D,
  width: number,
  height: number,
  intensity: number = 0.15
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(width, height) * 0.7;

  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.3,
    centerX,
    centerY,
    radius
  );

  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
