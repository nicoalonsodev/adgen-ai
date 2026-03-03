/**
 * Step: generateContextualBackground
 *
 * Unified background generator for lifestyle/narrative modes.
 * Generates realistic scene backgrounds with:
 * - Contextual props
 * - Natural lighting
 * - Depth of field
 * - NO text or typography
 * - Reserved negative space for copy
 */

import { generateImageNanoBanana } from "@/lib/ai/gemini";
import type { SceneBrief, CreativeMode } from "../schemas";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════ */

/** Target dimensions for Meta Ads (4:5) */
const WIDTH = 1080;
const HEIGHT = 1350;
const ASPECT_RATIO = "4:5" as const;

/** Global negative prompt */
const NEGATIVE_PROMPT =
  "text, watermark, logo, typography, letters, words, brand names, labels, " +
  "people, hands, fingers, faces, body parts, " +
  "blurry, low quality, distorted, oversaturated, cluttered";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface GenerateContextualBackgroundInput {
  sceneBrief: SceneBrief;
  mode: CreativeMode;
  /** Product category for context hints */
  category?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface GenerateContextualBackgroundResult {
  /** Data URL of the background */
  dataUrl: string;
  /** Base64 encoded image */
  base64: string;
  /** MIME type */
  mimeType: string;
  /** Prompt used */
  promptUsed: string;
  /** Generation time in ms */
  generationTimeMs: number;
  /** Model used */
  model: string;
}

/* ════════════════════════════════════════════════════════════════
   PROMPT BUILDING
════════════════════════════════════════════════════════════════ */

/**
 * Maps safe_text_area_preference to composition instructions.
 */
function getCompositionForTextArea(
  preference: SceneBrief["safe_text_area_preference"]
): string {
  const compositions: Record<string, string> = {
    top: "composition with large empty space at TOP of frame for text, main visual elements at bottom",
    bottom: "composition with large empty space at BOTTOM of frame for text, main visual elements at top",
    left: "composition with large empty space on LEFT side for text, main visual elements on right",
    right: "composition with large empty space on RIGHT side for text, main visual elements on left",
    top_left: "composition with empty space in TOP LEFT corner for text",
    top_right: "composition with empty space in TOP RIGHT corner for text",
    bottom_left: "composition with empty space in BOTTOM LEFT corner for text",
    bottom_right: "composition with empty space in BOTTOM RIGHT corner for text",
  };

  return compositions[preference] || compositions.left;
}

/**
 * Maps camera angle to photographic terms.
 */
function getCameraInstruction(camera: SceneBrief["camera"]): string {
  const instructions: Record<string, string> = {
    eye_level: "eye-level camera angle, straight-on view",
    low_angle: "low angle camera, looking slightly upward",
    high_angle: "high angle camera, looking down at 45 degrees",
    close_up: "close-up shot, intimate framing",
    medium_shot: "medium shot, balanced framing",
    wide_shot: "wide shot, environmental context visible",
  };

  return instructions[camera] || instructions.eye_level;
}

/**
 * Maps depth of field to photographic terms.
 */
function getDepthOfFieldInstruction(dof: SceneBrief["depth_of_field"]): string {
  const instructions: Record<string, string> = {
    shallow: "shallow depth of field, softly blurred background, f/2.8 aperture look",
    medium: "medium depth of field, some background detail visible, f/5.6 aperture look",
    deep: "deep depth of field, everything in focus, f/11 aperture look",
  };

  return instructions[dof] || instructions.shallow;
}

/**
 * Builds the prompt for contextual background generation.
 */
function buildPrompt(input: GenerateContextualBackgroundInput): string {
  const { sceneBrief, mode, category } = input;

  // Core scene description
  const environment = sceneBrief.environment;
  const props = sceneBrief.props.length > 0
    ? `with ${sceneBrief.props.join(", ")} as contextual props`
    : "minimal props";
  const lighting = sceneBrief.light;
  const mood = sceneBrief.mood;
  const colorPalette = sceneBrief.color_palette
    ? `color palette: ${sceneBrief.color_palette}`
    : "";

  // Camera and composition
  const composition = getCompositionForTextArea(sceneBrief.safe_text_area_preference);
  const cameraAngle = getCameraInstruction(sceneBrief.camera);
  const depthOfField = getDepthOfFieldInstruction(sceneBrief.depth_of_field);

  // Mode-specific style
  const modeStyle =
    mode === "narrative"
      ? "cinematic, story-driven, emotional atmosphere"
      : "lifestyle photography, aspirational, editorial feel";

  // Build prompt
  const prompt = `${environment}, ${props}, ${lighting}, ${mood} mood, ` +
    `${composition}, ${cameraAngle}, ${depthOfField}, ` +
    `${modeStyle}, ${colorPalette ? colorPalette + ", " : ""}` +
    `professional product photography background, ` +
    `LEAVE EMPTY SPACE FOR PRODUCT COMPOSITING, ` +
    `no product visible yet, ` +
    `high resolution, commercial quality, ` +
    `vertical 4:5 aspect ratio, ` +
    `NO text, NO logos, NO watermarks, NO typography, ` +
    `NO people, NO hands, NO faces`;

  return prompt;
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Generates a contextual background for lifestyle/narrative modes.
 *
 * @param input - Scene brief and generation options
 * @returns Background image result
 */
export async function generateContextualBackground(
  input: GenerateContextualBackgroundInput
): Promise<GenerateContextualBackgroundResult> {
  const { verbose = false } = input;
  const startTime = Date.now();

  const prompt = buildPrompt(input);

  if (verbose) {
    console.log("[generateContextualBackground] Prompt:", prompt);
  }

  try {
    const result = await generateImageNanoBanana({
      prompt,
      aspectRatio: ASPECT_RATIO,
    });

    const generationTimeMs = Date.now() - startTime;

    console.log(
      `[generateContextualBackground] Generated ${input.mode} background in ${generationTimeMs}ms`
    );

    return {
      dataUrl: `data:${result.mimeType};base64,${result.base64}`,
      base64: result.base64,
      mimeType: result.mimeType,
      promptUsed: prompt,
      generationTimeMs,
      model: result.model,
    };
  } catch (error: any) {
    console.error("[generateContextualBackground] Error:", error?.message);
    throw error;
  }
}

/* ════════════════════════════════════════════════════════════════
   FALLBACK: EDITORIAL BACKGROUND
════════════════════════════════════════════════════════════════ */

/**
 * Generates a fallback editorial background when contextual fails.
 */
export async function generateFallbackBackground(): Promise<GenerateContextualBackgroundResult> {
  const startTime = Date.now();

  const prompt =
    "Minimal editorial advertising background, soft studio lighting, " +
    "warm neutral beige tones, subtle gradient background, clean surface, " +
    "no objects, no clutter, large empty space on LEFT side for typography, " +
    "high resolution commercial background, professional product photography style, " +
    "1080x1350 vertical composition, " +
    "no people, no hands, no text, no logos, no watermark";

  try {
    const result = await generateImageNanoBanana({
      prompt,
      aspectRatio: ASPECT_RATIO,
    });

    const generationTimeMs = Date.now() - startTime;

    console.log(
      `[generateContextualBackground] Generated fallback in ${generationTimeMs}ms`
    );

    return {
      dataUrl: `data:${result.mimeType};base64,${result.base64}`,
      base64: result.base64,
      mimeType: result.mimeType,
      promptUsed: prompt,
      generationTimeMs,
      model: result.model,
    };
  } catch (error: any) {
    console.error("[generateContextualBackground] Fallback error:", error?.message);
    throw error;
  }
}
