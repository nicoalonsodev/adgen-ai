/**
 * SceneAdapterOutput – Schema y tipos para la salida de buildScenePlan().
 *
 * Define la estructura de los 8 scene prompts generados determinísticamente
 * a partir del StrategicCoreOutput + SceneLibrary.
 */

import type { SceneId, LayoutId, NegativeSpace } from "@/lib/scenes/sceneLibrary";

/* ── ScenePrompt (individual) ── */
export interface ScenePrompt {
  scene_id: SceneId;
  layout_id: LayoutId;
  negative_space: NegativeSpace;
  background_prompt: string;
  background_negative_prompt: string;
  rules: {
    allow_uppercase: boolean;
    allow_badge: boolean;
    allow_offer_cta: boolean;
  };
}

/* ── SceneAdapterOutput (full plan) ── */
export interface SceneAdapterOutput {
  product_name: string;
  scenes: ScenePrompt[];
  generated_at_iso: string;
}

/* ── Validation ── */

/**
 * Valida que un SceneAdapterOutput cumpla la estructura esperada.
 * Devuelve un array de errores. Si está vacío, es válido.
 */
export function validateSceneAdapterOutput(
  output: unknown
): string[] {
  const errors: string[] = [];

  if (!output || typeof output !== "object") {
    return ["Output must be a non-null object."];
  }

  const o = output as Record<string, unknown>;

  if (typeof o.product_name !== "string" || o.product_name.length === 0) {
    errors.push("product_name must be a non-empty string.");
  }

  if (typeof o.generated_at_iso !== "string") {
    errors.push("generated_at_iso must be a string.");
  }

  if (!Array.isArray(o.scenes)) {
    errors.push("scenes must be an array.");
    return errors;
  }

  if (o.scenes.length !== 8) {
    errors.push(`Expected 8 scenes, got ${o.scenes.length}.`);
  }

  const validSceneIds = new Set([
    "AUTHORITY", "BENEFIT", "DIFFERENTIAL", "OBJECTION",
    "OFFER", "URGENCY", "SOCIAL_PROOF", "ASPIRATIONAL",
  ]);

  const validLayoutIds = new Set([
    "hero_center", "hero_left", "hero_right", "split_top",
    "split_bottom", "diagonal", "floating", "minimal",
  ]);

  const validNegativeSpaces = new Set([
    "right", "left", "top", "bottom", "top_right", "top_left",
  ]);

  const seenSceneIds = new Set<string>();

  for (let i = 0; i < o.scenes.length; i++) {
    const s = o.scenes[i] as Record<string, unknown>;
    const prefix = `scenes[${i}]`;

    if (!s || typeof s !== "object") {
      errors.push(`${prefix} must be an object.`);
      continue;
    }

    // scene_id
    if (typeof s.scene_id !== "string" || !validSceneIds.has(s.scene_id)) {
      errors.push(`${prefix}.scene_id is invalid: "${s.scene_id}".`);
    } else if (seenSceneIds.has(s.scene_id)) {
      errors.push(`${prefix}.scene_id "${s.scene_id}" is duplicated.`);
    } else {
      seenSceneIds.add(s.scene_id);
    }

    // layout_id
    if (typeof s.layout_id !== "string" || !validLayoutIds.has(s.layout_id)) {
      errors.push(`${prefix}.layout_id is invalid: "${s.layout_id}".`);
    }

    // negative_space
    if (
      typeof s.negative_space !== "string" ||
      !validNegativeSpaces.has(s.negative_space)
    ) {
      errors.push(
        `${prefix}.negative_space is invalid: "${s.negative_space}".`
      );
    }

    // background_prompt
    if (typeof s.background_prompt !== "string" || s.background_prompt.length < 20) {
      errors.push(
        `${prefix}.background_prompt must be a string of at least 20 chars.`
      );
    } else if (s.background_prompt.length > 900) {
      errors.push(
        `${prefix}.background_prompt exceeds 900 chars (${(s.background_prompt as string).length}).`
      );
    }

    // background_negative_prompt
    if (
      typeof s.background_negative_prompt !== "string" ||
      s.background_negative_prompt.length === 0
    ) {
      errors.push(
        `${prefix}.background_negative_prompt must be a non-empty string.`
      );
    }

    // rules
    const rules = s.rules as Record<string, unknown> | undefined;
    if (!rules || typeof rules !== "object") {
      errors.push(`${prefix}.rules must be an object.`);
    } else {
      for (const key of [
        "allow_uppercase",
        "allow_badge",
        "allow_offer_cta",
      ] as const) {
        if (typeof rules[key] !== "boolean") {
          errors.push(`${prefix}.rules.${key} must be a boolean.`);
        }
      }
    }
  }

  return errors;
}
