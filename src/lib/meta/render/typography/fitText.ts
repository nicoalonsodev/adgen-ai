/**
 * Text Fitting – Typography Engine V2
 *
 * Auto-fits text within bounding boxes with word wrapping.
 * Reduces font size until text fits.
 */

import type { SKRSContext2D } from "@napi-rs/canvas";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface FitTextBox {
  /** Maximum width for text */
  maxWidth: number;
  /** Maximum height for text block (optional) */
  maxHeight?: number;
}

export interface FitTextOptions {
  /** Font family */
  fontFamily: string;
  /** Starting font size (will be reduced if needed) */
  startSize: number;
  /** Minimum font size (won't go below this) */
  minSize: number;
  /** Font weight (default: "600") */
  fontWeight?: string;
  /** Line height multiplier (default: 1.2) */
  lineHeight?: number;
  /** Maximum number of lines (default: unlimited) */
  maxLines?: number;
}

export interface FitTextResult {
  /** Final font size used */
  fontSize: number;
  /** Wrapped lines of text */
  lines: string[];
  /** Total height of text block */
  totalHeight: number;
  /** Line height in pixels */
  lineHeightPx: number;
  /** True if text was truncated */
  truncated: boolean;
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Fit text within a bounding box with word wrapping.
 *
 * Starts at `startSize` and reduces font size (in 2px steps) until:
 * - All text fits within maxWidth
 * - Total height fits within maxHeight (if specified)
 * - Line count is within maxLines (if specified)
 *
 * @param ctx - Canvas 2D context
 * @param text - Text to fit
 * @param box - Bounding box constraints
 * @param options - Font and sizing options
 * @returns FitTextResult with font size and wrapped lines
 *
 * @example
 * const result = fitTextInBox(ctx, "Long headline text", { maxWidth: 400 }, {
 *   fontFamily: "Inter",
 *   startSize: 48,
 *   minSize: 24,
 *   maxLines: 3,
 * });
 * // => { fontSize: 36, lines: ["Long headline", "text"], ... }
 */
export function fitTextInBox(
  ctx: SKRSContext2D,
  text: string,
  box: FitTextBox,
  options: FitTextOptions
): FitTextResult {
  const {
    fontFamily,
    startSize,
    minSize,
    fontWeight = "600",
    lineHeight = 1.2,
    maxLines = Infinity,
  } = options;

  const { maxWidth, maxHeight } = box;

  // Try sizes from startSize down to minSize in steps of 2px
  for (let fontSize = startSize; fontSize >= minSize; fontSize -= 2) {
    const result = tryFitAtSize(
      ctx,
      text,
      maxWidth,
      maxHeight,
      fontFamily,
      fontWeight,
      fontSize,
      lineHeight,
      maxLines
    );

    if (result.fits) {
      return {
        fontSize,
        lines: result.lines,
        totalHeight: result.totalHeight,
        lineHeightPx: result.lineHeightPx,
        truncated: false,
      };
    }
  }

  // At minimum size, truncate if necessary
  const finalResult = tryFitAtSize(
    ctx,
    text,
    maxWidth,
    maxHeight,
    fontFamily,
    fontWeight,
    minSize,
    lineHeight,
    maxLines
  );

  // If still doesn't fit, truncate last line
  let lines = finalResult.lines;
  let truncated = false;

  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    // Add ellipsis to last line
    if (lines.length > 0) {
      lines[lines.length - 1] = truncateLineWithEllipsis(
        ctx,
        lines[lines.length - 1],
        maxWidth,
        fontFamily,
        fontWeight,
        minSize
      );
      truncated = true;
    }
  }

  return {
    fontSize: minSize,
    lines,
    totalHeight: lines.length * minSize * lineHeight,
    lineHeightPx: minSize * lineHeight,
    truncated,
  };
}

/* ════════════════════════════════════════════════════════════════
   INTERNAL HELPERS
════════════════════════════════════════════════════════════════ */

interface TryFitResult {
  fits: boolean;
  lines: string[];
  totalHeight: number;
  lineHeightPx: number;
}

/**
 * Try to fit text at a specific font size.
 */
function tryFitAtSize(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number | undefined,
  fontFamily: string,
  fontWeight: string,
  fontSize: number,
  lineHeight: number,
  maxLines: number
): TryFitResult {
  // Set font
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;

  // Wrap text into lines
  const lines = wrapText(ctx, text, maxWidth);

  // Calculate total height
  const lineHeightPx = fontSize * lineHeight;
  const totalHeight = lines.length * lineHeightPx;

  // Check if fits
  const fitsWidth = lines.every(
    (line) => ctx.measureText(line).width <= maxWidth
  );
  const fitsHeight = maxHeight === undefined || totalHeight <= maxHeight;
  const fitsLines = lines.length <= maxLines;

  return {
    fits: fitsWidth && fitsHeight && fitsLines,
    lines,
    totalHeight,
    lineHeightPx,
  };
}

/**
 * Wrap text into lines that fit within maxWidth.
 */
function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  // Clean up text
  const cleanText = text.replace(/\s+/g, " ").trim();
  const words = cleanText.split(" ");

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      // Word doesn't fit on current line
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word too long - force break
        const brokenWord = breakLongWord(ctx, word, maxWidth);
        for (let i = 0; i < brokenWord.length - 1; i++) {
          lines.push(brokenWord[i]);
        }
        currentLine = brokenWord[brokenWord.length - 1] || "";
      }
    }
  }

  // Add remaining line
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Break a single long word that doesn't fit.
 */
function breakLongWord(
  ctx: SKRSContext2D,
  word: string,
  maxWidth: number
): string[] {
  const parts: string[] = [];
  let current = "";

  for (const char of word) {
    const test = current + char;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) {
        parts.push(current);
      }
      current = char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Truncate a line and add ellipsis.
 */
function truncateLineWithEllipsis(
  ctx: SKRSContext2D,
  line: string,
  maxWidth: number,
  fontFamily: string,
  fontWeight: string,
  fontSize: number
): string {
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;

  const ellipsis = "…";
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  const targetWidth = maxWidth - ellipsisWidth;

  if (ctx.measureText(line).width <= maxWidth) {
    return line;
  }

  // Binary search for truncation point
  let left = 0;
  let right = line.length;

  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2);
    const testLine = line.slice(0, mid);

    if (ctx.measureText(testLine).width <= targetWidth) {
      left = mid;
    } else {
      right = mid - 1;
    }
  }

  // Trim trailing space before ellipsis
  const truncated = line.slice(0, left).trimEnd();
  return truncated + ellipsis;
}

/* ════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
════════════════════════════════════════════════════════════════ */

/**
 * Measure text height for a given font.
 * Uses font metrics if available, falls back to approximation.
 */
export function measureTextHeight(
  ctx: SKRSContext2D,
  text: string,
  fontFamily: string,
  fontWeight: string,
  fontSize: number
): number {
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  const metrics = ctx.measureText(text);

  // Use actualBoundingBoxAscent + actualBoundingBoxDescent if available
  if (
    typeof metrics.actualBoundingBoxAscent === "number" &&
    typeof metrics.actualBoundingBoxDescent === "number"
  ) {
    return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  }

  // Fallback to font size approximation
  return fontSize;
}

/**
 * Quick check if text fits on single line.
 */
export function fitsOnSingleLine(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontWeight: string,
  fontSize: number
): boolean {
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  return ctx.measureText(text).width <= maxWidth;
}
