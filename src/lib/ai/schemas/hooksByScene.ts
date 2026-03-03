/**
 * HooksByScene – JSON Schema + tipos + validación
 *
 * Output de /api/copy/hooks-by-scene:
 *   8 escenas × 2 variantes (A funcional, B emocional)
 *
 * Versión: 1.0
 */

import type { SceneId } from "@/lib/scenes/sceneLibrary";

/* ── Tipos ── */

export interface HookVariant {
  variant_id: "A" | "B";
  hook: string;
  subheadline: string;
  cta: string;
  badge: string | null;
  tone_label: string;
}

export interface SceneHooks {
  scene_id: SceneId;
  angle_id: string;
  variants: [HookVariant, HookVariant]; // siempre A + B
}

export interface HookBySceneOutput {
  version: "1.0";
  scenes: SceneHooks[];
  generated_at_iso: string;
}

/* ── JSON Schema para Structured Outputs ── */

export const HOOKS_BY_SCENE_SCHEMA = {
  name: "hooks_by_scene_v1_0",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      version: { type: "string", enum: ["1.0"] },
      scenes: {
        type: "array",
        minItems: 8,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            scene_id: {
              type: "string",
              enum: [
                "AUTHORITY",
                "BENEFIT",
                "DIFFERENTIAL",
                "OBJECTION",
                "OFFER",
                "URGENCY",
                "SOCIAL_PROOF",
                "ASPIRATIONAL",
              ],
            },
            angle_id: { type: "string" },
            variants: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  variant_id: { type: "string", enum: ["A", "B"] },
                  hook: { type: "string" },
                  subheadline: { type: "string" },
                  cta: { type: "string" },
                  badge: { type: ["string", "null"] },
                  tone_label: { type: "string" },
                },
                required: [
                  "variant_id",
                  "hook",
                  "subheadline",
                  "cta",
                  "badge",
                  "tone_label",
                ],
              },
            },
          },
          required: ["scene_id", "angle_id", "variants"],
        },
      },
      generated_at_iso: { type: "string" },
    },
    required: ["version", "scenes", "generated_at_iso"],
  },
} as const;

/* ── Repair schema (single scene) ── */

export const HOOKS_SCENE_REPAIR_SCHEMA = {
  name: "hooks_scene_repair_v1_0",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      scene_id: {
        type: "string",
        enum: [
          "AUTHORITY",
          "BENEFIT",
          "DIFFERENTIAL",
          "OBJECTION",
          "OFFER",
          "URGENCY",
          "SOCIAL_PROOF",
          "ASPIRATIONAL",
        ],
      },
      angle_id: { type: "string" },
      variants: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            variant_id: { type: "string", enum: ["A", "B"] },
            hook: { type: "string" },
            subheadline: { type: "string" },
            cta: { type: "string" },
            badge: { type: ["string", "null"] },
            tone_label: { type: "string" },
          },
          required: [
            "variant_id",
            "hook",
            "subheadline",
            "cta",
            "badge",
            "tone_label",
          ],
        },
      },
    },
    required: ["scene_id", "angle_id", "variants"],
  },
} as const;

/* ── Reglas de negocio por escena ── */

/** Escenas que permiten uppercase en hook */
const UPPERCASE_SCENES: ReadonlySet<string> = new Set([
  "OFFER",
  "URGENCY",
  "OBJECTION",
]);

/** Escenas que permiten badge */
const BADGE_SCENES: ReadonlySet<string> = new Set([
  "OFFER",
  "URGENCY",
  "SOCIAL_PROOF",
]);

/** Escenas que permiten CTA de oferta */
const OFFER_CTA_SCENES: ReadonlySet<string> = new Set(["OFFER", "URGENCY"]);

/* ── Límites de caracteres ── */
const HOOK_MAX_CHARS = 42;
const SUBHEADLINE_MAX_CHARS = 64;
const CTA_MAX_CHARS = 18;
const BADGE_MAX_CHARS = 20;

/* ── Helpers de validación ── */

function normalizeSpaces(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function hasEmoji(s: string): boolean {
  return /[\u{1F300}-\u{1FAFF}]/u.test(s);
}

function isUppercaseMostly(s: string): boolean {
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (!letters) return true;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "").length;
  return upper / letters.length >= 0.85;
}

/* ── Validar una variante dentro de una escena ── */

export function validateSceneVariant(
  sceneId: string,
  variant: HookVariant,
  hasActiveOffer: boolean
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const prefix = `${sceneId}.${variant.variant_id}`;

  // Hook
  const hook = normalizeSpaces(variant.hook);
  if (!hook) errors.push(`${prefix}.hook: vacío`);
  if (hook.length > HOOK_MAX_CHARS)
    errors.push(`${prefix}.hook: excede ${HOOK_MAX_CHARS} chars (${hook.length})`);
  if (hasEmoji(hook)) errors.push(`${prefix}.hook: contiene emojis`);

  // Uppercase check
  if (UPPERCASE_SCENES.has(sceneId) && !isUppercaseMostly(hook)) {
    errors.push(`${prefix}.hook: debería estar en MAYÚSCULAS para ${sceneId}`);
  }
  if (!UPPERCASE_SCENES.has(sceneId) && isUppercaseMostly(hook) && hook.length > 5) {
    errors.push(`${prefix}.hook: NO debería estar en MAYÚSCULAS para ${sceneId}`);
  }

  // Subheadline
  const sub = normalizeSpaces(variant.subheadline);
  if (!sub) errors.push(`${prefix}.subheadline: vacío`);
  if (sub.length > SUBHEADLINE_MAX_CHARS)
    errors.push(`${prefix}.subheadline: excede ${SUBHEADLINE_MAX_CHARS} chars (${sub.length})`);
  if (hasEmoji(sub)) errors.push(`${prefix}.subheadline: contiene emojis`);

  // CTA
  const cta = normalizeSpaces(variant.cta);
  if (!cta) errors.push(`${prefix}.cta: vacío`);
  if (cta.length > CTA_MAX_CHARS)
    errors.push(`${prefix}.cta: excede ${CTA_MAX_CHARS} chars (${cta.length})`);

  // CTA de oferta
  const isOfferCta =
    cta.toLowerCase().includes("oferta") || cta.toLowerCase().includes("ver oferta");
  if (isOfferCta && (!OFFER_CTA_SCENES.has(sceneId) || !hasActiveOffer)) {
    errors.push(
      `${prefix}.cta: "Ver oferta" solo permitido en OFFER/URGENCY con oferta activa`
    );
  }

  // Badge
  const badge = variant.badge ? normalizeSpaces(variant.badge) : null;
  if (badge && !BADGE_SCENES.has(sceneId)) {
    errors.push(`${prefix}.badge: badges solo permitidos en OFFER/URGENCY/SOCIAL_PROOF`);
  }
  if (badge && badge.length > BADGE_MAX_CHARS) {
    errors.push(`${prefix}.badge: excede ${BADGE_MAX_CHARS} chars (${badge.length})`);
  }

  return { ok: errors.length === 0, errors };
}

/* ── Validar output completo ── */

export function validateHookBySceneOutput(
  output: HookBySceneOutput,
  hasActiveOffer: boolean
): { ok: boolean; errors: string[]; invalidSceneIds: string[] } {
  const errors: string[] = [];
  const invalidSceneIds: string[] = [];

  if (output.version !== "1.0") {
    errors.push(`version debe ser "1.0", recibido: "${output.version}"`);
  }

  if (!Array.isArray(output.scenes) || output.scenes.length !== 8) {
    errors.push(`Se esperan 8 escenas, recibidas: ${output.scenes?.length ?? 0}`);
    return { ok: false, errors, invalidSceneIds };
  }

  const seenIds = new Set<string>();

  for (const scene of output.scenes) {
    if (seenIds.has(scene.scene_id)) {
      errors.push(`scene_id duplicado: ${scene.scene_id}`);
    }
    seenIds.add(scene.scene_id);

    if (!scene.variants || scene.variants.length !== 2) {
      errors.push(`${scene.scene_id}: se esperan 2 variantes, recibidas: ${scene.variants?.length}`);
      invalidSceneIds.push(scene.scene_id);
      continue;
    }

    const variantIds = scene.variants.map((v) => v.variant_id);
    if (!variantIds.includes("A") || !variantIds.includes("B")) {
      errors.push(`${scene.scene_id}: variantes deben ser A y B`);
      invalidSceneIds.push(scene.scene_id);
      continue;
    }

    let sceneOk = true;
    for (const variant of scene.variants) {
      const check = validateSceneVariant(scene.scene_id, variant, hasActiveOffer);
      if (!check.ok) {
        errors.push(...check.errors);
        sceneOk = false;
      }
    }
    if (!sceneOk) {
      invalidSceneIds.push(scene.scene_id);
    }
  }

  return { ok: errors.length === 0, errors, invalidSceneIds };
}
