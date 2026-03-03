/**
 * Repair If Needed
 * 
 * Auto-repair logic for low QA scores.
 * NO AI - deterministic repair actions only.
 */

import { 
  PlacementOutput, 
  SceneAnchors, 
  QAScoreResult, 
  RepairResult,
  SMART_USAGE_CONSTANTS 
} from "./types";
import { ProductMetadata, CanvasSize, getProductDimensions } from "./computePlacement";
import { qaScore, QAScoreInput } from "./qaScore";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "repair" });

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface RepairInput {
  placement: PlacementOutput;
  productMeta: ProductMetadata;
  canvas: CanvasSize;
  anchors: SceneAnchors;
  currentScore: QAScoreResult;
  textBlocks?: Array<{ x: number; y: number; w: number; h: number }>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

export function repairIfNeeded(input: RepairInput): RepairResult {
  const { QA_THRESHOLD, MAX_REPAIR_LOOPS } = SMART_USAGE_CONSTANTS;
  
  // If score is above threshold, no repair needed
  if (input.currentScore.score >= QA_THRESHOLD) {
    logger.debug("QA score above threshold, no repair needed", {
      score: input.currentScore.score,
      threshold: QA_THRESHOLD,
    });
    
    return {
      repaired: false,
      actions: [],
      regenerateScene: false,
      finalScore: input.currentScore.score,
    };
  }
  
  logger.info("Starting repair process", {
    initialScore: input.currentScore.score,
    threshold: QA_THRESHOLD,
    issues: input.currentScore.issues,
  });
  
  const actions: string[] = [];
  let currentPlacement = { ...input.placement };
  let loopCount = 0;
  let lastScore = input.currentScore;
  
  // Repair loop
  while (loopCount < MAX_REPAIR_LOOPS && lastScore.score < QA_THRESHOLD) {
    loopCount++;
    logger.debug(`Repair loop ${loopCount}`, { currentScore: lastScore.score });
    
    // 1) Try to fix product size issues
    if (lastScore.details.productSizeScore < 0.8) {
      const sizeAction = repairProductSize(currentPlacement, input.productMeta, input.canvas, lastScore);
      if (sizeAction) {
        currentPlacement = sizeAction.placement;
        actions.push(sizeAction.action);
      }
    }
    
    // 2) Try to fix surface contact issues
    if (lastScore.details.surfaceScore < 0.8 && input.anchors.surfaceLineY !== undefined) {
      const surfaceAction = repairSurfaceContact(currentPlacement, input.productMeta, input.anchors);
      if (surfaceAction) {
        currentPlacement = surfaceAction.placement;
        actions.push(surfaceAction.action);
      }
    }
    
    // 3) Try to fix margin issues
    if (lastScore.details.marginScore < 0.9) {
      const marginAction = repairMargins(currentPlacement, input.productMeta, input.canvas);
      if (marginAction) {
        currentPlacement = marginAction.placement;
        actions.push(marginAction.action);
      }
    }
    
    // 4) Recalculate score
    const newScoreInput: QAScoreInput = {
      placement: currentPlacement,
      productMeta: input.productMeta,
      canvas: input.canvas,
      anchors: input.anchors,
      textBlocks: input.textBlocks,
    };
    
    lastScore = qaScore(newScoreInput);
    logger.debug(`Score after repair loop ${loopCount}`, { newScore: lastScore.score });
  }
  
  // Check if we need to regenerate scene
  const regenerateScene = lastScore.score < QA_THRESHOLD;
  
  if (regenerateScene) {
    actions.push("Repair insuficiente - se recomienda regenerar escena");
    logger.warn("Repair failed, recommending scene regeneration", {
      finalScore: lastScore.score,
      threshold: QA_THRESHOLD,
      loopsAttempted: loopCount,
    });
  } else {
    logger.info("Repair successful", {
      initialScore: input.currentScore.score,
      finalScore: lastScore.score,
      actionsApplied: actions.length,
      loops: loopCount,
    });
  }
  
  return {
    repaired: actions.length > 0,
    actions,
    newPlacement: actions.length > 0 ? currentPlacement : undefined,
    regenerateScene,
    finalScore: lastScore.score,
  };
}

/* ═══════════════════════════════════════════════════════════════
   REPAIR ACTIONS
═══════════════════════════════════════════════════════════════ */

interface RepairAction {
  placement: PlacementOutput;
  action: string;
}

/**
 * Repair 1: Increase product scale by 8%
 */
function repairProductSize(
  placement: PlacementOutput,
  productMeta: ProductMetadata,
  canvas: CanvasSize,
  qaResult: QAScoreResult
): RepairAction | null {
  const { SCALE_INCREMENT, MAX_PRODUCT_HEIGHT_RATIO, SAFE_MARGIN } = SMART_USAGE_CONSTANTS;
  
  const currentDims = getProductDimensions(productMeta, placement.scale);
  const currentRatio = currentDims.height / canvas.height;
  
  // Only scale up if product is too small
  if (currentRatio >= MAX_PRODUCT_HEIGHT_RATIO) {
    return null;
  }
  
  const newScale = Math.min(placement.scale * (1 + SCALE_INCREMENT), 0.40);
  const newDims = getProductDimensions(productMeta, newScale);
  
  // Adjust Y to keep bottom position similar
  let newY = placement.y - (newDims.height - currentDims.height);
  newY = Math.max(SAFE_MARGIN, newY);
  
  // Adjust X to keep centered
  let newX = placement.x - (newDims.width - currentDims.width) / 2;
  newX = Math.max(SAFE_MARGIN, Math.min(canvas.width - newDims.width - SAFE_MARGIN, newX));
  
  return {
    placement: {
      ...placement,
      scale: newScale,
      x: Math.round(newX),
      y: Math.round(newY),
    },
    action: `Producto escalado de ${(placement.scale * 100).toFixed(1)}% a ${(newScale * 100).toFixed(1)}%`,
  };
}

/**
 * Repair 2: Move product 20px toward surface
 */
function repairSurfaceContact(
  placement: PlacementOutput,
  productMeta: ProductMetadata,
  anchors: SceneAnchors
): RepairAction | null {
  const { SURFACE_MOVE_PX } = SMART_USAGE_CONSTANTS;
  
  if (anchors.surfaceLineY === undefined) {
    return null;
  }
  
  const currentDims = getProductDimensions(productMeta, placement.scale);
  const productBottom = placement.y + currentDims.height;
  const distanceToSurface = anchors.surfaceLineY - productBottom;
  
  // Move product down if above surface
  if (distanceToSurface > 10) {
    const moveAmount = Math.min(distanceToSurface, SURFACE_MOVE_PX);
    const newY = placement.y + moveAmount;
    
    return {
      placement: {
        ...placement,
        y: Math.round(newY),
      },
      action: `Producto movido ${moveAmount}px hacia la superficie`,
    };
  }
  
  // Move product up if below surface
  if (distanceToSurface < -10) {
    const moveAmount = Math.min(-distanceToSurface, SURFACE_MOVE_PX);
    const newY = placement.y - moveAmount;
    
    return {
      placement: {
        ...placement,
        y: Math.round(newY),
      },
      action: `Producto movido ${moveAmount}px arriba (estaba debajo de superficie)`,
    };
  }
  
  return null;
}

/**
 * Repair 3: Fix margin violations
 */
function repairMargins(
  placement: PlacementOutput,
  productMeta: ProductMetadata,
  canvas: CanvasSize
): RepairAction | null {
  const { SAFE_MARGIN } = SMART_USAGE_CONSTANTS;
  
  const currentDims = getProductDimensions(productMeta, placement.scale);
  let newX = placement.x;
  let newY = placement.y;
  let changed = false;
  
  // Fix left margin
  if (newX < SAFE_MARGIN) {
    newX = SAFE_MARGIN;
    changed = true;
  }
  
  // Fix right margin
  if (newX + currentDims.width > canvas.width - SAFE_MARGIN) {
    newX = canvas.width - SAFE_MARGIN - currentDims.width;
    changed = true;
  }
  
  // Fix top margin
  if (newY < SAFE_MARGIN) {
    newY = SAFE_MARGIN;
    changed = true;
  }
  
  // Fix bottom margin
  if (newY + currentDims.height > canvas.height - SAFE_MARGIN) {
    newY = canvas.height - SAFE_MARGIN - currentDims.height;
    changed = true;
  }
  
  if (!changed) {
    return null;
  }
  
  return {
    placement: {
      ...placement,
      x: Math.round(newX),
      y: Math.round(newY),
    },
    action: "Producto reposicionado dentro de márgenes seguros",
  };
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY EXPORTS
═══════════════════════════════════════════════════════════════ */

/**
 * Expand overlay opacity for text legibility
 */
export function suggestOverlayExpansion(
  currentOpacity: number
): { newOpacity: number; action: string } | null {
  const { OVERLAY_OPACITY_INCREMENT } = SMART_USAGE_CONSTANTS;
  
  if (currentOpacity >= 0.7) {
    return null; // Already at max reasonable opacity
  }
  
  const newOpacity = Math.min(currentOpacity + OVERLAY_OPACITY_INCREMENT, 0.7);
  
  return {
    newOpacity,
    action: `Overlay expandido de ${(currentOpacity * 100).toFixed(0)}% a ${(newOpacity * 100).toFixed(0)}% opacidad`,
  };
}
