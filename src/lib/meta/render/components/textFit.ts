/**
 * Text Fit – Auto-sizing text to fit within bounding box
 *
 * Implements gradual fontSize reduction until text fits.
 * Maintains line height ratio and handles word wrapping.
 */

import type { SKRSContext2D } from "@napi-rs/canvas";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface TextFitOptions {
  /** Font family name */
  fontFamily: string;
  /** Maximum font size to try */
  fontSizeMax: number;
  /** Minimum font size (stop shrinking here) */
  fontSizeMin: number;
  /** Line height multiplier (e.g., 1.2) */
  lineHeight: number;
  /** Maximum number of lines allowed */
  maxLines: number;
  /** Font weight (optional, default "normal") */
  fontWeight?: string;
}

export interface TextFitResult {
  /** Lines of text after wrapping */
  lines: string[];
  /** Final font size used */
  fontSize: number;
  /** Total height of all lines */
  totalHeight: number;
  /** Actual line height in pixels */
  lineHeightPx: number;
  /** Whether text was truncated */
  truncated: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   WORD WRAPPING
═══════════════════════════════════════════════════════════════ */

/**
 * Wrap text into lines that fit within maxWidth
 */
export function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

/**
 * Truncate last line with ellipsis if it exceeds maxWidth
 */
export function truncateLineWithEllipsis(
  ctx: SKRSContext2D,
  line: string,
  maxWidth: number
): string {
  if (ctx.measureText(line).width <= maxWidth) return line;

  let truncated = line;
  while (
    truncated.length > 0 &&
    ctx.measureText(truncated + "…").width > maxWidth
  ) {
    truncated = truncated.slice(0, -1).trimEnd();
  }

  return truncated.length > 0 ? truncated + "…" : "…";
}

/* ═══════════════════════════════════════════════════════════════
   FIT TEXT IN BOX
═══════════════════════════════════════════════════════════════ */

/**
 * Fit text within a bounding box by reducing font size
 *
 * @param ctx - Canvas context (for measuring text)
 * @param text - Text to fit
 * @param maxWidth - Maximum width available
 * @param maxHeight - Maximum height available
 * @param options - Font and sizing options
 * @returns TextFitResult with lines, fontSize, and metadata
 */
export function fitTextInBox(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  options: TextFitOptions
): TextFitResult {
  const { fontFamily, fontSizeMax, fontSizeMin, lineHeight, maxLines, fontWeight } =
    options;

  let fontSize = fontSizeMax;
  let lines: string[] = [];
  let lineHeightPx = 0;
  let truncated = false;

  // Try decreasing font sizes until text fits
  while (fontSize >= fontSizeMin) {
    const weight = fontWeight || "normal";
    ctx.font = `${weight} ${fontSize}px "${fontFamily}"`;
    lineHeightPx = Math.ceil(fontSize * lineHeight);

    lines = wrapText(ctx, text, maxWidth);

    // Check if within line limit
    if (lines.length <= maxLines) {
      const totalHeight = lines.length * lineHeightPx;

      // Check if within height limit
      if (totalHeight <= maxHeight) {
        return {
          lines,
          fontSize,
          totalHeight,
          lineHeightPx,
          truncated: false,
        };
      }
    }

    // Reduce font size and try again
    fontSize -= 2;
  }

  // At minimum font size – truncate if needed
  fontSize = fontSizeMin;
  ctx.font = `${fontWeight || "normal"} ${fontSize}px "${fontFamily}"`;
  lineHeightPx = Math.ceil(fontSize * lineHeight);
  lines = wrapText(ctx, text, maxWidth);

  // Enforce maxLines with truncation
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const lastIndex = lines.length - 1;
    lines[lastIndex] = truncateLineWithEllipsis(ctx, lines[lastIndex], maxWidth);
    truncated = true;
  }

  return {
    lines,
    fontSize,
    totalHeight: lines.length * lineHeightPx,
    lineHeightPx,
    truncated,
  };
}

/* ═══════════════════════════════════════════════════════════════
   SINGLE LINE FIT
═══════════════════════════════════════════════════════════════ */

export interface SingleLineFitResult {
  text: string;
  fontSize: number;
  width: number;
  truncated: boolean;
}

/**
 * Fit a single line of text by reducing font size
 * If it still doesn't fit at min size, truncate with ellipsis
 */
export function fitSingleLine(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  options: Omit<TextFitOptions, "maxLines" | "lineHeight">
): SingleLineFitResult {
  const { fontFamily, fontSizeMax, fontSizeMin, fontWeight } = options;

  let fontSize = fontSizeMax;

  // Try decreasing font sizes
  while (fontSize >= fontSizeMin) {
    ctx.font = `${fontWeight || "normal"} ${fontSize}px "${fontFamily}"`;
    const metrics = ctx.measureText(text);

    if (metrics.width <= maxWidth) {
      return {
        text,
        fontSize,
        width: metrics.width,
        truncated: false,
      };
    }

    fontSize -= 2;
  }

  // At minimum – truncate
  fontSize = fontSizeMin;
  ctx.font = `${fontWeight || "normal"} ${fontSize}px "${fontFamily}"`;
  const truncatedText = truncateLineWithEllipsis(ctx, text, maxWidth);

  return {
    text: truncatedText,
    fontSize,
    width: ctx.measureText(truncatedText).width,
    truncated: truncatedText !== text,
  };
}

/* ═══════════════════════════════════════════════════════════════
   MEASURE TEXT HEIGHT
═══════════════════════════════════════════════════════════════ */

/**
 * Calculate total height of wrapped text at a given font size
 */
export function measureTextHeight(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  fontWeight?: string
): number {
  ctx.font = `${fontWeight || "normal"} ${fontSize}px "${fontFamily}"`;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeightPx = Math.ceil(fontSize * lineHeight);
  return lines.length * lineHeightPx;
}
