/**
 * Template: Classic Editorial
 *
 * Layout: background full-bleed, contour lines decorativas (del bg),
 * copy centrado a la derecha, badge pill al fondo.
 * Replica el estilo de la imagen de referencia.
 */

import type { LayoutSpec } from "../layoutSpec";
import type { CopyContent } from "../types";
import { resolveTemplateColors, resolveTemplateColorsFromPalette, resolveBrandColorVars } from "@/lib/colorUtils";

const W = 1080;
const H = 1080; // puede ser 1080x1080 o 1080x1350, se adapta

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
// Lora (Playfair) es más estrecha, Poppins (Inter) es más ancha
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

/** Inserta \n cerca del medio o antes de "cuando/para/y" para titulares elegantes */
function smartBreak(text: string): string {
  if (!text) return text;
  // Romper antes de conjunciones/preposiciones comunes
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
  /** Línea pequeña superior: ingredientes o tagline */
  title?: string;
  /** Titular principal */
  headline?: string;
  /** Descripción breve debajo del headline */
  subheadline?: string;
  /** Badge/oferta pill al fondo */
  badge?: string;
  bullets?: string[];
  /** comparacion-split: competition label (right column, gray) */
  competitionTitle?: string;
  /** comparacion-split: competition weaknesses (right column, ✗ bullets) */
  competitionBullets?: string[];
  /** Social proof / disclaimer line (e.g. "+12.000 mujeres ya lo usan") */
  disclaimer?: string;
  /** Brand primary color as hex — fallback cuando no hay brandColors */
  primaryColor?: string;
  /**
   * Paleta completa de la marca (7 colores guardados en mi-negocio).
   * Índices: [0] primary, [1] primaryLight, [2] primaryDark, [3] primaryPale,
   *          [4] accent, [5] accentLight, [6] accentDark
   * Tiene prioridad sobre primaryColor si está presente.
   */
  brandColors?: string[];
}

export function buildClassicEditorialLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  console.log("HOLA[classic-editorial] copy.bullets:", copy.bullets); 
  const { width: CW, height: CH } = canvas;

  // ── Colores de marca — 7 variables directas ─────────────────────────────
  // Prioridad: brandColors[] (paleta guardada) > primaryColor (fallback auto) > neutros
  const brand = resolveBrandColorVars(copy.brandColors, copy.primaryColor);
  // Las 7 variables de marca disponibles para usar en cualquier elemento:
  // brand.BRAND_PRIMARY       → color principal
  // brand.BRAND_PRIMARY_LIGHT → principal claro (fondos)
  // brand.BRAND_PRIMARY_DARK  → principal oscuro (titulares con identidad)
  // brand.BRAND_PRIMARY_PALE  → principal suave (fondos sutiles)
  // brand.BRAND_ACCENT        → acento (badge, CTA, highlights)
  // brand.BRAND_ACCENT_LIGHT  → acento claro (badges secundarios)
  // brand.BRAND_ACCENT_DARK   → acento oscuro (texto sobre fondo claro con color)

  // ── Roles semánticos para este template (light mode: fondo lifestyle) ───
  // classic-editorial usa fondo lifestyle claro → garantizar contraste WCAG AA
  const tc =
    resolveTemplateColorsFromPalette(copy.brandColors, "light") ??
    resolveTemplateColors(copy.primaryColor, "light");
  const COL_HEADLINE = tc?.headline ?? brand.BRAND_PRIMARY_DARK;
  const COL_BODY     = tc?.body     ?? brand.BRAND_PRIMARY_DARK;
  const COL_MUTED    = tc?.muted    ?? brand.BRAND_ACCENT_DARK;
  const COL_BADGE_BG = brand.BRAND_PRIMARY;
  const COL_BADGE_TX = tc?.badgeText ?? "#FFFFFF";

  // ── Zona de copy: mitad derecha ─────────────────────────────────────────
  const COPY_X = Math.round(CW * 0.46); // ~497px  (empieza pasada la mitad)
  const COPY_W = Math.round(CW * 0.49); // ~529px  (hasta margen derecho de 2%)
  const RIGHT_MARGIN = Math.round(CW * 0.04);

  // ── HEADLINE: Playfair, font adaptativo ─────────────────────────────────
  const HL_FAMILY = "Playfair Display";
  const HL_WEIGHT = "700";

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

  let hlFontSize = 200;
  while (
    hlFontSize > 28 &&
    measureLine(longestHlLine, hlFontSize, true, HL_FAMILY) >
      COPY_W - RIGHT_MARGIN
  ) {
    hlFontSize -= 2;
  }

  const HL_LINE_H = 1.15;
  const hlLines = brokenHeadline.split("\n").length;
  const hlHeightPx = Math.ceil(hlFontSize * HL_LINE_H * hlLines);

  // ── Posiciones verticales (% del canvas) ────────────────────────────────
  // title:      12% del alto
  // headline:   38% del alto
  // sub:        justo debajo del headline + gap 20px
  // badge:      91% del alto
  const TITLE_Y = Math.round(CH * 0.1);
  const HL_Y = Math.round(CH * 0.28);
  const SUB_Y = HL_Y + hlHeightPx + 20;
  const BADGE_Y = Math.round(CH * 0.91);

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.05) },

    // No hay producto en este modo (es un template puro de copy)
    product: {
      anchor: "custom",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
      rotation: 0,
    },

    overlays: [], // El background ya tiene su estilo, sin overlay

    textBlocks: [
      // ── TITLE: ingredientes / tagline, centrado en canvas completo ────────
      {
        id: "cta",
        content: copy.title ?? "",
        x: Math.round(CW * 0.46), // alineado con el copy, no con canvas completo
        y: TITLE_Y,
        w: COPY_W - RIGHT_MARGIN,
        h: 56,
        align: "left", // igual que el headline
        fontFamily: "Montserrat",
        fontWeight: "400", // fino, no bold
        fontSize: Math.round(CW * 0.02), // ~19px, más pequeño
        color: COL_MUTED, // color de marca (muted) o fallback gris
        maxLines: 2,
        lineHeight: 1.4,
        letterSpacing: 0.04,
        textTransform: "none",
      },

      // ── HEADLINE: Playfair, zona derecha ──────────────────────────────────
      {
        id: "headline",
        content: brokenHeadline,
        x: COPY_X,
        y: HL_Y,
        w: COPY_W - RIGHT_MARGIN,
        h: hlHeightPx + 8,
        align: "left",
        fontFamily: HL_FAMILY,
        fontWeight: HL_WEIGHT,
        fontSize: hlFontSize,
        lineHeight: HL_LINE_H,
        letterSpacing: -0.02,
        color: COL_HEADLINE,
        maxLines: 5,
        textTransform: "none",
      },

     // ── SUBHEADLINE ──
{
  id: "subheadline",
  content: copy.subheadline ?? "",
  x: COPY_X,
  y: SUB_Y,
  w: COPY_W - RIGHT_MARGIN,
  h: Math.round(CH * 0.15),
  align: "left",
  fontFamily: "Montserrat",
  fontWeight: "700",
  fontSize: Math.round(CW * 0.02),
  color: COL_BODY,
  maxLines: 3,
  lineHeight: 1.55,
  letterSpacing: 0,
  textTransform: "none",
},

// ── BULLETS ──
...(copy.bullets && copy.bullets.length > 0
  ? copy.bullets.slice(0, 4).map((bullet, idx) => ({
      id: `bullet_${idx}`,
      content: `${bullet}`,
      x: COPY_X,
      y: SUB_Y + Math.round(CH * 0.15) + idx * Math.round(CH * 0.055),
      w: COPY_W - RIGHT_MARGIN,
      h: Math.round(CH * 0.055),
      align: "left" as const,
      fontFamily: "Montserrat",
      fontWeight: "400",
      fontSize: Math.round(CW * 0.025),
      color: COL_MUTED,
      maxLines: 1,
      lineHeight: 1.3,
      letterSpacing: 0,
      textTransform: "none" as const,
    }))
  : []),

      // ── BADGE: pill teal al fondo, ancho 90% del canvas ──────────────────
      {
        id: "badge",
        content: copy.badge ?? "",
        x: Math.round((CW - Math.round(CW * 0.6)) / 2), // antes 0.05
        y: BADGE_Y,
        w: Math.round(CW * 0.6), // antes 0.90 — mucho más contenido
        h: 60,
        align: "center",
        color: COL_BADGE_TX,
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: Math.round(CW * 0.021),
        maxLines: 1,
        lineHeight: 1,
        letterSpacing: 0.01,
        textTransform: "none",
        background: {
          type: "pill",
          color: COL_BADGE_BG,
          radius: 32,
          padding: 20, // antes 18 — más aire adentro
          opacity: 1,
        },
      },
    ],

    confidence: 1,
    rationale:
      "TEMPLATE_BETA: classic-editorial — copy derecha, badge pill fondo",
    warnings: [],
  } as unknown as LayoutSpec;
}
