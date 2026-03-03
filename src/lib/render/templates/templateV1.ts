/**
 * Meta Template V1 – Deterministic render template for Meta Ads (1080×1350)
 *
 * Fixed layout, no AI. All positioning is hardcoded.
 * Uses Inter font family exclusively.
 *
 * Layout:
 * - Background: full bleed
 * - Logo: top-left (max 140x60)
 * - Product: hero centered (y: 170-650)
 * - Text panel: bottom overlay with headline, subheadline, CTA
 */

import { createCanvas, loadImage, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import { ensureFontsRegistered } from "../typography";

/* ── Constants ── */

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const SAFE_MARGIN = 80;

/* ── Layout zones ── */

const LAYOUT = {
  logo: {
    x: SAFE_MARGIN,
    y: SAFE_MARGIN,
    maxW: 140,
    maxH: 60,
  },
  product: {
    x: 0,
    y: 170,
    w: CANVAS_W,
    h: 480, // y: 170 to 650
    maxY: 650,
  },
  panel: {
    x: SAFE_MARGIN,
    y: 760,
    w: CANVAS_W - SAFE_MARGIN * 2, // 920
    h: 510,
    radius: 32,
    padding: 48,
    bgColor: "rgba(0, 0, 0, 0.55)",
  },
  text: {
    headline: {
      fontSizeMax: 72,
      fontSizeMin: 52,
      lineHeight: 1.05,
      maxLines: 3,
      color: "#FFFFFF",
      fontFamily: "Inter Bold",
    },
    subheadline: {
      fontSizeMax: 38,
      fontSizeMin: 28,
      lineHeight: 1.15,
      maxLines: 2,
      color: "rgba(255, 255, 255, 0.85)",
      fontFamily: "Inter SemiBold",
    },
    cta: {
      fontSizeMax: 30,
      fontSizeMin: 26,
      height: 72,
      paddingH: 28,
      radius: 28,
      bgColor: "#FFFFFF",
      textColor: "#000000",
      fontFamily: "Inter Bold",
    },
  },
  spacing: {
    headlineToSub: 18,
    subToCta: 28,
  },
} as const;

/* ── Types ── */

export interface TemplateV1Input {
  background: { src: string };
  product: { src: string };
  logo?: { src: string };
  headline: string;
  subheadline?: string;
  cta: string;
}

/* ── Helpers ── */

/**
 * Fit image into box maintaining aspect ratio (contain mode).
 */
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

/**
 * Draw a rounded rectangle.
 */
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

/**
 * Word-wrap text to fit within maxWidth.
 */
function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
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

/**
 * Truncate line with ellipsis to fit within maxWidth.
 */
function truncateWithEllipsis(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string {
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
  align?: CanvasTextAlign;
}

interface TextBlockResult {
  lines: string[];
  fontSize: number;
  totalHeight: number;
}

/**
 * Draw text block with auto-fit: reduces font size until text fits,
 * truncates last line with "…" if still doesn't fit.
 */
function drawTextBlock(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  options: TextBlockOptions
): TextBlockResult {
  const { fontFamily, fontSizeMax, fontSizeMin, lineHeight, maxLines, color, align = "left" } = options;

  let fontSize = fontSizeMax;
  let lines: string[] = [];
  let actualLineHeight = 0;

  // Try decreasing font size until text fits
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

  // If still too many lines, truncate
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    // Truncate last line with ellipsis
    lines[lines.length - 1] = truncateWithEllipsis(ctx, lines[lines.length - 1], maxW);
  }

  // Draw lines
  ctx.fillStyle = color;
  ctx.textAlign = align;
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

/**
 * Load image from URL or data URL.
 */
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

/* ── Main render function ── */

/**
 * Render Meta Template V1.
 *
 * @param input - Template input with images and text
 * @returns PNG buffer
 */
export async function renderTemplateV1(input: TemplateV1Input): Promise<Buffer> {
  // Register fonts
  ensureFontsRegistered();

  // Load required images
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

  /* ── 2) Draw logo (top-left, contain) ── */
  if (logoImage) {
    const fit = fitContain(
      logoImage.width,
      logoImage.height,
      LAYOUT.logo.maxW,
      LAYOUT.logo.maxH
    );
    ctx.drawImage(logoImage, LAYOUT.logo.x, LAYOUT.logo.y, fit.w, fit.h);
  }

  /* ── 3) Draw product (hero, centered, with subtle shadow) ── */
  {
    const productBoxH = LAYOUT.product.maxY - LAYOUT.product.y; // 480
    const fit = fitContain(
      productImage.width,
      productImage.height,
      LAYOUT.product.w,
      productBoxH
    );

    const productX = (CANVAS_W - fit.w) / 2;
    const productY = LAYOUT.product.y + (productBoxH - fit.h) / 2;

    // Subtle drop shadow for depth
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 20;

    ctx.drawImage(productImage, productX, productY, fit.w, fit.h);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  /* ── 4) Draw text panel (overlay) ── */
  {
    ctx.save();
    ctx.fillStyle = LAYOUT.panel.bgColor;
    drawRoundedRect(
      ctx,
      LAYOUT.panel.x,
      LAYOUT.panel.y,
      LAYOUT.panel.w,
      LAYOUT.panel.h,
      LAYOUT.panel.radius
    );
    ctx.fill();
    ctx.restore();
  }

  /* ── 5) Draw text content inside panel ── */
  {
    const panelInnerX = LAYOUT.panel.x + LAYOUT.panel.padding;
    const panelInnerW = LAYOUT.panel.w - LAYOUT.panel.padding * 2;
    let currentY = LAYOUT.panel.y + LAYOUT.panel.padding;

    // Calculate available height for text
    const panelInnerH = LAYOUT.panel.h - LAYOUT.panel.padding * 2;
    const ctaHeight = LAYOUT.text.cta.height;
    const spacingTotal = LAYOUT.spacing.headlineToSub + LAYOUT.spacing.subToCta;
    const availableTextH = panelInnerH - ctaHeight - spacingTotal;

    // Headline
    const headlineMaxH = input.subheadline
      ? Math.floor(availableTextH * 0.6)
      : availableTextH;

    const headlineResult = drawTextBlock(
      ctx,
      input.headline,
      panelInnerX,
      currentY,
      panelInnerW,
      headlineMaxH,
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

    // Subheadline (optional)
    if (input.subheadline) {
      const subMaxH = Math.floor(availableTextH * 0.4);

      const subResult = drawTextBlock(
        ctx,
        input.subheadline,
        panelInnerX,
        currentY,
        panelInnerW,
        subMaxH,
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
      const maxCtaTextWidth = panelInnerW - ctaCfg.paddingH * 2;

      // Reduce font size if needed
      while (ctaTextWidth > maxCtaTextWidth && ctaFontSize > ctaCfg.fontSizeMin) {
        ctaFontSize -= 1;
        ctx.font = `${ctaFontSize}px "${ctaCfg.fontFamily}"`;
        ctaTextWidth = ctx.measureText(ctaText).width;
      }

      // Truncate if still too wide
      if (ctaTextWidth > maxCtaTextWidth) {
        ctaText = truncateWithEllipsis(ctx, ctaText, maxCtaTextWidth);
        ctaTextWidth = ctx.measureText(ctaText).width;
      }

      const ctaButtonW = ctaTextWidth + ctaCfg.paddingH * 2;
      const ctaButtonH = ctaCfg.height;
      const ctaButtonX = panelInnerX;
      const ctaButtonY = currentY;

      // Draw button background
      ctx.save();
      ctx.fillStyle = ctaCfg.bgColor;
      drawRoundedRect(ctx, ctaButtonX, ctaButtonY, ctaButtonW, ctaButtonH, ctaCfg.radius);
      ctx.fill();
      ctx.restore();

      // Draw button text (centered vertically)
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
