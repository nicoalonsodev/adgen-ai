/**
 * Template: Headline Top Left
 *
 * Layout — large editorial headline in the TOP zone, product fills BOTTOM 65%:
 *   TOP    (0%–35%):   headline (Playfair Display bold, left) + subheadline
 *   BOTTOM (35%–100%): reserved for product via PRODUCT_IA
 *
 * Fields used: headline, subheadline
 * copyZone: "bottom"
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

export function buildHeadlineTopLeftLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Horizontal constants ──────────────────────────────────────────────────

  const HL_X = Math.round(CW * 0.06);
  const HL_W = Math.round(CW * 0.88);

  const SUB_W = Math.round(CW * 0.78);
  const SUB_X = Math.round((CW - SUB_W) / 2);

  // ── Adaptive headline font size ───────────────────────────────────────────
  // Reduce from 88 down to 40 so the full text fits within HL_W on one line.
  // The renderer wraps to maxLines: 3 as needed.

  const rawHeadline = copy.headline ?? "";
  const hlFontSize = fitFontSize(rawHeadline, HL_W, 88, 40, true, "Playfair Display");

  // ── Vertical positions ────────────────────────────────────────────────────

  const HL_Y = Math.round(CH * 0.07);
  const HL_H = Math.ceil(hlFontSize * 1.1 * 3) + 8; // reserved space (up to 3 lines)

  // Estimate actual wrapped line count so subheadline sits tight under the headline
  const hlWords = rawHeadline.split(" ");
  let hlLineWidth = 0;
  let hlLineCount = 1;
  for (const word of hlWords) {
    const wordW = measureLine(word, hlFontSize, true, "Playfair Display");
    const spaceW = measureLine(" ", hlFontSize, true, "Playfair Display");
    if (hlLineWidth > 0 && hlLineWidth + spaceW + wordW > HL_W) {
      hlLineCount++;
      hlLineWidth = wordW;
    } else {
      hlLineWidth = hlLineWidth === 0 ? wordW : hlLineWidth + spaceW + wordW;
    }
  }
  const actualHlLines = Math.min(hlLineCount, 3);
  const actualHL_H = Math.ceil(hlFontSize * 1.1 * actualHlLines) + 8;

  const SUB_Y = HL_Y + actualHL_H + 12; // +12 gap from actual headline bottom (was HL_H + 16)
  const SUB_FONT = Math.round(CW * 0.022);
  const SUB_H = Math.ceil(SUB_FONT * 1.4 * 2) + 8; // up to 2 lines

  // ── Separator: short centered line below subheadline ──────────────────────
  const SEP_W = 44;
  const SEP_X = Math.round((CW - SEP_W) / 2);
  const SEP_Y = SUB_Y + SUB_H + 11; // 11px gap below subheadline

  // ── Dato de impacto: social proof just below product base ─────────────────
  const IMPACT_FONT = Math.round(CW * 0.012); // ~13px — small, subordinate
  const IMPACT_W    = Math.round(CW * 0.62);
  const IMPACT_X    = Math.round((CW - IMPACT_W) / 2);
  const IMPACT_Y    = Math.round(CH * 0.808); // just below product base (~80%)
  const IMPACT_H    = Math.ceil(IMPACT_FONT * 1.6) + 8;

  // Badge — anchored near bottom of top zone, capped at 86% canvas height
  const BADGE_FONT = Math.round(CW * 0.022);
  const BADGE_H = Math.ceil(BADGE_FONT * 1.6) + 16;
  const BADGE_Y = Math.min(Math.round(CH * 0.85), Math.round(CH * 0.86));
  const BADGE_W = Math.round(CW * 0.62);
  const BADGE_X = Math.round((CW - BADGE_W) / 2);

  // ── SVG decorations ────────────────────────────────────────────────────────
  const svgDecorations = `
  <!-- Separator: short centered line below subheadline -->
  <line x1="${SEP_X}" y1="${SEP_Y}" x2="${SEP_X + SEP_W}" y2="${SEP_Y}"
        stroke="#1A1A1A" stroke-width="1" opacity="0.35"/>`;

  // ── LayoutSpec ────────────────────────────────────────────────────────────

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.04) },

    svgDecorations,

    // Bottom zone reserved for PRODUCT_IA — no product rendered here
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
      // ── HEADLINE: Playfair Display bold, left-aligned, top zone ───────────
      {
        id: "headline",
        content: rawHeadline,
        x: HL_X,
        y: HL_Y,
        w: HL_W,
        h: HL_H,
        align: "center",
        fontFamily: "Playfair Display",
        fontWeight: "700",
        fontSize: hlFontSize,
        color: "#1A1A1A",
        lineHeight: 1.1,
        letterSpacing: -0.02,
        maxLines: 3,
        textTransform: "none",
      },

      // ── SUBHEADLINE: Montserrat regular, left-aligned, below headline ─────
      {
        id: "subheadline",
        content: copy.subheadline ?? "",
        x: SUB_X,
        y: SUB_Y,
        w: SUB_W,
        h: SUB_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "400",
        fontSize: SUB_FONT,
        color: "#555555",
        lineHeight: 1.4,
        letterSpacing: 0,
        maxLines: 2,
        textTransform: "none",
      },

      // ── DATO DE IMPACTO: social proof below product ───────────────────────
      ...(copy.disclaimer
        ? [
            {
              id: "disclaimer" as const,
              content: copy.disclaimer,
              x: IMPACT_X,
              y: IMPACT_Y,
              w: IMPACT_W,
              h: IMPACT_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "500" as const,
              fontSize: IMPACT_FONT,
              color: "#666666",
              lineHeight: 1.4,
              letterSpacing: 0.01,
              maxLines: 1,
              textTransform: "none" as const,
            },
          ]
        : []),

      // ── BADGE (optional): accent pill near bottom of top zone ─────────────
      ...(copy.badge
        ? [
            {
              id: "badge" as const,
              content: copy.badge,
              x: BADGE_X,
              y: BADGE_Y,
              w: BADGE_W,
              h: BADGE_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "600" as const,
              fontSize: BADGE_FONT,
              color: "#FFFFFF",
              lineHeight: 1.4,
              letterSpacing: 0.02,
              maxLines: 1,
              textTransform: "none" as const,
              background: {
                type: "pill" as const,
                color: "#00B5AD",
                radius: 32,
                padding: 20,
                opacity: 1,
              },
            },
          ]
        : []),
    ],

    confidence: 1,
    rationale:
      "TEMPLATE_BETA: headline-top-left — large editorial headline top-left, product bottom via PRODUCT_IA",
    warnings: [],
  } as unknown as LayoutSpec;
}
