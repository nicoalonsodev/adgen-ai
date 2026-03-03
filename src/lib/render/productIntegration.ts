/**
 * Product Integration Module
 *
 * Provides realistic shadow rendering for product images to achieve
 * professional visual integration with backgrounds.
 *
 * Features:
 * - Contact shadow (elliptical, soft radial gradient)
 * - Directional drop shadow
 */

import type { SKRSContext2D, Image } from "@napi-rs/canvas";

/* ── Types ── */

export interface ContactShadowOptions {
  /** Width multiplier for shadow relative to product width (default: 1.1) */
  widthMultiplier?: number;
  /** Height multiplier for shadow relative to product height (default: 0.22) */
  heightMultiplier?: number;
  /** Center opacity of shadow (default: 0.35) */
  centerOpacity?: number;
  /** Vertical offset from product bottom (default: 0) */
  offsetY?: number;
}

export interface DropShadowOptions {
  /** Shadow color with alpha (default: rgba(0,0,0,0.30)) */
  color?: string;
  /** Shadow blur radius (default: 50) */
  blur?: number;
  /** Horizontal offset (default: 10) */
  offsetX?: number;
  /** Vertical offset (default: 20) */
  offsetY?: number;
}

export interface ProductIntegrationOptions {
  contactShadow?: ContactShadowOptions | false;
  dropShadow?: DropShadowOptions | false;
}

/* ── Contact Shadow ── */

/**
 * Draws an elliptical contact shadow beneath the product.
 * Creates the illusion that the product is resting on a surface.
 *
 * @param ctx - Canvas 2D rendering context
 * @param x - Product x position
 * @param y - Product y position
 * @param w - Product width
 * @param h - Product height
 * @param opts - Shadow configuration options
 */
export function drawContactShadow(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: ContactShadowOptions = {}
): void {
  const {
    widthMultiplier = 1.1,
    heightMultiplier = 0.22,
    centerOpacity = 0.35,
    offsetY = 0,
  } = opts;

  const shadowW = w * widthMultiplier;
  const shadowH = h * heightMultiplier;

  // Position shadow at the bottom center of the product
  const shadowCenterX = x + w / 2;
  const shadowCenterY = y + h + offsetY;

  ctx.save();

  // Create elliptical gradient by scaling the context
  ctx.translate(shadowCenterX, shadowCenterY);
  ctx.scale(shadowW / 2, shadowH / 2);

  // Radial gradient from center (opaque) to edge (transparent)
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${centerOpacity})`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${centerOpacity * 0.5})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ── Product with Integration ── */

/**
 * Draws a product image with full visual integration:
 * 1. Contact shadow (elliptical, beneath product)
 * 2. Drop shadow (directional, behind product)
 * 3. Product image
 *
 * @param ctx - Canvas 2D rendering context
 * @param productImage - Product image to draw
 * @param x - Destination x position
 * @param y - Destination y position
 * @param w - Destination width
 * @param h - Destination height
 * @param opts - Integration options
 */
export function drawProductWithIntegration(
  ctx: SKRSContext2D,
  productImage: Image,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: ProductIntegrationOptions = {}
): void {
  const { contactShadow = {}, dropShadow = {} } = opts;

  // 1. Draw contact shadow (if enabled)
  if (contactShadow !== false) {
    drawContactShadow(ctx, x, y, w, h, contactShadow);
  }

  // 2. Draw product with drop shadow (if enabled)
  if (dropShadow !== false) {
    const {
      color = "rgba(0, 0, 0, 0.30)",
      blur = 50,
      offsetX = 10,
      offsetY = 20,
    } = dropShadow;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;

    ctx.drawImage(productImage, x, y, w, h);

    // Reset shadow properties
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  } else {
    // Draw without drop shadow
    ctx.drawImage(productImage, x, y, w, h);
  }
}

/* ── Debug Utilities ── */

/**
 * Draws a debug bounding box around a zone.
 *
 * @param ctx - Canvas 2D rendering context
 * @param x - Zone x position
 * @param y - Zone y position
 * @param w - Zone width
 * @param h - Zone height
 * @param color - Border color (default: red)
 * @param label - Optional label text
 */
export function drawDebugBoundingBox(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = "rgba(255, 0, 0, 0.6)",
  label?: string
): void {
  ctx.save();

  // Draw semi-transparent fill
  ctx.fillStyle = color.replace(/[\d.]+\)$/, "0.1)");
  ctx.fillRect(x, y, w, h);

  // Draw border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x, y, w, h);

  // Draw label if provided
  if (label) {
    ctx.fillStyle = color;
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText(label, x + 4, y + 16);
  }

  ctx.restore();
}
