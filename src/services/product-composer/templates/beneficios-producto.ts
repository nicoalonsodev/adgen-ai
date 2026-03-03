/**
 * Template: Beneficios Producto  v2
 *
 * Layout de alto impacto visual inspirado en la estética de "healf / SILA":
 *   IZQUIERDA (~50%): producto hero shot grande (compuesto por PRODUCT_IA)
 *   DERECHA  (~44%): headline GRANDE dominante + subheadline + 4 beneficios + badge CTA
 *
 * Jerarquía visual:
 *   1. Headline enorme (6.8% del canvas) que wrappea a 2 líneas — IMPACTO INMEDIATO
 *   2. Subheadline descriptor pequeño debajo del headline
 *   3. 4 beneficios con em-dash, Montserrat SemiBold
 *   4. Badge CTA pill con color de acento eléctrico (#C8F43A)
 *
 * copyZone = "right" → PRODUCT_IA coloca el producto en el LEFT ~50%.
 *
 * TemplateCopy fields:
 *   headline     — claim corto (max 25 chars, wrappea a 2 líneas en la pantalla)
 *   subheadline  — descriptor corto (max 45 chars, 1 línea)
 *   bullets      — array de 4 beneficios clave (max 20 chars each)
 *   badge        — CTA o sitio web (optional, bottom, pill accent)
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip leading bullet/dot/arrow characters that OpenAI might add */
function cleanBullet(raw: string): string {
  return raw
    .replace(/^[\s●•▸▹▪▫◆◇→►▶\-–—·*]+/, "")
    .trim();
}

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildBeneficiosProductoLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Text zone (right column) ──────────────────────────────────────────────
  const TEXT_X = Math.round(CW * 0.53);   // starts at 53% — product gets left 53%
  const TEXT_W = Math.round(CW * 0.43);   // 43% wide (leaves 4% right margin)

  // ── HEADLINE: compacto — se lee de un vistazo, no domina ─────────────────
  //   At 1080px: 4.2% ≈ 45px → cabe en 1-2 líneas con frases de hasta 30 chars
  const HEADLINE_FONT = Math.round(CW * 0.042);
  const HEADLINE_Y    = Math.round(CH * 0.07);
  const HEADLINE_H    = Math.round(CH * 0.14);  // 2 líneas máximo

  // ── SUBHEADLINE: descriptor compacto bajo el headline ─────────────────────
  const SUB_FONT = Math.round(CW * 0.021);       // ~23px
  const SUB_Y    = Math.round(CH * 0.23);
  const SUB_H    = Math.round(CH * 0.07);

  // ── Benefits: protagonistas — más grandes y más espaciados ────────────────
  const BEN_FONT  = Math.round(CW * 0.030);      // ~32px — ahora son el foco visual
  const BEN_H     = Math.ceil(BEN_FONT * 1.5) + 8;
  const BEN_START = Math.round(CH * 0.33);
  const BEN_GAP   = Math.round(CH * 0.155);      // ~167px @ 1080 — aire generoso

  // ── Badge / CTA: accent-colored pill at bottom ────────────────────────────
  const BADGE_FONT = Math.round(CW * 0.019);     // ~21px
  const BADGE_W    = Math.round(CW * 0.40);
  const BADGE_H    = Math.ceil(BADGE_FONT + 14 * 2) + 4;
  const BADGE_Y    = Math.round(CH * 0.91);

  // ── Data ──────────────────────────────────────────────────────────────────
  const bullets = (copy.bullets ?? []).slice(0, 4).map(cleanBullet);

  // ── LayoutSpec ────────────────────────────────────────────────────────────

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.03) },

    // Product zone: left side, LARGE — PRODUCT_IA places product here
    product: {
      anchor: "custom",
      x: Math.round(CW * 0.01),
      y: Math.round(CH * 0.05),
      width: Math.round(CW * 0.50),
      height: Math.round(CH * 0.88),
      scale: 1,
      rotation: 0,
    },

    // Dark gradient on text zone — ensures white text is readable on any BG
    overlays: [
      {
        type: "linearGradient",
        x: Math.round(CW * 0.42),
        y: 0,
        w: Math.round(CW * 0.58),
        h: CH,
        color: "rgba(0,0,0,0.90)",
        opacity: 0.58,
        direction: "right",
      },
    ],

    textBlocks: [
      // ── HEADLINE: GRANDE, dominante, top del column derecho ──────────────
      ...(copy.headline
        ? [
            {
              id: "headline" as const,
              content: copy.headline,
              x: TEXT_X,
              y: HEADLINE_Y,
              w: TEXT_W,
              h: HEADLINE_H,
              align: "left" as const,
              fontFamily: "Montserrat",
              fontWeight: "700" as const,
              fontSize: HEADLINE_FONT,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: -0.01,
              maxLines: 2,
              textTransform: "none" as const,
            },
          ]
        : []),

      // ── SUBHEADLINE: descriptor compacto bajo el headline ─────────────────
      ...(copy.subheadline
        ? [
            {
              id: "subheadline" as const,
              content: copy.subheadline,
              x: TEXT_X,
              y: SUB_Y,
              w: TEXT_W,
              h: SUB_H,
              align: "left" as const,
              fontFamily: "Montserrat",
              fontWeight: "400" as const,
              fontSize: SUB_FONT,
              color: "#C0C0C0",
              lineHeight: 1.45,
              letterSpacing: 0,
              maxLines: 2,
              textTransform: "none" as const,
            },
          ]
        : []),

      // ── BENEFIT ITEMS: columna limpia con em-dash ─────────────────────────
      ...bullets.map((bullet, idx) => {
        const rowY = BEN_START + idx * BEN_GAP;

        return {
          id: `bullet_${idx}` as "headline",
          content: `—  ${bullet}`,
          x: TEXT_X,
          y: rowY,
          w: TEXT_W,
          h: BEN_H,
          align: "left" as const,
          fontFamily: "Montserrat",
          fontWeight: "600" as const,
          fontSize: BEN_FONT,
          color: "#FFFFFF",
          lineHeight: 1.3,
          letterSpacing: 0,
          maxLines: 1,
          textTransform: "none" as const,
        };
      }),

      // ── BADGE: pill con acento eléctrico (#C8F43A lime) ───────────────────
      ...(copy.badge
        ? [
            {
              id: "badge" as const,
              content: copy.badge,
              x: TEXT_X,
              y: BADGE_Y,
              w: BADGE_W,
              h: BADGE_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "700" as const,
              fontSize: BADGE_FONT,
              color: "#0A0A0A",
              lineHeight: 1,
              letterSpacing: 0.02,
              maxLines: 1,
              textTransform: "none" as const,
              background: {
                type: "pill" as const,
                color: "#C8F43A",
                radius: 30,
                padding: 14,
                opacity: 1,
              },
            },
          ]
        : []),
    ],

    confidence: 1,
    rationale:
      "beneficios-producto v3 — Bullets son protagonistas (4.2% headline compacto + bullets grandes 3% bien espaciados). Producto hero LEFT + copy RIGHT. Gradient overlay. Badge lime.",
    warnings: [
      "Product placed on LEFT side via PRODUCT_IA (copyZone=right keeps right clear).",
      "Headline compact (~45px, 2 lines max) — bullets are the visual focus now.",
      "Benefits spaced 15.5% apart so each line breathes — reference Body Tales style.",
      "Badge pill uses #C8F43A (electric lime) with dark text.",
    ],
  } as unknown as LayoutSpec;
}
