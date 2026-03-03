/**
 * Luminance Sampling – Typography Engine V2
 *
 * Analyzes background luminance to determine optimal text color.
 * Uses efficient sampling to avoid processing every pixel.
 */

import type { SKRSContext2D, ImageData as NapiImageData } from "@napi-rs/canvas";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LuminanceResult {
  /** Mean luminance (0-1, where 0=black, 1=white) */
  mean: number;
  /** Variance of luminance (higher = more contrast/noise in background) */
  variance: number;
  /** Number of samples taken */
  sampleCount: number;
}

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════ */

/** ITU-R BT.709 coefficients for relative luminance */
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Sample the luminance of a rectangular region on the canvas.
 *
 * Uses sparse sampling (every `step` pixels) for efficiency.
 * Returns mean and variance to detect:
 * - Light vs dark backgrounds
 * - High-contrast/noisy backgrounds that need backplate
 *
 * @param ctx - Canvas 2D context
 * @param rect - Rectangle to sample { x, y, w, h }
 * @param step - Sampling step (default 6, smaller = more accurate but slower)
 * @returns LuminanceResult with mean, variance, and sample count
 *
 * @example
 * const lum = sampleLuminance(ctx, { x: 560, y: 300, w: 440, h: 200 }, 6);
 * // => { mean: 0.72, variance: 0.02, sampleCount: 550 }
 */
export function sampleLuminance(
  ctx: SKRSContext2D,
  rect: Rect,
  step: number = 6
): LuminanceResult {
  // Clamp rect to canvas bounds
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(canvasW, Math.floor(rect.x + rect.w));
  const y1 = Math.min(canvasH, Math.floor(rect.y + rect.h));

  const w = x1 - x0;
  const h = y1 - y0;

  if (w <= 0 || h <= 0) {
    // Return default for invalid rect
    return { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  // Get image data
  let imageData: NapiImageData;
  try {
    imageData = ctx.getImageData(x0, y0, w, h);
  } catch {
    // Fallback if getImageData fails
    return { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  const data = imageData.data;
  const samples: number[] = [];

  // Sample every `step` pixels
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Alpha is data[i + 3], ignored for luminance

      // Calculate relative luminance (0-1)
      const luma = (LUMA_R * r + LUMA_G * g + LUMA_B * b) / 255;
      samples.push(luma);
    }
  }

  if (samples.length === 0) {
    return { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  // Calculate mean
  const sum = samples.reduce((acc, v) => acc + v, 0);
  const mean = sum / samples.length;

  // Calculate variance
  const squaredDiffs = samples.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / samples.length;

  return {
    mean,
    variance,
    sampleCount: samples.length,
  };
}

/**
 * Sample luminance at specific points (center + corners).
 * Faster alternative to full rect sampling.
 */
export function sampleLuminancePoints(
  ctx: SKRSContext2D,
  rect: Rect
): LuminanceResult {
  const points = [
    // Center
    { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
    // Corners
    { x: rect.x + rect.w * 0.1, y: rect.y + rect.h * 0.1 },
    { x: rect.x + rect.w * 0.9, y: rect.y + rect.h * 0.1 },
    { x: rect.x + rect.w * 0.1, y: rect.y + rect.h * 0.9 },
    { x: rect.x + rect.w * 0.9, y: rect.y + rect.h * 0.9 },
    // Mid-edges
    { x: rect.x + rect.w / 2, y: rect.y + rect.h * 0.1 },
    { x: rect.x + rect.w / 2, y: rect.y + rect.h * 0.9 },
    { x: rect.x + rect.w * 0.1, y: rect.y + rect.h / 2 },
    { x: rect.x + rect.w * 0.9, y: rect.y + rect.h / 2 },
  ];

  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  const samples: number[] = [];

  for (const pt of points) {
    const px = Math.floor(Math.min(Math.max(pt.x, 0), canvasW - 1));
    const py = Math.floor(Math.min(Math.max(pt.y, 0), canvasH - 1));

    try {
      const imageData = ctx.getImageData(px, py, 1, 1);
      const data = imageData.data;
      const luma = (LUMA_R * data[0] + LUMA_G * data[1] + LUMA_B * data[2]) / 255;
      samples.push(luma);
    } catch {
      // Skip failed samples
    }
  }

  if (samples.length === 0) {
    return { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  const sum = samples.reduce((acc, v) => acc + v, 0);
  const mean = sum / samples.length;
  const squaredDiffs = samples.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / samples.length;

  return { mean, variance, sampleCount: samples.length };
}
