/**
 * Adaptive Text Drawing – Typography Engine V2
 *
 * Draws text that adapts to background luminance.
 * Automatically chooses colors and adds backplates when needed.
 */

import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  sampleLuminance,
  type Rect,
  type LuminanceResult,
} from "../typography/luminance";
import {
  decideTextMode,
  getTextColor,
  getTextShadow,
  type TextMode,
  type TextModeResult,
} from "../typography/textMode";
import {
  drawBackplate,
  drawDirectionalBackplate,
} from "../typography/backplate";
import {
  fitTextInBox,
  type TextFitResult as FitTextResult,
} from "./textFit";
import type { DrawResult, BoundingBox } from "./drawing";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface AdaptiveTextContext {
  /** Text mode (dark or light text) */
  mode: TextMode;
  /** Whether backplate was drawn */
  hasBackplate: boolean;
  /** Luminance analysis result */
  luminance: LuminanceResult;
  /** Decision confidence */
  confidence: number;
}

export interface DrawAdaptiveHeadlineOptions {
  text: string;
  x: number;
  y: number;
  maxW: number;
  maxH: number;
  fontFamily: string;
  fontSizeMax?: number;
  fontSizeMin?: number;
  lineHeight?: number;
  maxLines?: number;
  align?: CanvasTextAlign;
  /** Override auto-detected mode */
  forceMode?: TextMode;
  /** Override backplate decision */
  forceBackplate?: boolean;
  /** Backplate direction for split layouts */
  backplateDirection?: "left" | "right";
}

export interface DrawAdaptiveTextResult extends DrawResult {
  fit: FitTextResult;
  context: AdaptiveTextContext;
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTIONS
════════════════════════════════════════════════════════════════ */

/**
 * Draw headline with automatic color and backplate adaptation.
 *
 * Analyzes background luminance and:
 * - Chooses dark or light text color
 * - Adds soft backplate if background is noisy
 * - Applies subtle shadow if no backplate
 *
 * @param ctx - Canvas 2D context
 * @param options - Drawing options
 * @returns Result with bounds, fit info, and adaptation context
 */
export function drawAdaptiveHeadline(
  ctx: SKRSContext2D,
  options: DrawAdaptiveHeadlineOptions
): DrawAdaptiveTextResult {
  const {
    text,
    x,
    y,
    maxW,
    maxH,
    fontFamily,
    fontSizeMax = 56,
    fontSizeMin = 38,
    lineHeight = 1.15,
    maxLines = 2,
    align = "left",
    forceMode,
    forceBackplate,
    backplateDirection,
  } = options;

  // Define text rect for luminance sampling
  const textRect: Rect = { x, y, w: maxW, h: maxH };

  // Sample luminance
  let luminance: LuminanceResult;
  try {
    luminance = sampleLuminance(ctx, textRect, 6);
  } catch {
    // Fallback on error
    luminance = { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  // Decide text mode
  let modeResult: TextModeResult;
  if (forceMode) {
    modeResult = {
      mode: forceMode,
      needsBackplate: forceBackplate ?? false,
      confidence: 1,
    };
  } else {
    modeResult = decideTextMode(luminance);
    if (forceBackplate !== undefined) {
      modeResult.needsBackplate = forceBackplate;
    }
  }

  // Handle fallback (low samples)
  if (luminance.sampleCount < 10 && !forceMode) {
    modeResult = {
      mode: "LIGHT_TEXT",
      needsBackplate: true,
      confidence: 0.3,
    };
  }

  // Fit text first to get accurate bounds
  const fit = fitTextInBox(ctx, text, maxW, maxH, {
    fontFamily,
    fontSizeMax,
    fontSizeMin,
    fontWeight: "bold",
    lineHeight,
    maxLines,
  });

  // Actual text bounds
  const actualBounds: BoundingBox = {
    x,
    y,
    w: maxW,
    h: fit.totalHeight,
  };

  // Draw backplate if needed
  if (modeResult.needsBackplate) {
    const backplateRect: Rect = {
      x: actualBounds.x,
      y: actualBounds.y,
      w: actualBounds.w,
      h: actualBounds.h,
    };

    if (backplateDirection) {
      drawDirectionalBackplate(ctx, backplateRect, modeResult.mode, backplateDirection);
    } else {
      drawBackplate(ctx, backplateRect, modeResult.mode);
    }
  }

  // Get colors
  const primaryColor = getTextColor(modeResult.mode, "primary");

  // Apply shadow if no backplate
  ctx.save();
  if (!modeResult.needsBackplate) {
    const shadow = getTextShadow(modeResult.mode);
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
  }

  // Draw text
  ctx.font = `bold ${fit.fontSize}px "${fontFamily}"`;
  ctx.fillStyle = primaryColor;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  let textX = x;
  if (align === "center") textX = x + maxW / 2;
  else if (align === "right") textX = x + maxW;

  for (let i = 0; i < fit.lines.length; i++) {
    ctx.fillText(fit.lines[i], textX, y + i * fit.lineHeightPx);
  }

  ctx.restore();

  return {
    bounds: actualBounds,
    fit,
    context: {
      mode: modeResult.mode,
      hasBackplate: modeResult.needsBackplate,
      luminance,
      confidence: modeResult.confidence,
    },
  };
}

/**
 * Draw subheadline with automatic color and backplate adaptation.
 */
export function drawAdaptiveSubheadline(
  ctx: SKRSContext2D,
  options: DrawAdaptiveHeadlineOptions & {
    /** Use parent headline's mode instead of re-sampling */
    inheritMode?: TextMode;
    /** Use parent headline's backplate decision */
    inheritBackplate?: boolean;
  }
): DrawAdaptiveTextResult {
  const {
    text,
    x,
    y,
    maxW,
    maxH,
    fontFamily,
    fontSizeMax = 32,
    fontSizeMin = 22,
    lineHeight = 1.25,
    maxLines = 2,
    align = "left",
    forceMode,
    forceBackplate,
    backplateDirection,
    inheritMode,
    inheritBackplate,
  } = options;

  // Use inherited mode or detect
  const effectiveForceMode = forceMode ?? inheritMode;
  const effectiveForceBackplate = forceBackplate ?? (inheritBackplate ? false : undefined);

  // Define text rect for luminance sampling
  const textRect: Rect = { x, y, w: maxW, h: maxH };

  // Sample luminance (or skip if inheriting)
  let luminance: LuminanceResult;
  if (effectiveForceMode) {
    luminance = { mean: 0.5, variance: 0, sampleCount: 0 };
  } else {
    try {
      luminance = sampleLuminance(ctx, textRect, 8);
    } catch {
      luminance = { mean: 0.5, variance: 0.1, sampleCount: 0 };
    }
  }

  // Decide text mode
  let modeResult: TextModeResult;
  if (effectiveForceMode) {
    modeResult = {
      mode: effectiveForceMode,
      needsBackplate: effectiveForceBackplate ?? false,
      confidence: 1,
    };
  } else {
    modeResult = decideTextMode(luminance);
    if (effectiveForceBackplate !== undefined) {
      modeResult.needsBackplate = effectiveForceBackplate;
    }
  }

  // Fit text
  const fit = fitTextInBox(ctx, text, maxW, maxH, {
    fontFamily,
    fontSizeMax,
    fontSizeMin,
    fontWeight: "600",
    lineHeight,
    maxLines,
  });

  // Actual text bounds
  const actualBounds: BoundingBox = {
    x,
    y,
    w: maxW,
    h: fit.totalHeight,
  };

  // Draw backplate if needed (usually skip for subheadline if headline has one)
  if (modeResult.needsBackplate && !inheritBackplate) {
    const backplateRect: Rect = {
      x: actualBounds.x,
      y: actualBounds.y,
      w: actualBounds.w,
      h: actualBounds.h,
    };

    if (backplateDirection) {
      drawDirectionalBackplate(ctx, backplateRect, modeResult.mode, backplateDirection, {
        centerAlpha: 0.18, // Lighter backplate for subheadline
      });
    } else {
      drawBackplate(ctx, backplateRect, modeResult.mode, {
        centerAlpha: 0.18,
      });
    }
  }

  // Get colors (secondary for subheadline)
  const color = getTextColor(modeResult.mode, "secondary");

  // Apply shadow if no backplate
  ctx.save();
  if (!modeResult.needsBackplate) {
    const shadow = getTextShadow(modeResult.mode);
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur * 0.8;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY * 0.8;
  }

  // Draw text
  ctx.font = `600 ${fit.fontSize}px "${fontFamily}"`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  let textX = x;
  if (align === "center") textX = x + maxW / 2;
  else if (align === "right") textX = x + maxW;

  for (let i = 0; i < fit.lines.length; i++) {
    ctx.fillText(fit.lines[i], textX, y + i * fit.lineHeightPx);
  }

  ctx.restore();

  return {
    bounds: actualBounds,
    fit,
    context: {
      mode: modeResult.mode,
      hasBackplate: modeResult.needsBackplate && !inheritBackplate,
      luminance,
      confidence: modeResult.confidence,
    },
  };
}

/* ════════════════════════════════════════════════════════════════
   HELPER: ANALYZE TEXT ZONE
════════════════════════════════════════════════════════════════ */

/**
 * Pre-analyze a text zone before drawing.
 * Useful when you need to make decisions before drawing
 * (e.g., adjust other elements based on text mode).
 */
export function analyzeTextZone(
  ctx: SKRSContext2D,
  rect: Rect,
  step: number = 6
): TextModeResult & { luminance: LuminanceResult } {
  let luminance: LuminanceResult;
  try {
    luminance = sampleLuminance(ctx, rect, step);
  } catch {
    luminance = { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  const modeResult = decideTextMode(luminance);

  // Fallback for low samples
  if (luminance.sampleCount < 10) {
    return {
      mode: "LIGHT_TEXT",
      needsBackplate: true,
      confidence: 0.3,
      luminance,
    };
  }

  return {
    ...modeResult,
    luminance,
  };
}
