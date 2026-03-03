/**
 * Smart Usage V1 Module
 * 
 * Fully automatic pipeline for apply_skin archetype
 * with structured contracts, validation and QA scoring.
 * 
 * AI returns structured JSON only - rendering is deterministic.
 */

// Types
export * from "./types";

// Functions
export { inferUsage, type InferUsageInput } from "./inferUsage";
export { analyzeSceneAnchors, type AnalyzeSceneInput, type AnalyzeSceneResult } from "./analyzeSceneAnchors";
export { computePlacement, getProductDimensions, isPlacementValid, type ProductMetadata, type CanvasSize, type ComputePlacementInput } from "./computePlacement";
export { qaScore, type QAScoreInput } from "./qaScore";
export { repairIfNeeded, suggestOverlayExpansion, type RepairInput } from "./repair";
