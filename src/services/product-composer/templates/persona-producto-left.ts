/**
 * Template: Persona Producto Left
 *
 * Inspirado en el estilo Huel — lifestyle ad con persona sosteniendo el producto:
 *   OVERLAY:     gradiente lineal de izquierda (oscuro) a derecha (transparente)
 *                cubre ~60% del ancho, texto blanco siempre legible
 *   BADGE:       nombre de marca top-left (pequeño, Montserrat Bold)
 *   HEADLINE:    claim principal grande (Montserrat Bold, izquierda)
 *   SUBHEADLINE: bajada de beneficio (Montserrat Regular, izquierda)
 *   CTA:         botón pill bottom-left (fondo oscuro, texto blanco)
 *   ESCENA:      persona con producto generada por IA — lado derecho del canvas
 *
 * TemplateCopy fields:
 *   badge       — nombre de marca o tagline corto (top-left, max 30 chars)
 *   headline    — claim principal (max 8 palabras, tipografía grande)
 *   subheadline — línea de beneficio de apoyo (max 100 chars, 2-3 líneas)
 *   cta         — texto del botón (max 25 chars, ej: "Shop Now", "Quiero el mío")
 *   productPrompt — descripción de la persona con el producto para Gemini
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

export function buildPersonaProductoLeftLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;
  const MARGIN = Math.round(CW * 0.04); // ~43px

  // ── Gradient overlay: dark left → transparent right ──────────────────────
  // Covers 60% of canvas width so text zone always has dark backing
  const OVERLAY_W = Math.round(CW * 0.60);

  // ── BADGE: brand name / tagline — top-left, small ────────────────────────
  const BADGE_FONT = Math.round(CW * 0.024); // ~26px
  const BADGE_W    = Math.round(CW * 0.42);
  const BADGE_X    = MARGIN;
  const BADGE_Y    = MARGIN;
  const BADGE_H    = Math.ceil(BADGE_FONT * 1.2) + 8;

  // ── HEADLINE: large bold claim ────────────────────────────────────────────
  // Font scales down for longer headlines to avoid overflow
  const headlineWords = (copy.headline ?? "").trim().split(/\s+/).filter(Boolean).length;
  const HL_FONT = Math.round(
    CW * (headlineWords <= 4 ? 0.065 : headlineWords <= 6 ? 0.055 : 0.048),
  );
  const HL_W    = Math.round(CW * 0.48);
  const HL_X    = MARGIN;
  const HL_Y    = Math.round(CH * 0.24);
  const HL_H    = Math.ceil(HL_FONT * 1.15 * 5) + 12;

  // ── SUBHEADLINE: supporting copy ─────────────────────────────────────────
  const SUB_FONT = Math.round(CW * 0.034); // ~37px
  const SUB_W    = Math.round(CW * 0.46);
  const SUB_X    = MARGIN;
  // Word-wrap simulation: estimate actual rendered headline lines.
  // Simple char estimation fails for short words (each word fills its own line at large font).
  const hlWords      = (copy.headline ?? "").trim().split(/\s+/).filter(Boolean);
  const avgCharWidth = HL_FONT * 0.6; // Montserrat Bold average char width coefficient
  let simLines = 1;
  let simLineWidth = 0;
  for (const word of hlWords) {
    const wordWidth  = word.length * avgCharWidth;
    const spaceWidth = simLineWidth > 0 ? avgCharWidth : 0;
    if (simLineWidth > 0 && simLineWidth + spaceWidth + wordWidth > HL_W) {
      simLines++;
      simLineWidth = wordWidth;
    } else {
      simLineWidth += spaceWidth + wordWidth;
    }
  }
  const estimatedLines = Math.min(5, Math.max(1, simLines));
  const HL_H_rendered  = Math.ceil(HL_FONT * 1.15 * estimatedLines) + 12;
  const SUB_GAP        = Math.round(CH * 0.04); // ~43px breathing room
 const SUB_Y = HL_Y + HL_H_rendered + SUB_GAP;
  const SUB_H = Math.ceil(SUB_FONT * 1.4 * 3) + 8;

  // ── CTA: pill button — bottom-left ───────────────────────────────────────
  const CTA_FONT    = Math.round(CW * 0.030); // ~32px
  const CTA_PADDING = 20;
  const CTA_W       = Math.round(CW * 0.38); // wider to fit ~15-char CTAs
  const CTA_X       = MARGIN;
  const CTA_Y       = Math.round(CH * 0.85);
  const CTA_H       = Math.ceil(CTA_FONT * 1.2) + CTA_PADDING * 2;

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: MARGIN },

    // No independent product placement — person+product handled by PRODUCT_IA
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
      {
        // Left-to-right gradient: full opacity at left edge → transparent at right edge
        type: "linearGradient",
        x: 0,
        y: 0,
        w: OVERLAY_W,
        h: CH,
        direction: "right",
        color: "rgba(0,0,0,0.82)",
        opacity: 0.68,
      },
    ],

    textBlocks: [
      // ── BADGE: brand name, top-left ──────────────────────────────────────
      ...(copy.badge
        ? [
            // {
            //   id: "badge" as const,
            //   content: copy.badge,
            //   x: BADGE_X,
            //   y: BADGE_Y,
            //   w: BADGE_W,
            //   h: BADGE_H,
            //   align: "left" as const,
            //   fontFamily: "Montserrat",
            //   fontWeight: "700" as const,
            //   fontSize: BADGE_FONT,
            //   color: "#FFFFFF",
            //   lineHeight: 1.2,
            //   letterSpacing: 0.02,
            //   maxLines: 1,
            //   textTransform: "none" as const,
            // },
          ]
        : []),

      // ── HEADLINE: large bold claim ────────────────────────────────────────
      ...(copy.headline
        ? [
            {
              id: "headline" as const,
              content: copy.headline,
              x: HL_X,
              y: HL_Y,
              w: HL_W,
              h: HL_H,
              align: "left" as const,
              fontFamily: "Montserrat",
              fontWeight: "700" as const,
              boldWeight: "900",
              fontSize: HL_FONT,
              color: "#FFFFFF",
              lineHeight: 1.12,
              letterSpacing: -0.01,
              maxLines: 5,
              textTransform: "none" as const,
            },
          ]
        : []),

      // ── SUBHEADLINE: supporting copy ─────────────────────────────────────
      ...(copy.subheadline
        ? [
            {
              id: "subheadline" as const,
              content: copy.subheadline,
              x: SUB_X,
              y: SUB_Y,
              w: SUB_W,
              h: SUB_H,
              align: "left" as const,
              fontFamily: "Montserrat",
              fontWeight: "500" as const,
              boldWeight: "700",
              fontSize: SUB_FONT,
              color: "#E8E8E8",
              lineHeight: 1.4,
              letterSpacing: 0,
              maxLines: 3,
              textTransform: "none" as const,
            },
          ]
        : []),

      // ── CTA: pill button bottom-left ──────────────────────────────────────
      ...(copy.title
        ? [
            {
              id: "cta" as const,
              content: copy.title,
              x: CTA_X,
              y: CTA_Y,
              w: CTA_W,
              h: CTA_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "700" as const,
              fontSize: CTA_FONT,
              color: "#FFFFFF",
              lineHeight: 1,
              letterSpacing: 0.01,
              maxLines: 1,
              textTransform: "none" as const,
              background: {
                type: "pill" as const,
                color: "#1A2E1A",
                radius: 32,
                padding: CTA_PADDING,
                opacity: 1,
              },
            },
          ]
        : []),
    ],

    confidence: 1,
    rationale:
      "persona-producto-left — Huel-style lifestyle ad: gradient overlay left, brand badge top, large headline, subheadline, CTA pill bottom-left, person with product RIGHT side via PRODUCT_IA.",
    warnings: [
      "Person with product generated by PRODUCT_IA. Person stays in RIGHT 52% of canvas.",
      "Gradient overlay covers LEFT 60% for white text readability.",
    ],
  } as unknown as LayoutSpec;
}
