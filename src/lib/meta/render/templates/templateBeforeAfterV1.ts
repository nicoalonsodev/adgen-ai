/**
 * Template: T_BEFORE_AFTER_V1
 *
 * Layout:
 * - Headline at top (centered)
 * - Product on right side
 * - Before/After grid at bottom (Day 1 / Day 30)
 * - Optional caption below grid
 * - CTA at bottom
 *
 * Canvas: 1080×1350 (4:5)
 * Safe margins: 80px H, 90px V
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
  drawBeforeAfterGrid,
  drawGradientOverlay,
  drawForegroundShape,
  drawAdaptiveHeadline,
  drawAdaptiveSubheadline,
} from "../components";
import { getStylePack } from "../../selectors/styleSelector";
import type { CreativeSpec } from "../../spec/creativeSpec";
import { ensureFontsRegistered } from "@/lib/render/typography";

/* ═══════════════════════════════════════════════════════════════
   LAYOUT CONSTANTS
═══════════════════════════════════════════════════════════════ */

const LAYOUT = {
  headline: {
    x: SAFE_MARGIN.horizontal,
    y: SAFE_MARGIN.top + 30,
    w: CANVAS_W - SAFE_MARGIN.horizontal * 2,
    maxH: 140,
  },
  subheadline: {
    x: SAFE_MARGIN.horizontal,
    w: CANVAS_W - SAFE_MARGIN.horizontal * 2,
    maxH: 80,
  },
  product: {
    x: 480,
    y: 280,
    w: 520,
    h: 600,
  },
  grid: {
    x: SAFE_MARGIN.horizontal,
    y: 950,
    w: CANVAS_W - SAFE_MARGIN.horizontal * 2,
    h: 200,
  },
  logo: {
    x: CANVAS_W - SAFE_MARGIN.horizontal - 120,
    y: SAFE_MARGIN.top,
    maxW: 120,
    maxH: 50,
  },
  cta: {
    xCenter: CANVAS_W / 2,
    bottomOffset: SAFE_MARGIN.bottom + 10,
  },
};

const FONT_FAMILY = "Inter";

/* ═══════════════════════════════════════════════════════════════
   RENDER FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function renderTemplateBeforeAfterV1(
  spec: CreativeSpec
): Promise<Buffer> {
  await ensureFontsRegistered();

  // Validate proof type
  if (spec.proof?.type !== "BEFORE_AFTER") {
    throw new Error("T_BEFORE_AFTER_V1 requires proof.type = BEFORE_AFTER");
  }

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  const style = getStylePack(spec.style.packId);

  /* ── 1. Background ── */
  await drawBackground(ctx, { src: spec.bg.imageSrc });

  /* ── 2. Top gradient for headline legibility ── */
  drawGradientOverlay(ctx, {
    direction: "top",
    x: 0,
    y: 0,
    w: CANVAS_W,
    h: 400,
    opacity: 0.45,
  });

  /* ── 3. Bottom gradient for grid legibility ── */
  drawGradientOverlay(ctx, {
    direction: "bottom",
    x: 0,
    y: CANVAS_H - 450,
    w: CANVAS_W,
    h: 450,
    opacity: 0.55,
  });

  /* ── 4. Logo (top-right) ── */
  if (spec.product.logoSrc) {
    await drawLogo(ctx, {
      src: spec.product.logoSrc,
      x: LAYOUT.logo.x,
      y: LAYOUT.logo.y,
      maxW: LAYOUT.logo.maxW,
      maxH: LAYOUT.logo.maxH,
    });
  }

  /* ── 5. Headline (adaptive – Typography Engine V2) ── */
  let textY = LAYOUT.headline.y;

  const headlineResult = drawAdaptiveHeadline(ctx, {
    text: spec.claims.headline,
    x: LAYOUT.headline.x,
    y: textY,
    maxW: LAYOUT.headline.w,
    maxH: LAYOUT.headline.maxH,
    fontFamily: FONT_FAMILY,
    fontSizeMax: 52,
    fontSizeMin: 38,
    align: "center",
  });

  textY += headlineResult.bounds.h + 16;

  /* ── 6. Subheadline (adaptive – inherits mode from headline) ── */
  if (spec.claims.subheadline) {
    drawAdaptiveSubheadline(ctx, {
      text: spec.claims.subheadline,
      x: LAYOUT.subheadline.x,
      y: textY,
      maxW: LAYOUT.subheadline.w,
      maxH: LAYOUT.subheadline.maxH,
      fontFamily: FONT_FAMILY,
      fontSizeMax: 28,
      fontSizeMin: 20,
      align: "center",
      inheritMode: headlineResult.context.mode,
      inheritBackplate: headlineResult.context.hasBackplate,
    });
  }

  /* ── 7. Product (right side) ── */
  if (spec.artDirection) {
    await drawProductWithArtDirection(ctx, {
      src: spec.product.imageSrc,
      artDirection: spec.artDirection,
      // Keep product on right side for before/after template
      overrideX: 0.58,
      overrideY: 0.38,
    });
  } else {
    await drawProduct(ctx, {
      src: spec.product.imageSrc,
      x: LAYOUT.product.x,
      y: LAYOUT.product.y,
      maxW: LAYOUT.product.w,
      maxH: LAYOUT.product.h,
      shadow: true,
    });
  }

  /* ── 7.5 Foreground blur (Scene Depth V2) ── */
  if (spec.scenePlan?.foregroundElement === "BLUR_MATE") {
    drawForegroundShape(ctx, {
      position: "left",
      opacity: 0.1,
    });
  }

  /* ── 8. Before/After grid ── */
  drawBeforeAfterGrid(ctx, {
    x: LAYOUT.grid.x,
    y: LAYOUT.grid.y,
    w: LAYOUT.grid.w,
    h: LAYOUT.grid.h,
    day1Label: spec.proof.day1Label,
    day30Label: spec.proof.day30Label,
    caption: spec.proof.caption,
    fontFamily: FONT_FAMILY,
    textColor: style.primaryTextColor,
  });

  /* ── 9. CTA Button (centered at bottom) ── */
  const ctaY = CANVAS_H - LAYOUT.cta.bottomOffset - 56;
  ctx.font = `bold 24px "${FONT_FAMILY}"`;
  const ctaTextW = ctx.measureText(spec.cta.label).width;
  const ctaW = ctaTextW + 64;
  const ctaX = LAYOUT.cta.xCenter - ctaW / 2;

  drawCta(ctx, {
    text: spec.cta.label,
    x: ctaX,
    y: ctaY,
    bgColor: style.ctaBackground,
    textColor: style.ctaTextColor,
    fontFamily: FONT_FAMILY,
    fontSize: 24,
  });

  /* ── Export ── */
  return canvas.toBuffer("image/png");
}
