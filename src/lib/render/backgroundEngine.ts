/**
 * Background Engine Editorial V1
 *
 * Generates minimalist, editorial-style backgrounds for Meta Ads.
 * All backgrounds are generated at 1080x1350 (4:5 aspect ratio).
 *
 * Features:
 * - Template-based prompt selection
 * - Controlled negative space
 * - Low temperature for consistency
 * - No objects, people, or text
 */

import { generateImageNanoBanana } from "@/lib/ai/gemini";
import type { LayoutId } from "@/lib/scenes/sceneLibrary";

/* ── Constants ── */

/** Target dimensions for Meta Ads (4:5) */
export const EDITORIAL_WIDTH = 1080;
export const EDITORIAL_HEIGHT = 1350;
export const EDITORIAL_ASPECT_RATIO = "4:5" as const;

/* ── Template Categories ── */

/**
 * Editorial template categories that map to LayoutIds.
 * Each category has a specific prompt optimized for that composition.
 */
export type EditorialTemplate =
  | "SPLIT_LEFT_PRODUCT"    // Product left, text right
  | "SPLIT_RIGHT_PRODUCT"   // Product right, text left
  | "CENTER_MINIMAL"        // Product centered
  | "TOP_PRODUCT"           // Product top, text bottom
  | "BOTTOM_PRODUCT";       // Product bottom, text top

/**
 * Maps LayoutId to EditorialTemplate category.
 */
export function layoutToEditorialTemplate(layoutId: LayoutId): EditorialTemplate {
  switch (layoutId) {
    case "hero_left":
    case "diagonal":
      return "SPLIT_LEFT_PRODUCT";  // Product left → empty space RIGHT for text

    case "hero_right":
      return "SPLIT_RIGHT_PRODUCT"; // Product right → empty space LEFT for text

    case "hero_center":
    case "floating":
    case "minimal":
      return "CENTER_MINIMAL";      // Product centered

    case "split_top":
      return "TOP_PRODUCT";         // Product top → empty space bottom for text

    case "split_bottom":
      return "BOTTOM_PRODUCT";      // Product bottom → empty space top for text

    default:
      return "CENTER_MINIMAL";
  }
}

/* ── Prompt Templates ── */

/** Global restrictions to append to all prompts */
const GLOBAL_RESTRICTIONS =
  "no people, no hands, no furniture, no props, no text, no logos, no watermark, no typography, no brand names, no objects";

/** Negative prompt for image generation */
export const EDITORIAL_NEGATIVE_PROMPT =
  "text, watermark, logo, blurry, low quality, deformed, distorted, oversaturated, cluttered background, people, hands, furniture, props, typography, brand names, objects, products";

/**
 * Base prompts for each editorial template.
 * Designed for minimalist, clean, studio-style backgrounds.
 */
const TEMPLATE_PROMPTS: Record<EditorialTemplate, string> = {
  SPLIT_LEFT_PRODUCT: `Minimal editorial advertising background, soft studio lighting, warm neutral beige tones, subtle gradient background, clean surface, no objects, no clutter, large empty space on RIGHT side for typography, high resolution commercial background, professional product photography style, 1080x1350 vertical composition, ${GLOBAL_RESTRICTIONS}`,

  SPLIT_RIGHT_PRODUCT: `Bold minimal advertising background, cool neutral gray tones, subtle geometric shapes or soft gradients, large empty space on LEFT side for large typography, no objects, no clutter, high resolution commercial background, 1080x1350 vertical composition, ${GLOBAL_RESTRICTIONS}`,

  CENTER_MINIMAL: `Minimal premium advertising background, soft studio lighting, pure white or light neutral gradient, subtle floor shadow in center, no objects, no clutter, clean studio environment, high resolution commercial background, 1080x1350 vertical composition, ${GLOBAL_RESTRICTIONS}`,

  TOP_PRODUCT: `Minimal editorial advertising background, soft overhead studio lighting, warm white tones with subtle cream gradient, clean surface, no objects, no clutter, large empty space on BOTTOM half for typography, high resolution commercial background, professional product photography style, 1080x1350 vertical composition, ${GLOBAL_RESTRICTIONS}`,

  BOTTOM_PRODUCT: `Minimal editorial advertising background, soft studio lighting from below, cool neutral tones with subtle gray gradient, clean surface, no objects, no clutter, large empty space on TOP half for typography, high resolution commercial background, professional product photography style, 1080x1350 vertical composition, ${GLOBAL_RESTRICTIONS}`,
};

/* ── Types ── */

export interface EditorialBackgroundResult {
  /** Base64-encoded image data */
  base64: string;
  /** MIME type (typically image/png) */
  mimeType: string;
  /** Data URL ready for use */
  dataUrl: string;
  /** Model used for generation */
  model: string;
  /** Template used */
  template: EditorialTemplate;
  /** Original layoutId requested */
  layoutId: LayoutId;
  /** Prompt used (for debugging) */
  promptUsed: string;
  /** Generation time in ms */
  generationTimeMs: number;
}

export interface EditorialBackgroundOptions {
  /** Custom prompt suffix to append (optional) */
  customSuffix?: string;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/* ── Main Function ── */

/**
 * Generates an editorial background image based on the layout template.
 *
 * The background is:
 * - Always 1080x1350 (4:5 aspect ratio)
 * - Minimalist, clean, studio-style
 * - No objects, people, or text
 * - Optimized for controlled negative space
 *
 * @param layoutId - The layout ID that determines the template
 * @param options - Optional configuration
 * @returns Promise<EditorialBackgroundResult>
 *
 * @example
 * const bg = await generateEditorialBackground("hero_left");
 * // Returns background with empty space on RIGHT for text
 */
export async function generateEditorialBackground(
  layoutId: LayoutId,
  options: EditorialBackgroundOptions = {}
): Promise<EditorialBackgroundResult> {
  const { customSuffix, verbose = false } = options;

  const startTime = Date.now();

  // Map layout to editorial template
  const template = layoutToEditorialTemplate(layoutId);
  const basePrompt = TEMPLATE_PROMPTS[template];

  // Build final prompt
  const prompt = customSuffix
    ? `${basePrompt}, ${customSuffix}`
    : basePrompt;

  // Log generation start
  if (verbose) {
    console.log(`[backgroundEngine] Starting generation...`);
    console.log(`[backgroundEngine] LayoutId: ${layoutId}`);
    console.log(`[backgroundEngine] Template: ${template}`);
    console.log(`[backgroundEngine] Dimensions: ${EDITORIAL_WIDTH}x${EDITORIAL_HEIGHT}`);
    console.log(`[backgroundEngine] Prompt: ${prompt}`);
  }

  // Generate image
  const result = await generateImageNanoBanana({
    prompt,
    aspectRatio: EDITORIAL_ASPECT_RATIO,
  });

  const generationTimeMs = Date.now() - startTime;

  // Log completion
  console.log(
    `[backgroundEngine] Generated ${template} background for layout=${layoutId} in ${generationTimeMs}ms`
  );

  if (verbose) {
    console.log(`[backgroundEngine] Model: ${result.model}`);
    console.log(`[backgroundEngine] MIME: ${result.mimeType}`);
  }

  return {
    base64: result.base64,
    mimeType: result.mimeType,
    dataUrl: `data:${result.mimeType};base64,${result.base64}`,
    model: result.model,
    template,
    layoutId,
    promptUsed: prompt,
    generationTimeMs,
  };
}

/* ── Batch Generation ── */

export interface BatchEditorialResult {
  layoutId: LayoutId;
  result: EditorialBackgroundResult | null;
  error: string | null;
}

/**
 * Generates editorial backgrounds for multiple layouts.
 *
 * @param layoutIds - Array of layout IDs to generate backgrounds for
 * @param options - Optional configuration
 * @returns Promise<BatchEditorialResult[]>
 */
export async function generateEditorialBackgroundsBatch(
  layoutIds: LayoutId[],
  options: EditorialBackgroundOptions = {}
): Promise<BatchEditorialResult[]> {
  const results: BatchEditorialResult[] = [];

  for (const layoutId of layoutIds) {
    try {
      const result = await generateEditorialBackground(layoutId, options);
      results.push({
        layoutId,
        result,
        error: null,
      });
    } catch (err: any) {
      console.error(
        `[backgroundEngine] Failed to generate background for ${layoutId}:`,
        err?.message
      );
      results.push({
        layoutId,
        result: null,
        error: err?.message ?? "Generation failed",
      });
    }
  }

  return results;
}

/* ── Utility: Get Prompt for Template ── */

/**
 * Returns the prompt that would be used for a given layout.
 * Useful for debugging or preview.
 *
 * @param layoutId - The layout ID
 * @returns The prompt string
 */
export function getEditorialPromptForLayout(layoutId: LayoutId): string {
  const template = layoutToEditorialTemplate(layoutId);
  return TEMPLATE_PROMPTS[template];
}

/**
 * Returns all available editorial templates with their prompts.
 * Useful for documentation or UI display.
 */
export function getAllEditorialTemplates(): Record<EditorialTemplate, string> {
  return { ...TEMPLATE_PROMPTS };
}

/* ══════════════════════════════════════════════════════════════════
   SCENE PLAN V2 – Contextual Background Generation
══════════════════════════════════════════════════════════════════ */

import {
  type ScenePlan,
  generateScenePrompt,
  generateForegroundPrompt,
} from "@/lib/meta/scene/scenePlan";

export interface SceneBackgroundResult {
  /** Base64-encoded main background image */
  base64: string;
  /** MIME type */
  mimeType: string;
  /** Data URL ready for use */
  dataUrl: string;
  /** Model used */
  model: string;
  /** Scene plan used */
  scenePlan: ScenePlan;
  /** Main prompt used */
  promptUsed: string;
  /** Foreground image (if BLUR_MATE) */
  foreground?: {
    base64: string;
    mimeType: string;
    dataUrl: string;
    promptUsed: string;
  };
  /** Generation time in ms */
  generationTimeMs: number;
}

export interface SceneBackgroundOptions {
  /** Enable verbose logging */
  verbose?: boolean;
  /** Skip foreground generation (for faster testing) */
  skipForeground?: boolean;
}

/**
 * Generates a contextual background based on ScenePlan.
 *
 * Produces a realistic scene with:
 * - Specific environment (kitchen, desk, travel, home)
 * - Surface texture (wood, marble, desk, neutral)
 * - Lighting direction (left/right window, soft top)
 * - Mood (calm, warm, clean)
 * - Optional foreground blur element
 *
 * @param scenePlan - The scene plan configuration
 * @param options - Optional settings
 * @returns SceneBackgroundResult with main background and optional foreground
 */
export async function generateSceneBackground(
  scenePlan: ScenePlan,
  options: SceneBackgroundOptions = {}
): Promise<SceneBackgroundResult> {
  const { verbose = false, skipForeground = false } = options;
  const startTime = Date.now();

  // Build main background prompt
  const mainPrompt = generateScenePrompt(scenePlan);

  if (verbose) {
    console.log(`[backgroundEngine] Scene generation starting...`);
    console.log(`[backgroundEngine] SceneType: ${scenePlan.sceneType}`);
    console.log(`[backgroundEngine] Surface: ${scenePlan.surface}`);
    console.log(`[backgroundEngine] Light: ${scenePlan.light}`);
    console.log(`[backgroundEngine] Mood: ${scenePlan.mood}`);
    console.log(`[backgroundEngine] Foreground: ${scenePlan.foregroundElement}`);
    console.log(`[backgroundEngine] Prompt: ${mainPrompt}`);
  }

  // Generate main background
  const mainResult = await generateImageNanoBanana({
    prompt: mainPrompt,
    aspectRatio: EDITORIAL_ASPECT_RATIO,
  });

  // Handle foreground if BLUR_MATE
  let foregroundResult:
    | { base64: string; mimeType: string; dataUrl: string; promptUsed: string }
    | undefined;

  if (
    scenePlan.foregroundElement === "BLUR_MATE" &&
    !skipForeground
  ) {
    const fgPrompt = generateForegroundPrompt(scenePlan);

    if (fgPrompt) {
      if (verbose) {
        console.log(`[backgroundEngine] Generating foreground: ${fgPrompt}`);
      }

      try {
        const fgResult = await generateImageNanoBanana({
          prompt: fgPrompt,
          aspectRatio: EDITORIAL_ASPECT_RATIO,
        });

        foregroundResult = {
          base64: fgResult.base64,
          mimeType: fgResult.mimeType,
          dataUrl: `data:${fgResult.mimeType};base64,${fgResult.base64}`,
          promptUsed: fgPrompt,
        };
      } catch (err: any) {
        console.warn(
          `[backgroundEngine] Foreground generation failed:`,
          err?.message
        );
        // Continue without foreground
      }
    }
  }

  const generationTimeMs = Date.now() - startTime;

  console.log(
    `[backgroundEngine] Scene background generated: ${scenePlan.sceneType}/${scenePlan.surface} in ${generationTimeMs}ms`
  );

  return {
    base64: mainResult.base64,
    mimeType: mainResult.mimeType,
    dataUrl: `data:${mainResult.mimeType};base64,${mainResult.base64}`,
    model: mainResult.model,
    scenePlan,
    promptUsed: mainPrompt,
    foreground: foregroundResult,
    generationTimeMs,
  };
}
