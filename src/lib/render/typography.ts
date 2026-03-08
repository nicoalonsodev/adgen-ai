/**
 * Typography – Inter font registration & size presets for Meta Ads 1080×1350
 *
 * Uses @napi-rs/canvas GlobalFonts to register Inter families once.
 * All sizes are optimized for 1080×1350 portrait format.
 */

import { GlobalFonts } from "@napi-rs/canvas";
import path from "path";

/* ── Font registration (idempotent) ── */

let fontsRegistered = false;

export function ensureFontsRegistered(): void {
  if (fontsRegistered) return;

  const fontsDir = path.join(process.cwd(), "public", "fonts");

  GlobalFonts.registerFromPath(
    path.join(fontsDir, "Inter-Regular.ttf"),
    "Inter"
  );
  GlobalFonts.registerFromPath(
    path.join(fontsDir, "Inter-SemiBold.ttf"),
    "Inter SemiBold"
  );
  GlobalFonts.registerFromPath(
    path.join(fontsDir, "Inter-Bold.ttf"),
    "Inter Bold"
  );
  GlobalFonts.registerFromPath(
    path.join(fontsDir, "BebasNeue-Regular.ttf"),
    "Bebas Neue"
  );
  // Futura substitute (commercial font → free open-source alternative)
  GlobalFonts.registerFromPath(
    path.join(fontsDir, "Jost-Regular.ttf"),
    "Jost"
  );
  GlobalFonts.registerFromPath(
    path.join(fontsDir, "Jost-Bold.ttf"),
    "Jost Bold"
  );
  // Recoleta substitute (commercial font → free open-source alternative)
  GlobalFonts.registerFromPath(
    path.join(fontsDir, "DMSerifDisplay-Regular.ttf"),
    "DM Serif Display"
  );
  GlobalFonts.registerFromPath(
    path.join(fontsDir, "DMSerifDisplay-Italic.ttf"),
    "DM Serif Display Italic"
  );

  fontsRegistered = true;
}

/* ── Font size presets ── */

export const FONT = {
  /** Headline – bold, large, impactful */
  headline: {
    family: "Inter Bold",
    size: 64,
    lineHeight: 72,
    letterSpacing: -1,
  },
  /** Subheadline – semi-bold, medium */
  subheadline: {
    family: "Inter SemiBold",
    size: 36,
    lineHeight: 44,
    letterSpacing: 0,
  },
  /** CTA button text – bold, compact */
  cta: {
    family: "Inter Bold",
    size: 28,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  /** Badge text – semi-bold, small */
  badge: {
    family: "Inter SemiBold",
    size: 22,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  /** Disclaimer – regular, small */
  disclaimer: {
    family: "Inter",
    size: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
} as const;

export type FontPreset = keyof typeof FONT;

/* ── Canvas font string builder ── */

export function fontString(preset: FontPreset): string {
  const f = FONT[preset];
  return `${f.size}px "${f.family}"`;
}

/* ── Safe margins (1080×1350) ── */

export const SAFE_MARGIN = {
  top: 120,
  bottom: 160,
  left: 100,
  right: 100,
} as const;

/** Usable content area after margins */
export const CONTENT_AREA = {
  x: SAFE_MARGIN.left,
  y: SAFE_MARGIN.top,
  width: 1080 - SAFE_MARGIN.left - SAFE_MARGIN.right, // 880
  height: 1350 - SAFE_MARGIN.top - SAFE_MARGIN.bottom, // 1070
} as const;

/* ── Text measurement helpers ── */

/**
 * Word-wrap text to fit within maxWidth.
 * Returns array of lines.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
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

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

// Re-export the CanvasRenderingContext2D type reference
type CanvasRenderingContext2D = import("@napi-rs/canvas").SKRSContext2D;
