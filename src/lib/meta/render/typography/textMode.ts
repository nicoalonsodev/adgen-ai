/**
 * Text Mode Decision – Typography Engine V2
 *
 * Decides whether to use dark or light text based on background luminance.
 * Also determines if a backplate is needed for legibility.
 */

import type { LuminanceResult } from "./luminance";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export type TextMode = "DARK_TEXT" | "LIGHT_TEXT";

export interface TextModeResult {
  /** Text color mode */
  mode: TextMode;
  /** Whether a backplate is needed for legibility */
  needsBackplate: boolean;
  /** Confidence level (0-1) */
  confidence: number;
}

/* ════════════════════════════════════════════════════════════════
   THRESHOLDS
════════════════════════════════════════════════════════════════ */

/** Above this luminance, use dark text (background is light) */
const LIGHT_BG_THRESHOLD = 0.62;

/** Below this luminance, use light text (background is dark) */
const DARK_BG_THRESHOLD = 0.42;

/** Above this variance, backplate is needed (noisy/contrasty background) */
const VARIANCE_THRESHOLD = 0.035;

/** Minimum samples needed for reliable decision */
const MIN_SAMPLES = 10;

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Decide text mode based on background luminance analysis.
 *
 * Rules:
 * - If mean > 0.62: DARK_TEXT (background is light)
 * - If mean < 0.42: LIGHT_TEXT (background is dark)
 * - If between 0.42-0.62: DARK_TEXT (default, safer for most backgrounds)
 * - If variance > 0.035: needsBackplate (busy/noisy background)
 *
 * @param luminance - Result from sampleLuminance()
 * @returns TextModeResult with mode and backplate flag
 *
 * @example
 * const lum = { mean: 0.72, variance: 0.02 };
 * const result = decideTextMode(lum);
 * // => { mode: "DARK_TEXT", needsBackplate: false, confidence: 0.85 }
 */
export function decideTextMode(luminance: LuminanceResult): TextModeResult {
  const { mean, variance, sampleCount } = luminance;

  // If not enough samples, use safe defaults
  if (sampleCount < MIN_SAMPLES) {
    return {
      mode: "LIGHT_TEXT",
      needsBackplate: true,
      confidence: 0.3,
    };
  }

  // Decide text mode
  let mode: TextMode;
  let confidence: number;

  if (mean > LIGHT_BG_THRESHOLD) {
    // Light background → dark text
    mode = "DARK_TEXT";
    // Higher confidence further from threshold
    confidence = Math.min(1, 0.6 + (mean - LIGHT_BG_THRESHOLD) * 2);
  } else if (mean < DARK_BG_THRESHOLD) {
    // Dark background → light text
    mode = "LIGHT_TEXT";
    confidence = Math.min(1, 0.6 + (DARK_BG_THRESHOLD - mean) * 2);
  } else {
    // Mid-tone: default to dark text (safer for editorial look)
    mode = "DARK_TEXT";
    // Lower confidence in mid-range
    confidence = 0.5;
  }

  // Decide backplate need
  // High variance = noisy/contrasty background = needs backplate
  const needsBackplate = variance > VARIANCE_THRESHOLD;

  // Reduce confidence if variance is high (harder to read regardless)
  if (variance > VARIANCE_THRESHOLD * 2) {
    confidence *= 0.8;
  }

  return {
    mode,
    needsBackplate,
    confidence,
  };
}

/* ════════════════════════════════════════════════════════════════
   COLOR UTILITIES
════════════════════════════════════════════════════════════════ */

/** Dark text colors */
export const DARK_TEXT_COLORS = {
  primary: "#101418",       // Almost black with slight blue
  secondary: "#3D4654",     // Dark slate
  muted: "#6B7280",         // Gray-500
} as const;

/** Light text colors */
export const LIGHT_TEXT_COLORS = {
  primary: "#F6F2EA",       // Warm off-white
  secondary: "#E8E4DC",     // Cream
  muted: "#C9C5BD",         // Light gray-beige
} as const;

/**
 * Get appropriate text color based on mode.
 */
export function getTextColor(
  mode: TextMode,
  variant: "primary" | "secondary" | "muted" = "primary"
): string {
  if (mode === "DARK_TEXT") {
    return DARK_TEXT_COLORS[variant];
  }
  return LIGHT_TEXT_COLORS[variant];
}

/**
 * Get shadow configuration for text based on mode.
 * Only used when backplate is NOT applied.
 */
export function getTextShadow(mode: TextMode): {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
} {
  if (mode === "LIGHT_TEXT") {
    // Light text on dark bg: subtle dark shadow
    return {
      color: "rgba(0, 0, 0, 0.35)",
      blur: 8,
      offsetX: 0,
      offsetY: 2,
    };
  }
  // Dark text on light bg: subtle light shadow/glow
  return {
    color: "rgba(255, 255, 255, 0.2)",
    blur: 6,
    offsetX: 0,
    offsetY: 1,
  };
}
