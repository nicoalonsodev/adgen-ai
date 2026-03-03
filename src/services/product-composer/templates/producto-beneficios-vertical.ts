/**
 * Template: Producto Beneficios Vertical (BODY TALES style)
 *
 * Layout tipo "Body Tales — What do you want / What you need":
 *   BRAND:           nombre de marca centrado ENCIMA del box (full width)
 *   BOX (rounded):   panel de dos columnas con esquinas redondeadas
 *     HEADER BAR:    franja oscura con dos títulos de columna
 *       LEFT:  columnTitle  ("Lo que querés")
 *       RIGHT: competitionTitle ("Lo que necesitás")
 *     IZQUIERDA: lavanda pastel, 4 beneficios con círculo + checkmark SVG
 *     DERECHA:   azul-gris oscuro, producto GRANDE + nombre debajo
 *   URL/BADGE:       website URL centrado DEBAJO del box
 *
 * Box backgrounds rendered via SVG <clipPath> con rx para esquinas redondeadas.
 * Contenido izquierdo restringido a SAFE_RIGHT ≤ 42% del canvas (no bleeding).
 * copyZone = "left" → PRODUCT_IA coloca el producto en el RIGHT ~55%.
 *
 * TemplateCopy fields:
 *   title            — nombre de marca (encima del box, centrado)
 *   columnTitle      — título columna izquierda ("Lo que querés")
 *   competitionTitle — título columna derecha ("Lo que necesitás")
 *   bullets          — array de 4 deseos/beneficios
 *   headline         — nombre del producto (abajo a la derecha, dentro del box)
 *   badge            — website URL (debajo del box, centrado)
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

type ProdBeneficiosCopy = TemplateCopy & {
  columnTitle?: string;
  competitionTitle?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanBullet(raw: string): string {
  return raw.replace(/^[\s●•▸▹▪▫◆◇→►▶✓✔✗✘\-–—·*\d.]+/, "").trim();
}

/**
 * Genera un checkmark SVG dentro de un círculo.
 * Usa solo SVG paths — sin dependencia de fuentes.
 */
function checkIconSvg(
  cx: number,
  cy: number,
  circleR: number,
  fillColor: string,
): string {
  const sw = Math.max(2, Math.round(circleR * 0.16));
  const x1 = (cx - circleR * 0.38).toFixed(1);
  const y1 = (cy + circleR * 0.06).toFixed(1);
  const x2 = (cx - circleR * 0.03).toFixed(1);
  const y2 = (cy + circleR * 0.42).toFixed(1);
  const x3 = (cx + circleR * 0.46).toFixed(1);
  const y3 = (cy - circleR * 0.30).toFixed(1);
  return `
  <circle cx="${cx}" cy="${cy}" r="${circleR}"
          fill="${fillColor}" opacity="0.92"/>
  <polyline
    points="${x1},${y1} ${x2},${y2} ${x3},${y3}"
    stroke="#FFFFFF" stroke-width="${sw}" fill="none"
    stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildProductoBeneficiosVerticalLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const c = copy as ProdBeneficiosCopy;
  const { width: CW, height: CH } = canvas;

  // ── Box geometry ───────────────────────────────────────────────────────────
  const BOX_MARGIN  = Math.round(CW * 0.035);       // ~38px horizontal margin
  const BOX_X       = BOX_MARGIN;
  const BOX_W       = CW - 2 * BOX_MARGIN;          // ~1004px
  const CORNER_R    = Math.round(CW * 0.022);        // ~24px corner radius
  const BOX_Y       = Math.round(CH * 0.130);        // ~140px top of box
  const BOX_H       = Math.round(CH * 0.770);        // ~832px box height
  const BOX_END_Y   = BOX_Y + BOX_H;                 // ~972px

  // ── Brand (above box, full canvas width) ──────────────────────────────────
  const BRAND_FONT  = Math.round(CW * 0.030);        // ~32px
  const BRAND_Y     = Math.round(CH * 0.022);        // ~24px from top
  const BRAND_H     = Math.round(BRAND_FONT * 2.2);

  // ── Column split within box ────────────────────────────────────────────────
  const BOX_MID_X   = BOX_X + Math.round(BOX_W * 0.50);  // center of box
  const SAFE_RIGHT  = BOX_X + Math.round(BOX_W * 0.42);  // max x for left text
  const RIGHT_X     = BOX_MID_X;
  const RIGHT_W     = BOX_X + BOX_W - RIGHT_X;

  // ── Padding within columns ─────────────────────────────────────────────────
  const PAD_L       = Math.round(BOX_W * 0.040);    // ~40px
  const PAD_R       = Math.round(BOX_W * 0.040);    // ~40px

  // ── Header bar (at top of box) ─────────────────────────────────────────────
  const HEADER_Y    = BOX_Y;
  const HEADER_H    = Math.round(CH * 0.060);        // ~65px
  const HEADER_FONT = Math.round(CW * 0.021);        // ~23px

  // ── Benefits zone ──────────────────────────────────────────────────────────
  const BENEFIT_TOP = HEADER_Y + HEADER_H + Math.round(CH * 0.022); // ~229px
  const BENEFIT_BOT = Math.round(CH * 0.838);        // ~905px
  const BENEFIT_H   = BENEFIT_BOT - BENEFIT_TOP;

  const bullets = (c.bullets ?? []).slice(0, 4).map(cleanBullet);
  const N       = Math.max(bullets.length, 1);
  const ITEM_H  = Math.round(BENEFIT_H / N);

  // ── Circle icon geometry ───────────────────────────────────────────────────
  const CIRCLE_R  = Math.round(CW * 0.040);          // ~43px radio
  const CIRCLE_CX = BOX_X + PAD_L + CIRCLE_R;        // ~121px centro X

  // ── Bullet text (safe zone) ────────────────────────────────────────────────
  const BULLET_X    = CIRCLE_CX + CIRCLE_R + Math.round(PAD_L * 0.5); // ~184px
  const BULLET_W    = SAFE_RIGHT - BULLET_X - PAD_L;                   // ~236px
  const BULLET_FONT = Math.round(CW * 0.024);        // ~26px

  // ── Product name (bottom-right, inside box) ───────────────────────────────
  const PRODNAME_FONT = Math.round(CW * 0.026);
  const PRODNAME_H    = Math.ceil(PRODNAME_FONT * 1.6) + 10;
  const PRODNAME_Y    = Math.round(CH * 0.840);      // ~907px
  const PRODNAME_X    = RIGHT_X + PAD_R;
  const PRODNAME_W    = RIGHT_W - PAD_R * 2;

  // ── URL / Badge (below box) ────────────────────────────────────────────────
  const BADGE_FONT = Math.round(CW * 0.016);
  const BADGE_W    = Math.round(CW * 0.50);
  const BADGE_X    = Math.round((CW - BADGE_W) / 2);
  const BADGE_Y    = BOX_END_Y + Math.round((CH - BOX_END_Y) * 0.38);
  const BADGE_H    = Math.ceil(BADGE_FONT + 8 * 2) + 4;

  // ── Copy data ──────────────────────────────────────────────────────────────
  const colTitle  = c.columnTitle      ?? "Lo que querés";
  const colTitleR = c.competitionTitle ?? "Lo que necesitás";

  // ── Bullet positions ───────────────────────────────────────────────────────
  const bulletPositions = bullets.map((_, idx) => ({
    cy:    BENEFIT_TOP + Math.round(idx * ITEM_H + ITEM_H * 0.44),
    textY: BENEFIT_TOP + Math.round(idx * ITEM_H + ITEM_H * 0.44 - BULLET_FONT * 0.9),
  }));

  // ── SVG decorations ────────────────────────────────────────────────────────
  const ICON_COLOR   = "#2D3260";   // azul-índigo oscuro
  const LEFT_COLOR   = "#C2C8E4";   // lavanda pastel
  const RIGHT_COLOR  = "#6B7394";   // azul-gris apagado
  const HEADER_COLOR = "#4A5170";   // azul-pizarra oscuro

  const iconsSvg = bulletPositions
    .map(({ cy }, idx) => bullets[idx]
      ? checkIconSvg(CIRCLE_CX, cy, CIRCLE_R, ICON_COLOR)
      : ""
    )
    .join("\n");

  const dividerSvg = `
  <line x1="${BOX_MID_X}" y1="${HEADER_Y + HEADER_H}"
        x2="${BOX_MID_X}" y2="${BOX_END_Y}"
        stroke="rgba(255,255,255,0.18)" stroke-width="1"/>`;

  // Box shadow + column backgrounds clipped to rounded rect + header bar
  const svgDecorations = `
  <defs>
    <clipPath id="boxClip">
      <rect x="${BOX_X}" y="${BOX_Y}" width="${BOX_W}" height="${BOX_H}"
            rx="${CORNER_R}" ry="${CORNER_R}"/>
    </clipPath>
  </defs>

  <!-- Box shadow -->
  <rect x="${BOX_X + 3}" y="${BOX_Y + 6}" width="${BOX_W}" height="${BOX_H}"
        rx="${CORNER_R}" ry="${CORNER_R}" fill="rgba(30,30,70,0.16)"/>

  <!-- Left column background (clipped to rounded box) -->
  <rect x="${BOX_X}" y="${BOX_Y}" width="${BOX_MID_X - BOX_X}" height="${BOX_H}"
        fill="${LEFT_COLOR}" opacity="0.95" clip-path="url(#boxClip)"/>

  <!-- Right column background (clipped to rounded box) -->
  <rect x="${BOX_MID_X}" y="${BOX_Y}" width="${BOX_X + BOX_W - BOX_MID_X}" height="${BOX_H}"
        fill="${RIGHT_COLOR}" opacity="0.90" clip-path="url(#boxClip)"/>

  <!-- Header bar (full box width, clipped) -->
  <rect x="${BOX_X}" y="${HEADER_Y}" width="${BOX_W}" height="${HEADER_H}"
        fill="${HEADER_COLOR}" opacity="0.97" clip-path="url(#boxClip)"/>

  ${dividerSvg}
  ${iconsSvg}`;

  // ── LayoutSpec ─────────────────────────────────────────────────────────────
  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.03) },

    svgDecorations,

    product: {
      anchor: "custom",
      x: RIGHT_X + PAD_R,
      y: HEADER_Y + HEADER_H + Math.round(CH * 0.020),
      width: RIGHT_W - PAD_R * 2,
      height: PRODNAME_Y - (HEADER_Y + HEADER_H + Math.round(CH * 0.020)) - Math.round(CH * 0.012),
      scale: 1,
      rotation: 0,
    },

    overlays: [
      // Full canvas background — soft periwinkle lavender
      { type: "solid", x: 0, y: 0, w: CW, h: CH, color: "#DDD8EF", opacity: 1.0 },
    ],

    textBlocks: [
      // ── BRAND: above box, full width centered ─────────────────────────────
      ...(c.title
        ? [{
            id: "disclaimer" as const,
            content: c.title,
            x: 0,
            y: BRAND_Y,
            w: CW,
            h: BRAND_H,
            align: "center" as const,
            fontFamily: "Montserrat",
            fontWeight: "700" as const,
            fontSize: BRAND_FONT,
            color: "#2D2A5E",
            lineHeight: 1.2,
            letterSpacing: 0.030,
            maxLines: 1,
            textTransform: "none" as const,
          }]
        : []),

      // ── HEADER LEFT: "Lo que querés" ──────────────────────────────────────
      {
        id: "headline" as const,
        content: colTitle,
        x: BOX_X + PAD_L,
        y: HEADER_Y + Math.round((HEADER_H - HEADER_FONT) / 2),
        w: BOX_MID_X - BOX_X - PAD_L * 2,
        h: Math.ceil(HEADER_FONT * 1.4),
        align: "left" as const,
        fontFamily: "Montserrat",
        fontWeight: "700" as const,
        fontSize: HEADER_FONT,
        color: "#FFFFFF",
        lineHeight: 1.2,
        letterSpacing: 0.01,
        maxLines: 1,
        textTransform: "none" as const,
      },

      // ── HEADER RIGHT: "Lo que necesitás" ─────────────────────────────────
      {
        id: "subheadline" as const,
        content: colTitleR,
        x: RIGHT_X + PAD_R,
        y: HEADER_Y + Math.round((HEADER_H - HEADER_FONT) / 2),
        w: RIGHT_W - PAD_R * 2,
        h: Math.ceil(HEADER_FONT * 1.4),
        align: "left" as const,
        fontFamily: "Montserrat",
        fontWeight: "700" as const,
        fontSize: HEADER_FONT,
        color: "#FFFFFF",
        lineHeight: 1.2,
        letterSpacing: 0.01,
        maxLines: 1,
        textTransform: "none" as const,
      },

      // ── BENEFITS: 4 items, safe zone ≤ 42% canvas ────────────────────────
      ...bullets.map((bullet, idx) => ({
        id: `bullet_${idx}` as "headline",
        content: bullet,
        x: BULLET_X,
        y: bulletPositions[idx].textY,
        w: BULLET_W,
        h: Math.round(ITEM_H * 0.68),
        align: "left" as const,
        fontFamily: "Montserrat",
        fontWeight: "700" as const,
        fontSize: BULLET_FONT,
        color: "#1E2340",
        lineHeight: 1.35,
        letterSpacing: -0.01,
        maxLines: 2,
        textTransform: "none" as const,
      })),

      // ── PRODUCT NAME: bottom-right, inside box ────────────────────────────
      ...(c.headline
        ? [{
            id: "cta" as const,
            content: c.headline,
            x: PRODNAME_X,
            y: PRODNAME_Y,
            w: PRODNAME_W,
            h: PRODNAME_H,
            align: "center" as const,
            fontFamily: "Montserrat",
            fontWeight: "700" as const,
            fontSize: PRODNAME_FONT,
            color: "#FFFFFF",
            lineHeight: 1.3,
            letterSpacing: 0.01,
            maxLines: 1,
            textTransform: "none" as const,
          }]
        : []),

      // ── BADGE/URL: below box, full width centered ─────────────────────────
      ...(c.badge
        ? [{
            id: "badge" as const,
            content: c.badge,
            x: BADGE_X,
            y: BADGE_Y,
            w: BADGE_W,
            h: BADGE_H,
            align: "center" as const,
            fontFamily: "Montserrat",
            fontWeight: "500" as const,
            fontSize: BADGE_FONT,
            color: "#5A5078",
            lineHeight: 1,
            letterSpacing: 0.03,
            maxLines: 1,
            textTransform: "none" as const,
          }]
        : []),
    ],

    confidence: 1,
    rationale:
      "producto-beneficios-vertical — BODY TALES split con box redondeado: brand encima, LEFT lavender+checkmarks (≤42%), RIGHT blue-gray+product, URL debajo del box.",
    warnings: [
      "Text content restricted to x<42% of canvas to prevent product bleeding.",
      "Box backgrounds rendered via SVG clipPath for true rounded corners.",
      "Checkmark icons via SVG polylines (no font dependency).",
      "Brand above box (title field), URL below box (badge field).",
    ],
  } as unknown as LayoutSpec;
}
