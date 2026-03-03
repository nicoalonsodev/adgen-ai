/**
 * Layout Engine – 8 fixed layouts for Meta Ads 1080×1350
 *
 * Each layout defines zones for: product, text block (headline + subheadline + CTA),
 * badge, and logo. All positions are absolute pixels.
 *
 * 100% determinístico. Sin IA.
 */

import type { LayoutId, NegativeSpace } from "@/lib/scenes/sceneLibrary";
import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  SAFE_MARGIN,
  CONTENT_AREA,
  FONT,
  fontString,
  wrapText,
} from "./typography";

/* ── Canvas dimensions ── */
export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

/* ── Zone types ── */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutZones {
  /** Where to place the product image (object-fit: contain) */
  product: Rect;
  /** Where to render the text block (headline + sub + cta) */
  textBlock: Rect;
  /** Badge position (top-left of badge rect) */
  badge: Rect;
  /** Logo position (always top-left, but configurable) */
  logo: Rect;
}

/* ── Logo defaults ── */
const LOGO_RECT: Rect = {
  x: SAFE_MARGIN.left,
  y: SAFE_MARGIN.top,
  w: 140,
  h: 60,
};

/* ── Layout definitions ── */

const LAYOUTS: Record<LayoutId, LayoutZones> = {
  /* hero_center: producto centrado, texto abajo */
  hero_center: {
    product: { x: 190, y: 200, w: 700, h: 650 },
    textBlock: { x: SAFE_MARGIN.left, y: 900, w: CONTENT_AREA.width, h: 350 },
    badge: { x: CANVAS_W - SAFE_MARGIN.right - 200, y: SAFE_MARGIN.top + 10, w: 200, h: 50 },
    logo: LOGO_RECT,
  },

  /* hero_left: producto a la izquierda, texto a la derecha */
  hero_left: {
    product: { x: 40, y: 250, w: 500, h: 600 },
    textBlock: { x: 560, y: 300, w: 420, h: 500 },
    badge: { x: 560, y: 250, w: 200, h: 50 },
    logo: LOGO_RECT,
  },

  /* hero_right: producto a la derecha, texto a la izquierda */
  hero_right: {
    product: { x: 540, y: 250, w: 500, h: 600 },
    textBlock: { x: SAFE_MARGIN.left, y: 300, w: 420, h: 500 },
    badge: { x: SAFE_MARGIN.left, y: 250, w: 200, h: 50 },
    logo: LOGO_RECT,
  },

  /* split_top: producto arriba, texto abajo */
  split_top: {
    product: { x: 190, y: 120, w: 700, h: 550 },
    textBlock: { x: SAFE_MARGIN.left, y: 720, w: CONTENT_AREA.width, h: 470 },
    badge: { x: CANVAS_W - SAFE_MARGIN.right - 200, y: 130, w: 200, h: 50 },
    logo: LOGO_RECT,
  },

  /* split_bottom: texto arriba, producto abajo */
  split_bottom: {
    product: { x: 190, y: 650, w: 700, h: 550 },
    textBlock: { x: SAFE_MARGIN.left, y: 150, w: CONTENT_AREA.width, h: 450 },
    badge: { x: SAFE_MARGIN.left, y: SAFE_MARGIN.top + 80, w: 200, h: 50 },
    logo: LOGO_RECT,
  },

  /* diagonal: producto abajo-derecha, texto arriba-izquierda */
  diagonal: {
    product: { x: 400, y: 550, w: 600, h: 650 },
    textBlock: { x: SAFE_MARGIN.left, y: 200, w: 500, h: 450 },
    badge: { x: SAFE_MARGIN.left, y: 150, w: 200, h: 50 },
    logo: LOGO_RECT,
  },

  /* floating: producto flotante centrado, texto abajo */
  floating: {
    product: { x: 240, y: 180, w: 600, h: 600 },
    textBlock: { x: SAFE_MARGIN.left, y: 830, w: CONTENT_AREA.width, h: 380 },
    badge: { x: CANVAS_W - SAFE_MARGIN.right - 200, y: 200, w: 200, h: 50 },
    logo: LOGO_RECT,
  },

  /* minimal: producto pequeño centrado, mucho espacio para texto */
  minimal: {
    product: { x: 290, y: 200, w: 500, h: 450 },
    textBlock: { x: SAFE_MARGIN.left, y: 720, w: CONTENT_AREA.width, h: 470 },
    badge: { x: CANVAS_W - SAFE_MARGIN.right - 200, y: 210, w: 200, h: 50 },
    logo: LOGO_RECT,
  },
};

/** Get layout zones by layout_id */
export function getLayout(layoutId: LayoutId): LayoutZones {
  return LAYOUTS[layoutId];
}

/* ── Backplate (semi-transparent rect behind text) ── */

export function drawBackplate(
  ctx: SKRSContext2D,
  zone: Rect,
  padding: number = 24
): void {
  const bx = zone.x - padding;
  const by = zone.y - padding;
  const bw = zone.w + padding * 2;
  const bh = zone.h + padding * 2;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";

  // Rounded rect
  const radius = 16;
  ctx.beginPath();
  ctx.moveTo(bx + radius, by);
  ctx.lineTo(bx + bw - radius, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
  ctx.lineTo(bx + bw, by + bh - radius);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
  ctx.lineTo(bx + radius, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
  ctx.lineTo(bx, by + radius);
  ctx.quadraticCurveTo(bx, by, bx + radius, by);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* ── Draw text block (headline + subheadline + CTA) ── */

export interface TextContent {
  headline: string;
  subheadline: string;
  cta: string;
  badge: string | null;
  casing: "uppercase" | "sentence";
}

export function drawTextBlock(
  ctx: SKRSContext2D,
  zone: Rect,
  content: TextContent
): void {
  const GAP = 16;
  let cursorY = zone.y;

  // ── Headline ──
  const headlineText =
    content.casing === "uppercase"
      ? content.headline.toUpperCase()
      : content.headline;

  ctx.font = fontString("headline");
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "top";

  const headlineLines = wrapText(ctx, headlineText, zone.w);
  for (const line of headlineLines) {
    ctx.fillText(line, zone.x, cursorY);
    cursorY += FONT.headline.lineHeight;
  }

  cursorY += GAP;

  // ── Subheadline ──
  ctx.font = fontString("subheadline");
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";

  const subLines = wrapText(ctx, content.subheadline, zone.w);
  for (const line of subLines) {
    ctx.fillText(line, zone.x, cursorY);
    cursorY += FONT.subheadline.lineHeight;
  }

  cursorY += GAP * 1.5;

  // ── CTA button ──
  drawCtaButton(ctx, zone.x, cursorY, content.cta, zone.w);
}

/* ── CTA Button ── */

function drawCtaButton(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  text: string,
  maxWidth: number
): void {
  ctx.font = fontString("cta");
  const metrics = ctx.measureText(text);
  const padH = 32;
  const padV = 14;
  const btnW = Math.min(metrics.width + padH * 2, maxWidth);
  const btnH = FONT.cta.lineHeight + padV * 2;
  const radius = btnH / 2;

  // Button background (white)
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + btnW - radius, y);
  ctx.quadraticCurveTo(x + btnW, y, x + btnW, y + radius);
  ctx.lineTo(x + btnW, y + btnH - radius);
  ctx.quadraticCurveTo(x + btnW, y + btnH, x + btnW - radius, y + btnH);
  ctx.lineTo(x + radius, y + btnH);
  ctx.quadraticCurveTo(x, y + btnH, x, y + btnH - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Button text (dark)
  ctx.fillStyle = "#111111";
  ctx.textBaseline = "top";
  ctx.fillText(text, x + padH, y + padV);
}

/* ── Badge ── */

export function drawBadge(
  ctx: SKRSContext2D,
  zone: Rect,
  text: string
): void {
  ctx.font = fontString("badge");
  const metrics = ctx.measureText(text);
  const padH = 16;
  const padV = 8;
  const badgeW = metrics.width + padH * 2;
  const badgeH = FONT.badge.lineHeight + padV * 2;

  // Badge background (accent yellow)
  ctx.save();
  ctx.fillStyle = "#FACC15";
  const radius = 8;
  const bx = zone.x;
  const by = zone.y;

  ctx.beginPath();
  ctx.moveTo(bx + radius, by);
  ctx.lineTo(bx + badgeW - radius, by);
  ctx.quadraticCurveTo(bx + badgeW, by, bx + badgeW, by + radius);
  ctx.lineTo(bx + badgeW, by + badgeH - radius);
  ctx.quadraticCurveTo(bx + badgeW, by + badgeH, bx + badgeW - radius, by + badgeH);
  ctx.lineTo(bx + radius, by + badgeH);
  ctx.quadraticCurveTo(bx, by + badgeH, bx, by + badgeH - radius);
  ctx.lineTo(bx, by + radius);
  ctx.quadraticCurveTo(bx, by, bx + radius, by);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Badge text (dark)
  ctx.fillStyle = "#111111";
  ctx.textBaseline = "top";
  ctx.fillText(text, bx + padH, by + padV);
}

/* ── Image placement (object-fit: contain) ── */

export function fitImageInRect(
  imgW: number,
  imgH: number,
  rect: Rect
): { dx: number; dy: number; dw: number; dh: number } {
  const scaleW = rect.w / imgW;
  const scaleH = rect.h / imgH;
  const scale = Math.min(scaleW, scaleH);

  const dw = imgW * scale;
  const dh = imgH * scale;
  const dx = rect.x + (rect.w - dw) / 2;
  const dy = rect.y + (rect.h - dh) / 2;

  return { dx, dy, dw, dh };
}
