/**
 * QA Score
 * 
 * Heuristic-based quality scoring for composed images.
 * NO AI - pure deterministic scoring.
 */

import { 
  PlacementOutput, 
  SceneAnchors, 
  QAScoreResult, 
  SMART_USAGE_CONSTANTS,
  BoundingBox 
} from "./types";
import { getProductDimensions, ProductMetadata, CanvasSize } from "./computePlacement";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "qaScore" });

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface QAScoreInput {
  placement: PlacementOutput;
  productMeta: ProductMetadata;
  canvas: CanvasSize;
  anchors: SceneAnchors;
  textBlocks?: Array<{ x: number; y: number; w: number; h: number }>;
}

/* ═══════════════════════════════════════════════════════════════
   WEIGHTS
═══════════════════════════════════════════════════════════════ */

const WEIGHTS = {
  productSize: 0.25,
  overlap: 0.20,
  margin: 0.20,
  surface: 0.20,
  clearArea: 0.15,
} as const;

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

export function qaScore(input: QAScoreInput): QAScoreResult {
  const { placement, productMeta, canvas, anchors, textBlocks } = input;
  const { MIN_PRODUCT_HEIGHT_RATIO, MAX_PRODUCT_HEIGHT_RATIO, SAFE_MARGIN } = SMART_USAGE_CONSTANTS;
  
  const issues: string[] = [];
  const productDims = getProductDimensions(productMeta, placement.scale);
  
  logger.debug("Computing QA score", {
    productSize: `${productDims.width}x${productDims.height}`,
    canvasSize: `${canvas.width}x${canvas.height}`,
    placement,
  });
  
  // 1) Product Size Score
  //    Product height should be 18-35% of canvas height
  const productHeightRatio = productDims.height / canvas.height;
  let productSizeScore: number;
  
  if (productHeightRatio >= MIN_PRODUCT_HEIGHT_RATIO && productHeightRatio <= MAX_PRODUCT_HEIGHT_RATIO) {
    productSizeScore = 1.0;
  } else if (productHeightRatio < MIN_PRODUCT_HEIGHT_RATIO) {
    // Too small
    const deficit = MIN_PRODUCT_HEIGHT_RATIO - productHeightRatio;
    productSizeScore = Math.max(0, 1 - (deficit / MIN_PRODUCT_HEIGHT_RATIO));
    issues.push(`Producto muy pequeño (${(productHeightRatio * 100).toFixed(1)}% del canvas, mínimo ${MIN_PRODUCT_HEIGHT_RATIO * 100}%)`);
  } else {
    // Too large
    const excess = productHeightRatio - MAX_PRODUCT_HEIGHT_RATIO;
    productSizeScore = Math.max(0, 1 - (excess / MAX_PRODUCT_HEIGHT_RATIO));
    issues.push(`Producto muy grande (${(productHeightRatio * 100).toFixed(1)}% del canvas, máximo ${MAX_PRODUCT_HEIGHT_RATIO * 100}%)`);
  }
  
  // 2) Overlap Score
  //    No text/product overlap
  let overlapScore = 1.0;
  const productBox: BoundingBox = {
    x: placement.x,
    y: placement.y,
    w: productDims.width,
    h: productDims.height,
  };
  
  if (textBlocks && textBlocks.length > 0) {
    for (const textBlock of textBlocks) {
      if (boxesOverlap(productBox, textBlock)) {
        const overlapArea = calculateOverlapArea(productBox, textBlock);
        const textArea = textBlock.w * textBlock.h;
        const overlapRatio = overlapArea / textArea;
        
        overlapScore = Math.max(0, overlapScore - overlapRatio);
        issues.push(`Overlap detectado con bloque de texto (${(overlapRatio * 100).toFixed(1)}%)`);
      }
    }
  }
  
  // 3) Margin Score
  //    Product should be within safe margin
  let marginScore = 1.0;
  
  const leftMargin = placement.x;
  const topMargin = placement.y;
  const rightMargin = canvas.width - (placement.x + productDims.width);
  const bottomMargin = canvas.height - (placement.y + productDims.height);
  
  const margins = [
    { name: "izquierdo", value: leftMargin },
    { name: "superior", value: topMargin },
    { name: "derecho", value: rightMargin },
    { name: "inferior", value: bottomMargin },
  ];
  
  for (const margin of margins) {
    if (margin.value < SAFE_MARGIN) {
      const deficit = (SAFE_MARGIN - margin.value) / SAFE_MARGIN;
      marginScore -= deficit * 0.25; // Penalize proportionally
      issues.push(`Margen ${margin.name} insuficiente (${margin.value}px < ${SAFE_MARGIN}px)`);
    }
  }
  marginScore = Math.max(0, marginScore);
  
  // 4) Surface Score
  //    If surface was required and detected, product should touch it
  let surfaceScore = 1.0;
  
  if (anchors.surfaceLineY !== undefined) {
    const productBottom = placement.y + productDims.height;
    const distanceToSurface = Math.abs(productBottom - anchors.surfaceLineY);
    
    if (distanceToSurface > 30) {
      // Product is not touching surface
      surfaceScore = Math.max(0, 1 - (distanceToSurface / 100));
      issues.push(`Producto no toca la superficie (${distanceToSurface}px de distancia)`);
    }
  } else {
    // No surface detected - mild penalty
    surfaceScore = 0.7;
    issues.push("No se detectó superficie en la escena");
  }
  
  // 5) Clear Area Score
  //    Product should be in or near clear area if specified
  let clearAreaScore = 1.0;
  
  if (anchors.clearArea) {
    const productCenter = {
      x: placement.x + productDims.width / 2,
      y: placement.y + productDims.height / 2,
    };
    
    const clearAreaCenter = {
      x: anchors.clearArea.x + anchors.clearArea.w / 2,
      y: anchors.clearArea.y + anchors.clearArea.h / 2,
    };
    
    const distance = Math.sqrt(
      Math.pow(productCenter.x - clearAreaCenter.x, 2) +
      Math.pow(productCenter.y - clearAreaCenter.y, 2)
    );
    
    // Penalize if product is far from clear area
    const maxAcceptableDistance = Math.max(canvas.width, canvas.height) * 0.4;
    if (distance > maxAcceptableDistance) {
      clearAreaScore = Math.max(0, 1 - ((distance - maxAcceptableDistance) / maxAcceptableDistance));
      issues.push(`Producto lejos del área despejada (${Math.round(distance)}px)`);
    }
  } else {
    // No clear area detected - mild penalty
    clearAreaScore = 0.8;
  }
  
  // Calculate weighted final score
  const score = 
    productSizeScore * WEIGHTS.productSize +
    overlapScore * WEIGHTS.overlap +
    marginScore * WEIGHTS.margin +
    surfaceScore * WEIGHTS.surface +
    clearAreaScore * WEIGHTS.clearArea;
  
  const result: QAScoreResult = {
    score: Math.round(score * 100) / 100,
    details: {
      productSizeScore: Math.round(productSizeScore * 100) / 100,
      overlapScore: Math.round(overlapScore * 100) / 100,
      marginScore: Math.round(marginScore * 100) / 100,
      surfaceScore: Math.round(surfaceScore * 100) / 100,
      clearAreaScore: Math.round(clearAreaScore * 100) / 100,
    },
    issues,
  };
  
  logger.info("QA score computed", {
    score: result.score,
    issueCount: issues.length,
    details: result.details,
  });
  
  return result;
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */

function boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function calculateOverlapArea(a: BoundingBox, b: BoundingBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}
