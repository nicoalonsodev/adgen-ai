/**
 * composePipelineV2 – Creative Pipeline V2 Orchestrator
 *
 * New generation flow for templates with `pipelineV2: true`:
 *
 *   1. generateCreativeBrief (OpenAI) — LLM reads template + ADN → creative brief
 *   2. generateGeminiPrompts (pure fn) — brief → background prompt + person prompt
 *   3. generateBackground (Gemini) — background prompt → dark cinematic BG
 *   4. generateScene (Gemini) — BG + person prompt → final scene with person
 *
 * The result is a fully composed scene (background + person) ready for the
 * template renderer to overlay text (headline, logo, dark overlay).
 *
 * Coexists with V1: only activated when the template has `pipelineV2: true`.
 */

import { generateCreativeBrief, type CreativeBriefInput, type CreativeBrief } from "./generateCreativeBrief";
import { generateGeminiPrompts, type GeminiPrompts } from "./generateBackgroundPrompt";
import { generateBackground, generateScene } from "@/lib/ai/gemini";
import { getTemplateMeta } from "@/services/product-composer/templates/meta";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface PipelineV2Input {
  /** Template ID (must have pipelineV2: true) */
  templateId: string;
  /** Product name */
  productName: string;
  /** Product description */
  productDescription?: string;
  /** Strategic core from stage 1 */
  strategicCore: {
    coreBenefit: string;
    category: string;
    positioning?: string;
    keyProof?: string;
  };
  /** Business DNA (ADN) */
  businessProfile?: CreativeBriefInput["businessProfile"];
  /** Active offer */
  offer?: CreativeBriefInput["offer"];
  /** Variant index (for diversity) */
  variantIndex?: number;
  /** Aspect ratio for image generation */
  aspectRatio?: string;
}

export interface PipelineV2Result {
  /** Final composed scene as PNG buffer */
  sceneBuffer: Buffer;
  /** Scene as data URL for downstream use */
  sceneDataUrl: string;
  /** Background-only buffer (before person compositing) */
  backgroundBuffer: Buffer;
  /** Background as data URL */
  backgroundDataUrl: string;
  /** The creative brief that drove generation */
  brief: CreativeBrief;
  /** The Gemini prompts derived from the brief */
  prompts: GeminiPrompts;
  /** Timing breakdown */
  timing: {
    briefMs: number;
    backgroundMs: number;
    sceneMs: number;
    totalMs: number;
  };
}

/* ════════════════════════════════════════════════════════════════
   MAIN ORCHESTRATOR
════════════════════════════════════════════════════════════════ */

/**
 * Execute the V2 creative pipeline.
 *
 * Flow:
 *   Brief (OpenAI) → Prompts (pure) → Background (Gemini) → Scene (Gemini)
 *
 * @param input - Pipeline input with product/brand/template context
 * @returns Composed scene buffer + metadata
 */
export async function composePipelineV2(
  input: PipelineV2Input,
): Promise<PipelineV2Result> {
  const totalStart = Date.now();
  const templateMeta = getTemplateMeta(input.templateId);

  if (!templateMeta) {
    throw new Error(`[pipelineV2] Template not found: ${input.templateId}`);
  }

  console.log(
    `[pipelineV2] Starting for template=${input.templateId} ` +
    `product="${input.productName}" variant=${input.variantIndex ?? 0}`,
  );

  /* ═══════════════════════════════════════════════════════════════
     STEP 1: Generate Creative Brief (OpenAI)
  ═══════════════════════════════════════════════════════════════ */
  const briefStart = Date.now();

  const { brief } = await generateCreativeBrief({
    templateId: input.templateId,
    productName: input.productName,
    productDescription: input.productDescription,
    strategicCore: input.strategicCore,
    businessProfile: input.businessProfile,
    offer: input.offer,
    variantIndex: input.variantIndex,
  });

  const briefMs = Date.now() - briefStart;
  console.log(`[pipelineV2] Step 1 (brief): ${briefMs}ms — mood="${brief.mood}"`);

  /* ═══════════════════════════════════════════════════════════════
     STEP 2: Generate Gemini Prompts (pure function, instant)
  ═══════════════════════════════════════════════════════════════ */
  const prompts = generateGeminiPrompts(brief, input.templateId);

  console.log(
    `[pipelineV2] Step 2 (prompts): bg_chars=${prompts.backgroundPrompt.length} ` +
    `person_chars=${prompts.personPrompt.length}`,
  );

  /* ═══════════════════════════════════════════════════════════════
     STEP 3: Generate Background (Gemini — text → image)
  ═══════════════════════════════════════════════════════════════ */
  const bgStart = Date.now();

  const backgroundBuffer = await generateBackground({
    prompt: prompts.backgroundPrompt,
    aspectRatio: input.aspectRatio ?? "1:1",
  });

  const backgroundMs = Date.now() - bgStart;
  console.log(`[pipelineV2] Step 3 (background): ${backgroundMs}ms`);

  const backgroundDataUrl = `data:image/png;base64,${backgroundBuffer.toString("base64")}`;

  /* ═══════════════════════════════════════════════════════════════
     STEP 4: Generate Scene — composite person onto background
     (Gemini — image + text → image)

     Only if the template requires scene generation (personScene: true).
     Otherwise, just return the background as the final scene.
  ═══════════════════════════════════════════════════════════════ */
  let sceneBuffer: Buffer;
  let sceneMs = 0;

  if (templateMeta.requiresSceneGeneration && templateMeta.personScene) {
    const sceneStart = Date.now();

    sceneBuffer = await generateScene({
      backgroundPng: backgroundBuffer,
      prompt: prompts.personPrompt,
      aspectRatio: input.aspectRatio ?? "1:1",
    });

    sceneMs = Date.now() - sceneStart;
    console.log(`[pipelineV2] Step 4 (scene): ${sceneMs}ms`);
  } else {
    sceneBuffer = backgroundBuffer;
    console.log(`[pipelineV2] Step 4 (scene): skipped — no person scene required`);
  }

  const sceneDataUrl = `data:image/png;base64,${sceneBuffer.toString("base64")}`;
  const totalMs = Date.now() - totalStart;

  console.log(
    `[pipelineV2] Pipeline complete in ${totalMs}ms ` +
    `(brief=${briefMs}ms bg=${backgroundMs}ms scene=${sceneMs}ms)`,
  );

  return {
    sceneBuffer,
    sceneDataUrl,
    backgroundBuffer,
    backgroundDataUrl,
    brief,
    prompts,
    timing: {
      briefMs,
      backgroundMs,
      sceneMs,
      totalMs,
    },
  };
}
