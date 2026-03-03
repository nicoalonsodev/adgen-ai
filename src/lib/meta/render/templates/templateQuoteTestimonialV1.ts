/**
 * Template: T_QUOTE_TESTIMONIAL_V1
 *
 * Layout:
 * - Large quote at top (with quotation marks)
 * - Author name below quote
 * - Product at bottom-right or center
 * - Optional small offer sticker
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
  drawQuote,
  drawSticker,
  drawGradientOverlay,
  drawForegroundShape,
} from "../components";
import { getStylePack } from "../../selectors/styleSelector";
import type { CreativeSpec } from "../../spec/creativeSpec";
import { ensureFontsRegistered } from "@/lib/render/typography";

/* ═══════════════════════════════════════════════════════════════
   LAYOUT CONSTANTS
═══════════════════════════════════════════════════════════════ */

const LAYOUT = {
  quote: {
    x: SAFE_MARGIN.horizontal,
    y: SAFE_MARGIN.top + 80,
    w: CANVAS_W - SAFE_MARGIN.horizontal * 2,
    maxH: 300,
  },
  product: {
    x: 300,
    y: 550,
    w: 500,
    h: 600,
  },
  sticker: {
    x: CANVAS_W - SAFE_MARGIN.horizontal - 180,
    y: 500,
  },
  logo: {
    x: SAFE_MARGIN.horizontal,
    y: SAFE_MARGIN.top,
    maxW: 120,
    maxH: 50,
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

export async function renderTemplateQuoteTestimonialV1(
  spec: CreativeSpec
): Promise<Buffer> {
  await ensureFontsRegistered();

  // Validate proof type
  if (spec.proof?.type !== "QUOTE") {
    throw new Error("T_QUOTE_TESTIMONIAL_V1 requires proof.type = QUOTE");
  }

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  const style = getStylePack(spec.style.packId);

  /* ── 1. Background ── */
  await drawBackground(ctx, { src: spec.bg.imageSrc });

  /* ── 2. Top gradient for quote legibility ── */
  drawGradientOverlay(ctx, {
    direction: "top",
    x: 0,
    y: 0,
    w: CANVAS_W,
    h: 500,
    opacity: 0.55,
  });

  /* ── 3. Bottom gradient for CTA legibility ── */
  drawGradientOverlay(ctx, {
    direction: "bottom",
    x: 0,
    y: CANVAS_H - 300,
    w: CANVAS_W,
    h: 300,
    opacity: 0.4,
  });

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

  /* ── 5. Quote with author ── */
  const quoteResult = drawQuote(ctx, {
    quote: spec.proof.quote,
    author: spec.proof.author,
    x: LAYOUT.quote.x,
    y: LAYOUT.quote.y,
    maxW: LAYOUT.quote.w,
    maxH: LAYOUT.quote.maxH,
    quoteColor: style.primaryTextColor,
    authorColor: style.secondaryTextColor,
    fontFamily: FONT_FAMILY,
    quoteFontSizeMax: 44,
    quoteFontSizeMin: 32,
  });

  /* ── 6. Product (center-bottom) ── */
  if (spec.artDirection) {
    await drawProductWithArtDirection(ctx, {
      src: spec.product.imageSrc,
      artDirection: spec.artDirection,
      // Keep product centered-bottom for quote template
      overrideY: 0.55,
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

  /* ── 6.5 Foreground blur (Scene Depth V2) ── */
  if (spec.scenePlan?.foregroundElement === "BLUR_MATE") {
    drawForegroundShape(ctx, {
      position: "right",
      opacity: 0.1,
    });
  }

  /* ── 7. Optional sticker (if offer active or sticker text provided) ── */
  if (spec.sticker?.text) {
    drawSticker(ctx, {
      text: spec.sticker.text,
      x: LAYOUT.sticker.x,
      y: LAYOUT.sticker.y,
      bgColor: style.stickerBackground,
      textColor: style.stickerTextColor,
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      rotation: 8,
    });
  } else if (spec.offer?.active && spec.offer?.label) {
    drawSticker(ctx, {
      text: spec.offer.label,
      x: LAYOUT.sticker.x,
      y: LAYOUT.sticker.y,
      bgColor: style.badgeBackground,
      textColor: style.badgeTextColor,
      fontFamily: FONT_FAMILY,
      fontSize: 14,
      rotation: 8,
    });
  }

  /* ── 8. CTA Button (centered at bottom) ── */
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
