/**
 * Scene Library – 8 escenas fijas para Meta Ads 1080×1350 (MVP)
 *
 * 100% determinístico. Sin IA.
 * Cada escena define layout, espacio negativo, iluminación, paleta y reglas de copy.
 */

/* ── Scene IDs ── */
export type SceneId =
  | "AUTHORITY"
  | "BENEFIT"
  | "DIFFERENTIAL"
  | "OBJECTION"
  | "OFFER"
  | "URGENCY"
  | "SOCIAL_PROOF"
  | "ASPIRATIONAL";

export const SCENE_IDS: readonly SceneId[] = [
  "AUTHORITY",
  "BENEFIT",
  "DIFFERENTIAL",
  "OBJECTION",
  "OFFER",
  "URGENCY",
  "SOCIAL_PROOF",
  "ASPIRATIONAL",
] as const;

/* ── Layout IDs ── */
export type LayoutId =
  | "hero_center"
  | "hero_left"
  | "hero_right"
  | "split_top"
  | "split_bottom"
  | "diagonal"
  | "floating"
  | "minimal";

export const LAYOUT_IDS: readonly LayoutId[] = [
  "hero_center",
  "hero_left",
  "hero_right",
  "split_top",
  "split_bottom",
  "diagonal",
  "floating",
  "minimal",
] as const;

/* ── Negative Space ── */
export type NegativeSpace =
  | "right"
  | "left"
  | "top"
  | "bottom"
  | "top_right"
  | "top_left";

/* ── Scene Template ── */
export interface SceneTemplate {
  scene_id: SceneId;
  layout_id: LayoutId;
  negative_space: NegativeSpace;
  lighting_style: string;
  palette_hint: string;
  background_negative_prompt: string;
  rules: {
    allow_uppercase: boolean;
    allow_badge: boolean;
    allow_offer_cta: boolean;
  };
}

/* ── Default negative prompt (shared) ── */
const DEFAULT_NEG_PROMPT =
  "text, watermark, logo, blurry, low quality, deformed, distorted, oversaturated, cluttered background, extra limbs, bad anatomy";

/* ── Scene Library ── */
export const SCENE_LIBRARY: readonly SceneTemplate[] = [
  /* 1 — AUTHORITY */
  {
    scene_id: "AUTHORITY",
    layout_id: "hero_center",
    negative_space: "bottom",
    lighting_style: "studio soft light, neutral backdrop",
    palette_hint: "dark navy, white, gold accent",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: true,
      allow_badge: true,
      allow_offer_cta: false,
    },
  },

  /* 2 — BENEFIT */
  {
    scene_id: "BENEFIT",
    layout_id: "hero_left",
    negative_space: "right",
    lighting_style: "warm natural light, lifestyle setting",
    palette_hint: "warm whites, soft green, earthy tones",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: false,
      allow_badge: false,
      allow_offer_cta: true,
    },
  },

  /* 3 — DIFFERENTIAL */
  {
    scene_id: "DIFFERENTIAL",
    layout_id: "split_top",
    negative_space: "bottom",
    lighting_style: "clean product lighting, white sweep",
    palette_hint: "monochrome with one accent color",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: true,
      allow_badge: true,
      allow_offer_cta: false,
    },
  },

  /* 4 — OBJECTION */
  {
    scene_id: "OBJECTION",
    layout_id: "hero_right",
    negative_space: "left",
    lighting_style: "soft diffused, approachable tone",
    palette_hint: "light blue, white, slate gray",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: false,
      allow_badge: false,
      allow_offer_cta: false,
    },
  },

  /* 5 — OFFER */
  {
    scene_id: "OFFER",
    layout_id: "diagonal",
    negative_space: "top_left",
    lighting_style: "vibrant, high contrast, energetic",
    palette_hint: "red, black, white, yellow accent",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: true,
      allow_badge: true,
      allow_offer_cta: true,
    },
  },

  /* 6 — URGENCY */
  {
    scene_id: "URGENCY",
    layout_id: "floating",
    negative_space: "top_right",
    lighting_style: "dramatic rim light, dark background",
    palette_hint: "black, electric orange, white",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: true,
      allow_badge: true,
      allow_offer_cta: true,
    },
  },

  /* 7 — SOCIAL_PROOF */
  {
    scene_id: "SOCIAL_PROOF",
    layout_id: "split_bottom",
    negative_space: "top",
    lighting_style: "natural daylight, real-world context",
    palette_hint: "soft pastels, white, light gray",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: false,
      allow_badge: true,
      allow_offer_cta: false,
    },
  },

  /* 8 — ASPIRATIONAL */
  {
    scene_id: "ASPIRATIONAL",
    layout_id: "minimal",
    negative_space: "bottom",
    lighting_style: "golden hour, cinematic, warm glow",
    palette_hint: "warm gold, cream, deep brown",
    background_negative_prompt: DEFAULT_NEG_PROMPT,
    rules: {
      allow_uppercase: false,
      allow_badge: false,
      allow_offer_cta: true,
    },
  },
] as const;

/* ── Helpers ── */

/** Buscar escena por scene_id. Throws si no existe. */
export function getScene(id: SceneId): SceneTemplate {
  const scene = SCENE_LIBRARY.find((s) => s.scene_id === id);
  if (!scene) throw new Error(`Scene "${id}" not found in library.`);
  return scene;
}

/** Devuelve todas las escenas que permiten offer/CTA. */
export function getOfferScenes(): SceneTemplate[] {
  return SCENE_LIBRARY.filter((s) => s.rules.allow_offer_cta);
}
