/**
 * Template: T_SPLIT_EDITORIAL_V1
 *
 * Layout: Product LEFT (40%), Text RIGHT (60%)
 * Style: Clean editorial with subtle gradient overlay
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
  product: {
    x: 40,
    y: 180,
    w: 500,
    h: 900,
  },
  text: {
    x: 560,
    y: 380,
    w: 440,
    maxH: 600,
  },
  logo: {
    x: SAFE_MARGIN.horizontal,
    y: SAFE_MARGIN.top,
    maxW: 120,
    maxH: 50,
  },
  cta: {
    x: 560,
    bottomOffset: SAFE_MARGIN.bottom + 40,
  },
  gradientOverlay: {
    x: 500,
    w: 580,
  },
};

const FONT_FAMILY = "Inter";

/* ═══════════════════════════════════════════════════════════════
   RENDER FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function renderTemplateSplitEditorialV1(
  spec: CreativeSpec
): Promise<Buffer> {
  await ensureFontsRegistered();

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  const style = getStylePack(spec.style.packId);

  /* ── 1. Background ── */
  await drawBackground(ctx, { src: spec.bg.imageSrc });

  /* ── 2. Gradient overlay on right side ── */
  drawGradientOverlay(ctx, {
    direction: "right",
    x: LAYOUT.gradientOverlay.x,
    y: 0,
    w: LAYOUT.gradientOverlay.w,
    h: CANVAS_H,
    opacity: 0.55,
  });

  /* ── 3. Product (left side with shadow) ── */
  if (spec.artDirection) {
    // Use art direction for product placement and shadow
    await drawProductWithArtDirection(ctx, {
      src: spec.product.imageSrc,
      artDirection: spec.artDirection,
      // For split template, constrain product to left side
      overrideX: 0.28,
    });
  } else {
    // Fallback to fixed layout
    await drawProduct(ctx, {
      src: spec.product.imageSrc,
      x: LAYOUT.product.x,
      y: LAYOUT.product.y,
      maxW: LAYOUT.product.w,
      maxH: LAYOUT.product.h,
      shadow: true,
    });
  }

  /* ── 3.5 Foreground blur (Scene Depth V2) ── */
  if (spec.scenePlan?.foregroundElement === "BLUR_MATE") {
    drawForegroundShape(ctx, {
      position: "left",
      opacity: 0.12,
    });
  }

  /* ── 4. Logo (top-left) ── */
  if (spec.product.logoSrc) {
    await drawLogo(ctx, {
      src: spec.product.logoSrc,
      x: LAYOUT.logo.x,
      y: LAYOUT.logo.y,
      maxW: LAYOUT.logo.maxW,
      maxH: LAYOUT.logo.maxH,
    });
  }

  /* ── 5. Headline (Typography Engine V2 - Adaptive) ── */
  let textY = LAYOUT.text.y;

  const headlineResult = drawAdaptiveHeadline(ctx, {
    text: spec.claims.headline,
    x: LAYOUT.text.x,
    y: textY,
    maxW: LAYOUT.text.w,
    maxH: 150,
    fontFamily: FONT_FAMILY,
    fontSizeMax: 54,
    fontSizeMin: 38,
    align: "left",
    backplateDirection: "right",
  });

  textY += headlineResult.bounds.h + 20;

  /* ── 6. Subheadline (inherits mode from headline) ── */
  if (spec.claims.subheadline) {
    const subResult = drawAdaptiveSubheadline(ctx, {
      text: spec.claims.subheadline,
      x: LAYOUT.text.x,
      y: textY,
      maxW: LAYOUT.text.w,
      maxH: 100,
      fontFamily: FONT_FAMILY,
      fontSizeMax: 30,
      fontSizeMin: 22,
      align: "left",
      inheritMode: headlineResult.context.mode,
      inheritBackplate: headlineResult.context.hasBackplate,
    });

    textY += subResult.bounds.h + 32;
  }

  /* ── 7. CTA Button ── */
  const ctaY = CANVAS_H - LAYOUT.cta.bottomOffset - 56;
  drawCta(ctx, {
    text: spec.cta.label,
    x: LAYOUT.cta.x,
    y: ctaY,
    bgColor: style.ctaBackground,
    textColor: style.ctaTextColor,
    fontFamily: FONT_FAMILY,
    fontSize: 24,
  });

  /* ── Export ── */
  return canvas.toBuffer("image/png");
}
