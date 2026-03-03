/**
 * Drawing Components – Reusable primitives for template rendering
 *
 * All components use @napi-rs/canvas and follow consistent patterns:
 * - Accept canvas context + position/size
 * - Accept style options
 * - Return draw result with bounds
 */

import {
  loadImage,
  type SKRSContext2D,
  type Image,
} from "@napi-rs/canvas";
import { fitTextInBox, fitSingleLine, type TextFitResult } from "./textFit";
import type { StylePack } from "../../selectors/styleSelector";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const SAFE_MARGIN = {
  horizontal: 80,
  top: 90,
  bottom: 90,
};

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DrawResult {
  bounds: BoundingBox;
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: ROUNDED RECT PATH
═══════════════════════════════════════════════════════════════ */

export function roundedRectPath(
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

/* ═══════════════════════════════════════════════════════════════
   HELPER: FIT CONTAIN
═══════════════════════════════════════════════════════════════ */

export function fitContain(
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

/* ═══════════════════════════════════════════════════════════════
   DRAW BACKGROUND
═══════════════════════════════════════════════════════════════ */

export interface DrawBackgroundOptions {
  src: string;
}

export async function drawBackground(
  ctx: SKRSContext2D,
  options: DrawBackgroundOptions
): Promise<DrawResult> {
  const img = await loadImage(options.src);

  // Cover the entire canvas
  const srcAspect = img.width / img.height;
  const canvasAspect = CANVAS_W / CANVAS_H;

  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (srcAspect > canvasAspect) {
    // Source is wider – crop sides
    sw = img.height * canvasAspect;
    sx = (img.width - sw) / 2;
  } else {
    // Source is taller – crop top/bottom
    sh = img.width / canvasAspect;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);

  return {
    bounds: { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW PRODUCT
═══════════════════════════════════════════════════════════════ */

export interface DrawProductOptions {
  src: string;
  x: number;
  y: number;
  maxW: number;
  maxH: number;
  /** Draw contact shadow */
  shadow?: boolean;
  /** Shadow Y offset from product bottom */
  shadowOffsetY?: number;
}

export async function drawProduct(
  ctx: SKRSContext2D,
  options: DrawProductOptions
): Promise<DrawResult> {
  const { src, x, y, maxW, maxH, shadow = true, shadowOffsetY = 20 } = options;

  const img = await loadImage(src);
  const fit = fitContain(img.width, img.height, maxW, maxH);

  // Center product in bounding box
  const drawX = x + (maxW - fit.w) / 2;
  const drawY = y + (maxH - fit.h) / 2;

  // Draw contact shadow first (behind product)
  if (shadow) {
    const shadowCenterX = drawX + fit.w / 2;
    const shadowCenterY = drawY + fit.h + shadowOffsetY;
    const shadowRadiusX = fit.w * 0.35;
    const shadowRadiusY = fit.h * 0.06;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      shadowCenterX,
      shadowCenterY,
      shadowRadiusX,
      shadowRadiusY,
      0,
      0,
      Math.PI * 2
    );

    const gradient = ctx.createRadialGradient(
      shadowCenterX,
      shadowCenterY,
      0,
      shadowCenterX,
      shadowCenterY,
      shadowRadiusX
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.25)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.12)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  // Draw product
  ctx.drawImage(img, drawX, drawY, fit.w, fit.h);

  return {
    bounds: { x: drawX, y: drawY, w: fit.w, h: fit.h },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW PRODUCT WITH ART DIRECTION
═══════════════════════════════════════════════════════════════ */

import type { ArtDirection } from "../../spec/creativeSpec";
import {
  getLayoutPosition,
  getShadowParams,
} from "../../artDirection/generateArtDirection";

export interface DrawProductWithArtDirectionOptions {
  src: string;
  artDirection: ArtDirection;
  /** Override position if needed (normalized 0-1) */
  overrideX?: number;
  overrideY?: number;
}

/**
 * Draw product using ArtDirection parameters.
 * Computes position based on layout, applies productScale, and renders
 * directional shadow based on lightDirection and energy.
 */
export async function drawProductWithArtDirection(
  ctx: SKRSContext2D,
  options: DrawProductWithArtDirectionOptions
): Promise<DrawResult> {
  const { src, artDirection, overrideX, overrideY } = options;
  const { layout, productScale, lightDirection, energy } = artDirection;

  const img = await loadImage(src);
  
  // Calculate product size based on scale (relative to canvas height)
  const targetH = Math.round(CANVAS_H * productScale);
  const fit = fitContain(img.width, img.height, CANVAS_W * 0.7, targetH);

  // Get position from layout (or use override)
  const layoutPos = getLayoutPosition(layout);
  const normX = overrideX ?? layoutPos.x;
  const normY = overrideY ?? layoutPos.y;

  // Calculate center position on canvas
  const centerX = Math.round(CANVAS_W * normX);
  const centerY = Math.round(CANVAS_H * normY);

  // Calculate top-left corner based on anchor
  const drawX = Math.round(centerX - fit.w / 2);
  const drawY = Math.round(centerY - fit.h / 2);

  // Get shadow params based on light direction and energy
  const shadowParams = getShadowParams(lightDirection, energy);

  // Apply drop shadow (directional)
  ctx.save();
  ctx.shadowColor = shadowParams.color;
  ctx.shadowBlur = shadowParams.blur;
  ctx.shadowOffsetX = shadowParams.offsetX;
  ctx.shadowOffsetY = shadowParams.offsetY;
  ctx.drawImage(img, drawX, drawY, fit.w, fit.h);
  ctx.restore();

  // Draw product again without shadow (for cleaner edges)
  ctx.drawImage(img, drawX, drawY, fit.w, fit.h);

  return {
    bounds: { x: drawX, y: drawY, w: fit.w, h: fit.h },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW LOGO
═══════════════════════════════════════════════════════════════ */

export interface DrawLogoOptions {
  src: string;
  x: number;
  y: number;
  maxW: number;
  maxH: number;
}

export async function drawLogo(
  ctx: SKRSContext2D,
  options: DrawLogoOptions
): Promise<DrawResult> {
  const { src, x, y, maxW, maxH } = options;

  const img = await loadImage(src);
  const fit = fitContain(img.width, img.height, maxW, maxH);

  ctx.drawImage(img, x, y, fit.w, fit.h);

  return {
    bounds: { x, y, w: fit.w, h: fit.h },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW HEADLINE
═══════════════════════════════════════════════════════════════ */

export interface DrawHeadlineOptions {
  text: string;
  x: number;
  y: number;
  maxW: number;
  maxH: number;
  color: string;
  fontFamily: string;
  fontSizeMax?: number;
  fontSizeMin?: number;
  lineHeight?: number;
  maxLines?: number;
  align?: CanvasTextAlign;
}

export interface DrawHeadlineResult extends DrawResult {
  fit: TextFitResult;
}

export function drawHeadline(
  ctx: SKRSContext2D,
  options: DrawHeadlineOptions
): DrawHeadlineResult {
  const {
    text,
    x,
    y,
    maxW,
    maxH,
    color,
    fontFamily,
    fontSizeMax = 56,
    fontSizeMin = 38,
    lineHeight = 1.15,
    maxLines = 2,
    align = "left",
  } = options;

  const fit = fitTextInBox(ctx, text, maxW, maxH, {
    fontFamily,
    fontSizeMax,
    fontSizeMin,
    lineHeight,
    maxLines,
    fontWeight: "bold",
  });

  ctx.font = `bold ${fit.fontSize}px "${fontFamily}"`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  let textX = x;
  if (align === "center") textX = x + maxW / 2;
  else if (align === "right") textX = x + maxW;

  for (let i = 0; i < fit.lines.length; i++) {
    ctx.fillText(fit.lines[i], textX, y + i * fit.lineHeightPx);
  }

  return {
    bounds: { x, y, w: maxW, h: fit.totalHeight },
    fit,
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW SUBHEADLINE
═══════════════════════════════════════════════════════════════ */

export interface DrawSubheadlineOptions {
  text: string;
  x: number;
  y: number;
  maxW: number;
  maxH: number;
  color: string;
  fontFamily: string;
  fontSizeMax?: number;
  fontSizeMin?: number;
  lineHeight?: number;
  maxLines?: number;
  align?: CanvasTextAlign;
}

export function drawSubheadline(
  ctx: SKRSContext2D,
  options: DrawSubheadlineOptions
): DrawHeadlineResult {
  const {
    text,
    x,
    y,
    maxW,
    maxH,
    color,
    fontFamily,
    fontSizeMax = 32,
    fontSizeMin = 22,
    lineHeight = 1.25,
    maxLines = 2,
    align = "left",
  } = options;

  const fit = fitTextInBox(ctx, text, maxW, maxH, {
    fontFamily,
    fontSizeMax,
    fontSizeMin,
    lineHeight,
    maxLines,
    fontWeight: "600",
  });

  ctx.font = `600 ${fit.fontSize}px "${fontFamily}"`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  let textX = x;
  if (align === "center") textX = x + maxW / 2;
  else if (align === "right") textX = x + maxW;

  for (let i = 0; i < fit.lines.length; i++) {
    ctx.fillText(fit.lines[i], textX, y + i * fit.lineHeightPx);
  }

  return {
    bounds: { x, y, w: maxW, h: fit.totalHeight },
    fit,
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW CTA (BUTTON)
═══════════════════════════════════════════════════════════════ */

export interface DrawCtaOptions {
  text: string;
  x: number;
  y: number;
  minW?: number;
  height?: number;
  paddingH?: number;
  radius?: number;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  fontSize?: number;
}

export function drawCta(
  ctx: SKRSContext2D,
  options: DrawCtaOptions
): DrawResult {
  const {
    text,
    x,
    y,
    minW = 180,
    height = 56,
    paddingH = 32,
    radius = 28,
    bgColor,
    textColor,
    fontFamily,
    fontSize = 24,
  } = options;

  ctx.font = `bold ${fontSize}px "${fontFamily}"`;
  const textMetrics = ctx.measureText(text);
  const buttonW = Math.max(minW, textMetrics.width + paddingH * 2);

  // Draw pill background
  roundedRectPath(ctx, x, y, buttonW, height, radius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Draw text
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + buttonW / 2, y + height / 2);

  return {
    bounds: { x, y, w: buttonW, h: height },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW BADGE (LARGE OFFER BADGE)
═══════════════════════════════════════════════════════════════ */

export interface DrawBadgeOptions {
  text: string;
  x: number;
  y: number;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  fontSize?: number;
  /** Circle or rectangle */
  shape?: "circle" | "rect";
  /** Size for circle, or width/height for rect */
  size?: number;
}

export function drawBadge(
  ctx: SKRSContext2D,
  options: DrawBadgeOptions
): DrawResult {
  const {
    text,
    x,
    y,
    bgColor,
    textColor,
    fontFamily,
    fontSize = 36,
    shape = "circle",
    size = 140,
  } = options;

  ctx.save();

  if (shape === "circle") {
    // Circle badge
    const radius = size / 2;
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Add subtle shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.shadowColor = "transparent";

    // Text
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + radius, y + radius);

    ctx.restore();
    return {
      bounds: { x, y, w: size, h: size },
    };
  } else {
    // Rounded rectangle badge
    const paddingH = 24;
    const paddingV = 16;
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;
    const textW = ctx.measureText(text).width;
    const w = textW + paddingH * 2;
    const h = fontSize + paddingV * 2;

    roundedRectPath(ctx, x, y, w, h, 12);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, y + h / 2);

    ctx.restore();
    return {
      bounds: { x, y, w, h },
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   DRAW STICKER (SMALL URGENCY TAG)
═══════════════════════════════════════════════════════════════ */

export interface DrawStickerOptions {
  text: string;
  x: number;
  y: number;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  fontSize?: number;
  /** Rotation in degrees */
  rotation?: number;
}

export function drawSticker(
  ctx: SKRSContext2D,
  options: DrawStickerOptions
): DrawResult {
  const {
    text,
    x,
    y,
    bgColor,
    textColor,
    fontFamily,
    fontSize = 18,
    rotation = -5,
  } = options;

  ctx.save();

  ctx.font = `bold ${fontSize}px "${fontFamily}"`;
  const textW = ctx.measureText(text).width;
  const paddingH = 16;
  const paddingV = 10;
  const w = textW + paddingH * 2;
  const h = fontSize + paddingV * 2;

  // Rotate around center
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  // Background
  roundedRectPath(ctx, x, y, w, h, 6);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Text
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, centerX, centerY);

  ctx.restore();

  return {
    bounds: { x, y, w, h },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW BEFORE/AFTER GRID
═══════════════════════════════════════════════════════════════ */

export interface DrawBeforeAfterGridOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  day1Label: string;
  day30Label: string;
  caption?: string;
  fontFamily: string;
  textColor: string;
  borderColor?: string;
}

export function drawBeforeAfterGrid(
  ctx: SKRSContext2D,
  options: DrawBeforeAfterGridOptions
): DrawResult {
  const {
    x,
    y,
    w,
    h,
    day1Label,
    day30Label,
    caption,
    fontFamily,
    textColor,
    borderColor = "rgba(255, 255, 255, 0.3)",
  } = options;

  const boxW = (w - 20) / 2; // 20px gap
  const boxH = h - (caption ? 40 : 0);
  const gap = 20;

  // Draw two boxes with borders
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;

  // Left box (Day 1)
  roundedRectPath(ctx, x, y, boxW, boxH, 16);
  ctx.stroke();

  // Right box (Day 30)
  roundedRectPath(ctx, x + boxW + gap, y, boxW, boxH, 16);
  ctx.stroke();

  // Labels inside boxes
  ctx.font = `600 24px "${fontFamily}"`;
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(day1Label, x + boxW / 2, y + boxH / 2);
  ctx.fillText(day30Label, x + boxW + gap + boxW / 2, y + boxH / 2);

  // Caption below
  if (caption) {
    ctx.font = `400 18px "${fontFamily}"`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(caption, x + w / 2, y + boxH + 24);
  }

  return {
    bounds: { x, y, w, h },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW QUOTE
═══════════════════════════════════════════════════════════════ */

export interface DrawQuoteOptions {
  quote: string;
  author?: string;
  x: number;
  y: number;
  maxW: number;
  maxH: number;
  quoteColor: string;
  authorColor: string;
  fontFamily: string;
  quoteFontSizeMax?: number;
  quoteFontSizeMin?: number;
}

export interface DrawQuoteResult extends DrawResult {
  quoteFit: TextFitResult;
}

export function drawQuote(
  ctx: SKRSContext2D,
  options: DrawQuoteOptions
): DrawQuoteResult {
  const {
    quote,
    author,
    x,
    y,
    maxW,
    maxH,
    quoteColor,
    authorColor,
    fontFamily,
    quoteFontSizeMax = 40,
    quoteFontSizeMin = 28,
  } = options;

  // Add quote marks
  const quotedText = `"${quote}"`;

  // Fit quote text
  const authorSpace = author ? 50 : 0;
  const quoteMaxH = maxH - authorSpace;

  const quoteFit = fitTextInBox(ctx, quotedText, maxW, quoteMaxH, {
    fontFamily,
    fontSizeMax: quoteFontSizeMax,
    fontSizeMin: quoteFontSizeMin,
    lineHeight: 1.3,
    maxLines: 3,
    fontWeight: "500",
  });

  // Draw quote
  ctx.font = `500 ${quoteFit.fontSize}px "${fontFamily}"`;
  ctx.fillStyle = quoteColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  for (let i = 0; i < quoteFit.lines.length; i++) {
    ctx.fillText(quoteFit.lines[i], x, y + i * quoteFit.lineHeightPx);
  }

  // Draw author
  let authorY = y + quoteFit.totalHeight + 16;
  if (author) {
    ctx.font = `600 20px "${fontFamily}"`;
    ctx.fillStyle = authorColor;
    ctx.fillText(`— ${author}`, x, authorY);
    authorY += 28;
  }

  return {
    bounds: { x, y, w: maxW, h: authorY - y },
    quoteFit,
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW GRADIENT OVERLAY
═══════════════════════════════════════════════════════════════ */

export interface DrawGradientOverlayOptions {
  direction: "left" | "right" | "bottom" | "top";
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  opacity?: number;
}

export function drawGradientOverlay(
  ctx: SKRSContext2D,
  options: DrawGradientOverlayOptions
): DrawResult {
  const {
    direction,
    x,
    y,
    w,
    h,
    color = "#000000",
    opacity = 0.5,
  } = options;

  let gradient: CanvasGradient;

  switch (direction) {
    case "left":
      gradient = ctx.createLinearGradient(x, y, x + w, y);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      break;
    case "right":
      gradient = ctx.createLinearGradient(x + w, y, x, y);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      break;
    case "bottom":
      gradient = ctx.createLinearGradient(x, y + h, x, y);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      break;
    case "top":
      gradient = ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      break;
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  return {
    bounds: { x, y, w, h },
  };
}

/* ═══════════════════════════════════════════════════════════════
   DRAW FOREGROUND BLUR OVERLAY (Scene Depth V2)
═══════════════════════════════════════════════════════════════ */

export interface DrawForegroundBlurOptions {
  /** Source image (data URL) */
  src: string;
  /** Position: "left" or "right" corner */
  position: "left" | "right";
  /** Opacity (0-1) */
  opacity?: number;
  /** Blur intensity in pixels (simulated via scaling) */
  blurAmount?: number;
}

/**
 * Draws a blurred foreground element in a corner.
 * Creates depth by adding an out-of-focus element in the foreground.
 *
 * Note: Canvas doesn't support native blur, so we simulate it
 * by drawing at reduced resolution and scaling up.
 */
export async function drawForegroundBlur(
  ctx: SKRSContext2D,
  options: DrawForegroundBlurOptions
): Promise<DrawResult> {
  const {
    src,
    position,
    opacity = 0.7,
    blurAmount = 15,
  } = options;

  const img = await loadImage(src);

  // Size: roughly 1/3 of canvas width, positioned in corner
  const targetW = Math.round(CANVAS_W * 0.35);
  const targetH = Math.round((targetW / img.width) * img.height);

  // Position calculation
  let x: number;
  const y = CANVAS_H - targetH + 50; // Slightly off-screen at bottom

  if (position === "left") {
    x = -targetW * 0.3; // Partially off-screen left
  } else {
    x = CANVAS_W - targetW * 0.7; // Partially off-screen right
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  // Simulate blur by drawing multiple offset copies with low opacity
  const blurSteps = Math.min(blurAmount, 10);
  const blurOpacity = 1 / (blurSteps * 2);

  for (let i = 0; i < blurSteps; i++) {
    const offset = i * 2;
    ctx.globalAlpha = blurOpacity * opacity;

    // Draw offset copies in different directions
    ctx.drawImage(img, x - offset, y - offset, targetW, targetH);
    ctx.drawImage(img, x + offset, y - offset, targetW, targetH);
    ctx.drawImage(img, x - offset, y + offset, targetW, targetH);
    ctx.drawImage(img, x + offset, y + offset, targetW, targetH);
  }

  // Draw main image on top
  ctx.globalAlpha = opacity * 0.5;
  ctx.drawImage(img, x, y, targetW, targetH);

  ctx.restore();

  return {
    bounds: { x, y, w: targetW, h: targetH },
  };
}

/**
 * Draw a simple blurred shape as foreground element.
 * Alternative to image-based foreground when no image is provided.
 */
export function drawForegroundShape(
  ctx: SKRSContext2D,
  options: {
    position: "left" | "right";
    color?: string;
    opacity?: number;
  }
): DrawResult {
  const {
    position,
    color = "#000000",
    opacity = 0.15,
  } = options;

  const shapeW = Math.round(CANVAS_W * 0.4);
  const shapeH = Math.round(CANVAS_H * 0.35);
  const y = CANVAS_H - shapeH + 80;
  const x = position === "left" ? -shapeW * 0.5 : CANVAS_W - shapeW * 0.5;

  // Create soft elliptical shape
  const centerX = x + shapeW / 2;
  const centerY = y + shapeH / 2;
  const radiusX = shapeW / 2;
  const radiusY = shapeH / 2;

  ctx.save();

  // Multiple passes for soft blur effect
  for (let i = 5; i > 0; i--) {
    const scale = 1 + i * 0.1;
    const passOpacity = opacity / (i * 2);

    ctx.globalAlpha = passOpacity;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      radiusX * scale,
      radiusY * scale,
      0,
      0,
      Math.PI * 2
    );

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radiusX * scale
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.restore();

  return {
    bounds: { x, y, w: shapeW, h: shapeH },
  };
}

