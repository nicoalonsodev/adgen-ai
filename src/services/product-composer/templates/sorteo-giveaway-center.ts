/**
 * Template: Sorteo / Giveaway Center
 *
 * Layout — full-bleed scene/persona generada por IA, copy centrado en capas sobre la foto:
 *   TOP    (5%–18%):   brand/title (Montserrat, centrado) + CTA pequeño debajo del logo
 *   CENTER (40%–58%):  headline principal ("SORTEO") + subheadline script italic ("Día de la madre")
 *   BOTTOM (65%–78%):  badge destacado con premios ("6 PREMIOS / 6 GANADORAS")
 *
 * Fields used: title, headline, subheadline, badge, bullets[0] (colaboración)
 * copyZone: "center"
 * requiresSceneGeneration: false
 * El background se genera directamente con personas/escena via Gemini (no PRODUCT_IA)
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

// ── Text measurement ──────────────────────────────────────────────────────────

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

export function buildSorteoGiveawayCenterLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Shared horizontal constants ───────────────────────────────────────────

  const MARGIN_X = Math.round(CW * 0.05);
  const FULL_W = CW - MARGIN_X * 2;
  const CENTER_X = MARGIN_X;

  // ── TITLE (brand/logo area) ───────────────────────────────────────────────
  // Top ~5–15% of canvas, centered, small caps Montserrat

  const TITLE_FONT = Math.round(CW * 0.032); // ~35px
  const TITLE_Y = Math.round(CH * 0.055);
  const TITLE_H = Math.ceil(TITLE_FONT * 1.3 * 2) + 8;

  // ── HEADLINE ("SORTEO") ───────────────────────────────────────────────────
  // Enormous sans-serif 900, uppercase, white, centered
  // Adapt from 220 down to 80

  const rawHeadline = copy.headline ?? "";
  const HL_MAX_W = Math.round(CW * 0.9);
  const hlFontSize = fitFontSize(
    rawHeadline,
    HL_MAX_W,
    220,
    80,
    true,
    "Montserrat",
  );

  const HL_Y = Math.round(CH * 0.40);
  const HL_LINE_H = 1.0;

  // Estimate actual headline line count
  // fitFontSize ajusta el headline para caber en una línea según nuestra medición,
  // pero el renderer real puede ser ligeramente más ancho y causar wrap a 2 líneas.
  // Si el ancho medido supera el 85 % de HL_MAX_W, asumimos que en el render real
  // se partirá en 2 líneas para que SUB_Y quede correctamente debajo.
  const hlSingleLineW = measureLine(rawHeadline, hlFontSize, true, "Montserrat");
  const hlWillWrap = hlSingleLineW > HL_MAX_W * 0.85;

  const hlWords = rawHeadline.split(" ");
  let hlLineWidth = 0;
  let hlLineCount = 1;
  for (const word of hlWords) {
    const wordW = measureLine(word, hlFontSize, true, "Montserrat");
    const spaceW = measureLine(" ", hlFontSize, true, "Montserrat");
    if (hlLineWidth > 0 && hlLineWidth + spaceW + wordW > HL_MAX_W) {
      hlLineCount++;
      hlLineWidth = wordW;
    } else {
      hlLineWidth = hlLineWidth === 0 ? wordW : hlLineWidth + spaceW + wordW;
    }
  }
  const actualHlLines = hlWillWrap ? 2 : Math.min(hlLineCount, 2);
  const actualHL_H = Math.ceil(hlFontSize * HL_LINE_H * actualHlLines) + 8;

  // ── SUBHEADLINE (script italic line: "Día de la madre") ──────────────────
  // Lora italic, white, centered, right below headline

  const SUB_GAP = 4; // tight gap — script feels part of the headline
  const SUB_FONT = fitFontSize(
    copy.subheadline ?? "",
    Math.round(CW * 0.88),
    96,
    36,
    false,
    "Lora",
  );
  const SUB_Y = HL_Y + actualHL_H + SUB_GAP;
  const SUB_H = Math.ceil(SUB_FONT * 1.2 * 2) + 8;

  // ── BADGE ("6 PREMIOS / 6 GANADORAS") ────────────────────────────────────
  // Large bold centered block with dark pill background, ~65–78% of canvas

  const BADGE_FONT = Math.round(CW * 0.072); // ~78px
  const BADGE_W = Math.round(CW * 0.82);
  const BADGE_X = Math.round((CW - BADGE_W) / 2);
  const BADGE_Y = Math.round(CH * 0.645);
  const BADGE_H = Math.ceil(BADGE_FONT * 1.25 * 2) + 24; // 2 lines

  // ── CTA ("Junto a @handle") — pequeño, debajo del logo/título ───────────
  // Montserrat 400, centrado, se ubica justo por debajo del bloque de título

  const CTA_FONT = Math.round(CW * 0.024); // ~26px — más pequeño que el título
  const CTA_Y = TITLE_Y + TITLE_H + 4;      // justo debajo del logo
  const CTA_W = Math.round(CW * 0.9);
  const CTA_X = Math.round((CW - CTA_W) / 2);
  const CTA_H = Math.ceil(CTA_FONT * 1.4) + 8;

  // ── LayoutSpec ────────────────────────────────────────────────────────────

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.04) },

    // Full-bleed scene — PRODUCT_IA generates the people/scene
    product: {
      anchor: "custom",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
      rotation: 0,
    },

    overlays: [
      // Capa oscura uniforme sobre toda la foto — sutil pero suficiente
      // para que el texto blanco sea legible sin destruir la imagen.
      {
        type: "solid" as const,
        x: 0,
        y: 0,
        w: CW,
        h: CH,
        opacity: 0.35,
        color: "#000000",
      },
    ],

    textBlocks: [
      // ── TITLE: brand name, top center ─────────────────────────────────────
      ...(copy.title
        ? [
            {
              id: "cta" as const,
              content: copy.title,
              x: CENTER_X,
              y: TITLE_Y,
              w: FULL_W,
              h: TITLE_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "400" as const,
              fontSize: TITLE_FONT,
              color: "#FFFFFF",
              lineHeight: 1.3,
              letterSpacing: 0.12,
              maxLines: 2,
              textTransform: "uppercase" as const,
            },
          ]
        : []),

      // ── HEADLINE: "SORTEO" — enormous Montserrat 900 uppercase ────────────
      {
        id: "headline",
        content: rawHeadline,
        x: Math.round((CW - HL_MAX_W) / 2),
        y: HL_Y,
        w: HL_MAX_W,
        h: actualHL_H + 8,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "900",
        fontSize: hlFontSize,
        color: "#FFFFFF",
        lineHeight: HL_LINE_H,
        letterSpacing: -0.02,
        maxLines: 2,
        textTransform: "uppercase",
      },

      // ── SUBHEADLINE: script italic line ("Día de la madre") ───────────────
      ...(copy.subheadline
        ? [
            {
              id: "subheadline" as const,
              content: copy.subheadline,
              x: Math.round((CW - Math.round(CW * 0.88)) / 2),
              y: SUB_Y,
              w: Math.round(CW * 0.88),
              h: SUB_H,
              align: "center" as const,
              fontFamily: "Lora",
              fontWeight: "400" as const,
              fontSize: SUB_FONT,
              color: "#FFFFFF",
              lineHeight: 1.2,
              letterSpacing: 0.01,
              maxLines: 2,
              textTransform: "none" as const,
            },
          ]
        : []),

      // ── CTA / colaboración: "Junto a @handle" ─────────────────────────────
      ...(copy.bullets?.[0]
        ? [
            {
              id: "bullet_0" as const,
              content: copy.bullets[0],
              x: CTA_X,
              y: CTA_Y,
              w: CTA_W,
              h: CTA_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "400" as const,
              fontSize: CTA_FONT,
              color: "#FFFFFF",
              lineHeight: 1.4,
              letterSpacing: 0,
              maxLines: 1,
              textTransform: "none" as const,
            },
          ]
        : []),
    ],

    confidence: 0.92,
    rationale:
      "TEMPLATE_BETA: sorteo-giveaway-center — full-bleed scene via PRODUCT_IA, copy centrado en capas. Headline enorme Montserrat 900 uppercase + subheadline script Lora italic + badge premios + CTA colaboración.",
    warnings: [
      "El background es la escena con personas — generada por Gemini via backgroundPrompt adaptado al producto.",
      "Overlay solid 35% sobre todo el canvas para legibilidad del texto blanco.",
      "Sin pills ni fondos en ningún textBlock — solo texto blanco limpio sobre overlay.",
      "El subheadline usa Lora italic para efecto script — el renderer debe aplicar font-style: italic.",
      "noProductLayer: true — PRODUCT_IA nunca se ejecuta sobre este template.",
    ],
  } as unknown as LayoutSpec;
}