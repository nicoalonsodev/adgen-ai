/**
 * generateBackgroundPrompt – Pipeline V2 Step 2
 *
 * Takes the Creative Brief → produces two optimized prompts for Gemini:
 *   1. Background-only prompt (dark cinematic environment, no person)
 *   2. Person-only prompt (to composite onto the pre-generated background)
 *
 * These prompts are Gemini-native: concise, descriptive, photographic.
 * They follow the ABSOLUTE_RULES from promptRules.ts.
 */

import {
  ABSOLUTE_RULES_SCENE,
  ABSOLUTE_RULES_BACKGROUND,
  ABSOLUTE_RULES_ANATOMY,
} from "@/lib/ai/promptRules";
import type { CreativeBrief } from "./generateCreativeBrief";
import { getTemplateMeta } from "@/services/product-composer/templates/meta";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface GeminiPrompts {
  /** Prompt for background-only generation (text → image) */
  backgroundPrompt: string;
  /** Prompt for person-only compositing (background image + prompt → image) */
  personPrompt: string;
  /** Whether the background should be sent as raw (no wrapper) */
  rawBackground: boolean;
}

/* ════════════════════════════════════════════════════════════════
   PROMPT BUILDERS
════════════════════════════════════════════════════════════════ */

/**
 * Build the background-only prompt from the creative brief.
 * This generates a dark cinematic environment with NO person.
 */
function buildBackgroundPrompt(brief: CreativeBrief, templateId: string): string {
  const meta = getTemplateMeta(templateId);

  const basePrompt = brief.background_prompt;

  const negativeConstraints = [
    "Absolutely no text, watermarks, logos, or UI elements.",
    "No split-screen or collage compositions.",
    "No people, no body parts, no products.",
    "Single continuous environment, edge-to-edge.",
  ].join(" ");

  return [
    `Generate an image: ${basePrompt}`,
    "",
    "REQUIREMENTS:",
    "- Photorealistic, cinematic quality. Editorial photography aesthetic, Hasselblad-like rendering.",
    `- Color palette: ${brief.color_palette}`,
    `- Lighting: ${brief.lighting}`,
    `- ${negativeConstraints}`,
    "- Dark tonal range — mean luminance 25-40%.",
    "- 8K detail level, sharp environmental focus, professional color grading.",
    `- ${brief.safe_zone_note}`,
    meta?.sceneFullBleed
      ? "- Full-bleed composition — the scene must cover the entire canvas edge to edge, no vignetting or borders."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Build the person-only composite prompt from the creative brief.
 * This prompt is sent ALONG WITH the pre-generated background image.
 * It must describe ONLY the person (no environment).
 */
function buildPersonPrompt(brief: CreativeBrief, templateId: string): string {
  const meta = getTemplateMeta(templateId);

  const personBase = brief.person_prompt;

  const parts = [
    `Edit this image by adding a photorealistic person to the scene.`,
    "",
    "PERSON DESCRIPTION:",
    personBase,
    "",
    `LIGHTING ON PERSON: ${brief.lighting}`,
    "  Match the exact light color temperature and direction of the background.",
    "  The person must look physically integrated into the existing scene — not composited.",
    `MOOD/EXPRESSION: ${brief.mood}`,
    `CAMERA: ${brief.camera}`,
    "",
    "CRITICAL RULES:",
    ABSOLUTE_RULES_ANATOMY,
    "  No extra fingers. No merged or fused limbs. No floating hands.",
    ABSOLUTE_RULES_BACKGROUND,
    "",
    "COMPOSITION:",
    "- Person fills 60-80% of frame height.",
    "- Face must be visible and expressive — emotion readable at mobile scroll speed.",
    "- No props, no text, no logos in the generated image.",
    `- ${brief.safe_zone_note}`,
  ];

  // Full-bleed scenes: person can span most of the canvas
  if (meta?.sceneFullBleed) {
    parts.push(
      "- Full-bleed composition: the person can span the entire canvas width.",
      "- Ensure the person's head/face is NOT directly behind the top 15% of the canvas (headline area).",
    );
  }

  // Person-only composite mode: emphasize no environment
  if (meta?.personOnly) {
    parts.push(
      "",
      "IMPORTANT — PERSON-ONLY COMPOSITE MODE:",
      "The background has ALREADY been generated. Do NOT add, describe, or modify any environment.",
      "Focus EXCLUSIVELY on the person: appearance, clothing, pose, expression, body language.",
      "The person must look like they BELONG in the existing dark cinematic background.",
      "Precisely match the background's lighting direction, color temperature, and shadow quality.",
    );
  }

  return parts.join("\n");
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Convert a Creative Brief into Gemini-ready prompts.
 *
 * Pure function — no API calls, no side effects.
 *
 * @param brief - The creative brief from generateCreativeBrief
 * @param templateId - Template to generate for
 * @returns Background and person prompts ready for Gemini
 */
export function generateGeminiPrompts(
  brief: CreativeBrief,
  templateId: string,
): GeminiPrompts {
  const meta = getTemplateMeta(templateId);

  return {
    backgroundPrompt: buildBackgroundPrompt(brief, templateId),
    personPrompt: buildPersonPrompt(brief, templateId),
    rawBackground: meta?.rawBackgroundPrompt ?? false,
  };
}
