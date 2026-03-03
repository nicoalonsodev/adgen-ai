/**
 * Step: generateSceneBrief
 *
 * Uses a cheap LLM to generate a scene brief for lifestyle/narrative modes.
 * Output is validated with Zod schema.
 *
 * The scene brief describes:
 * - Environment (where the product is shown)
 * - Props (contextual objects in the scene)
 * - Lighting
 * - Mood/atmosphere
 * - Safe text area preference
 * - Camera angle
 */

import OpenAI from "openai";
import { SceneBriefSchema, type SceneBrief, type CreativeMode } from "../schemas";

/* ════════════════════════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════════════════════════ */

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use cheap, fast model for scene brief
const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.4;
const MAX_TOKENS = 500;

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface GenerateSceneBriefInput {
  productName: string;
  productDescription?: string;
  category: string;
  coreBenefit: string;
  mode: CreativeMode;
  /** Optional hints for the scene */
  hints?: {
    preferredEnvironment?: string;
    preferredMood?: string;
    timeOfDay?: string;
  };
}

export interface GenerateSceneBriefResult {
  sceneBrief: SceneBrief;
  generationTimeMs: number;
  model: string;
}

/* ════════════════════════════════════════════════════════════════
   PROMPT
════════════════════════════════════════════════════════════════ */

function buildPrompt(input: GenerateSceneBriefInput): string {
  const { productName, productDescription, category, coreBenefit, mode, hints } = input;

  const modeDescription =
    mode === "narrative"
      ? "story-driven, emotional, aspirational"
      : "contextual, realistic, lifestyle-focused";

  return `You are a creative director for advertising photography.
Generate a scene brief for a product photoshoot.

PRODUCT: ${productName}
${productDescription ? `DESCRIPTION: ${productDescription}` : ""}
CATEGORY: ${category}
CORE BENEFIT: ${coreBenefit}
STYLE: ${modeDescription}
${hints?.preferredEnvironment ? `PREFERRED ENVIRONMENT: ${hints.preferredEnvironment}` : ""}
${hints?.preferredMood ? `PREFERRED MOOD: ${hints.preferredMood}` : ""}
${hints?.timeOfDay ? `TIME OF DAY: ${hints.timeOfDay}` : ""}

Generate a scene brief with:
1. environment: A specific, realistic setting (e.g., "modern bathroom with white marble countertop")
2. props: 0-5 contextual props that complement the product (e.g., ["white towel", "small plant"])
3. light: Lighting description (e.g., "soft morning light from large window on left")
4. mood: Single word or short phrase for atmosphere (e.g., "calm", "energetic", "luxurious")
5. safe_text_area_preference: Where text should go relative to product position. Choose from: top, bottom, left, right, top_left, top_right, bottom_left, bottom_right
6. camera: Camera angle. Choose from: eye_level, low_angle, high_angle, close_up, medium_shot, wide_shot
7. color_palette (optional): Color hints (e.g., "warm neutrals", "cool blues")
8. depth_of_field: shallow (blurred BG), medium, or deep (all in focus)

CRITICAL RULES:
- NO people or hands in the scene
- NO text, logos, or typography
- Product will be composited - leave NEGATIVE SPACE for it
- Keep props minimal and contextual
- Environment should feel aspirational but realistic

Respond with ONLY valid JSON.`;
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Generates a scene brief using LLM.
 *
 * @param input - Product info and generation hints
 * @returns Validated scene brief
 */
export async function generateSceneBrief(
  input: GenerateSceneBriefInput
): Promise<GenerateSceneBriefResult> {
  const startTime = Date.now();

  // Skip for clean mode
  if (input.mode === "clean") {
    return {
      sceneBrief: {
        environment: "minimal studio with soft gradient",
        props: [],
        light: "soft diffused studio lighting",
        mood: "clean",
        safe_text_area_preference: "left",
        camera: "eye_level",
        depth_of_field: "shallow",
      },
      generationTimeMs: 0,
      model: "fallback",
    };
  }

  const prompt = buildPrompt(input);

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: "You are a creative director. Respond only with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM");
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Invalid JSON from LLM: ${content.slice(0, 200)}`);
    }

    // Validate with Zod
    const validated = SceneBriefSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("[generateSceneBrief] Validation failed:", validated.error.flatten());
      throw new Error(`Schema validation failed: ${validated.error.message}`);
    }

    const generationTimeMs = Date.now() - startTime;
    console.log(`[generateSceneBrief] Generated in ${generationTimeMs}ms: ${validated.data.environment}`);

    return {
      sceneBrief: validated.data,
      generationTimeMs,
      model: MODEL,
    };
  } catch (error: any) {
    console.error("[generateSceneBrief] Error:", error?.message);

    // Fallback scene brief
    const fallback: SceneBrief = {
      environment: "clean surface with soft natural light",
      props: [],
      light: "soft diffused natural light",
      mood: "calm",
      safe_text_area_preference: "left",
      camera: "eye_level",
      depth_of_field: "shallow",
    };

    return {
      sceneBrief: fallback,
      generationTimeMs: Date.now() - startTime,
      model: "fallback",
    };
  }
}
