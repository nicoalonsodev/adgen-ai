/**
 * Preset to LayoutSpec Converter
 * 
 * Converts a parametric preset (with relative zones) into an absolute LayoutSpec
 * that can be rendered by the compose pipeline.
 * 
 * NO AI - pure mathematical conversion.
 */

import type { Preset, RelativeZone, TextBlockPresetConfig, BadgePresetConfig } from "./presets/types";
import type { LayoutSpec, TextBlock, Overlay, ProductPlacement } from "./layoutSpec";
import { getPreset, getPresetVariant } from "./presets";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "presetToLayout" });

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface PresetToLayoutInput {
  presetId: string;
  canvas: {
    width: number;
    height: number;
  };
  productMeta: {
    width: number;
    height: number;
  };
  productContentBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  copy: {
    headline?: string;
    subheadline?: string;
    cta?: string;
    badge?: string;
    disclaimer?: string;
  };
}

export interface PresetToLayoutOutput {
  layout: LayoutSpec;
  presetUsed: string;
  aspectRatioVariant?: string;
  computedProductScale: number;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

/**
 * Convert relative zone (percentages) to absolute pixels.
 */
function zoneToPixels(
  zone: RelativeZone,
  canvas: { width: number; height: number }
): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.round((zone.x / 100) * canvas.width),
    y: Math.round((zone.y / 100) * canvas.height),
    w: Math.round((zone.w / 100) * canvas.width),
    h: Math.round((zone.h / 100) * canvas.height),
  };
}

/**
 * Detect aspect ratio from canvas dimensions.
 */
function detectAspectRatio(canvas: { width: number; height: number }): "4:5" | "1:1" | "9:16" | "16:9" {
  const ratio = canvas.width / canvas.height;
  
  if (Math.abs(ratio - 1) < 0.05) return "1:1";
  if (Math.abs(ratio - 0.8) < 0.05) return "4:5";       // 1080x1350
  if (Math.abs(ratio - 0.5625) < 0.05) return "9:16";   // 1080x1920
  if (Math.abs(ratio - 1.7778) < 0.05) return "16:9";   // 1920x1080
  
  // Default to closest
  if (ratio < 0.7) return "9:16";
  if (ratio < 0.9) return "4:5";
  if (ratio < 1.3) return "1:1";
  return "16:9";
}

/**
 * Apply variant overrides to a zone.
 */
function applyZoneOverride(
  baseZone: RelativeZone,
  override?: Partial<RelativeZone>
): RelativeZone {
  if (!override) return baseZone;
  return {
    x: override.x ?? baseZone.x,
    y: override.y ?? baseZone.y,
    w: override.w ?? baseZone.w,
    h: override.h ?? baseZone.h,
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

/**
 * Convert a preset + inputs into a fully resolved LayoutSpec.
 */
export function presetToLayout(input: PresetToLayoutInput): PresetToLayoutOutput {
  const { presetId, canvas, productMeta, productContentBox, copy } = input;
  
  logger.info("Converting preset to layout", { presetId, canvas, productSize: productMeta });
  
  // 1) Load and validate preset
  const preset = getPreset(presetId);
  
  // 2) Detect aspect ratio and get variant if available
  const aspectRatio = detectAspectRatio(canvas);
  const variant = getPresetVariant(preset, aspectRatio);
  
  logger.debug("Aspect ratio detected", { aspectRatio, hasVariant: !!variant });
  
  // 3) Resolve product zone (with variant override if exists)
  const productZone = applyZoneOverride(
    preset.product.zone,
    variant?.overrides?.product?.zone
  );
  const productZonePx = zoneToPixels(productZone, canvas);
  
  // 4) Calculate product scale using CONTENT bounding box (alpha), with preset clamps
  const { min: minScale, max: maxScale } = preset.product.scaleRange;

  const contentHeight = Math.max(1, productContentBox?.height ?? productMeta.height);
  const targetContentHeight = canvas.height * 0.56;

  let productScale = targetContentHeight / contentHeight;
  productScale = Math.max(minScale, Math.min(maxScale, productScale));
  
  // Calculate actual product size
  let productWidth = Math.round(productMeta.width * productScale);
  let productHeight = Math.round(productMeta.height * productScale);
  
  const maxScaleByZone = Math.min(
    productZonePx.w / Math.max(1, productMeta.width),
    productZonePx.h / Math.max(1, productMeta.height)
  );

  if (productScale > maxScaleByZone) {
    productScale = maxScaleByZone;
    productWidth = Math.round(productMeta.width * productScale);
    productHeight = Math.round(productMeta.height * productScale);
  }
  
  // 5) Center product within its zone
  const productX = productZonePx.x + Math.round((productZonePx.w - productWidth) / 2);
  const productY = productZonePx.y + Math.round((productZonePx.h - productHeight) / 2);
  
  logger.debug("Product placement computed", {
    zone: productZonePx,
    finalSize: { w: productWidth, h: productHeight },
    position: { x: productX, y: productY },
    scale: productScale,
    contentHeight,
    targetContentHeight,
    contentHeightRatio: (contentHeight * productScale) / canvas.height,
  });
  
  // 6) Build product placement
  const productPlacement: ProductPlacement = {
    anchor: mapAnchor(preset.product.anchor),
    x: productX,
    y: productY,
    width: productWidth,
    height: productHeight,
    scale: productScale,
    rotation: 0,
    shadow: {
      drop: preset.product.shadow.drop.enabled ? {
        enabled: true,
        blur: preset.product.shadow.drop.blur,
        opacity: preset.product.shadow.drop.opacity,
        offsetX: 0,
        offsetY: preset.product.shadow.drop.offsetY,
        color: "rgba(0,0,0,0.5)",
      } : undefined,
      contact: preset.product.shadow.contact.enabled ? {
        enabled: true,
        blur: preset.product.shadow.contact.blur,
        opacity: preset.product.shadow.contact.opacity,
        width: 0.7,
        height: 0.12,
        offsetY: 3,
      } : undefined,
    },
  };
  
  // 7) Build text blocks
  const textBlocks: TextBlock[] = [];
  
  for (const textConfig of preset.textBlocks) {
    // Get variant override if exists
    const variantOverride = variant?.overrides?.textBlocks?.find(t => t.id === textConfig.id);
    const textZone = applyZoneOverride(textConfig.zone, variantOverride?.zone);
    const textZonePx = zoneToPixels(textZone, canvas);
    const fontSize = variantOverride?.baseFontSize ?? textConfig.baseFontSize;
    
    // Get copy content
    const content = copy[textConfig.id as keyof typeof copy];
    if (!content) continue; // Skip if no content provided
    
    const textBlock: TextBlock = {
      id: textConfig.id,
      content,
      x: textZonePx.x,
      y: textZonePx.y,
      w: textZonePx.w,
      h: textZonePx.h,
      align: textConfig.align,
      color: textConfig.color,
      fontFamily: textConfig.fontFamily,
      fontWeight: textConfig.fontWeight,
      fontSize,
      maxLines: textConfig.maxLines,
      lineHeight: textConfig.lineHeight,
      letterSpacing: textConfig.letterSpacing,
      textTransform: textConfig.textTransform,
    };
    
    textBlocks.push(textBlock);
  }
  
  // 8) Build badge if exists
  if (preset.badge && copy.badge) {
    const badgeConfig = preset.badge;
    const badgeZone = applyZoneOverride(
      badgeConfig.zone,
      variant?.overrides?.badge?.zone
    );
    const badgeZonePx = zoneToPixels(badgeZone, canvas);
    
    // For badge, center within zone
    const badgeBlock: TextBlock = {
      id: "badge",
      content: copy.badge,
      x: badgeZonePx.x,
      y: badgeZonePx.y,
      w: badgeZonePx.w,
      h: badgeZonePx.h,
      align: "center",
      color: badgeConfig.style.textColor,
      fontFamily: badgeConfig.font.family,
      fontWeight: badgeConfig.font.weight,
      fontSize: badgeConfig.font.size,
      maxLines: 1,
      lineHeight: 1,
      letterSpacing: badgeConfig.font.letterSpacing,
      textTransform: badgeConfig.font.textTransform,
      background: {
        type: badgeConfig.style.type,
        color: badgeConfig.style.backgroundColor,
        radius: badgeConfig.style.borderRadius,
        padding: badgeConfig.style.paddingY,
        opacity: 1,
      },
    };
    
    textBlocks.push(badgeBlock);
  }
  
  // 9) Build overlays
  const overlays: Overlay[] = preset.overlays.map(ov => {
    const overlayZonePx = zoneToPixels(ov.zone, canvas);
    return {
      type: ov.type,
      x: overlayZonePx.x,
      y: overlayZonePx.y,
      w: overlayZonePx.w,
      h: overlayZonePx.h,
      opacity: ov.strength,
      color: ov.color,
      direction: ov.direction,
    };
  });
  
  // 10) Assemble final LayoutSpec
  const layout: LayoutSpec = {
    version: "1",
    canvas: {
      width: canvas.width,
      height: canvas.height,
    },
    safeArea: {
      margin: preset.safePadding,
    },
    product: productPlacement,
    overlays,
    textBlocks,
    confidence: 1.0, // Presets are 100% deterministic
    rationale: `Preset: ${preset.name} (${aspectRatio})`,
    warnings: [],
  };
  
  logger.info("Layout generated from preset", {
    preset: presetId,
    aspectRatio,
    productScale,
    textBlockCount: textBlocks.length,
    overlayCount: overlays.length,
  });
  
  return {
    layout,
    presetUsed: presetId,
    aspectRatioVariant: aspectRatio,
    computedProductScale: productScale,
  };
}

/**
 * Map preset anchor to LayoutSpec anchor.
 */
function mapAnchor(presetAnchor: string): ProductPlacement["anchor"] {
  const map: Record<string, ProductPlacement["anchor"]> = {
    left_center: "center_left",
    right_center: "center_right",
    center: "center",
    bottom_center: "bottom_center",
    bottom_left: "bottom_center",
    bottom_right: "bottom_center",
  };
  return map[presetAnchor] || "center";
}
