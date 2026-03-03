/**
 * Text Renderer Utilities
 *
 * Helper functions for text layout, wrapping, and contrast.
 * Uses deterministic algorithms - no AI involved.
 */

import type {
  TextElement,
  FontStyle,
  SafeArea,
  TextGradient,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LayoutLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextLayout {
  lines: LayoutLine[];
  totalWidth: number;
  totalHeight: number;
  overflow: boolean;
}

export interface MeasureTextFn {
  (text: string, font: FontStyle): { width: number; height: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse color string to RGB values
 */
export function parseColor(
  color: string
): { r: number; g: number; b: number; a: number } | null {
  // Hex format: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  const hexMatch = color.match(
    /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/
  );
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  // RGB/RGBA format
  const rgbMatch = color.match(
    /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Calculate relative luminance (0-1)
 * Using WCAG formula
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (1-21)
 * WCAG 2.1 formula
 */
export function calculateContrastRatio(
  color1: string,
  color2: string
): number {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  if (!c1 || !c2) return 1;

  const l1 = calculateLuminance(c1.r, c1.g, c1.b);
  const l2 = calculateLuminance(c2.r, c2.g, c2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get optimal text color (black or white) for given background
 */
export function getContrastColor(backgroundColor: string): string {
  const c = parseColor(backgroundColor);
  if (!c) return "#FFFFFF";

  const luminance = calculateLuminance(c.r, c.g, c.b);
  // WCAG recommends contrast ratio >= 4.5:1 for normal text
  // White on dark, black on light
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

/**
 * Ensure minimum contrast ratio by adjusting text color
 */
export function ensureContrast(
  textColor: string,
  backgroundColor: string,
  minRatio: number = 4.5
): string {
  const ratio = calculateContrastRatio(textColor, backgroundColor);
  if (ratio >= minRatio) return textColor;

  // If contrast is insufficient, return black or white
  return getContrastColor(backgroundColor);
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Wrapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple word wrapping algorithm
 * Wraps text to fit within maxWidth using the provided measure function
 */
export function wrapText(
  text: string,
  maxWidth: number,
  font: FontStyle,
  measureFn: MeasureTextFn
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const { width } = measureFn(testLine, font);

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // Check if single word exceeds maxWidth
      const wordWidth = measureFn(word, font).width;
      if (wordWidth > maxWidth) {
        // Force break the word
        const chars = word.split("");
        let charLine = "";
        for (const char of chars) {
          const testCharLine = charLine + char;
          if (measureFn(testCharLine, font).width <= maxWidth) {
            charLine = testCharLine;
          } else {
            if (charLine) lines.push(charLine);
            charLine = char;
          }
        }
        currentLine = charLine;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Apply ellipsis to text that overflows
 */
export function applyEllipsis(
  lines: string[],
  maxLines: number,
  maxWidth: number,
  font: FontStyle,
  measureFn: MeasureTextFn,
  ellipsis: string = "..."
): string[] {
  if (lines.length <= maxLines) return lines;

  const truncated = lines.slice(0, maxLines);
  const lastLine = truncated[truncated.length - 1];

  // Try to fit ellipsis
  let testLine = lastLine + ellipsis;
  while (measureFn(testLine, font).width > maxWidth && testLine.length > ellipsis.length) {
    // Remove one character before ellipsis
    testLine = testLine.slice(0, -ellipsis.length - 1) + ellipsis;
  }

  truncated[truncated.length - 1] = testLine;
  return truncated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate text layout with positioning
 */
export function calculateTextLayout(
  element: TextElement,
  measureFn: MeasureTextFn,
  safeArea: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 }
): TextLayout {
  const { text, box, align, verticalAlign, maxLines, ellipsis, wordWrap } =
    element;

  // Default font if not provided
  const font = element.font ?? {
    family: "Inter",
    size: 48,
    weight: "700" as const,
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#FFFFFF",
  };

  const padding = box.padding || 0;
  const availableWidth = box.width - padding * 2;
  const availableHeight = box.height - padding * 2;

  // Get line height in pixels
  const lineHeightPx = font.size * font.lineHeight;

  // Wrap text if enabled
  let lines: string[];
  if (wordWrap) {
    lines = wrapText(text, availableWidth, font, measureFn);
  } else {
    lines = text.split("\n");
  }

  // Apply max lines and ellipsis
  if (maxLines && lines.length > maxLines) {
    if (ellipsis) {
      lines = applyEllipsis(lines, maxLines, availableWidth, font, measureFn);
    } else {
      lines = lines.slice(0, maxLines);
    }
  }

  // Calculate total height
  const totalTextHeight = lines.length * lineHeightPx;
  const overflow = totalTextHeight > availableHeight;

  // Calculate vertical starting position
  let startY: number;
  switch (verticalAlign) {
    case "middle":
      startY = box.y + padding + (availableHeight - totalTextHeight) / 2;
      break;
    case "bottom":
      startY = box.y + padding + availableHeight - totalTextHeight;
      break;
    case "top":
    default:
      startY = box.y + padding;
  }

  // Apply safe area offset
  startY = Math.max(startY, safeArea.top);

  // Build layout lines
  const layoutLines: LayoutLine[] = [];
  let maxLineWidth = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const { width: lineWidth } = measureFn(lineText, font);
    maxLineWidth = Math.max(maxLineWidth, lineWidth);

    // Calculate X position based on alignment
    let x: number;
    switch (align) {
      case "center":
        x = box.x + padding + (availableWidth - lineWidth) / 2;
        break;
      case "right":
        x = box.x + padding + availableWidth - lineWidth;
        break;
      case "left":
      default:
        x = box.x + padding;
    }

    // Apply safe area offset
    x = Math.max(x, safeArea.left);

    layoutLines.push({
      text: lineText,
      x,
      y: startY + i * lineHeightPx + font.size, // baseline position
      width: lineWidth,
      height: lineHeightPx,
    });
  }

  return {
    lines: layoutLines,
    totalWidth: maxLineWidth,
    totalHeight: totalTextHeight,
    overflow,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escape text for SVG
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert font weight to CSS value
 */
export function fontWeightToCss(weight: string): string {
  switch (weight) {
    case "normal":
      return "400";
    case "bold":
      return "700";
    default:
      return weight;
  }
}

/**
 * Generate SVG gradient definition
 */
export function generateGradientDef(
  id: string,
  gradient: TextGradient
): string {
  if (gradient.type === "linear") {
    const angle = gradient.angle || 90;
    // Convert angle to x1,y1,x2,y2
    const radians = (angle - 90) * (Math.PI / 180);
    const x1 = 50 - Math.cos(radians) * 50;
    const y1 = 50 - Math.sin(radians) * 50;
    const x2 = 50 + Math.cos(radians) * 50;
    const y2 = 50 + Math.sin(radians) * 50;

    const stops = gradient.stops
      .map(
        (s) =>
          `<stop offset="${s.offset * 100}%" stop-color="${escapeXml(s.color)}"/>`
      )
      .join("\n      ");

    return `
    <linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      ${stops}
    </linearGradient>`;
  } else {
    const stops = gradient.stops
      .map(
        (s) =>
          `<stop offset="${s.offset * 100}%" stop-color="${escapeXml(s.color)}"/>`
      )
      .join("\n      ");

    return `
    <radialGradient id="${id}" cx="50%" cy="50%" r="50%">
      ${stops}
    </radialGradient>`;
  }
}

/**
 * Generate SVG filter for text shadow
 */
export function generateShadowFilter(
  id: string,
  offsetX: number,
  offsetY: number,
  blur: number,
  color: string
): string {
  return `
    <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="${offsetX}" dy="${offsetY}" stdDeviation="${blur / 2}" flood-color="${escapeXml(color)}"/>
    </filter>`;
}

/**
 * Generate font-face CSS for custom fonts
 */
export function generateFontFace(
  family: string,
  src: string,
  weight: string = "400",
  style: string = "normal"
): string {
  return `
    @font-face {
      font-family: '${family}';
      src: url('${src}');
      font-weight: ${weight};
      font-style: ${style};
    }`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Approximate Text Measurement (for SVG mode)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approximate character widths for common fonts
 * These are rough estimates - actual rendering may vary
 */
const CHAR_WIDTH_RATIOS: Record<string, number> = {
  // Narrow characters
  i: 0.25,
  l: 0.25,
  I: 0.3,
  f: 0.3,
  j: 0.3,
  t: 0.35,
  r: 0.35,
  "1": 0.5,
  // Wide characters
  m: 0.9,
  w: 0.85,
  M: 1.0,
  W: 1.1,
  // Default
  default: 0.55,
};

/**
 * Approximate text width measurement
 * Used when Canvas is not available
 */
export function approximateTextWidth(text: string, font: FontStyle): number {
  let width = 0;
  for (const char of text) {
    const ratio = CHAR_WIDTH_RATIOS[char] ?? CHAR_WIDTH_RATIOS.default;
    width += font.size * ratio;
  }
  // Adjust for letter spacing
  width += (text.length - 1) * font.letterSpacing;
  return width;
}

/**
 * Create approximate measure function
 */
export function createApproximateMeasureFn(): MeasureTextFn {
  return (text: string, font: FontStyle) => ({
    width: approximateTextWidth(text, font),
    height: font.size * font.lineHeight,
  });
}
