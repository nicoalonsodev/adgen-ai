/**
 * Template: T_LIFESTYLE_HERO_V1
 *
 * Layout:
 * - Product centrado o siguiendo artDirection
 * - Texto en safe area (determinado por typography plan)
 * - Overlay degradé opcional detrás del texto
 * - CTA estilo pill
 *
 * Canvas: 1080×1350 (4:5)
 * Safe margins: 80px H, 90px V
 *
 * Diseñado para fondos lifestyle con escenas realistas.
 */

import { createCanvas } from "@napi-rs/canvas";
import {
  CANVAS_W,
  CANVAS_H,
  SAFE_MARGIN,
  drawBackground,
  drawProduct,
  drawProductWithArtDirection,
  drawLogo,
  drawCta,
  drawGradientOverlay,
  drawForegroundShape,
  drawAdaptiveHeadline,
  drawAdaptiveSubheadline,
} from "../components";
import { drawBackplate } from "../typography/backplate";
import { getStylePack } from "../../selectors/styleSelector";
import type { CreativeSpec } from "../../spec/creativeSpec";
import { ensureFontsRegistered } from "@/lib/render/typography";
import type { TypographyPlan } from "../../pipeline/schemas";

/* ═══════════════════════════════════════════════════════════════
   LAYOUT CONSTANTS
═══════════════════════════════════════════════════════════════ */

const LAYOUT = {
  // Default product position (can be overridden by artDirection)
  product: {
    x: 290,
    y: 350,
    w: 500,
    h: 700,
  },
  // Text positions by typography plan position
  text: {
    left: { x: SAFE_MARGIN.horizontal, y: 200, w: 400, maxH: 350 },
    right: { x: CANVAS_W - SAFE_MARGIN.horizontal - 400, y: 200, w: 400, maxH: 350 },
    top_left: { x: SAFE_MARGIN.horizontal, y: SAFE_MARGIN.top + 60, w: 500, maxH: 280 },
    top_right: { x: CANVAS_W - SAFE_MARGIN.horizontal - 500, y: SAFE_MARGIN.top + 60, w: 500, maxH: 280 },
    top_center: { x: SAFE_MARGIN.horizontal, y: SAFE_MARGIN.top + 60, w: CANVAS_W - SAFE_MARGIN.horizontal * 2, maxH: 250 },
    bottom_left: { x: SAFE_MARGIN.horizontal, y: CANVAS_H - 400, w: 500, maxH: 280 },
    bottom_right: { x: CANVAS_W - SAFE_MARGIN.horizontal - 500, y: CANVAS_H - 400, w: 500, maxH: 280 },
    bottom_center: { x: SAFE_MARGIN.horizontal, y: CANVAS_H - 400, w: CANVAS_W - SAFE_MARGIN.horizontal * 2, maxH: 250 },
  },
  logo: {
    x: SAFE_MARGIN.horizontal,
    y: SAFE_MARGIN.top,
    maxW: 120,
    maxH: 50,
  },
  cta: {
    bottomOffset: SAFE_MARGIN.bottom + 30,
  },
};

const FONT_FAMILY = "Inter";

/* ═══════════════════════════════════════════════════════════════
   HELPER: GET TEXT LAYOUT
═══════════════════════════════════════════════════════════════ */

function getTextLayout(position?: TypographyPlan["position"]) {
  if (!position) return LAYOUT.text.left;

  // Map position to layout key
  const positionMap: Record<string, keyof typeof LAYOUT.text> = {
    middle_left: "left",
    middle_right: "right",
    top_left: "top_left",
    top_right: "top_right",
    top_center: "top_center",
    bottom_left: "bottom_left",
    bottom_right: "bottom_right",
    bottom_center: "bottom_center",
  };

  const layoutKey = positionMap[position] || "left";
  return LAYOUT.text[layoutKey];
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: GET TEXT ALIGNMENT
═══════════════════════════════════════════════════════════════ */

function getTextAlign(position?: TypographyPlan["position"]): CanvasTextAlign {
  if (!position) return "left";
  if (position.includes("right")) return "right";
  if (position.includes("center")) return "center";
  return "left";
}

/* ═══════════════════════════════════════════════════════════════
   RENDER FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function renderTemplateLifestyleHeroV1(
  spec: CreativeSpec
): Promise<Buffer> {
  await ensureFontsRegistered();

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  const style = getStylePack(spec.style.packId);
  const typoPlan = spec.typographyPlan;

  /* ── 1. Background ── */
  await drawBackground(ctx, { src: spec.bg.imageSrc });

  /* ── 2. Optional overlay gradient for text legibility ── */
  if (typoPlan?.overlayGradient?.enabled) {
    const direction = typoPlan.overlayGradient.direction || "left";
    const opacity = typoPlan.overlayGradient.opacity || 0.4;

    const gradientConfig: Record<string, { x: number; y: number; w: number; h: number }> = {
      left: { x: 0, y: 0, w: 500, h: CANVAS_H },
      right: { x: CANVAS_W - 500, y: 0, w: 500, h: CANVAS_H },
      top: { x: 0, y: 0, w: CANVAS_W, h: 450 },
      bottom: { x: 0, y: CANVAS_H - 450, w: CANVAS_W, h: 450 },
    };

    const config = gradientConfig[direction] || gradientConfig.left;

    drawGradientOverlay(ctx, {
      direction: direction as "left" | "right" | "top" | "bottom",
      x: config.x,
      y: config.y,
      w: config.w,
      h: config.h,
      opacity,
    });
  }

  /* ── 3. Product ── */
  if (spec.artDirection) {
    await drawProductWithArtDirection(ctx, {
      src: spec.product.imageSrc,
      artDirection: spec.artDirection,
    });
  } else {
    await drawProduct(ctx, {
      src: spec.product.imageSrc,
      x: LAYOUT.product.x,
      y: LAYOUT.product.y,
      maxW: LAYOUT.product.w,
      maxH: LAYOUT.product.h,
      shadow: true,
      shadowOffsetY: 25,
    });
  }

  /* ── 4. Foreground blur (Scene Depth V2) ── */
  if (spec.scenePlan?.foregroundElement === "BLUR_MATE") {
    const position = typoPlan?.position?.includes("left") ? "right" : "left";
    drawForegroundShape(ctx, {
      position: position as "left" | "right",
      opacity: 0.1,
    });
  }

  /* ── 5. Logo (top-left) ── */
  if (spec.product.logoSrc) {
    await drawLogo(ctx, {
      src: spec.product.logoSrc,
      x: LAYOUT.logo.x,
      y: LAYOUT.logo.y,
      maxW: LAYOUT.logo.maxW,
      maxH: LAYOUT.logo.maxH,
    });
  }

  /* ── 6. Text (adaptive – Typography Engine V2) ── */
  const textLayout = getTextLayout(typoPlan?.position);
  const textAlign = getTextAlign(typoPlan?.position);

  // Determine backplate direction based on position
  const backplateDirection = typoPlan?.position?.includes("left")
    ? "left"
    : typoPlan?.position?.includes("right")
    ? "right"
    : undefined;

  // Headline
  const headlineResult = drawAdaptiveHeadline(ctx, {
    text: spec.claims.headline,
    x: textLayout.x,
    y: textLayout.y,
    maxW: textLayout.w,
    maxH: 180,
    fontFamily: FONT_FAMILY,
    fontSizeMax: 52,
    fontSizeMin: 36,
    align: textAlign,
    forceMode: typoPlan?.textColor === "dark" ? "DARK_TEXT" : typoPlan?.textColor === "light" ? "LIGHT_TEXT" : undefined,
    forceBackplate: typoPlan?.useBackplate,
    backplateDirection,
  });

  // Subheadline
  if (spec.claims.subheadline) {
    const subY = textLayout.y + headlineResult.bounds.h + 20;

    drawAdaptiveSubheadline(ctx, {
      text: spec.claims.subheadline,
      x: textLayout.x,
      y: subY,
      maxW: textLayout.w,
      maxH: 100,
      fontFamily: FONT_FAMILY,
      fontSizeMax: 28,
      fontSizeMin: 20,
      align: textAlign,
      inheritMode: headlineResult.context.mode,
      inheritBackplate: headlineResult.context.hasBackplate,
    });
  }

  /* ── 7. CTA Button (pill style, centered at bottom) ── */
  const ctaY = CANVAS_H - LAYOUT.cta.bottomOffset - 60;
  
  // Measure CTA text
  ctx.font = `bold 22px "${FONT_FAMILY}"`;
  const ctaTextW = ctx.measureText(spec.cta.label).width;
  const ctaPaddingX = 48;
  const ctaPaddingY = 18;
  const ctaW = ctaTextW + ctaPaddingX * 2;
  const ctaH = 22 + ctaPaddingY * 2;
  const ctaX = (CANVAS_W - ctaW) / 2;
  const ctaRadius = ctaH / 2; // Full pill shape

  // Draw pill CTA
  ctx.beginPath();
  ctx.moveTo(ctaX + ctaRadius, ctaY);
  ctx.lineTo(ctaX + ctaW - ctaRadius, ctaY);
  ctx.arc(ctaX + ctaW - ctaRadius, ctaY + ctaRadius, ctaRadius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(ctaX + ctaRadius, ctaY + ctaH);
  ctx.arc(ctaX + ctaRadius, ctaY + ctaRadius, ctaRadius, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();

  ctx.fillStyle = style.ctaBackground;
  ctx.fill();

  // CTA text
  ctx.fillStyle = style.ctaTextColor;
  ctx.font = `bold 22px "${FONT_FAMILY}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.cta.label, ctaX + ctaW / 2, ctaY + ctaH / 2);

  /* ── Export ── */
  return canvas.toBuffer("image/png");
}
