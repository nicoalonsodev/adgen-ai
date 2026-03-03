/**
 * Template: Hero Center Bottom
 *
 * Layout — copy split between TOP and BOTTOM, center zone free for product:
 *   TOP    (0%–22%):   title + subheadline
 *   CENTER (22%–68%):  reserved for product via PRODUCT_IA
 *   BOTTOM (68%–100%): disclaimer (social proof) + headline (big offer) + badge pill
 *
 * Fields used: title, subheadline, headline, disclaimer, badge
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

export function buildHeroCenterBottomLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Horizontal constants ──────────────────────────────────────────────────

  const TITLE_W = Math.round(CW * 0.85);
  const TITLE_X = Math.round((CW - TITLE_W) / 2);

  const SUB_W = Math.round(CW * 0.80);
  const SUB_X = Math.round(CW * 0.10);

  const HL_W = Math.round(CW * 0.90);
  const HL_X = Math.round((CW - HL_W) / 2);

  const BADGE_W = Math.round(CW * 0.65);
  const BADGE_X = Math.round((CW - BADGE_W) / 2);

  const DISCLAIMER_W = Math.round(CW * 0.82);
  const DISCLAIMER_X = Math.round((CW - DISCLAIMER_W) / 2);

  // ── Vertical positions ────────────────────────────────────────────────────

  const TITLE_Y = Math.round(CH * 0.14);
  const SUB_Y = Math.round(CH * 0.22);
  const DISCLAIMER_Y = Math.round(CH * 0.70); // social proof row
  const HL_Y = Math.round(CH * 0.78);         // was 0.76 — shifted down to make room
  const BADGE_Y = Math.round(CH * 0.93); // unused inline below but kept for reference

  // ── Adaptive font sizes ───────────────────────────────────────────────────

  const rawTitle = copy.title ?? "";
  const titleFontSize = fitFontSize(
    rawTitle,
    TITLE_W,
    64,
    36,
    true,
    "Playfair Display",
  );

  const rawHeadline = copy.headline ?? "";
  const hlFontSize = fitFontSize(
    rawHeadline,
    HL_W,
    68,
    38,
    true,
    "Montserrat",
  );

  // ── LayoutSpec ────────────────────────────────────────────────────────────

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.04) },

    // Center zone is reserved for PRODUCT_IA — no product rendered by this template
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
      // ── TOP: TITLE (Playfair Display bold, tagline / product name) ─────────
      {
        id: "title",
        content: rawTitle,
        x: TITLE_X,
        y: TITLE_Y,
        w: TITLE_W,
        h: Math.round(titleFontSize * 1.2 * 2 + 8), // 2 lines max
        align: "center",
        fontFamily: "Playfair Display",
        fontWeight: "700",
        fontSize: titleFontSize,
        color: "#1A1A1A",
        letterSpacing: 0,
        maxLines: 2,
        lineHeight: 1.2,
        textTransform: "none",
      },

      // ── TOP: SUBHEADLINE (Montserrat medium — legible en feed) ───────────
      {
        id: "subheadline",
        content: copy.subheadline ?? "",
        x: SUB_X,
        y: SUB_Y,
        w: SUB_W,
        h: Math.round(CW * 0.026 * 1.4 * 2 + 8), // 2 lines max
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "500",           // era "400" — más peso para feed
        fontSize: Math.round(CW * 0.026), // era 0.018 (~19px) — ahora ~28px
        color: "#5A4A3A",            // era "#7A6A5A" — más contraste
        maxLines: 2,
        lineHeight: 1.4,
        letterSpacing: 0,
        textTransform: "none",
      },

      // ── BOTTOM: DISCLAIMER — social proof (estrellas + número clientas) ──
      {
        id: "disclaimer",
        content: copy.disclaimer ?? "",
        x: DISCLAIMER_X,
        y: DISCLAIMER_Y,
        w: DISCLAIMER_W,
        h: Math.round(CW * 0.024 * 1.3 + 8), // 1 línea compacta
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "600",
        fontSize: Math.round(CW * 0.024), // ~26px — visible sin robar protagonismo
        color: "#5A4A3A",
        maxLines: 1,
        lineHeight: 1.3,
        letterSpacing: 0.01,
        textTransform: "none",
      },

      // ── BOTTOM: HEADLINE — big offer text (Montserrat Black) ─────────────
      {
        id: "headline",
        content: rawHeadline,
        x: HL_X,
        y: HL_Y,
        w: HL_W,
        h: Math.round(hlFontSize * 1.2 + 8), // 1 line only
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: hlFontSize,
        color: "#1A1A1A",
        letterSpacing: -0.01,
        maxLines: 1,
        lineHeight: 1.1,
        textTransform: "none",
      },

      // ── BOTTOM: BADGE — teal pill ─────────────────────────────────────────
      {
        id: "badge",
        content: copy.badge ?? "",
        x: BADGE_X,
        y: Math.round(CH * 0.93),
        w: BADGE_W,
        h: 40,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: Math.round(CW * 0.022),
        color: "#FFFFFF",
        maxLines: 1,
        lineHeight: 1,
        letterSpacing: 0,
        textTransform: "none",
        background: {
          type: "pill",
          color: "#00B5AD",
          radius: 30,
          padding: 16,
          opacity: 1,
        },
      },
    ],

    confidence: 1,
    rationale:
      "TEMPLATE_BETA: hero-center-bottom — title+sub top, product center, social-proof+offer+badge bottom",
    warnings: [],
  } as LayoutSpec;
}
