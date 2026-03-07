/**
 * Template: Razones Producto
 *
 * Inspirado en "BODY TALES — Reasons to start using":
 *   TOP-LEFT:          nombre de marca (title)
 *   TOP-CENTER:        headline intro + nombre del producto (bold + underline SVG)
 *   CENTRO:            producto GRANDE centrado (PRODUCT_IA)
 *   ALREDEDOR:         4 beneficios, 2 a la izquierda y 2 a la derecha del producto
 *   CONECTORES SVG:    dot en borde del producto + línea horizontal → label
 *                      (determinísticos, no dibujados por Gemini)
 *   BOTTOM-LEFT:       badge URL
 *
 * copyZone = "center" → PRODUCT_IA coloca el producto centrado.
 *
 * TemplateCopy fields:
 *   title        — nombre de marca (top-left)
 *   headline     — intro claim, ej: "Razones para empezar a usar" (line 1, cursiva)
 *   subheadline  — nombre del producto (line 2, bold grande, con underline SVG)
 *   bullets      — array de 4 beneficios clave (max 22 chars cada uno)
 *   badge        — URL o CTA (bottom-left)
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanBullet(raw: string): string {
  return raw.replace(/^[\s●•▸▹▪▫◆◇→►▶✓✔✗✘\-–—·*]+/, "").trim();
}

function cleanTitle(raw: string): string {
  // Elimina separadores tipo "·" del título de marca (ej: "BRAND · Tag · Sub" → "BRAND")
  return raw.split(/\s*·\s*/)[0].trim();
}

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildRazonesProductoLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Brand (top-left) ──────────────────────────────────────────────────────
  const BRAND_FONT = Math.round(CW * 0.022);       // ~24px
  const BRAND_Y    = Math.round(CH * 0.038);        // ~41px
  const BRAND_H    = Math.ceil(BRAND_FONT * 1.5);
  const BRAND_X    = Math.round(CW * 0.040);
  const BRAND_W    = Math.round(CW * 0.400);

  // ── Headline intro (line 1: "Razones para usar...") ───────────────────────
  const H1_FONT = Math.round(CW * 0.028);           // ~30px
  const H1_Y    = Math.round(CH * 0.090);           // ~97px
  const H1_H    = Math.ceil(H1_FONT * 1.3) + 6;
  const H1_W    = Math.round(CW * 0.680);
  const H1_X    = Math.round((CW - H1_W) / 2);

  // ── Subheadline (line 2: product name, bold) ──────────────────────────────
  const H2_FONT = Math.round(CW * 0.042);           // ~45px
  const H2_Y    = H1_Y + H1_H + 4;
  const H2_H    = Math.ceil(H2_FONT * 1.25) + 4;
  const H2_W    = Math.round(CW * 0.680);
  const H2_X    = Math.round((CW - H2_W) / 2);

  // ── SVG underline position (under subheadline) ────────────────────────────
  const UNDERLINE_Y = H2_Y + H2_H + 2;
  const UNDERLINE_W = Math.round(CW * 0.360);
  const UNDERLINE_X = Math.round((CW - UNDERLINE_W) / 2);

  // ── Product zone (centered) ───────────────────────────────────────────────
  const PROD_X = Math.round(CW * 0.295);            // ~319px
  const PROD_Y = Math.round(CH * 0.265);            // ~286px
  const PROD_W = Math.round(CW * 0.410);            // ~443px
  const PROD_H = Math.round(CH * 0.520);            // ~562px
  const PROD_LEFT  = PROD_X;
  const PROD_RIGHT = PROD_X + PROD_W;

  // ── Connector dot Y positions (inside product zone, left & right) ─────────
  const DOT_Y_TOP = Math.round(CH * 0.390);         // ~421px (~top 1/3 of product)
  const DOT_Y_BOT = Math.round(CH * 0.660);         // ~713px (~bottom 1/3 of product)
  const DOT_R     = Math.round(CW * 0.0048);        // ~5px radius
  const DOT_COLOR = "#5C4A3A";
  const LINE_W    = 1.5;

  // Lines end/start just before the benefit label
  const LINE_L_END = Math.round(CW * 0.248);        // right edge of left line (gap before label)
  const LINE_R_END = Math.round(CW * 0.752);        // left edge of right line (gap after label)

  // ── Benefit positions ─────────────────────────────────────────────────────
  const BENEFIT_FONT = Math.round(CW * 0.025);      // ~27px
  const BENEFIT_W    = Math.round(CW * 0.200);      // ~216px
  const BENEFIT_H    = Math.ceil(BENEFIT_FONT * 1.4 * 2) + 10;  // ~2 lines

  const BENEFIT_L_X  = Math.round(CW * 0.035);      // ~38px (left labels)
  const BENEFIT_R_X  = Math.round(CW * 0.760);      // ~821px (right labels)

  const positions = [
    // Top-Left: right-aligned toward the product
    { x: BENEFIT_L_X, y: DOT_Y_TOP - Math.round(BENEFIT_H / 2), align: "right" as const },
    // Top-Right: left-aligned away from product
    { x: BENEFIT_R_X, y: DOT_Y_TOP - Math.round(BENEFIT_H / 2), align: "left" as const },
    // Bottom-Left
    { x: BENEFIT_L_X, y: DOT_Y_BOT - Math.round(BENEFIT_H / 2), align: "right" as const },
    // Bottom-Right
    { x: BENEFIT_R_X, y: DOT_Y_BOT - Math.round(BENEFIT_H / 2), align: "left" as const },
  ];

  // ── Badge (bottom-left) ───────────────────────────────────────────────────
  const BADGE_FONT = Math.round(CW * 0.018);
  const BADGE_W    = Math.round(CW * 0.42);
  const BADGE_X    = Math.round(CW * 0.040);
  const BADGE_Y    = Math.round(CH * 0.940);
  const BADGE_H    = Math.ceil(BADGE_FONT + 6 * 2) + 4;

  // ── Data ──────────────────────────────────────────────────────────────────
  const bullets = (copy.bullets ?? []).slice(0, 4).map(cleanBullet);

  // ── SVG decorations: underline + 4 connector dots + 4 lines ──────────────
  const svgDecorations = `
  <!-- Subheadline underline -->
  <rect x="${UNDERLINE_X}" y="${UNDERLINE_Y}" width="${UNDERLINE_W}" height="3"
        fill="${DOT_COLOR}" opacity="0.80"/>

  <!-- LEFT TOP: dot + horizontal line -->
  <circle cx="${PROD_LEFT}" cy="${DOT_Y_TOP}" r="${DOT_R}" fill="${DOT_COLOR}"/>
  <line x1="${LINE_L_END}" y1="${DOT_Y_TOP}" x2="${PROD_LEFT}" y2="${DOT_Y_TOP}"
        stroke="${DOT_COLOR}" stroke-width="${LINE_W}" opacity="0.55"/>

  <!-- LEFT BOTTOM: dot + horizontal line -->
  <circle cx="${PROD_LEFT}" cy="${DOT_Y_BOT}" r="${DOT_R}" fill="${DOT_COLOR}"/>
  <line x1="${LINE_L_END}" y1="${DOT_Y_BOT}" x2="${PROD_LEFT}" y2="${DOT_Y_BOT}"
        stroke="${DOT_COLOR}" stroke-width="${LINE_W}" opacity="0.55"/>

  <!-- RIGHT TOP: dot + horizontal line -->
  <circle cx="${PROD_RIGHT}" cy="${DOT_Y_TOP}" r="${DOT_R}" fill="${DOT_COLOR}"/>
  <line x1="${PROD_RIGHT}" y1="${DOT_Y_TOP}" x2="${LINE_R_END}" y2="${DOT_Y_TOP}"
        stroke="${DOT_COLOR}" stroke-width="${LINE_W}" opacity="0.55"/>

  <!-- RIGHT BOTTOM: dot + horizontal line -->
  <circle cx="${PROD_RIGHT}" cy="${DOT_Y_BOT}" r="${DOT_R}" fill="${DOT_COLOR}"/>
  <line x1="${PROD_RIGHT}" y1="${DOT_Y_BOT}" x2="${LINE_R_END}" y2="${DOT_Y_BOT}"
        stroke="${DOT_COLOR}" stroke-width="${LINE_W}" opacity="0.55"/>`;

  // ── LayoutSpec ────────────────────────────────────────────────────────────
  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.03) },

    svgDecorations,

    product: {
      anchor: "custom",
      x: PROD_X,
      y: PROD_Y,
      width: PROD_W,
      height: PROD_H,
      scale: 1,
      rotation: 0,
    },

    // Subtle warm tint to unify background
    overlays: [
      { type: "solid", x: 0, y: 0, w: CW, h: CH, color: "#F5C9A0", opacity: 0.05 },
    ],

    textBlocks: [
      // ── BRAND: top-left ───────────────────────────────────────────────────
      // ...(copy.title
      //   // ? [{
      //   //     id: "disclaimer" as const,
      //   //     content: cleanTitle(copy.title),
      //   //     x: BRAND_X,
      //   //     y: BRAND_Y,
      //   //     w: BRAND_W,
      //   //     h: BRAND_H,
      //   //     align: "left" as const,
      //   //     fontFamily: "Montserrat",
      //   //     fontWeight: "600" as const,
      //   //     fontSize: BRAND_FONT,
      //   //     color: "#3C2415",
      //   //     lineHeight: 1.2,
      //   //     letterSpacing: 0.02,
      //   //     maxLines: 1,
      //   //     textTransform: "none" as const,
      //   //   }]
      //   : []),

      // ── HEADLINE INTRO: centered, line 1 ─────────────────────────────────
      ...(copy.headline
        ? [{
            id: "headline" as const,
            content: copy.headline,
            x: H1_X,
            y: H1_Y,
            w: H1_W,
            h: H1_H,
            align: "center" as const,
            fontFamily: "Lora",
            fontWeight: "400" as const,
            fontSize: H1_FONT,
            color: "#3C2415",
            lineHeight: 1.3,
            letterSpacing: 0,
            maxLines: 1,
            textTransform: "none" as const,
          }]
        : []),

      // ── PRODUCT NAME: centered, line 2, bold, bigger ─────────────────────
      ...(copy.subheadline
        ? [{
            id: "subheadline" as const,
            content: copy.subheadline,
            x: H2_X,
            y: H2_Y,
            w: H2_W,
            h: H2_H,
            align: "center" as const,
            fontFamily: "Montserrat",
            fontWeight: "700" as const,
            fontSize: H2_FONT,
            color: "#3C2415",
            lineHeight: 1.2,
            letterSpacing: -0.01,
            maxLines: 1,
            textTransform: "none" as const,
          }]
        : []),

      // ── 4 BENEFITS: positioned horizontally adjacent to connector lines ───
      ...bullets.map((bullet, idx) => {
        const pos = positions[idx];
        return {
          id: `bullet_${idx}` as "headline",
          content: bullet,
          x: pos.x,
          y: pos.y,
          w: BENEFIT_W,
          h: BENEFIT_H,
          align: pos.align,
          fontFamily: "Montserrat",
          fontWeight: "600",
          fontSize: BENEFIT_FONT,
          color: "#3C2415",
          lineHeight: 1.4,
          letterSpacing: 0,
          maxLines: 2,
          textTransform: "none" as const,
        };
      }),

      // ── BADGE: bottom-left (URL, CTA) ─────────────────────────────────────
      ...(copy.badge
        ? [{
            id: "badge" as const,
            content: copy.badge,
            x: BADGE_X,
            y: BADGE_Y,
            w: BADGE_W,
            h: BADGE_H,
            align: "left" as const,
            fontFamily: "Montserrat",
            fontWeight: "500" as const,
            fontSize: BADGE_FONT,
            color: "#3C2415",
            lineHeight: 1,
            letterSpacing: 0.01,
            maxLines: 1,
            textTransform: "none" as const,
          }]
        : []),
    ],

    confidence: 1,
    rationale:
      "razones-producto — Product CENTERED, 4 benefits with deterministic SVG horizontal connector lines + dots. Brand top-left, headline+productname+underline at top-center, URL bottom-left. BODY TALES style.",
    warnings: [
      "Connector lines/dots rendered as SVG decorations — NOT drawn by Gemini.",
      "Dots at product edge (PROD_LEFT/PROD_RIGHT at DOT_Y_TOP/DOT_Y_BOT).",
      "Benefit labels right-aligned (left side) and left-aligned (right side).",
      "SVG underline under subheadline at fixed Y position.",
    ],
  } as unknown as LayoutSpec;
}
