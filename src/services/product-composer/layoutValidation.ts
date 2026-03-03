/**
 * Layout Validation & Normalization
 * 
 * Clamps values to safe bounds, detects overlaps, and ensures
 * the layout spec is valid for rendering.
 */

import {
  LayoutSpec,
  TextBlock,
  Overlay,
  ProductPlacement,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_SAFE_MARGIN,
  MIN_SCALE,
  MAX_SCALE,
  MIN_CONFIDENCE,
  getDefaultPreset,
} from "./layoutSpec";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "layoutValidation" });

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface ValidationResult {
  valid: boolean;
  normalized: LayoutSpec;
  warnings: string[];
  corrections: string[];
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN VALIDATION FUNCTION
═══════════════════════════════════════════════════════════════ */

export function validateAndNormalizeLayout(
  layout: LayoutSpec,
  options?: {
    maxOverlays?: number;
    maxTextBlocks?: number;
    strictSafeArea?: boolean;
    enforceProductHeightRule?: boolean;
    enforcePresetBadgeNoOverlap?: boolean;
  }
): ValidationResult {
  const warnings: string[] = [];
  const corrections: string[] = [];
  
  const maxOverlays = options?.maxOverlays ?? 3;
  const maxTextBlocks = options?.maxTextBlocks ?? 5;
  const strictSafeArea = options?.strictSafeArea ?? true;
  const enforceProductHeightRule = options?.enforceProductHeightRule ?? false;
  const enforcePresetBadgeNoOverlap = options?.enforcePresetBadgeNoOverlap ?? false;
  
  const canvas = {
    width: layout.canvas.width || DEFAULT_CANVAS_WIDTH,
    height: layout.canvas.height || DEFAULT_CANVAS_HEIGHT,
  };
  const margin = layout.safeArea.margin || DEFAULT_SAFE_MARGIN;
  
  // 1) Normalize product placement
  const product = normalizeProduct(layout.product, canvas, margin, corrections);
  
  // 2) Normalize text blocks
  let textBlocks = layout.textBlocks.slice(0, maxTextBlocks).map((tb, idx) => 
    normalizeTextBlock(tb, canvas, margin, corrections, strictSafeArea, idx)
  );
  
  // 3) Check for text/product overlaps
  const productBox: BoundingBox = {
    x: product.x,
    y: product.y,
    w: product.width,
    h: product.height,
  };
  
  textBlocks = textBlocks.map((tb) => {
    const textBox: BoundingBox = { x: tb.x, y: tb.y, w: tb.w, h: tb.h };
    if (boxesOverlap(productBox, textBox)) {
      const corrected = resolveOverlap(textBox, productBox, canvas, margin);
      corrections.push(`TextBlock "${tb.id}" movido de (${tb.x},${tb.y}) a (${corrected.x},${corrected.y}) para evitar overlap con producto`);
      return { ...tb, x: corrected.x, y: corrected.y, w: corrected.w, h: corrected.h };
    }
    return tb;
  });
  
  // 4) Normalize overlays
  let overlays = layout.overlays.slice(0, maxOverlays).map((ov, idx) =>
    normalizeOverlay(ov, canvas, corrections, idx)
  );
  
  // 5) Check if any text block needs contrast overlay
  const needsOverlay = textBlocks.some(tb => !hasAdequateOverlay(tb, overlays));
  if (needsOverlay && overlays.length < maxOverlays) {
    // Find primary text block (headline) and add gradient if missing
    const headline = textBlocks.find(tb => tb.id === "headline");
    if (headline) {
      const existingOverlay = overlays.find(ov => boxesOverlap(
        { x: ov.x, y: ov.y, w: ov.w, h: ov.h },
        { x: headline.x, y: headline.y, w: headline.w, h: headline.h }
      ));
      if (!existingOverlay) {
        overlays.push(createContrastOverlay(headline, canvas));
        corrections.push("Agregado overlay de contraste para headline");
      }
    }
  }
  
  // 6) Validate confidence
  let confidence = layout.confidence;
  if (confidence < MIN_CONFIDENCE) {
    warnings.push(`Confidence ${confidence.toFixed(2)} está por debajo del umbral ${MIN_CONFIDENCE}`);
  }
  
  // 7) Update warnings array
  let allWarnings = [...(layout.warnings || []), ...warnings];
  
  let normalized: LayoutSpec = {
    version: "1",
    canvas,
    safeArea: { margin },
    product,
    textBlocks,
    overlays,
    confidence,
    rationale: layout.rationale || "",
    warnings: allWarnings,
  };

  if (enforceProductHeightRule) {
    const productBefore = normalized.product;
    normalized = enforceProductHeightRatio(normalized);

    if (
      normalized.product.width !== productBefore.width ||
      normalized.product.height !== productBefore.height ||
      normalized.product.x !== productBefore.x ||
      normalized.product.y !== productBefore.y
    ) {
      const ratio = normalized.product.height / normalized.canvas.height;
      corrections.push(`Hard rule aplicada: productHeightRatio ajustado a ${ratio.toFixed(3)}`);

      const productBoxAfter: BoundingBox = {
        x: normalized.product.x,
        y: normalized.product.y,
        w: normalized.product.width,
        h: normalized.product.height,
      };

      const adjustedTextBlocks = normalized.textBlocks.map((tb) => {
        const textBox: BoundingBox = { x: tb.x, y: tb.y, w: tb.w, h: tb.h };
        if (boxesOverlap(productBoxAfter, textBox)) {
          const corrected = resolveOverlap(textBox, productBoxAfter, canvas, margin);
          corrections.push(`TextBlock "${tb.id}" re-ajustado tras hard rule de producto`);
          return { ...tb, x: corrected.x, y: corrected.y, w: corrected.w, h: corrected.h };
        }
        return tb;
      });

      normalized = {
        ...normalized,
        textBlocks: adjustedTextBlocks,
      };
    }
  }

  if (enforcePresetBadgeNoOverlap) {
    const badgeRuleResult = enforceBadgeNoOverlapWithCopy(normalized);
    normalized = badgeRuleResult.layout;
    if (badgeRuleResult.corrections.length > 0) {
      corrections.push(...badgeRuleResult.corrections);
    }
    if (badgeRuleResult.warning) {
      allWarnings = [...allWarnings, badgeRuleResult.warning];
      normalized = {
        ...normalized,
        warnings: allWarnings,
      };
    }
  }
  
  logger.debug("Layout normalized", {
    corrections: corrections.length,
    warnings: allWarnings.length,
    confidence,
  });
  
  return {
    valid: confidence >= MIN_CONFIDENCE && corrections.length < 10,
    normalized,
    warnings: allWarnings,
    corrections,
  };
}

function enforceProductHeightRatio(layout: LayoutSpec): LayoutSpec {
  const canvas = layout.canvas;
  const margin = layout.safeArea.margin || DEFAULT_SAFE_MARGIN;
  const product = layout.product;

  if (!canvas.width || !canvas.height || product.height <= 0 || product.width <= 0) {
    return layout;
  }

  const canvasRatio = canvas.width / canvas.height;
  const isFourByFive = Math.abs(canvasRatio - 0.8) <= 0.03;
  if (!isFourByFive) {
    return layout;
  }

  const currentRatio = product.height / canvas.height;
  if (currentRatio >= 0.52 && currentRatio <= 0.62) {
    return layout;
  }

  const targetRatio = currentRatio < 0.52 ? 0.56 : 0.60;
  const aspectRatio = product.width / product.height;

  let nextHeight = Math.round(canvas.height * targetRatio);
  let nextWidth = Math.round(nextHeight * aspectRatio);

  const maxAllowedWidth = Math.max(1, canvas.width - margin * 2);
  const maxAllowedHeight = Math.max(1, canvas.height - margin * 2);

  if (nextWidth > maxAllowedWidth || nextHeight > maxAllowedHeight) {
    const fitScale = Math.min(maxAllowedWidth / nextWidth, maxAllowedHeight / nextHeight);
    nextWidth = Math.max(1, Math.floor(nextWidth * fitScale));
    nextHeight = Math.max(1, Math.floor(nextHeight * fitScale));
  }

  const oldCenterX = product.x + product.width / 2;
  const oldCenterY = product.y + product.height / 2;
  const oldBottomY = product.y + product.height;
  const oldTopY = product.y;

  let nextX = product.x;
  let nextY = product.y;

  switch (product.anchor) {
    case "bottom_center":
    case "floor":
    case "table": {
      nextX = oldCenterX - nextWidth / 2;
      nextY = oldBottomY - nextHeight;
      break;
    }
    case "top_center": {
      nextX = oldCenterX - nextWidth / 2;
      nextY = oldTopY;
      break;
    }
    case "center":
    case "center_left":
    case "center_right":
    case "floating":
    default: {
      nextX = oldCenterX - nextWidth / 2;
      nextY = oldCenterY - nextHeight / 2;
      break;
    }
  }

  const maxX = canvas.width - margin - nextWidth;
  const maxY = canvas.height - margin - nextHeight;

  nextX = Math.max(margin, Math.min(maxX, nextX));
  nextY = Math.max(margin, Math.min(maxY, nextY));

  const scaleFactor = nextHeight / product.height;

  return {
    ...layout,
    product: {
      ...product,
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
      scale: product.scale * scaleFactor,
    },
  };
}

function enforceBadgeNoOverlapWithCopy(layout: LayoutSpec): {
  layout: LayoutSpec;
  warning?: string;
  corrections: string[];
} {
  const corrections: string[] = [];
  const badgeIdx = layout.textBlocks.findIndex((tb) => tb.id === "badge");
  if (badgeIdx < 0) {
    return { layout, corrections };
  }

  const copyBlockIndices = layout.textBlocks
    .map((tb, idx) => ({ tb, idx }))
    .filter(({ tb }) => tb.id === "headline" || tb.id === "subheadline")
    .map(({ idx }) => idx);

  if (copyBlockIndices.length === 0) {
    return { layout, corrections };
  }

  const margin = layout.safeArea.margin || DEFAULT_SAFE_MARGIN;
  const safeBottom = layout.canvas.height - margin;
  const textBlocks = layout.textBlocks.map((tb) => ({ ...tb }));

  const hasCopyOverlap = (badgeBlock: TextBlock): boolean => {
    const badgeBox: BoundingBox = { x: badgeBlock.x, y: badgeBlock.y, w: badgeBlock.w, h: badgeBlock.h };
    return copyBlockIndices.some((idx) => {
      const copy = textBlocks[idx];
      const copyBox: BoundingBox = { x: copy.x, y: copy.y, w: copy.w, h: copy.h };
      return boxesOverlap(badgeBox, copyBox);
    });
  };

  let badge = { ...textBlocks[badgeIdx] };
  if (!hasCopyOverlap(badge)) {
    return { layout, corrections };
  }

  // --- FIX: Anclar badge al bottom safe-area ---
  badge.y = layout.canvas.height - margin - badge.h;
  corrections.push("badge_anchor_bottom");
  textBlocks[badgeIdx] = badge;

  // Recalcular overlap
  if (!hasCopyOverlap(badge)) {
    return {
      layout: {
        ...layout,
        textBlocks,
      },
      corrections,
    };
  }

  // --- FIX: shrink headline/subheadline si copyBottom > badge.y - gap ---
  const gap = 12;
  const copyMaxBottom = badge.y - gap;
  let headlineIdx = textBlocks.findIndex(tb => tb.id === "headline");
  let subheadlineIdx = textBlocks.findIndex(tb => tb.id === "subheadline");
  let headline = textBlocks[headlineIdx];
  let subheadline = textBlocks[subheadlineIdx];
  let changed = false;
  // shrink headline fontSize
  while (headline.fontSize > 40 && (subheadline.y + subheadline.h > copyMaxBottom)) {
    headline.fontSize -= 4;
    changed = true;
    corrections.push("shrink_headline");
  }
  // shrink subheadline fontSize
  while (subheadline.fontSize > 18 && (subheadline.y + subheadline.h > copyMaxBottom)) {
    subheadline.fontSize -= 2;
    changed = true;
    corrections.push("shrink_subheadline");
  }
  // reduce headline maxLines
  if (headline.maxLines > 2 && (subheadline.y + subheadline.h > copyMaxBottom)) {
    headline.maxLines = 2;
    changed = true;
    corrections.push("reduce_headline_lines");
  }
  // reduce subheadline maxLines
  if (subheadline.maxLines > 1 && (subheadline.y + subheadline.h > copyMaxBottom)) {
    subheadline.maxLines = 1;
    changed = true;
    corrections.push("reduce_subheadline_lines");
  }
  // mover headline.y hacia arriba si sigue overflow
  if (subheadline.y + subheadline.h > copyMaxBottom) {
    const delta = (subheadline.y + subheadline.h) - copyMaxBottom;
    headline.y = Math.max(margin, headline.y - delta);
    changed = true;
    corrections.push("move_headline_up");
  }
  textBlocks[headlineIdx] = headline;
  textBlocks[subheadlineIdx] = subheadline;

  return {
    layout: {
      ...layout,
      textBlocks,
    },
    corrections,
  };
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT NORMALIZATION
═══════════════════════════════════════════════════════════════ */

function normalizeProduct(
  product: ProductPlacement,
  canvas: { width: number; height: number },
  margin: number,
  corrections: string[]
): ProductPlacement {
  let { x, y, width, height, scale, rotation } = product;
  
  // Clamp scale
  if (scale < MIN_SCALE) {
    corrections.push(`Product scale ${scale} clamped to ${MIN_SCALE}`);
    scale = MIN_SCALE;
  }
  if (scale > MAX_SCALE) {
    corrections.push(`Product scale ${scale} clamped to ${MAX_SCALE}`);
    scale = MAX_SCALE;
  }
  
  // Clamp rotation
  rotation = Math.max(-45, Math.min(45, rotation || 0));
  
  // Ensure product fits in canvas (basic bounds check)
  const maxX = canvas.width - margin - width;
  const maxY = canvas.height - margin - height;
  
  if (x < margin) {
    corrections.push(`Product x ${x} clamped to margin ${margin}`);
    x = margin;
  }
  if (x > maxX && maxX > margin) {
    corrections.push(`Product x ${x} clamped to ${maxX}`);
    x = maxX;
  }
  
  if (y < margin) {
    corrections.push(`Product y ${y} clamped to margin ${margin}`);
    y = margin;
  }
  if (y > maxY && maxY > margin) {
    corrections.push(`Product y ${y} clamped to ${maxY}`);
    y = maxY;
  }
  
  return {
    ...product,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    scale,
    rotation,
  };
}

/* ═══════════════════════════════════════════════════════════════
   TEXT BLOCK NORMALIZATION
═══════════════════════════════════════════════════════════════ */

function normalizeTextBlock(
  tb: TextBlock,
  canvas: { width: number; height: number },
  margin: number,
  corrections: string[],
  strictSafeArea: boolean,
  idx: number
): TextBlock {
  let { x, y, w, h, fontSize, maxLines, lineHeight, letterSpacing } = tb;
  const minMargin = strictSafeArea ? margin : 0;
  
  // Clamp position
  if (x < minMargin) {
    corrections.push(`TextBlock[${idx}] x ${x} clamped to ${minMargin}`);
    x = minMargin;
  }
  if (y < minMargin) {
    corrections.push(`TextBlock[${idx}] y ${y} clamped to ${minMargin}`);
    y = minMargin;
  }
  
  // Ensure width doesn't exceed canvas bounds
  const maxWidth = canvas.width - x - minMargin;
  if (w > maxWidth) {
    corrections.push(`TextBlock[${idx}] width ${w} clamped to ${maxWidth}`);
    w = maxWidth;
  }
  
  // Ensure height doesn't exceed canvas bounds
  const maxHeight = canvas.height - y - minMargin;
  if (h > maxHeight) {
    corrections.push(`TextBlock[${idx}] height ${h} clamped to ${maxHeight}`);
    h = maxHeight;
  }
  
  // Clamp font size
  fontSize = Math.max(12, Math.min(200, fontSize || 48));
  maxLines = Math.max(1, Math.min(10, maxLines || 2));
  lineHeight = Math.max(0.8, Math.min(2, lineHeight || 1.2));
  letterSpacing = Math.max(-0.1, Math.min(0.3, letterSpacing || 0));
  
  return {
    ...tb,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    fontSize,
    maxLines,
    lineHeight,
    letterSpacing,
  };
}

/* ═══════════════════════════════════════════════════════════════
   OVERLAY NORMALIZATION
═══════════════════════════════════════════════════════════════ */

function normalizeOverlay(
  ov: Overlay,
  canvas: { width: number; height: number },
  corrections: string[],
  idx: number
): Overlay {
  let { x, y, w, h, opacity } = ov;
  
  // Clamp position and size
  x = Math.max(0, Math.min(canvas.width, x || 0));
  y = Math.max(0, Math.min(canvas.height, y || 0));
  w = Math.max(1, Math.min(canvas.width - x, w || canvas.width));
  h = Math.max(1, Math.min(canvas.height - y, h || canvas.height));
  opacity = Math.max(0, Math.min(1, opacity ?? 0.5));
  
  return {
    ...ov,
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
    opacity,
  };
}

/* ═══════════════════════════════════════════════════════════════
   OVERLAP DETECTION & RESOLUTION
═══════════════════════════════════════════════════════════════ */

function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function resolveOverlap(
  textBox: BoundingBox,
  productBox: BoundingBox,
  canvas: { width: number; height: number },
  margin: number
): BoundingBox {
  // Calculate distances to move text to each side of product
  const moveOptions = [
    // Move left of product
    { x: margin, y: textBox.y, w: Math.min(textBox.w, productBox.x - margin - 20), h: textBox.h },
    // Move right of product
    { x: productBox.x + productBox.w + 20, y: textBox.y, w: Math.min(textBox.w, canvas.width - productBox.x - productBox.w - margin - 20), h: textBox.h },
    // Move above product
    { x: textBox.x, y: margin, w: textBox.w, h: Math.min(textBox.h, productBox.y - margin - 20) },
    // Move below product
    { x: textBox.x, y: productBox.y + productBox.h + 20, w: textBox.w, h: Math.min(textBox.h, canvas.height - productBox.y - productBox.h - margin - 20) },
  ];
  
  // Find the option with most available space
  const validOptions = moveOptions.filter(opt => 
    opt.w > 100 && opt.h > 30 && 
    opt.x >= margin && opt.y >= margin &&
    opt.x + opt.w <= canvas.width - margin &&
    opt.y + opt.h <= canvas.height - margin
  );
  
  if (validOptions.length > 0) {
    // Prefer moving above or below (preserves x position)
    const verticalOptions = validOptions.filter(opt => opt.x === textBox.x);
    if (verticalOptions.length > 0) {
      return verticalOptions.sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
    }
    return validOptions.sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
  }
  
  // Fallback: move to top-left safe area
  return {
    x: margin,
    y: margin,
    w: Math.min(textBox.w, canvas.width - 2 * margin),
    h: Math.min(textBox.h, canvas.height / 4),
  };
}

/* ═══════════════════════════════════════════════════════════════
   CONTRAST HELPERS
═══════════════════════════════════════════════════════════════ */

function hasAdequateOverlay(textBlock: TextBlock, overlays: Overlay[]): boolean {
  const textBox: BoundingBox = { x: textBlock.x, y: textBlock.y, w: textBlock.w, h: textBlock.h };
  
  for (const ov of overlays) {
    const ovBox: BoundingBox = { x: ov.x, y: ov.y, w: ov.w, h: ov.h };
    if (boxesOverlap(textBox, ovBox) && ov.opacity >= 0.3) {
      return true;
    }
  }
  
  // If text has a background, it has contrast
  if (textBlock.background && textBlock.background.type !== "none") {
    return true;
  }
  
  return false;
}

function createContrastOverlay(
  textBlock: TextBlock,
  canvas: { width: number; height: number }
): Overlay {
  // Determine overlay position based on text position
  const isTop = textBlock.y < canvas.height / 2;
  
  if (isTop) {
    // Gradient from top
    return {
      type: "linearGradient",
      x: 0,
      y: 0,
      w: canvas.width,
      h: Math.min(textBlock.y + textBlock.h + 100, canvas.height / 2),
      opacity: 0.6,
      direction: "bottom",
      color: "rgba(0,0,0,0.7)",
    };
  } else {
    // Gradient from bottom
    const startY = Math.max(textBlock.y - 100, canvas.height / 2);
    return {
      type: "linearGradient",
      x: 0,
      y: startY,
      w: canvas.width,
      h: canvas.height - startY,
      opacity: 0.7,
      direction: "top",
      color: "rgba(0,0,0,0.85)",
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY EXPORTS
═══════════════════════════════════════════════════════════════ */

export { boxesOverlap, createContrastOverlay };

export function scaleLayoutToCanvas(
  layout: LayoutSpec,
  targetW: number,
  targetH: number
): LayoutSpec {
  if (layout.canvas.width === targetW && layout.canvas.height === targetH) {
    return layout;
  }

  const sourceW = layout.canvas.width || DEFAULT_CANVAS_WIDTH;
  const sourceH = layout.canvas.height || DEFAULT_CANVAS_HEIGHT;
  if (sourceW <= 0 || sourceH <= 0 || targetW <= 0 || targetH <= 0) {
    return layout;
  }

  const scaleX = targetW / sourceW;
  const scaleY = targetH / sourceH;
  const scale = Math.min(scaleX, scaleY);

  const product = {
    ...layout.product,
    x: Math.round(layout.product.x * scaleX),
    y: Math.round(layout.product.y * scaleY),
    width: Math.max(1, Math.round(layout.product.width * scaleX)),
    height: Math.max(1, Math.round(layout.product.height * scaleY)),
  };

  const textBlocks = layout.textBlocks.map((tb) => ({
    ...tb,
    x: Math.round(tb.x * scaleX),
    y: Math.round(tb.y * scaleY),
    w: Math.max(1, Math.round(tb.w * scaleX)),
    h: Math.max(1, Math.round(tb.h * scaleY)),
    fontSize: Math.max(12, Math.round(tb.fontSize * scaleY)),
    background: tb.background
      ? {
          ...tb.background,
          padding: Math.max(0, Math.round(tb.background.padding * scale)),
          radius: Math.max(0, Math.round(tb.background.radius * scale)),
        }
      : tb.background,
  }));

  const overlays = layout.overlays.map((ov) => ({
    ...ov,
    x: Math.round(ov.x * scaleX),
    y: Math.round(ov.y * scaleY),
    w: Math.max(1, Math.round(ov.w * scaleX)),
    h: Math.max(1, Math.round(ov.h * scaleY)),
  }));

  return {
    ...layout,
    canvas: {
      width: targetW,
      height: targetH,
    },
    safeArea: {
      margin: Math.max(0, Math.round(layout.safeArea.margin * scale)),
    },
    product,
    textBlocks,
    overlays,
  };
}

export function flowPresetCopy(
  layout: LayoutSpec,
  opts?: { gap?: number; autoShrinkMin?: number }
): LayoutSpec {
  const headlineIdx = layout.textBlocks.findIndex((tb) => tb.id === "headline");
  const subheadlineIdx = layout.textBlocks.findIndex((tb) => tb.id === "subheadline");
  if (headlineIdx < 0 || subheadlineIdx < 0) {
    return layout;
  }
  const aspect = layout.canvas.width / layout.canvas.height;
  const gap = aspect > 0.95 && aspect < 1.05 ? 10 : 12; // 1:1 vs 4:5
  const autoShrinkMin = opts?.autoShrinkMin ?? 0.6;
  const margin = layout.safeArea.margin || DEFAULT_SAFE_MARGIN;
  const safeBottom = layout.canvas.height - margin;
  const textBlocks = layout.textBlocks.map((tb) => ({ ...tb }));
  const headline = { ...textBlocks[headlineIdx] };
  let subheadline = { ...textBlocks[subheadlineIdx] };
  // --- Hard invariant: subheadline.y >= headline.y + estimatedHeadlineHeight + gap ---
  const linesUsedEst = Math.min(headline.maxLines, 2);
  const headlineHeightEst = Math.round(headline.fontSize * headline.lineHeight * linesUsedEst);
  let desiredSubheadlineY = headline.y + headlineHeightEst + gap;
  let flowFixApplied = false;
  if (subheadline.y < desiredSubheadlineY) {
    subheadline.y = desiredSubheadlineY;
    flowFixApplied = true;
  }
  // Nunca permitir headline.y === subheadline.y
  if (subheadline.y === headline.y) {
    subheadline.y += 1;
    flowFixApplied = true;
  }
  // Clamp to safe area
  const maxSubheadlineY = Math.max(margin, safeBottom - subheadline.h);
  if (subheadline.y > maxSubheadlineY) {
    subheadline.y = maxSubheadlineY;
    flowFixApplied = true;
  }
  textBlocks[subheadlineIdx] = subheadline;
  // Opcional: debug info (puedes agregarlo al layout si lo deseas)
  // layout._flowDebug = { flowFixApplied, headlineHeightEst, gap };
  return { ...layout, textBlocks };
}

/**
 * Check if a layout should be rejected and fallback used
 */
export function shouldUseFallback(layout: LayoutSpec): boolean {
  return layout.confidence < MIN_CONFIDENCE;
}

/**
 * Merge copy text into text blocks
 */
export function applyTextContent(
  layout: LayoutSpec,
  copy: {
    headline?: string;
    subheadline?: string;
    cta?: string;
    badge?: string;
    disclaimer?: string;
  }
): LayoutSpec {
  const textBlocks = layout.textBlocks.map(tb => {
    const content = copy[tb.id as keyof typeof copy];
    if (content) {
      return { ...tb, content };
    }
    return tb;
  });
  
  return { ...layout, textBlocks };
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSITION QUALITY ANALYSIS
═══════════════════════════════════════════════════════════════ */

export interface CompositionAnalysis {
  score: number;           // 0-1, higher is better
  issues: string[];        // List of composition issues found
  suggestions: string[];   // Suggested fixes
}

/**
 * Analyze visual composition quality of a layout
 */
export function analyzeComposition(layout: LayoutSpec): CompositionAnalysis {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;
  
  const canvas = layout.canvas;
  const product = layout.product;
  const textBlocks = layout.textBlocks;
  const margin = layout.safeArea.margin;
  
  // 1) Check product size - should be prominent
  const productArea = product.width * product.height;
  const canvasArea = canvas.width * canvas.height;
  const productRatio = productArea / canvasArea;
  
  if (productRatio < 0.08) {
    issues.push(`Producto muy pequeño (${Math.round(productRatio * 100)}% del canvas)`);
    suggestions.push("Aumentar scale del producto a 0.5-0.7");
    score -= 0.2;
  } else if (productRatio < 0.15) {
    issues.push(`Producto podría ser más grande (${Math.round(productRatio * 100)}% del canvas)`);
    score -= 0.1;
  }
  
  // 2) Check for dead space (large empty areas)
  const textBottomY = Math.max(...textBlocks.map(tb => tb.y + tb.h), 0);
  const productTopY = product.y;
  const gapBetweenTextAndProduct = productTopY - textBottomY;
  
  if (gapBetweenTextAndProduct > canvas.height * 0.3) {
    issues.push(`Espacio vacío excesivo (${Math.round(gapBetweenTextAndProduct)}px entre texto y producto)`);
    suggestions.push("Mover producto más arriba o agregar elemento visual en el medio");
    score -= 0.2;
  }
  
  // 3) Check CTA truncation risk
  const cta = textBlocks.find(tb => tb.id === "cta");
  if (cta && cta.content) {
    const estimatedTextWidth = estimateTextWidth(cta.content, cta.fontSize, cta.fontWeight);
    const availableWidth = cta.w - (cta.background?.padding || 0) * 2;
    
    if (estimatedTextWidth > availableWidth) {
      issues.push(`CTA truncado: "${cta.content}" (${Math.round(estimatedTextWidth)}px > ${availableWidth}px disponibles)`);
      suggestions.push(`Aumentar ancho del CTA a ${Math.round(estimatedTextWidth + 40)}px o reducir texto`);
      score -= 0.25;
    }
  }
  
  // 4) Check product positioning - shouldn't be too close to edges
  if (product.y + product.height > canvas.height - margin / 2) {
    issues.push("Producto demasiado cerca del borde inferior");
    suggestions.push("Subir el producto al menos 32px");
    score -= 0.1;
  }
  
  // 5) Check visual balance (rule of thirds)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const productCenterX = product.x + product.width / 2;
  const productCenterY = product.y + product.height / 2;
  
  // Product should be in bottom 2/3 or center 
  if (productCenterY < canvas.height * 0.33) {
    issues.push("Producto posicionado muy arriba");
    score -= 0.1;
  }
  
  // 6) Check headline visibility
  const headline = textBlocks.find(tb => tb.id === "headline");
  if (headline) {
    if (headline.y < margin) {
      issues.push("Headline fuera de área segura");
      score -= 0.15;
    }
    if (headline.w < canvas.width * 0.5) {
      issues.push("Headline muy estrecho");
      suggestions.push("Aumentar ancho del headline para mejor legibilidad");
      score -= 0.1;
    }
  }
  
  return {
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

/**
 * Estimate text width using character width table
 */
function estimateTextWidth(text: string, fontSize: number, fontWeight: string): number {
  const CHAR_WIDTHS: Record<string, number> = {
    'i': 0.25, 'l': 0.25, 'I': 0.28, '!': 0.28, '.': 0.28, ',': 0.28, ':': 0.28,
    'j': 0.28, 'f': 0.32, 't': 0.35, 'r': 0.38, '1': 0.45,
    's': 0.48, 'c': 0.50, 'a': 0.52, 'e': 0.52, 'o': 0.55, 'n': 0.55, 'u': 0.55,
    'z': 0.48, 'x': 0.50, 'v': 0.50, 'y': 0.50, 'k': 0.52, 'h': 0.55, 'b': 0.55, 
    'd': 0.55, 'p': 0.55, 'q': 0.55, 'g': 0.55,
    'w': 0.72, 'm': 0.82, 'W': 0.95, 'M': 0.88,
    'A': 0.65, 'B': 0.62, 'C': 0.65, 'D': 0.68, 'E': 0.55, 'F': 0.52, 'G': 0.70,
    'H': 0.70, 'J': 0.45, 'K': 0.62, 'L': 0.52, 'N': 0.70, 'O': 0.72, 'P': 0.58,
    'Q': 0.72, 'R': 0.62, 'S': 0.55, 'T': 0.58, 'U': 0.68, 'V': 0.62, 'X': 0.62,
    'Y': 0.58, 'Z': 0.58,
    '0': 0.55, '2': 0.55, '3': 0.55, '4': 0.55, '5': 0.55, '6': 0.55, '7': 0.55,
    '8': 0.55, '9': 0.55,
    ' ': 0.28, '-': 0.35, '%': 0.85, '@': 0.90, '&': 0.70,
  };
  const DEFAULT_WIDTH = 0.55;
  const isBold = fontWeight === "bold" || fontWeight === "700" || fontWeight === "800" || fontWeight === "900";
  
  let width = 0;
  for (const char of text) {
    width += (CHAR_WIDTHS[char] ?? DEFAULT_WIDTH) * fontSize;
  }
  
  return width * (isBold ? 1.08 : 1);
}

/**
 * Auto-fix common composition issues
 */
export function autoFixComposition(layout: LayoutSpec): { layout: LayoutSpec; fixes: string[] } {
  const fixes: string[] = [];
  const analysis = analyzeComposition(layout);
  
  // If score is good, no fixes needed
  if (analysis.score >= 0.8) {
    return { layout, fixes: [] };
  }
  
  const canvas = layout.canvas;
  const margin = layout.safeArea.margin;
  let product = { ...layout.product };
  let textBlocks = layout.textBlocks.map(tb => ({ ...tb }));
  
  // Fix 1: Enlarge small products
  const productArea = product.width * product.height;
  const canvasArea = canvas.width * canvas.height;
  if (productArea / canvasArea < 0.08) {
    const targetScale = Math.min(product.scale * 1.5, 0.7);
    const scaleMultiplier = targetScale / product.scale;
    product.width = Math.round(product.width * scaleMultiplier);
    product.height = Math.round(product.height * scaleMultiplier);
    product.scale = targetScale;
    // Adjust Y to keep bottom aligned
    product.y = Math.max(margin, product.y - (product.height * (scaleMultiplier - 1)));
    fixes.push(`Producto escalado de ${product.scale / scaleMultiplier} a ${targetScale}`);
  }
  
  // Fix 2: Reduce dead space by moving product up
  const textBottomY = Math.max(...textBlocks.map(tb => tb.y + tb.h), margin);
  const gapBetweenTextAndProduct = product.y - textBottomY;
  const maxAcceptableGap = canvas.height * 0.25;
  
  if (gapBetweenTextAndProduct > maxAcceptableGap) {
    const newY = Math.round(textBottomY + maxAcceptableGap);
    fixes.push(`Producto movido de y:${product.y} a y:${newY}`);
    product.y = newY;
  }
  
  // Fix 3: Widen truncated CTAs
  const ctaIdx = textBlocks.findIndex(tb => tb.id === "cta");
  if (ctaIdx >= 0) {
    const cta = textBlocks[ctaIdx];
    if (cta.content) {
      const estimatedWidth = estimateTextWidth(cta.content, cta.fontSize, cta.fontWeight);
      const minWidth = estimatedWidth + (cta.background?.padding || 16) * 2 + 20;
      
      if (cta.w < minWidth) {
        textBlocks[ctaIdx] = {
          ...cta,
          w: Math.min(Math.round(minWidth), canvas.width - margin * 2),
        };
        fixes.push(`CTA ensanchado de ${cta.w}px a ${textBlocks[ctaIdx].w}px`);
      }
    }
  }
  
  // Fix 4: Ensure product doesn't get cut off at bottom
  if (product.y + product.height > canvas.height) {
    const newY = canvas.height - product.height - 20;
    fixes.push(`Producto reposicionado verticalmente para evitar corte`);
    product.y = Math.max(margin, newY);
  }
  
  return {
    layout: {
      ...layout,
      product,
      textBlocks,
    },
    fixes,
  };
}
