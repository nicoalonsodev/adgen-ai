/**
 * Template: Pain Point Left
 *
 * Layout — copy column on LEFT, person/scene on RIGHT via PRODUCT_IA:
 *   LEFT  (0%–52%):   headline + subheadline + badge pill
 *   RIGHT (52%–100%): reserved for person/scene via PRODUCT_IA
 *
 * Fields used: headline, subheadline, badge
 * copyZone: "left"
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

// ── Text measurement (same system as layoutSpec / textRenderer) ───────────────

const CHAR_WIDTHS: Record<string, number> = {
  i: 0.25,
  l: 0.25,
  I: 0.28,
  "!": 0.28,
  ".": 0.28,
  ",": 0.28,
  j: 0.28,
  f: 0.32,
  t: 0.35,
  r: 0.38,
  "1": 0.45,
  s: 0.48,
  c: 0.5,
  a: 0.52,
  e: 0.52,
  o: 0.55,
  n: 0.55,
  u: 0.55,
  z: 0.48,
  x: 0.5,
  v: 0.5,
  y: 0.5,
  k: 0.52,
  h: 0.55,
  b: 0.55,
  d: 0.55,
  p: 0.55,
  q: 0.55,
  g: 0.55,
  w: 0.72,
  m: 0.82,
  W: 0.95,
  M: 0.88,
  A: 0.65,
  B: 0.62,
  C: 0.65,
  D: 0.68,
  E: 0.55,
  F: 0.52,
  G: 0.7,
  H: 0.7,
  J: 0.45,
  K: 0.62,
  L: 0.52,
  N: 0.7,
  O: 0.72,
  P: 0.58,
  Q: 0.72,
  R: 0.62,
  S: 0.55,
  T: 0.58,
  U: 0.68,
  V: 0.62,
  X: 0.62,
  Y: 0.58,
  Z: 0.58,
  "0": 0.55,
  "2": 0.55,
  "3": 0.55,
  "4": 0.55,
  "5": 0.55,
  "6": 0.55,
  "7": 0.55,
  "8": 0.55,
  "9": 0.55,
  " ": 0.28,
  "-": 0.35,
  "+": 0.55,
  "%": 0.85,
  "&": 0.7,
  á: 0.52,
  é: 0.52,
  í: 0.25,
  ó: 0.55,
  ú: 0.55,
  ñ: 0.55,
  Á: 0.65,
  É: 0.55,
  Ó: 0.72,
  Ú: 0.68,
  Ñ: 0.7,
};

const DEFAULT_CW = 0.55;

const FAMILY_FACTORS: Record<string, number> = {
  "playfair display": 0.987,
  playfair: 0.987,
  lora: 0.987,
  inter: 1.0,
  montserrat: 1.0,
  poppins: 1.0,
};

function measureLine(
  text: string,
  fontSize: number,
  bold: boolean,
  family: string,
): number {
  const factor =
    Object.entries(FAMILY_FACTORS).find(([k]) =>
      family.toLowerCase().includes(k),
    )?.[1] ?? 1.05;
  let w = 0;
  for (const ch of text) w += (CHAR_WIDTHS[ch] ?? DEFAULT_CW) * fontSize;
  if (bold) w *= 1.08;
  return w * factor;
}

/** Shrinks fontSize until `text` fits within `maxWidth`, down to `minSize` */
function fitFontSize(
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  bold: boolean,
  family: string,
): number {
  let size = startSize;
  while (size > minSize && measureLine(text, size, bold, family) > maxWidth) {
    size -= 1;
  }
  return size;
}

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildPainPointLeftLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Left column constants ─────────────────────────────────────────────────

  const HL_X = Math.round(CW * 0.03);
  const HL_W = Math.round(CW * 0.48);
  const SUB_X = Math.round(CW * 0.03);
  const SUB_W = Math.round(CW * 0.46);
  const BADGE_X = Math.round(CW * 0.04);
  const BADGE_W = Math.round(CW * 0.42);

  // ── Adaptive headline font size ───────────────────────────────────────────
  // Reduce from 124 down to 48 so the full text fits within HL_W on one line.
  // The renderer wraps to maxLines: 5 as needed.

  const rawHeadline = copy.headline ?? "";
  const hlFontSize = fitFontSize(
    rawHeadline,
    HL_W,
    148,
    48,
    true,
    "Montserrat",
  );

  // ── Vertical positions ────────────────────────────────────────────────────

  const HL_Y = Math.round(CH * 0.15);
  const HL_H = Math.ceil(hlFontSize * 1.08 * 5) + 8; // reserved space (up to 5 lines)

  // Estimate actual wrapped line count so subheadline sits tight under the headline
  const hlWords = rawHeadline.split(" ");
  let hlLineWidth = 0;
  let hlLineCount = 1;
  for (const word of hlWords) {
    const wordW = measureLine(word, hlFontSize, true, "Montserrat");
    const spaceW = measureLine(" ", hlFontSize, true, "Montserrat");
    if (hlLineWidth > 0 && hlLineWidth + spaceW + wordW > HL_W) {
      hlLineCount++;
      hlLineWidth = wordW;
    } else {
      hlLineWidth = hlLineWidth === 0 ? wordW : hlLineWidth + spaceW + wordW;
    }
  }
  const actualHlLines = Math.min(hlLineCount, 5);
  const actualHL_H = Math.ceil(hlFontSize * 1.08 * actualHlLines) + 8;

  const ARROW_FONT = CW * 0.045;
  const ARROW_Y = HL_Y + actualHL_H + 20;
  const ARROW_H = Math.ceil(ARROW_FONT * 1) + 8;

  const SUB_FONT = CW * 0.03;
  const naturalSubY = ARROW_Y + ARROW_H + 16;
  const SUB_Y = Math.max(naturalSubY, Math.round(CH * 0.62));
  const SUB_H = Math.ceil(SUB_FONT * 1.4 * 4) + 8; // up to 4 lines

  const BADGE_Y = Math.round(CH * 0.88);
  const BADGE_FONT = CW * 0.019;
  const BADGE_H = Math.ceil(BADGE_FONT * 1.4) + 8;

  // ── LayoutSpec ────────────────────────────────────────────────────────────

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.04) },

    // Right zone reserved for PRODUCT_IA — no product rendered here
    product: {
      anchor: "custom",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
      rotation: 0,
    },

    overlays: [],

    textBlocks: [
      // ── HEADLINE: Montserrat 900, left column, top-anchored ───────────────
      {
        id: "headline",
        content: rawHeadline,
        x: HL_X,
        y: HL_Y,
        w: HL_W,
        h: HL_H,
        align: "left",
        fontFamily: "Montserrat",
        fontWeight: "900",
        fontSize: hlFontSize,
        color: "#111111",
        lineHeight: 1.08,
        letterSpacing: -0.015,
        maxLines: 5,
        textTransform: "none",
      },

      // ── ARROW: between headline and subheadline ───────────────────────────
      {
        id: "arrow",
        content: "↓",
        x: Math.round(CW * 0.03),
        y: ARROW_Y,
        w: Math.round(CW * 0.10),
        h: ARROW_H,
        align: "left",
        fontFamily: "Montserrat",
        fontWeight: "400",
        fontSize: ARROW_FONT,
        color: "#111111",
        lineHeight: 1,
        letterSpacing: 0,
        maxLines: 1,
        textTransform: "none",
      },

      // ── SUBHEADLINE: Montserrat 700, below headline ────────────────────────
      {
        id: "subheadline",
        content: copy.subheadline ?? "",
        x: SUB_X,
        y: SUB_Y,
        w: SUB_W,
        h: SUB_H,
        align: "left",
        fontFamily: "Montserrat",
        fontWeight: "700",
        boldWeight: "900",
        fontSize: SUB_FONT,
        color: "#1A1A1A",
        lineHeight: 1.4,
        letterSpacing: 0,
        maxLines: 4,
        textTransform: "none",
      },

      // ── BADGE: bottom-left pill ─────────────────────────────────────────────
      {
        id: "badge",
        content: copy.badge ?? "",
        x: BADGE_X,
        y: BADGE_Y,
        w: BADGE_W,
        h: BADGE_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "600",
        fontSize: BADGE_FONT,
        color: "#FFFFFF",
        lineHeight: 1,
        letterSpacing: 0,
        maxLines: 1,
        textTransform: "none",
        background: {
          type: "pill",
          color: "#1A1A1A",
          radius: 28,
          padding: 14,
          opacity: 1,
        },
      },
    ],

    confidence: 1,
    rationale:
      "TEMPLATE_BETA: pain-point-left — headline+sub+badge left column, person/scene right via PRODUCT_IA",
    warnings: [],
  } as unknown as LayoutSpec;
}
