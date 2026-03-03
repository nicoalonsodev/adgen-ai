/**
 * SMART_USAGE_V1 Types
 * 
 * Structured contracts for the apply_skin archetype pipeline.
 * AI returns structured JSON only - rendering is deterministic.
 */

import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════
   USAGE PLAN
═══════════════════════════════════════════════════════════════ */

export const PrimaryEmotionSchema = z.enum(["comfort", "confidence", "relief"]);
export type PrimaryEmotion = z.infer<typeof PrimaryEmotionSchema>;

export const SceneTypeSchema = z.enum(["bathroom_morning", "bedroom_soft"]);
export type SceneType = z.infer<typeof SceneTypeSchema>;

export const CameraTypeSchema = z.enum(["medium_close", "closeup"]);
export type CameraType = z.infer<typeof CameraTypeSchema>;

export const NegativeSpacePreferenceSchema = z.enum(["top_left", "top_right"]);
export type NegativeSpacePreference = z.infer<typeof NegativeSpacePreferenceSchema>;

export const UsagePlanSchema = z.object({
  archetype: z.literal("apply_skin"),
  primaryEmotion: PrimaryEmotionSchema,
  sceneType: SceneTypeSchema,
  camera: CameraTypeSchema,
  negativeSpacePreference: NegativeSpacePreferenceSchema,
  surfaceRequired: z.boolean(),
  interactionRequired: z.boolean(),
});

export type UsagePlan = z.infer<typeof UsagePlanSchema>;

/* ═══════════════════════════════════════════════════════════════
   SCENE ANCHORS
═══════════════════════════════════════════════════════════════ */

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const LightingDirectionSchema = z.enum(["left", "right", "center"]);
export type LightingDirection = z.infer<typeof LightingDirectionSchema>;

export const LightingInfoSchema = z.object({
  direction: LightingDirectionSchema,
  softness: z.number().min(0).max(1),
});

export type LightingInfo = z.infer<typeof LightingInfoSchema>;

export const SceneAnchorsSchema = z.object({
  surfaceLineY: z.number().optional(),
  clearArea: BoundingBoxSchema.optional(),
  handRegion: BoundingBoxSchema.optional(),
  lighting: LightingInfoSchema,
  confidence: z.number().min(0).max(1),
});

export type SceneAnchors = z.infer<typeof SceneAnchorsSchema>;

/* ═══════════════════════════════════════════════════════════════
   PLACEMENT OUTPUT
═══════════════════════════════════════════════════════════════ */

export const ShadowPresetSchema = z.object({
  blur: z.number().min(0).max(100),
  opacity: z.number().min(0).max(1),
  offsetY: z.number(),
});

export type ShadowPreset = z.infer<typeof ShadowPresetSchema>;

export const PlacementOutputSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().min(0.1).max(1.5),
  shadowPreset: ShadowPresetSchema,
});

export type PlacementOutput = z.infer<typeof PlacementOutputSchema>;

/* ═══════════════════════════════════════════════════════════════
   QA RESULT
═══════════════════════════════════════════════════════════════ */

export const QAScoreResultSchema = z.object({
  score: z.number().min(0).max(1),
  details: z.object({
    productSizeScore: z.number(),
    overlapScore: z.number(),
    marginScore: z.number(),
    surfaceScore: z.number(),
    clearAreaScore: z.number(),
  }),
  issues: z.array(z.string()),
});

export type QAScoreResult = z.infer<typeof QAScoreResultSchema>;

/* ═══════════════════════════════════════════════════════════════
   REPAIR RESULT
═══════════════════════════════════════════════════════════════ */

export const RepairResultSchema = z.object({
  repaired: z.boolean(),
  actions: z.array(z.string()),
  newPlacement: PlacementOutputSchema.optional(),
  regenerateScene: z.boolean(),
  finalScore: z.number(),
});

export type RepairResult = z.infer<typeof RepairResultSchema>;

/* ═══════════════════════════════════════════════════════════════
   SMART USAGE RESULT
═══════════════════════════════════════════════════════════════ */

export interface SmartUsageResult {
  success: boolean;
  image?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  usage: UsagePlan;
  anchors: SceneAnchors;
  placement: PlacementOutput;
  qaScore: QAScoreResult;
  repair?: RepairResult;
  timings: Record<string, number>;
  error?: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

export const SMART_USAGE_CONSTANTS = {
  MIN_PRODUCT_HEIGHT_RATIO: 0.18,
  MAX_PRODUCT_HEIGHT_RATIO: 0.35,
  MIN_SCALE: 0.25,
  MAX_SCALE: 0.32,
  SAFE_MARGIN: 64,
  QA_THRESHOLD: 0.75,
  MAX_REPAIR_LOOPS: 2,
  SCALE_INCREMENT: 0.08,
  SURFACE_MOVE_PX: 20,
  OVERLAY_OPACITY_INCREMENT: 0.15,
} as const;
