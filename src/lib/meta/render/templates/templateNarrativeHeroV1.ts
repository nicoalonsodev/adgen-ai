/**
 * Template: T_NARRATIVE_HERO_V1
 *
 * Layout:
 * - Tag pequeño arriba (ej "Rutina AM") usando narrativeAngle
 * - Producto centrado o siguiendo artDirection
 * - Texto en safe area (determinado por typography plan)
 * - Overlay degradé opcional detrás del texto
 * - CTA estilo pill
 *
 * Canvas: 1080×1350 (4:5)
 * Safe margins: 80px H, 90px V
 *
 * Diseñado para fondos story-driven con emotional triggers.
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
import type { TypographyPlan, NarrativeAngle } from "../../pipeline/schemas";

/* ═══════════════════════════════════════════════════════════════
   LAYOUT CONSTANTS
═══════════════════════════════════════════════════════════════ */

const LAYOUT = {
  // Tag position (above text)
  tag: {
    y: SAFE_MARGIN.top + 60,
    paddingX: 16,
    paddingY: 8,
  },
  // Default product position
  product: {
    x: 290,
    y: 400,
    w: 500,
    h: 650,
  },
  // Text positions
  text: {
    left: { x: SAFE_MARGIN.horizontal, y: 220, w: 400, maxH: 320 },
    right: { x: CANVAS_W - SAFE_MARGIN.horizontal - 400, y: 220, w: 400, maxH: 320 },
    top_left: { x: SAFE_MARGIN.horizontal, y: SAFE_MARGIN.top + 140, w: 500, maxH: 260 },
    top_right: { x: CANVAS_W - SAFE_MARGIN.horizontal - 500, y: SAFE_MARGIN.top + 140, w: 500, maxH: 260 },
    top_center: { x: SAFE_MARGIN.horizontal, y: SAFE_MARGIN.top + 140, w: CANVAS_W - SAFE_MARGIN.horizontal * 2, maxH: 230 },
    bottom_left: { x: SAFE_MARGIN.horizontal, y: CANVAS_H - 380, w: 500, maxH: 260 },
    bottom_right: { x: CANVAS_W - SAFE_MARGIN.horizontal - 500, y: CANVAS_H - 380, w: 500, maxH: 260 },
    bottom_center: { x: SAFE_MARGIN.horizontal, y: CANVAS_H - 380, w: CANVAS_W - SAFE_MARGIN.horizontal * 2, maxH: 230 },
  },
  logo: {
    x: CANVAS_W - SAFE_MARGIN.horizontal - 120,
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
   HELPER: DRAW TAG
═══════════════════════════════════════════════════════════════ */

function drawTag(
  ctx: CanvasRenderingContext2D | any,
  options: {
    text: string;
    x: number;
    y: number;
    textColor: string;
    bgColor: string;
    fontFamily: string;
    align: CanvasTextAlign;
  }
) {
  const { text, x, y, textColor, bgColor, fontFamily, align } = options;
  const { paddingX, paddingY } = LAYOUT.tag;

  // Measure text
  ctx.font = `600 14px "${fontFamily}"`;
  const textWidth = ctx.measureText(text.toUpperCase()).width;
  const tagW = textWidth + paddingX * 2;
  const tagH = 14 + paddingY * 2;
  const radius = tagH / 2;

  // Calculate X based on alignment
  let tagX = x;
  if (align === "center") {
    tagX = x - tagW / 2;
  } else if (align === "right") {
    tagX = x - tagW;
  }

  // Draw pill background
  ctx.beginPath();
  ctx.moveTo(tagX + radius, y);
  ctx.lineTo(tagX + tagW - radius, y);
  ctx.arc(tagX + tagW - radius, y + radius, radius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(tagX + radius, y + tagH);
  ctx.arc(tagX + radius, y + radius, radius, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();

  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = `600 14px "${fontFamily}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), tagX + tagW / 2, y + tagH / 2);

  return { width: tagW, height: tagH };
}

/* ═══════════════════════════════════════════════════════════════
   RENDER FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function renderTemplateNarrativeHeroV1(
  spec: CreativeSpec
): Promise<Buffer> {
  await ensureFontsRegistered();

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");
  const style = getStylePack(spec.style.packId);
  const typoPlan = spec.typographyPlan;
  const narrative = spec.narrativeAngle as NarrativeAngle | undefined;

  /* ── 1. Background ── */
  await drawBackground(ctx, { src: spec.bg.imageSrc });

  /* ── 2. Optional overlay gradient ── */
  if (typoPlan?.overlayGradient?.enabled) {
    const direction = typoPlan.overlayGradient.direction || "left";
    const opacity = typoPlan.overlayGradient.opacity || 0.45;

    const gradientConfig: Record<string, { x: number; y: number; w: number; h: number }> = {
      left: { x: 0, y: 0, w: 520, h: CANVAS_H },
      right: { x: CANVAS_W - 520, y: 0, w: 520, h: CANVAS_H },
      top: { x: 0, y: 0, w: CANVAS_W, h: 500 },
      bottom: { x: 0, y: CANVAS_H - 500, w: CANVAS_W, h: 500 },
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

  /* ── 4. Foreground blur ── */
  if (spec.scenePlan?.foregroundElement === "BLUR_MATE") {
    const position = typoPlan?.position?.includes("left") ? "right" : "left";
    drawForegroundShape(ctx, {
      position: position as "left" | "right",
      opacity: 0.1,
    });
  }

  /* ── 5. Logo (top-right for narrative) ── */
  if (spec.product.logoSrc) {
    await drawLogo(ctx, {
      src: spec.product.logoSrc,
      x: LAYOUT.logo.x,
      y: LAYOUT.logo.y,
      maxW: LAYOUT.logo.maxW,
      maxH: LAYOUT.logo.maxH,
    });
  }

  /* ── 6. Tag (narrative label) ── */
  const textLayout = getTextLayout(typoPlan?.position);
  const textAlign = getTextAlign(typoPlan?.position);
  let tagHeight = 0;

  if (narrative?.tag_label) {
    // Determine tag position based on text position
    let tagX = textLayout.x;
    if (textAlign === "center") {
      tagX = textLayout.x + textLayout.w / 2;
    } else if (textAlign === "right") {
      tagX = textLayout.x + textLayout.w;
    }

    // Tag colors - muted version of style accent
    const tagBg = typoPlan?.textColor === "dark"
      ? "rgba(16, 20, 24, 0.12)"
      : "rgba(246, 242, 234, 0.18)";
    const tagText = typoPlan?.textColor === "dark"
      ? "#3A3F47"
      : "#D8D4CC";

    const tagResult = drawTag(ctx, {
      text: narrative.tag_label,
      x: tagX,
      y: LAYOUT.tag.y,
      textColor: tagText,
      bgColor: tagBg,
      fontFamily: FONT_FAMILY,
      align: textAlign,
    });

    tagHeight = tagResult.height + 16;
  }

  /* ── 7. Text (adaptive – Typography Engine V2) ── */
  // Adjust text Y to account for tag
  const adjustedTextY = narrative?.tag_label
    ? LAYOUT.tag.y + tagHeight + 8
    : textLayout.y;

  const backplateDirection = typoPlan?.position?.includes("left")
    ? "left"
    : typoPlan?.position?.includes("right")
    ? "right"
    : undefined;

  // Headline
  const headlineResult = drawAdaptiveHeadline(ctx, {
    text: spec.claims.headline,
    x: textLayout.x,
    y: adjustedTextY,
    maxW: textLayout.w,
    maxH: 170,
    fontFamily: FONT_FAMILY,
    fontSizeMax: 50,
    fontSizeMin: 34,
    align: textAlign,
    forceMode: typoPlan?.textColor === "dark" ? "DARK_TEXT" : typoPlan?.textColor === "light" ? "LIGHT_TEXT" : undefined,
    forceBackplate: typoPlan?.useBackplate,
    backplateDirection,
  });

  // Subheadline
  if (spec.claims.subheadline) {
    const subY = adjustedTextY + headlineResult.bounds.h + 18;

    drawAdaptiveSubheadline(ctx, {
      text: spec.claims.subheadline,
      x: textLayout.x,
      y: subY,
      maxW: textLayout.w,
      maxH: 90,
      fontFamily: FONT_FAMILY,
      fontSizeMax: 26,
      fontSizeMin: 18,
      align: textAlign,
      inheritMode: headlineResult.context.mode,
      inheritBackplate: headlineResult.context.hasBackplate,
    });
  }

  /* ── 8. CTA Button (pill style) ── */
  const ctaY = CANVAS_H - LAYOUT.cta.bottomOffset - 60;
  
  ctx.font = `bold 22px "${FONT_FAMILY}"`;
  const ctaTextW = ctx.measureText(spec.cta.label).width;
  const ctaPaddingX = 48;
  const ctaPaddingY = 18;
  const ctaW = ctaTextW + ctaPaddingX * 2;
  const ctaH = 22 + ctaPaddingY * 2;
  const ctaX = (CANVAS_W - ctaW) / 2;
  const ctaRadius = ctaH / 2;

  // Draw pill
  ctx.beginPath();
  ctx.moveTo(ctaX + ctaRadius, ctaY);
  ctx.lineTo(ctaX + ctaW - ctaRadius, ctaY);
  ctx.arc(ctaX + ctaW - ctaRadius, ctaY + ctaRadius, ctaRadius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(ctaX + ctaRadius, ctaY + ctaH);
  ctx.arc(ctaX + ctaRadius, ctaY + ctaRadius, ctaRadius, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();

  ctx.fillStyle = style.ctaBackground;
  ctx.fill();

  ctx.fillStyle = style.ctaTextColor;
  ctx.font = `bold 22px "${FONT_FAMILY}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.cta.label, ctaX + ctaW / 2, ctaY + ctaH / 2);

  /* ── Export ── */
  return canvas.toBuffer("image/png");
}
