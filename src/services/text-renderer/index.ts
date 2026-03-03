/**
 * Text Renderer Service
 *
 * Exports the main render functions and types.
 */

export { renderText, renderSingleText, addTextOverlay } from "./renderer";
export {
  RenderTextRequestSchema,
  FontStyleSchema,
  TextElementSchema,
  TextEffectsSchema,
  SafeAreaSchema,
  TextBoxSchema,
  getTextRendererConfig,
  type RenderTextRequest,
  type RenderTextResult,
  type TextElement,
  type FontStyle,
  type TextEffects,
  type TextShadow,
  type TextStroke,
  type TextGradient,
  type SafeArea,
  type TextBox,
  type BackgroundBox,
  type TextRendererConfig,
} from "./types";
export {
  wrapText,
  calculateTextLayout,
  calculateContrastRatio,
  getContrastColor,
  ensureContrast,
  parseColor,
  rgbToHex,
  calculateLuminance,
  escapeXml,
  createApproximateMeasureFn,
} from "./utils";
