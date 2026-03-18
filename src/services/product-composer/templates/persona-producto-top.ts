/**
 * Template: Persona Producto Top
 *
 * Panel superior limpio (top 40%) con headline + subheadline centrados.
 * Persona sosteniendo el producto ocupa el ancho completo del inferior (bottom 60%).
 * CTA pill centrado overlaid sobre la zona de la persona, al pie del canvas (~92%).
 * Estilo Huel/Nike lifestyle brand ad — sin gradiente lateral, texto oscuro sobre fondo claro.
 *
 * Composition: scene-with-product (avatarSceneWithProduct o sceneMode fallback)
 * compositionOrder: scene-first → PRODUCT_IA en bg limpio → TEMPLATE_BETA encima
 *
 * TemplateCopy fields:
 *   headline    — big claim (max 8 words, Montserrat Bold, centered)
 *   subheadline — benefit sentence (max 90 chars, centered)
 *   title       — CTA button text (max 15 chars, centered pill at bottom over person)
 *   sceneAction — person/scene description for Gemini
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

// ── Text-balance break: splits into exactly 2 lines at the most balanced point ─
function balanceBreak(text: string): string {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return text;

  let bestSplit = Math.ceil(words.length / 2);
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(
      words.slice(0, i).join(" ").length - words.slice(i).join(" ").length,
    );
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }
  return words.slice(0, bestSplit).join(" ") + "\n" + words.slice(bestSplit).join(" ");
}

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildPersonaProductoTopLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const { width: CW, height: CH } = canvas;

  // ── HEADLINE: large bold centered claim, forced 2 lines ───────────────────
  const headlineWords = (copy.headline ?? "").trim().split(/\s+/).filter(Boolean).length;
  const HL_FONT = Math.round(
    CW * (headlineWords <= 4 ? 0.082 : headlineWords <= 6 ? 0.068 : 0.058),
  );
  const balancedHeadline = balanceBreak(copy.headline ?? "");
  const HL_W = Math.round(CW * 0.88);
  const HL_X = Math.round((CW - HL_W) / 2);
  const HL_Y = Math.round(CH * 0.10);
  const HL_H = Math.ceil(HL_FONT * 1.1 * 2) + 12; // fixed 2 lines

  // ── SUBHEADLINE: centered, dynamically below headline ────────────────────
  const SUB_FONT = Math.round(CW * 0.030); // ~32px
  const SUB_W    = Math.round(CW * 0.78);
  const SUB_X    = Math.round((CW - SUB_W) / 2);
  const SUB_Y    = Math.round(HL_Y + HL_H + CW * 0.024);
  const SUB_H    = Math.ceil(SUB_FONT * 1.4 * 2) + 8;

  // ── CTA (title): centered pill overlaid on person zone at bottom ──────────
  // Mirrors editorial-center-top's CTA placement (~87.5-92% from top).
  const CTA_FONT    = Math.round(CW * 0.028); // ~30px
  const CTA_PADDING = 18;
  const CTA_W       = Math.round(CW * 0.46);
  const CTA_X       = Math.round((CW - CTA_W) / 2);
  const CTA_Y       = Math.round(CH * 0.875);
  const CTA_H = Math.ceil(CTA_FONT * 1.2) + CTA_PADDING * 2;

  const ctaPillColor =
    (copy as Record<string, unknown>).primaryColor as string | undefined ?? "#1A1A1A";

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.04) },

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

    // No overlay — top panel relies on the generated light background for readability.
    // The defaultProductPrompt + sceneAction instruct Gemini to keep the top 40% clear.
    overlays: [],

    textBlocks: [
      // ── HEADLINE: large bold centered ────────────────────────────────────
      ...(copy.headline
        ? [
            {
              id: "headline" as const,
              content: balancedHeadline,
              x: HL_X,
              y: HL_Y,
              w: HL_W,
              h: HL_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "700" as const,
              boldWeight: "900",
              fontSize: HL_FONT,
              color: "#1A1A1A",
              lineHeight: 1.1,
              letterSpacing: -0.02,
              maxLines: 2,
              textTransform: "none" as const,
            },
          ]
        : []),

      // ── SUBHEADLINE: centered, below headline ────────────────────────────
      ...(copy.subheadline
        ? [
            {
              id: "subheadline" as const,
              content: copy.subheadline,
              x: SUB_X,
              y: SUB_Y,
              w: SUB_W,
              h: SUB_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "500" as const,
              boldWeight: "700",
              fontSize: SUB_FONT,
              color: "#2A2A2A",
              lineHeight: 1.4,
              letterSpacing: 0,
              maxLines: 2,
              textTransform: "none" as const,
              textBalance: true,
            },
          ]
        : []),

      // ── CTA (title): pill button centered, overlaid on person zone at bottom ─
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
                color: ctaPillColor,
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
      "persona-producto-top — Huel-style lifestyle ad: clean top panel with centered headline + subheadline, CTA pill overlaid on person zone at bottom (~87.5%).",
    warnings: [
      "Person with product generated by PRODUCT_IA. Person must stay in BOTTOM 60% of canvas, full width.",
      "No gradient overlay — top panel relies on light background. sceneAction must instruct Gemini to keep top 40% clear.",
    ],
  } as unknown as LayoutSpec;
}
