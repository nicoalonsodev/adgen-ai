/**
 * Template: Producto Hero Top
 *
 * Layout — copy arriba + copy abajo, producto hero al centro via PRODUCT_IA:
 *   TOP    (0%–22%):   headline (nombre de marca, Montserrat Black uppercase)
 *                      + subheadline (benefit tagline, ligero, uppercase)
 *   CENTER (22%–80%):  reservado para producto via PRODUCT_IA
 *   BOTTOM (84%–95%):  disclaimer (short copy line, small)
 *
 * Fields used: headline, subheadline, disclaimer
 * copyZone: "center" (product fills the center)
 *
 * Inspired by: Blume "Soothe & Hydrate" editorial style
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

export function buildProductoHeroTopLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── Headline: brand / product name (top zone) ─────────────────────────────
  const HL_W = Math.round(CW * 0.88);
  const HL_X = Math.round((CW - HL_W) / 2);
  const HL_Y = Math.round(CH * 0.16); // ~173px at 1080 — moved further down for breathing room

  // Auto-scale font so the headline never overflows HL_W regardless of text length.
  // Montserrat Black uppercase averages ~0.72× fontSize per character (incl. spaces).
  const headlineText = (copy.headline || copy.badge || "Brand Name").toUpperCase();
  const charWidthFactor = 0.72;
  const maxFontByWidth = Math.floor(HL_W / (headlineText.length * charWidthFactor));
const HL_FONT = Math.max(24, Math.min(Math.round(CW * 0.095), maxFontByWidth));

  const HL_H = Math.ceil(HL_FONT * 1.2) + 8;

  // ── Subheadline: benefit tagline (below headline) ─────────────────────────
  const SUB_FONT = Math.round(CW * 0.021); // ~23px
  const SUB_W = Math.round(CW * 0.74);
  const SUB_X = Math.round((CW - SUB_W) / 2);
  const SUB_Y = HL_Y + HL_H + 8;
  const SUB_H = Math.ceil(SUB_FONT * 1.4) + 8;

  // ── Disclaimer: short copy at the bottom ──────────────────────────────────
  const DIS_FONT = Math.round(CW * 0.013); // ~14px
  const DIS_W = Math.round(CW * 0.70);
  const DIS_X = Math.round((CW - DIS_W) / 2);
  const DIS_Y = Math.round(CH * 0.875);
  const DIS_H = Math.ceil(DIS_FONT * 1.5) + 8;

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.04) },

    // Center zone reserved for PRODUCT_IA
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
      // ── HEADLINE: brand/product name, top center ───────────────────────────
      {
        id: "headline",
        content: copy.headline || copy.badge || "Brand Name",
        x: HL_X,
        y: HL_Y,
        w: HL_W,
        h: HL_H,
        align: "center",
        fontFamily: "Futura",
        fontWeight: "700",
        fontSize: HL_FONT,
        color: "#3A3A3A",
        lineHeight: 1.1,
        letterSpacing: 0.04,
        maxLines: 1,
        textTransform: "uppercase",
        textStroke: { color: "#00000033", width: 0.5 },
      },

      // ── SUBHEADLINE: benefit tagline, below headline ───────────────────────
      {
        id: "subheadline",
        content: copy.subheadline ?? "",
        x: SUB_X,
        y: SUB_Y,
        w: SUB_W,
        h: SUB_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "600",
        fontSize: SUB_FONT,
        color: "#3A3A3A",
        lineHeight: 1.3,
        letterSpacing: 0.14,
        maxLines: 1,
        textTransform: "uppercase",
      },

      // ── DISCLAIMER: short copy at the bottom ──────────────────────────────
      ...(copy.disclaimer
        ? [
            {
              id: "disclaimer" as const,
              content: copy.disclaimer,
              x: DIS_X,
              y: DIS_Y,
              w: DIS_W,
              h: DIS_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "400" as const,
              fontSize: DIS_FONT,
              color: "#FFFFFF",
              lineHeight: 1.4,
              letterSpacing: 0.06,
              maxLines: 1,
              textTransform: "uppercase" as const,
            },
          ]
        : []),
    ],

    confidence: 1,
    rationale:
      "TEMPLATE_BETA: producto-hero-top — brand name top, product hero center via PRODUCT_IA, disclaimer bottom",
    warnings: [],
  } as unknown as LayoutSpec;
}
