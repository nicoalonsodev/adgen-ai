/**
 * Template V1 Split – Editorial Clean Layout
 *
 * Layout: Product LEFT, Text RIGHT
 * Style: Minimal, editorial, no heavy black panel
 *
 * Canvas: 1080×1350 (4:5 Meta format)
 *
 * Zones:
 * - Logo: top-left
 * - Product: left side (x: 0-540, centered vertically)
 * - Text: right side with subtle gradient overlay
 * - CTA button at bottom right
 */

import { createCanvas, loadImage, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import { ensureFontsRegistered } from "../typography";
import { drawContactShadow } from "../productIntegration";

/* ── Constants ── */

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const SAFE_MARGIN = 60;

/* ── Layout zones (Split: product left, text right) ── */

const LAYOUT = {
  logo: {
    x: SAFE_MARGIN,
    y: SAFE_MARGIN,
    maxW: 120,
    maxH: 50,
  },
  product: {
    // Left half of canvas
    x: 40,
    y: 200,
    w: 500,
    h: 900, // Tall product zone
    centerY: 675, // Visual center
  },
  textPanel: {
    // Right side - no heavy panel, just gradient
    x: 540,
    y: 0,
    w: 540,
    h: CANVAS_H,
    gradientWidth: 200, // Fade from transparent to subtle
  },
  text: {
    // Text positioned in right zone
    x: 580,
    y: 400,
    w: 440, // Right margin = 60
    headline: {
      fontSizeMax: 56,
      fontSizeMin: 42,
      lineHeight: 1.1,
      maxLines: 2,
      color: "#FFFFFF",
      fontFamily: "Inter Bold",
    },
    subheadline: {
      fontSizeMax: 32,
      fontSizeMin: 24,
      lineHeight: 1.2,
      maxLines: 2,
      color: "rgba(255, 255, 255, 0.85)",
      fontFamily: "Inter SemiBold",
    },
    cta: {
      fontSizeMax: 26,
      fontSizeMin: 22,
      height: 60,
      paddingH: 28,
      radius: 30,
      bgColor: "#FFFFFF",
      textColor: "#000000",
      fontFamily: "Inter Bold",
    },
  },
  spacing: {
    headlineToSub: 20,
    subToCta: 32,
  },
} as const;

/* ── Types ── */

export interface TemplateSplitInput {
  background: { src: string };
  product: { src: string };
  logo?: { src: string };
  headline: string;
  subheadline?: string;
  cta: string;
}

/* ── Helpers ── */

function fitContain(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number
): { w: number; h: number } {
  const scale = Math.min(boxW / srcW, boxH / srcH);
  return {
    w: Math.round(srcW * scale),
    h: Math.round(srcH * scale),
  };
}

function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

function truncateWithEllipsis(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1).trimEnd();
  }
  return truncated + "…";
}

interface TextBlockOptions {
  fontFamily: string;
  fontSizeMax: number;
  fontSizeMin: number;
  lineHeight: number;
  maxLines: number;
  color: string;
}

interface TextBlockResult {
  lines: string[];
  fontSize: number;
  totalHeight: number;
}

function drawTextBlock(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  options: TextBlockOptions
): TextBlockResult {
  const { fontFamily, fontSizeMax, fontSizeMin, lineHeight, maxLines, color } = options;

  let fontSize = fontSizeMax;
  let lines: string[] = [];
  let actualLineHeight = 0;

  while (fontSize >= fontSizeMin) {
    ctx.font = `${fontSize}px "${fontFamily}"`;
    actualLineHeight = Math.ceil(fontSize * lineHeight);
    lines = wrapText(ctx, text, maxW);

    const totalHeight = lines.length * actualLineHeight;

    if (lines.length <= maxLines && totalHeight <= maxH) {
      break;
    }

    fontSize -= 2;
  }

  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[lines.length - 1] = truncateWithEllipsis(ctx, lines[lines.length - 1], maxW);
  }

  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  let currentY = y;
  for (const line of lines) {
    ctx.fillText(line, x, currentY);
    currentY += actualLineHeight;
  }

  return {
    lines,
    fontSize,
    totalHeight: lines.length * actualLineHeight,
  };
}

async function loadImageSafe(src: string): Promise<Image> {
  if (src.startsWith("data:")) {
    const base64Data = src.split(",")[1];
    if (!base64Data) throw new Error("Invalid data URL");
    const buffer = Buffer.from(base64Data, "base64");
    return loadImage(buffer);
  }

  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  return loadImage(Buffer.from(arrayBuf));
}

/* ── Main Render Function ── */

/**
 * Render Template V1 Split (Product Left, Text Right)
 */
export async function renderTemplateSplit(input: TemplateSplitInput): Promise<Buffer> {
  ensureFontsRegistered();

  // Load images
  const bgImage = await loadImageSafe(input.background.src);
  const productImage = await loadImageSafe(input.product.src);
  const logoImage = input.logo?.src ? await loadImageSafe(input.logo.src) : null;

  // Create canvas
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");

  /* ── 1) Draw background (cover) ── */
  {
    const scaleX = CANVAS_W / bgImage.width;
    const scaleY = CANVAS_H / bgImage.height;
    const scale = Math.max(scaleX, scaleY);
    const sw = CANVAS_W / scale;
    const sh = CANVAS_H / scale;
    const sx = (bgImage.width - sw) / 2;
    const sy = (bgImage.height - sh) / 2;
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
  }

  /* ── 2) Draw subtle gradient overlay on right side ── */
  {
    const gradient = ctx.createLinearGradient(
      LAYOUT.textPanel.x - LAYOUT.textPanel.gradientWidth,
      0,
      LAYOUT.textPanel.x + 100,
      0
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.55)");

    ctx.fillStyle = gradient;
    ctx.fillRect(
      LAYOUT.textPanel.x - LAYOUT.textPanel.gradientWidth,
      0,
      LAYOUT.textPanel.w + LAYOUT.textPanel.gradientWidth,
      CANVAS_H
    );
  }

  /* ── 3) Draw logo (top-left) ── */
  if (logoImage) {
    const fit = fitContain(
      logoImage.width,
      logoImage.height,
      LAYOUT.logo.maxW,
      LAYOUT.logo.maxH
    );
    ctx.drawImage(logoImage, LAYOUT.logo.x, LAYOUT.logo.y, fit.w, fit.h);
  }

  /* ── 4) Draw product (left side, centered, with shadows) ── */
  {
    const fit = fitContain(
      productImage.width,
      productImage.height,
      LAYOUT.product.w,
      LAYOUT.product.h
    );

    const productX = LAYOUT.product.x + (LAYOUT.product.w - fit.w) / 2;
    const productY = LAYOUT.product.centerY - fit.h / 2;

    // Contact shadow
    drawContactShadow(ctx, productX, productY, fit.w, fit.h, {
      widthMultiplier: 1.1,
      heightMultiplier: 0.15,
      centerOpacity: 0.35,
      offsetY: 10,
    });

    // Drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.30)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = 15;
    ctx.shadowOffsetY = 25;

    ctx.drawImage(productImage, productX, productY, fit.w, fit.h);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  /* ── 5) Draw text (right side) ── */
  {
    let currentY = LAYOUT.text.y;
    const textW = LAYOUT.text.w;
    const textX = LAYOUT.text.x;

    // Headline
    const headlineResult = drawTextBlock(
      ctx,
      input.headline,
      textX,
      currentY,
      textW,
      200,
      {
        fontFamily: LAYOUT.text.headline.fontFamily,
        fontSizeMax: LAYOUT.text.headline.fontSizeMax,
        fontSizeMin: LAYOUT.text.headline.fontSizeMin,
        lineHeight: LAYOUT.text.headline.lineHeight,
        maxLines: LAYOUT.text.headline.maxLines,
        color: LAYOUT.text.headline.color,
      }
    );

    currentY += headlineResult.totalHeight + LAYOUT.spacing.headlineToSub;

    // Subheadline
    if (input.subheadline) {
      const subResult = drawTextBlock(
        ctx,
        input.subheadline,
        textX,
        currentY,
        textW,
        100,
        {
          fontFamily: LAYOUT.text.subheadline.fontFamily,
          fontSizeMax: LAYOUT.text.subheadline.fontSizeMax,
          fontSizeMin: LAYOUT.text.subheadline.fontSizeMin,
          lineHeight: LAYOUT.text.subheadline.lineHeight,
          maxLines: LAYOUT.text.subheadline.maxLines,
          color: LAYOUT.text.subheadline.color,
        }
      );

      currentY += subResult.totalHeight;
    }

    currentY += LAYOUT.spacing.subToCta;

    // CTA Button
    {
      const ctaCfg = LAYOUT.text.cta;
      let ctaFontSize = ctaCfg.fontSizeMax;
      ctx.font = `${ctaFontSize}px "${ctaCfg.fontFamily}"`;

      let ctaText = input.cta;
      let ctaTextWidth = ctx.measureText(ctaText).width;
      const maxCtaTextWidth = textW - ctaCfg.paddingH * 2;

      while (ctaTextWidth > maxCtaTextWidth && ctaFontSize > ctaCfg.fontSizeMin) {
        ctaFontSize -= 1;
        ctx.font = `${ctaFontSize}px "${ctaCfg.fontFamily}"`;
        ctaTextWidth = ctx.measureText(ctaText).width;
      }

      if (ctaTextWidth > maxCtaTextWidth) {
        ctaText = truncateWithEllipsis(ctx, ctaText, maxCtaTextWidth);
        ctaTextWidth = ctx.measureText(ctaText).width;
      }

      const ctaButtonW = ctaTextWidth + ctaCfg.paddingH * 2;
      const ctaButtonH = ctaCfg.height;
      const ctaButtonX = textX;
      const ctaButtonY = currentY;

      // Draw button background
      ctx.save();
      ctx.fillStyle = ctaCfg.bgColor;
      drawRoundedRect(ctx, ctaButtonX, ctaButtonY, ctaButtonW, ctaButtonH, ctaCfg.radius);
      ctx.fill();
      ctx.restore();

      // Draw button text
      ctx.fillStyle = ctaCfg.textColor;
      ctx.font = `${ctaFontSize}px "${ctaCfg.fontFamily}"`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        ctaText,
        ctaButtonX + ctaCfg.paddingH,
        ctaButtonY + ctaButtonH / 2
      );
    }
  }

  /* ── 6) Export PNG ── */
  return canvas.toBuffer("image/png");
}

export { LAYOUT as TEMPLATE_SPLIT_LAYOUT };
