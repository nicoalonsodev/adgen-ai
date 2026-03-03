/**
 * Compute Placement
 * 
 * Pure mathematical computation of product placement.
 * NO AI - deterministic execution only.
 */

import { 
  UsagePlan, 
  SceneAnchors, 
  PlacementOutput, 
  SMART_USAGE_CONSTANTS 
} from "./types";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "computePlacement" });

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface ProductMetadata {
  width: number;
  height: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface ComputePlacementInput {
  usage: UsagePlan;
  anchors: SceneAnchors;
  productMeta: ProductMetadata;
  canvas: CanvasSize;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

export function computePlacement(input: ComputePlacementInput): PlacementOutput {
  const { usage, anchors, productMeta, canvas } = input;
  const { MIN_SCALE, MAX_SCALE, SAFE_MARGIN } = SMART_USAGE_CONSTANTS;
  
  logger.debug("Computing placement", {
    archetype: usage.archetype,
    surfaceLineY: anchors.surfaceLineY,
    handRegion: anchors.handRegion,
    productSize: `${productMeta.width}x${productMeta.height}`,
  });
  
  // 1) Calculate optimal scale
  //    Target: product height = 25-32% of canvas height
  const targetHeightRatio = (MIN_SCALE + MAX_SCALE) / 2; // ~0.285
  const baseScale = (canvas.height * targetHeightRatio) / productMeta.height;
  
  // Clamp scale to valid range
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, baseScale));
  
  // Calculate final product dimensions
  const productWidth = Math.round(productMeta.width * scale);
  const productHeight = Math.round(productMeta.height * scale);
  
  logger.debug("Scale calculated", {
    targetHeightRatio,
    baseScale,
    finalScale: scale,
    productDimensions: `${productWidth}x${productHeight}`,
  });
  
  // 2) Calculate Y position
  let y: number;
  
  if (anchors.surfaceLineY !== undefined) {
    // Surface detected - place product bottom at surface line
    y = anchors.surfaceLineY - productHeight;
    logger.debug("Using surface line for Y", { surfaceLineY: anchors.surfaceLineY, y });
  } else {
    // No surface - use 70% of canvas height as bottom reference
    const defaultBottomY = Math.round(canvas.height * 0.70);
    y = defaultBottomY - productHeight;
    logger.debug("Using default Y (70% canvas)", { y });
  }
  
  // Ensure Y is within safe bounds
  y = Math.max(SAFE_MARGIN, y);
  y = Math.min(canvas.height - productHeight - SAFE_MARGIN, y);
  
  // 3) Calculate X position
  let x: number;
  
  if (anchors.handRegion) {
    // Hand detected - place product near hand with offset
    const handCenterX = anchors.handRegion.x + anchors.handRegion.w / 2;
    
    // Place product slightly to the side of hand
    // If hand is on right side, place product to the left of hand
    if (handCenterX > canvas.width / 2) {
      x = anchors.handRegion.x - productWidth - 20;
    } else {
      x = anchors.handRegion.x + anchors.handRegion.w + 20;
    }
    
    logger.debug("Using hand region for X", { handCenterX, x });
  } else if (anchors.clearArea) {
    // Use clear area center
    x = anchors.clearArea.x + (anchors.clearArea.w - productWidth) / 2;
    logger.debug("Using clear area for X", { x });
  } else {
    // Default: center horizontally with slight offset based on negative space preference
    if (usage.negativeSpacePreference === "top_left") {
      // Text on left, product slightly right of center
      x = Math.round(canvas.width * 0.55 - productWidth / 2);
    } else {
      // Text on right, product slightly left of center
      x = Math.round(canvas.width * 0.45 - productWidth / 2);
    }
    logger.debug("Using default X with negative space preference", { 
      preference: usage.negativeSpacePreference, 
      x 
    });
  }
  
  // Ensure X is within safe bounds
  x = Math.max(SAFE_MARGIN, x);
  x = Math.min(canvas.width - productWidth - SAFE_MARGIN, x);
  
  // 4) Calculate shadow preset based on lighting
  const shadowPreset = calculateShadowPreset(anchors, usage);
  
  const placement: PlacementOutput = {
    x: Math.round(x),
    y: Math.round(y),
    scale,
    shadowPreset,
  };
  
  logger.info("Placement computed", {
    placement,
    productFinalSize: `${productWidth}x${productHeight}`,
    productBottom: Math.round(y + productHeight),
    surfaceUsed: anchors.surfaceLineY !== undefined,
  });
  
  return placement;
}

/* ═══════════════════════════════════════════════════════════════
   SHADOW CALCULATION
═══════════════════════════════════════════════════════════════ */

function calculateShadowPreset(
  anchors: SceneAnchors, 
  usage: UsagePlan
): PlacementOutput["shadowPreset"] {
  const { lighting, surfaceLineY } = anchors;
  
  // Base shadow values
  let blur = 25;
  let opacity = 0.35;
  let offsetY = 12;
  
  // Adjust based on lighting softness
  // Softer light = softer shadow
  if (lighting.softness > 0.7) {
    blur = 35;
    opacity = 0.25;
  } else if (lighting.softness < 0.3) {
    blur = 15;
    opacity = 0.45;
  }
  
  // Adjust offset based on lighting direction
  // For now, keep vertical offset constant
  // Could add horizontal offset based on direction in future
  
  // If surface is present, use contact shadow style
  if (surfaceLineY !== undefined) {
    offsetY = 8; // Closer shadow for surface contact
    opacity = Math.min(opacity + 0.1, 0.5);
  }
  
  // Scene type adjustments
  if (usage.sceneType === "bedroom_soft") {
    // Softer, dreamier shadows for bedroom scenes
    blur += 10;
    opacity -= 0.05;
  }
  
  return {
    blur: Math.round(blur),
    opacity: Math.round(opacity * 100) / 100,
    offsetY: Math.round(offsetY),
  };
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY EXPORTS
═══════════════════════════════════════════════════════════════ */

/**
 * Calculate product dimensions at given scale
 */
export function getProductDimensions(
  productMeta: ProductMetadata, 
  scale: number
): { width: number; height: number } {
  return {
    width: Math.round(productMeta.width * scale),
    height: Math.round(productMeta.height * scale),
  };
}

/**
 * Check if product placement is valid
 */
export function isPlacementValid(
  placement: PlacementOutput,
  productMeta: ProductMetadata,
  canvas: CanvasSize
): boolean {
  const { x, y, scale } = placement;
  const { width, height } = getProductDimensions(productMeta, scale);
  const margin = SMART_USAGE_CONSTANTS.SAFE_MARGIN;
  
  return (
    x >= margin &&
    y >= margin &&
    x + width <= canvas.width - margin &&
    y + height <= canvas.height - margin
  );
}
