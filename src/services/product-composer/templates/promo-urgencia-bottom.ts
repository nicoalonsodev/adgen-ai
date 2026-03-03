/**
 * Template: Promo Urgencia Bottom
 *
 * Layout: background full-bleed, todo el copy concentrado en el 40%
 * inferior del canvas. Ideal para composiciones con producto o imagen
 * ocupando el área superior, con call-to-action prominente abajo.
 */

import type { LayoutSpec } from "../layoutSpec";

// ── Medición de texto (mismo sistema que layoutSpec/textRenderer) ──────────
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

function smartBreak(text: string): string {
  if (!text) return text;
  const t = text.replace(
    /\s+(cuando|para|que|con|sin|por|de la|del)\s+/i,
    (m) => "\n" + m.trim() + " ",
  );
  if (!t.includes("\n") && text.length > 24) {
    const words = text.split(" ");
    const mid = Math.ceil(words.length / 2);
    return words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
  }
  return t;
}

export interface TemplateCopy {
  /** Línea pequeña superior (tagline / ingredientes) */
  title?: string;
  /** Titular principal */
  headline?: string;
  /** Descripción breve debajo del headline */
  subheadline?: string;
  /** Badge/oferta pill */
  badge?: string;
  /** Texto del botón CTA */
  cta?: string;
  bullets?: string[];
}

export function buildPromoUrgenciaBottomLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Zona de copy: franja inferior (y > CH * 0.60) ───────────────────────
  const COPY_X = Math.round(CW * 0.05);
  const COPY_W = Math.round(CW * 0.90);

  // ── HEADLINE: Playfair Display bold, centrado, font adaptativo ───────────
  const HL_FAMILY = "Playfair Display";
  const HL_MAX_FS = 80;
  const HL_MIN_FS = 32;
  const HL_LINE_H = 1.15;

  const rawHeadline = copy.headline ?? "";
  const hlWithPeriod =
    rawHeadline && !/[.!?]$/.test(rawHeadline)
      ? rawHeadline + "."
      : rawHeadline;
  const brokenHeadline = smartBreak(hlWithPeriod);
  const longestHlLine = brokenHeadline
    .split("\n")
    .reduce((a, b) =>
      measureLine(a, 1, true, HL_FAMILY) > measureLine(b, 1, true, HL_FAMILY)
        ? a
        : b,
    );

  let hlFontSize = HL_MAX_FS;
  while (
    hlFontSize > HL_MIN_FS &&
    measureLine(longestHlLine, hlFontSize, true, HL_FAMILY) > COPY_W
  ) {
    hlFontSize -= 2;
  }

  const hlLines = brokenHeadline.split("\n").length;
  const hlHeightPx = Math.ceil(hlFontSize * HL_LINE_H * hlLines);

  // ── Posiciones verticales ────────────────────────────────────────────────
  // Badge baja a 60% para darle aire al producto; headline sube a 67% para
  // cerrar la zona muerta entre pill y copy (gap ~26px vs ~64px anterior).
  const BADGE_Y = Math.round(CH * 0.60);
  const HL_Y = Math.round(CH * 0.67);
  const CTA_Y = Math.round(CH * 0.88);

  // ── Dimensiones de badge y CTA ───────────────────────────────────────────
  const BADGE_W = Math.round(CW * 0.70);
  const BADGE_X = Math.round((CW - BADGE_W) / 2);

  const CTA_W = Math.round(CW * 0.50);
  const CTA_X = Math.round((CW - CTA_W) / 2);

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.05) },

    product: {
      anchor: "center",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
      rotation: 0,
    },

    overlays: [],

    textBlocks: [
      // ── BADGE: pill teal, centrado, zona superior del bloque ──────────────
      {
        id: "badge",
        content: copy.badge ?? "",
        x: BADGE_X,
        y: BADGE_Y,
        w: BADGE_W,
        h: 52,
        align: "center",
        color: "#FFFFFF",
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: Math.round(CW * 0.024),
        maxLines: 1,
        lineHeight: 1,
        letterSpacing: 0.01,
        textTransform: "none",
        background: {
          type: "pill",
          color: "#00B5AD",
          radius: 32,
          padding: 22,
          opacity: 1,
        },
      },

      // ── HEADLINE: Playfair, centrado ──────────────────────────────────────
      {
        id: "headline",
        content: brokenHeadline,
        x: COPY_X,
        y: HL_Y,
        w: COPY_W,
        h: hlHeightPx + 8,
        align: "center",
        fontFamily: HL_FAMILY,
        fontWeight: "700",
        fontSize: hlFontSize,
        lineHeight: HL_LINE_H,
        letterSpacing: -0.02,
        color: "#1A1A1A",
        maxLines: 4,
        textTransform: "none",
      },

      // ── CTA: big pill negro, centrado ─────────────────────────────────────
      {
        id: "cta",
        content: copy.cta ?? "",
        x: CTA_X,
        y: CTA_Y,
        w: CTA_W,
        h: 68,
        align: "center",
        color: "#FFFFFF",
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: Math.round(CW * 0.026),
        maxLines: 1,
        lineHeight: 1,
        letterSpacing: 0.01,
        textTransform: "none",
        background: {
          type: "pill",
          color: "#1A1A1A",
          radius: 34,
          padding: 20,
          opacity: 1,
        },
      },
    ],

    confidence: 1,
    rationale:
      "TEMPLATE_BETA: promo-urgencia-bottom — badge + headline + cta en franja inferior, top 60% libre para producto",
    warnings: [],
  } as LayoutSpec;
}
