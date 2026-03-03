/**
 * Pipeline Steps – Barrel Export
 *
 * All pipeline step functions for the creative mode system.
 */

// Mode decision
export {
  decideCreativeMode,
  type StrategicCore,
  type Offer,
  type DecideModeInput,
  type DecideModeResult,
} from "./decideCreativeMode";

// Scene brief (LLM)
export {
  generateSceneBrief,
  type GenerateSceneBriefInput,
  type GenerateSceneBriefResult,
} from "./generateSceneBrief";

// Narrative angle (LLM)
export {
  generateNarrativeAngle,
  type GenerateNarrativeAngleInput,
  type GenerateNarrativeAngleResult,
} from "./generateNarrativeAngle";

// Light zone analysis (Canvas)
export {
  analyzeLightZones,
  getZoneByPosition,
  getZonesSortedByScore,
  getZonesForSide,
} from "./analyzeLightZones";

// Typography plan (Algorithmic)
export {
  pickTypographyPlan,
  type BrandHints,
  type PickTypographyPlanInput,
} from "./pickTypographyPlan";

// Background generation
export {
  generateContextualBackground,
  generateFallbackBackground,
  type GenerateContextualBackgroundInput,
  type GenerateContextualBackgroundResult,
} from "./generateContextualBackground";
