/**
 * Style Selector – Rules-First Deterministic Selection
 *
 * Selects style pack based on:
 * 1. offer.active true → BOLD_PROMO
 * 2. category == "skincare" | "health" → CLINICAL_CLEAN
 * 3. default → EDITORIAL_SOFT
 *
 * Style packs define:
 * - Background prompt style
 * - Color palette
 * - Typography weights
 */

import type { StylePackId, OfferSchema } from "../spec/creativeSpec";
import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface StyleSelectorInput {
  offer?: z.infer<typeof OfferSchema>;
  category?: string;
  /** Optional override – if provided, skip rules */
  forcePackId?: StylePackId;
}

export interface StyleSelectorResult {
  packId: StylePackId;
  reason: string;
}

/* ═══════════════════════════════════════════════════════════════
   STYLE PACK DEFINITIONS
═══════════════════════════════════════════════════════════════ */

export interface StylePack {
  id: StylePackId;
  name: string;
  description: string;
  /** For background generation prompt */
  backgroundStyle: string;
  /** Primary text color */
  primaryTextColor: string;
  /** Secondary text color */
  secondaryTextColor: string;
  /** CTA background */
  ctaBackground: string;
  /** CTA text color */
  ctaTextColor: string;
  /** Badge background */
  badgeBackground: string;
  /** Badge text color */
  badgeTextColor: string;
  /** Sticker background */
  stickerBackground: string;
  /** Sticker text color */
  stickerTextColor: string;
}

export const STYLE_PACKS: Record<StylePackId, StylePack> = {
  EDITORIAL_SOFT: {
    id: "EDITORIAL_SOFT",
    name: "Editorial Soft",
    description: "Luminous, beige/cream tones, soft shadows, editorial photography",
    backgroundStyle:
      "luminoso, tonos beige y crema, sombras suaves, estilo fotografía editorial de revista de lifestyle, sin texto, sin objetos adicionales, fondo limpio minimalista",
    primaryTextColor: "#FFFFFF",
    secondaryTextColor: "rgba(255, 255, 255, 0.85)",
    ctaBackground: "#FFFFFF",
    ctaTextColor: "#000000",
    badgeBackground: "#E8D5B5",
    badgeTextColor: "#2D2D2D",
    stickerBackground: "#000000",
    stickerTextColor: "#FFFFFF",
  },
  CLINICAL_CLEAN: {
    id: "CLINICAL_CLEAN",
    name: "Clinical Clean",
    description: "White/soft blue, dermocosmetic feel, clean and medical",
    backgroundStyle:
      "blanco puro con sutiles tonos azul claro, sensación dermocosmética limpia, estilo clínico y profesional, sin texto, sin objetos, fondo minimalista médico",
    primaryTextColor: "#1A365D",
    secondaryTextColor: "#4A5568",
    ctaBackground: "#2B6CB0",
    ctaTextColor: "#FFFFFF",
    badgeBackground: "#BEE3F8",
    badgeTextColor: "#2C5282",
    stickerBackground: "#2B6CB0",
    stickerTextColor: "#FFFFFF",
  },
  BOLD_PROMO: {
    id: "BOLD_PROMO",
    name: "Bold Promo",
    description: "High contrast gradients, abstract waves, promotional feel",
    backgroundStyle:
      "gradientes suaves vibrantes con ondas abstractas sutiles, alto contraste pero elegante, colores cálidos tipo coral y naranja, sin texto, sin objetos, fondo abstracto promocional",
    primaryTextColor: "#FFFFFF",
    secondaryTextColor: "rgba(255, 255, 255, 0.9)",
    ctaBackground: "#FF6B35",
    ctaTextColor: "#FFFFFF",
    badgeBackground: "#FF4136",
    badgeTextColor: "#FFFFFF",
    stickerBackground: "#FFD700",
    stickerTextColor: "#000000",
  },
};

/* ═══════════════════════════════════════════════════════════════
   CATEGORIES THAT TRIGGER CLINICAL_CLEAN
═══════════════════════════════════════════════════════════════ */

const CLINICAL_CATEGORIES = [
  "skincare",
  "dermocosmética",
  "health",
  "salud",
  "medical",
  "médico",
  "farmacia",
  "pharmaceutical",
  "cuidado de la piel",
  "dermatología",
];

/* ═══════════════════════════════════════════════════════════════
   RULES
═══════════════════════════════════════════════════════════════ */

const STYLE_RULES: Array<{
  packId: StylePackId;
  condition: (input: StyleSelectorInput) => boolean;
  reason: string;
}> = [
  {
    packId: "BOLD_PROMO",
    condition: (input) => input.offer?.active === true,
    reason: "Active offer detected → Bold Promo style",
  },
  {
    packId: "CLINICAL_CLEAN",
    condition: (input) =>
      input.category
        ? CLINICAL_CATEGORIES.some(
            (c) => input.category!.toLowerCase().includes(c)
          )
        : false,
    reason: "Clinical/skincare category detected → Clinical Clean style",
  },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN SELECTOR
═══════════════════════════════════════════════════════════════ */

/**
 * Select style pack deterministically based on rules
 */
export function selectStylePack(
  input: StyleSelectorInput
): StyleSelectorResult {
  // Override check
  if (input.forcePackId) {
    return {
      packId: input.forcePackId,
      reason: `Forced override: ${input.forcePackId}`,
    };
  }

  // Apply rules in priority order
  for (const rule of STYLE_RULES) {
    if (rule.condition(input)) {
      return {
        packId: rule.packId,
        reason: rule.reason,
      };
    }
  }

  // Default fallback
  return {
    packId: "EDITORIAL_SOFT",
    reason: "Default fallback → Editorial Soft style",
  };
}

/**
 * Get style pack by ID
 */
export function getStylePack(packId: StylePackId): StylePack {
  return STYLE_PACKS[packId];
}

/**
 * Get background prompt for a style pack
 */
export function getBackgroundPromptStyle(packId: StylePackId): string {
  return STYLE_PACKS[packId].backgroundStyle;
}
