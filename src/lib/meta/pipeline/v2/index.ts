/**
 * Pipeline V2 — Creative Brief-driven generation
 *
 * New flow for templates with `pipelineV2: true`:
 *   1. generateCreativeBrief (OpenAI) → structured creative brief
 *   2. generateGeminiPrompts (pure fn) → background + person prompts
 *   3. composePipelineV2 (Gemini) → background → scene with person
 *
 * Usage:
 *   import { composePipelineV2 } from "@/lib/meta/pipeline/v2";
 */

export {
  composePipelineV2,
  type PipelineV2Input,
  type PipelineV2Result,
} from "./composePipelineV2";

export {
  generateCreativeBrief,
  type CreativeBrief,
  type CreativeBriefInput,
  type CreativeBriefResult,
  CreativeBriefSchema,
} from "./generateCreativeBrief";

export {
  generateGeminiPrompts,
  type GeminiPrompts,
} from "./generateBackgroundPrompt";
