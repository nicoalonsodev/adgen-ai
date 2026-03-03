/**
 * Template: T_BADGE_OFFER_V1
 *
 * Layout:
 * - Large offer badge (top-left)
 * - Product center-right
 * - Headline below badge
 * - Urgency sticker (top-right or bottom-right)
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
  drawBadge,
  drawSticker,
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
  badge: {
    x: SAFE_MARGIN.horizontal,
    y: SAFE_MARGIN.top + 20,
    size: 160,
  },
  product: {
    x: 400,
    y: 200,
    w: 600,
    h: 800,
  },
  headline: {
    x: SAFE_MARGIN.horizontal,
    y: 280,
    w: 360,
    maxH: 160,
  },
  subheadline: {
    x: SAFE_MARGIN.horizontal,
    w: 360,
    maxH: 100,
  },
  sticker: {
    x: CANVAS_W - SAFE_MARGIN.horizontal - 200,
    y: SAFE_MARGIN.top + 30,
  },
  logo: {
    x: SAFE_MARGIN.horizontal,
    y: CANVAS_H - SAFE_MARGIN.bottom - 50,
    maxW: 100,
    maxH: 40,
  },
  cta: {
    xCenter: CANVAS_W / 2,
    bottomOffset: SAFE_MARGIN.bottom + 20,
  },
};

const FONT_FAMILY = "Inter";

/* ═══════════════════════════════════════════════════════════════
   RENDER FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function renderTemplateBadgeOfferV1(
  spec: CreativeSpec
): Promise<Buffer> {
  await ensureFontsRegistered();

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  const style = getStylePack(spec.style.packId);

  /* ── 1. Background ── */
  await drawBackground(ctx, { src: spec.bg.imageSrc });

  /* ── 2. Subtle overlay for text legibility ── */
  drawGradientOverlay(ctx, {
    direction: "left",
    x: 0,
    y: 0,
    w: 500,
    h: CANVAS_H,
    opacity: 0.4,
  });

  /* ── 3. Product (center-right) ── */
  if (spec.artDirection) {
    await drawProductWithArtDirection(ctx, {
      src: spec.product.imageSrc,
      artDirection: spec.artDirection,
      // Keep product on right side for badge template
      overrideX: 0.62,
    });
  } else {
    await drawProduct(ctx, {
      src: spec.product.imageSrc,
      x: LAYOUT.product.x,
      y: LAYOUT.product.y,
      maxW: LAYOUT.product.w,
      maxH: LAYOUT.product.h,
      shadow: true,
      shadowOffsetY: 30,
    });
  }

  /* ── 3.5 Foreground blur (Scene Depth V2) ── */
  if (spec.scenePlan?.foregroundElement === "BLUR_MATE") {
    drawForegroundShape(ctx, {
      position: "right",
      opacity: 0.12,
    });
  }

  /* ── 4. Badge (large offer) ── */
  if (spec.offer?.label) {
    drawBadge(ctx, {
      text: spec.offer.label,
      x: LAYOUT.badge.x,
      y: LAYOUT.badge.y,
      bgColor: style.badgeBackground,
      textColor: style.badgeTextColor,
      fontFamily: FONT_FAMILY,
      fontSize: 32,
      shape: "circle",
      size: LAYOUT.badge.size,
    });
  }

  /* ── 5. Sticker (urgency) ── */
  if (spec.sticker?.text) {
    drawSticker(ctx, {
      text: spec.sticker.text,
      x: LAYOUT.sticker.x,
      y: LAYOUT.sticker.y,
      bgColor: style.stickerBackground,
      textColor: style.stickerTextColor,
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      rotation: -8,
    });
  }

  /* ── 6. Headline (adaptive – Typography Engine V2) ── */
  let textY = LAYOUT.headline.y;

  const headlineResult = drawAdaptiveHeadline(ctx, {
    text: spec.claims.headline,
    x: LAYOUT.headline.x,
    y: textY,
    maxW: LAYOUT.headline.w,
    maxH: LAYOUT.headline.maxH,
    fontFamily: FONT_FAMILY,
    fontSizeMax: 48,
    fontSizeMin: 36,
    align: "left",
    backplateDirection: "left", // gradient from left side
  });

  textY += headlineResult.bounds.h + 16;

  /* ── 7. Subheadline (adaptive – inherits mode from headline) ── */
  if (spec.claims.subheadline) {
    drawAdaptiveSubheadline(ctx, {
      text: spec.claims.subheadline,
      x: LAYOUT.subheadline.x,
      y: textY,
      maxW: LAYOUT.subheadline.w,
      maxH: LAYOUT.subheadline.maxH,
      fontFamily: FONT_FAMILY,
      fontSizeMax: 26,
      fontSizeMin: 20,
      align: "left",
      inheritMode: headlineResult.context.mode,
      inheritBackplate: headlineResult.context.hasBackplate,
    });
  }

  /* ── 8. Logo (bottom-left) ── */
  if (spec.product.logoSrc) {
    await drawLogo(ctx, {
      src: spec.product.logoSrc,
      x: LAYOUT.logo.x,
      y: LAYOUT.logo.y,
      maxW: LAYOUT.logo.maxW,
      maxH: LAYOUT.logo.maxH,
    });
  }

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
