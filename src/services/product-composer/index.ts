/**
 * Product Composer Service
 *
 * Exports the main compose function and types.
 */

export { compose } from "./composer";
export { composeWithAutoLayout } from "./composeAutoLayout";
export { composeWithSmartUsage, type SmartUsageResult } from "./composeSmartUsage";
export { composeWithPreset, type ComposePresetResult } from "./composeWithPreset";
export {
  ComposeRequestSchema,
  PlacementHintSchema,
  CompositionStyleSchema,
  ComposeModeSchema,
  CopyContentSchema,
  AutoLayoutOptionsSchema,
  SmartUsageOptionsSchema,
  PresetOptionsSchema,
  type ComposeRequest,
  type ComposeResult,
  type PlacementHint,
  type PlacementAnchor,
  type CompositionStyle,
  type ComposeDebugInfo,
  type ComposeCostInfo,
  type ComposerConfig,
  type ComposeMode,
  type CopyContent,
  type AutoLayoutOptions,
  type SmartUsageOptions,
  type PresetOptions,
  getComposerConfig,
} from "./types";
export {
  LayoutSpecSchema,
  type LayoutSpec,
  type TextBlock,
  type Overlay,
  type ProductPlacement,
  PRESET_LAYOUTS,
  getPresetLayout,
  getDefaultPreset,
} from "./layoutSpec";
export { analyzeLayoutWithAI, type AutoLayoutRequest, type AutoLayoutResult } from "./autoLayout";
export { validateAndNormalizeLayout, applyTextContent, analyzeComposition, autoFixComposition, type ValidationResult, type CompositionAnalysis } from "./layoutValidation";
export { renderTextOnImage, renderOverlaysOnly, type RenderTextOptions, type RenderTextResult } from "./textRenderer";
export {
  loadImageBuffer,
  getImageMeta,
  calculatePlacement,
  generateShadow,
  generateContactShadow,
  calculateLuminance,
  adjustLuminance,
  ensureAlpha,
  hasValidTransparency,
  bufferToDataUrl,
} from "./utils";
export { composeWithProductIA } from "./composeWithProductIA";