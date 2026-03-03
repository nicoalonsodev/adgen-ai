/**
 * generateContextualBackground – stub
 * TODO: implement contextual background generation (lifestyle/narrative modes)
 */

import type { SceneBrief, CreativeMode } from "../schemas";

export interface GenerateContextualBackgroundInput {
  sceneBrief: SceneBrief;
  mode: CreativeMode;
  category: string;
  verbose?: boolean;
}

export interface GenerateContextualBackgroundResult {
  dataUrl: string;
  mimeType: string;
  model: string;
}

export async function generateContextualBackground(
  _input: GenerateContextualBackgroundInput
): Promise<GenerateContextualBackgroundResult> {
  throw new Error("generateContextualBackground: not implemented");
}

export async function generateFallbackBackground(): Promise<{ dataUrl: string }> {
  throw new Error("generateFallbackBackground: not implemented");
}
