/**
 * Step: generateNarrativeAngle
 *
 * Uses LLM to generate a narrative angle for story-driven creatives.
 * Only used for narrative mode.
 *
 * The narrative angle defines:
 * - Type of story being told (routine, transformation, etc.)
 * - Emotional trigger
 * - Time context
 * - Visual focus
 * - Optional tag label (e.g., "Rutina AM")
 */

import OpenAI from "openai";
import { NarrativeAngleSchema, type NarrativeAngle } from "../schemas";

/* ════════════════════════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════════════════════════ */

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use cheap, fast model
const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.5;
const MAX_TOKENS = 300;

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface GenerateNarrativeAngleInput {
  productName: string;
  productDescription?: string;
  category: string;
  coreBenefit: string;
  headline?: string;
  /** Optional hints for the narrative */
  hints?: {
    preferredAngle?: string;
    preferredTrigger?: string;
    timeOfDay?: string;
  };
}

export interface GenerateNarrativeAngleResult {
  narrativeAngle: NarrativeAngle;
  generationTimeMs: number;
  model: string;
}

/* ════════════════════════════════════════════════════════════════
   PROMPT
════════════════════════════════════════════════════════════════ */

function buildPrompt(input: GenerateNarrativeAngleInput): string {
  const { productName, productDescription, category, coreBenefit, headline, hints } = input;

  return `You are a creative strategist for emotional advertising.
Generate a narrative angle for a product ad.

PRODUCT: ${productName}
${productDescription ? `DESCRIPTION: ${productDescription}` : ""}
CATEGORY: ${category}
CORE BENEFIT: ${coreBenefit}
${headline ? `HEADLINE: ${headline}` : ""}
${hints?.preferredAngle ? `PREFERRED ANGLE: ${hints.preferredAngle}` : ""}
${hints?.preferredTrigger ? `PREFERRED TRIGGER: ${hints.preferredTrigger}` : ""}
${hints?.timeOfDay ? `TIME OF DAY: ${hints.timeOfDay}` : ""}

Generate a narrative angle with:

1. angle_type: Choose ONE from:
   - routine: Daily ritual/habit (e.g., "Rutina AM", "Tu ritual nocturno")
   - transformation: Before/after journey
   - moment: Perfect moment capture
   - lifestyle: Aspirational living
   - benefit_focus: Product benefit highlight
   - social_proof: What everyone loves

2. emotional_trigger: Choose ONE from:
   - desire: Wanting something
   - fear_of_loss: FOMO, scarcity
   - aspiration: Becoming better
   - comfort: Feeling good
   - urgency: Act now
   - curiosity: Want to know more

3. time_of_day: Choose ONE from:
   - morning, afternoon, evening, night, any

4. visual_focus: Choose ONE from:
   - product: Product is hero
   - result: The outcome/transformation
   - context: The usage context
   - emotion: The feeling

5. tag_label (optional): Short tag for the creative, max 20 chars.
   Examples: "Rutina AM", "Tu momento", "El secreto"
   Make it in SPANISH and compelling.

Respond with ONLY valid JSON.`;
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Generates a narrative angle using LLM.
 *
 * @param input - Product info and generation hints
 * @returns Validated narrative angle
 */
export async function generateNarrativeAngle(
  input: GenerateNarrativeAngleInput
): Promise<GenerateNarrativeAngleResult> {
  const startTime = Date.now();

  const prompt = buildPrompt(input);

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: "You are a creative strategist. Respond only with valid JSON.",
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
    const validated = NarrativeAngleSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("[generateNarrativeAngle] Validation failed:", validated.error.flatten());
      throw new Error(`Schema validation failed: ${validated.error.message}`);
    }

    const generationTimeMs = Date.now() - startTime;
    console.log(
      `[generateNarrativeAngle] Generated in ${generationTimeMs}ms: ${validated.data.angle_type}/${validated.data.emotional_trigger}`
    );

    return {
      narrativeAngle: validated.data,
      generationTimeMs,
      model: MODEL,
    };
  } catch (error: any) {
    console.error("[generateNarrativeAngle] Error:", error?.message);

    // Fallback narrative angle
    const fallback: NarrativeAngle = {
      angle_type: "benefit_focus",
      emotional_trigger: "desire",
      time_of_day: "any",
      visual_focus: "product",
      tag_label: undefined,
    };

    return {
      narrativeAngle: fallback,
      generationTimeMs: Date.now() - startTime,
      model: "fallback",
    };
  }
}
