/**
 * generateCreativeBrief – Pipeline V2 Step 1
 *
 * Takes template metadata + ADN + strategic core → produces a structured
 * Creative Brief via OpenAI (gpt-4.1-mini).
 *
 * The brief is the single source of truth for all downstream generation:
 * background prompt, person/scene prompt, and copy tone.
 */

import OpenAI from "openai";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { getTemplateMeta, type TemplateMetadata } from "@/services/product-composer/templates/meta";

// Load the knowledge base as raw text (server-side only)
let _sceneInstructionsCache: string | null = null;
function getSceneInstructions(): string {
  if (!_sceneInstructionsCache) {
    _sceneInstructionsCache = fs.readFileSync(
      path.join(process.cwd(), "src/lib/meta/pipeline/v2/scene-orchestrator-instructions.md"),
      "utf-8",
    );
  }
  return _sceneInstructionsCache!;
}

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface CreativeBriefInput {
  /** Template ID to generate for */
  templateId: string;
  /** Product name */
  productName: string;
  /** Product description (optional) */
  productDescription?: string;
  /** Strategic core from stage 1 */
  strategicCore: {
    coreBenefit: string;
    category: string;
    positioning?: string;
    keyProof?: string;
  };
  /** Business DNA (ADN) - brand profile */
  businessProfile?: {
    nombre?: string;
    rubro?: string;
    propuestaValor?: string;
    diferenciacion?: string;
    clienteIdeal?: string;
    dolores?: string[];
    motivaciones?: string[];
    tono?: string;
    coloresMarca?: string[];
  };
  /** Active offer (if any) */
  offer?: {
    active: boolean;
    type: string;
    value?: string;
    label?: string;
  };
  /** Variant index (for diversity across multiple creatives) */
  variantIndex?: number;
}

/** The structured creative brief produced by the LLM */
export const CreativeBriefSchema = z.object({
  scene_description: z.string().min(30).max(800),
  person_description: z.string().min(20).max(500),
  lighting: z.string().min(10).max(250),
  mood: z.string().min(2).max(30),
  camera: z.string().min(5).max(200),
  color_palette: z.string().min(5).max(200),
  safe_zone_note: z.string().min(5).max(200),
  background_prompt: z.string().min(15).max(400),
  person_prompt: z.string().min(20).max(600),
});

export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;

export interface CreativeBriefResult {
  brief: CreativeBrief;
  generationTimeMs: number;
}

/* ════════════════════════════════════════════════════════════════
   OPENAI CLIENT
════════════════════════════════════════════════════════════════ */

const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.4; // Slightly creative but consistent

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* ════════════════════════════════════════════════════════════════
   SYSTEM PROMPT BUILDER
════════════════════════════════════════════════════════════════ */

function buildSystemPrompt(templateMeta: TemplateMetadata): string {
  return `${getSceneInstructions()}

---

## CURRENT TEMPLATE CONTEXT

You are generating a brief for template: **${templateMeta.id}**
- Name: ${templateMeta.name}
- Description: ${templateMeta.description}
- Copy Zone: ${templateMeta.copyZone} (text renders in the ${templateMeta.copyZone} area)
- Scene Full Bleed: ${templateMeta.sceneFullBleed ?? false}
- Person Only (composite mode): ${templateMeta.personOnly ?? false}
- Person Scene: ${templateMeta.personScene ?? false}
- No Product Layer: ${templateMeta.noProductLayer ?? true}

${templateMeta.templateHint ? `### Template Hint\n${templateMeta.templateHint}` : ""}

---

## RESPONSE FORMAT

Respond with a single JSON object matching the schema. No markdown fencing, no explanation.
`;
}

/* ════════════════════════════════════════════════════════════════
   USER PROMPT BUILDER
════════════════════════════════════════════════════════════════ */

function buildUserPrompt(input: CreativeBriefInput, templateMeta: TemplateMetadata): string {
  const { productName, productDescription, strategicCore, businessProfile, offer, variantIndex } = input;

  const sections: string[] = [];

  // Product context
  sections.push(`PRODUCT: ${productName}`);
  if (productDescription) sections.push(`DESCRIPTION: ${productDescription}`);

  // Strategic core
  sections.push(`CORE BENEFIT: ${strategicCore.coreBenefit}`);
  sections.push(`CATEGORY: ${strategicCore.category}`);
  if (strategicCore.positioning) sections.push(`POSITIONING: ${strategicCore.positioning}`);
  if (strategicCore.keyProof) sections.push(`KEY PROOF: ${strategicCore.keyProof}`);

  // Business DNA
  if (businessProfile) {
    const adnParts: string[] = [];
    if (businessProfile.nombre) adnParts.push(`Brand: ${businessProfile.nombre}`);
    if (businessProfile.rubro) adnParts.push(`Industry: ${businessProfile.rubro}`);
    if (businessProfile.propuestaValor) adnParts.push(`Value prop: ${businessProfile.propuestaValor}`);
    if (businessProfile.clienteIdeal) adnParts.push(`Ideal client: ${businessProfile.clienteIdeal}`);
    if (businessProfile.dolores?.length) adnParts.push(`Pain points: ${businessProfile.dolores.join(", ")}`);
    if (businessProfile.tono) adnParts.push(`Tone: ${businessProfile.tono}`);
    if (businessProfile.coloresMarca?.length) adnParts.push(`Brand colors: ${businessProfile.coloresMarca.join(", ")}`);
    if (adnParts.length > 0) sections.push(`\nBRAND DNA:\n${adnParts.join("\n")}`);
  }

  // Offer context
  if (offer?.active) {
    sections.push(`\nACTIVE OFFER: ${offer.type} ${offer.value ?? ""} ${offer.label ?? ""}`);
  }

  // Template constraints
  sections.push(`\nTEMPLATE: ${templateMeta.id}`);
  sections.push(`COPY ZONE: ${templateMeta.copyZone} — keep this area relatively clean for text overlay.`);

  // Category-specific background reference
  const categoryBg = templateMeta.categoryBackgroundPrompts?.[strategicCore.category];
  if (categoryBg) {
    sections.push(`\nCATEGORY BACKGROUND REFERENCE (for context, adapt creatively):\n"${categoryBg}"`);
  }

  // Variant diversity hint
  if (variantIndex !== undefined && variantIndex > 0) {
    sections.push(`\nVARIANT ${variantIndex + 1}: Create a DIFFERENT scene from variant 1. Change the person's appearance, pose, setting details, and lighting angle. Keep the same emotional register but explore a different visual interpretation.`);
  }

  sections.push(`\nGenerate the creative brief as a JSON object.`);

  return sections.join("\n");
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Generate a structured creative brief using OpenAI.
 *
 * @param input - Product, brand, and template context
 * @returns Validated creative brief
 */
export async function generateCreativeBrief(
  input: CreativeBriefInput,
): Promise<CreativeBriefResult> {
  const start = Date.now();

  // Resolve template metadata
  const templateMeta = getTemplateMeta(input.templateId);
  if (!templateMeta) {
    throw new Error(`[generateCreativeBrief] Template not found: ${input.templateId}`);
  }

  const client = getClient();
  const systemPrompt = buildSystemPrompt(templateMeta);
  const userPrompt = buildUserPrompt(input, templateMeta);

  console.log(
    `[generateCreativeBrief] Generating brief for template=${input.templateId} ` +
    `product="${input.productName}" category=${input.strategicCore.category}`,
  );

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: 1200,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("[generateCreativeBrief] Empty response from OpenAI");
  }

  // Parse and validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[generateCreativeBrief] Invalid JSON from OpenAI: ${raw.slice(0, 200)}`);
  }

  const validated = CreativeBriefSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[generateCreativeBrief] Validation errors:", validated.error.flatten());
    throw new Error(
      `[generateCreativeBrief] Brief validation failed: ${validated.error.issues.map((issue: { message: string }) => issue.message).join(", ")}`,
    );
  }

  const generationTimeMs = Date.now() - start;
  console.log(
    `[generateCreativeBrief] Brief generated in ${generationTimeMs}ms — ` +
    `mood="${validated.data.mood}" lighting="${validated.data.lighting.slice(0, 50)}…"`,
  );

  return {
    brief: validated.data,
    generationTimeMs,
  };
}
