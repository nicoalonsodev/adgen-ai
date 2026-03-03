/**
 * Step: decideCreativeMode
 *
 * Decides the creative mode based on strategic core, offer, and category.
 * This is a pure algorithmic function (no LLM).
 *
 * Rules:
 * - If offer is active and aggressive (>30%) → clean (clear value prop)
 * - If category is beauty/skincare/wellness → lifestyle
 * - If category has emotional triggers (gifting, luxury) → narrative
 * - Default → clean
 */

import type { CreativeMode } from "../schemas";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface StrategicCore {
  coreBenefit: string;
  category: string;
  emotionalTriggers?: string[];
  targetAudience?: string;
}

export interface Offer {
  active: boolean;
  type?: string;
  value?: string;
}

export interface DecideModeInput {
  strategicCore: StrategicCore;
  offer?: Offer;
  category?: string;
}

export interface DecideModeResult {
  mode: CreativeMode;
  reason: string;
  confidence: number;
}

/* ════════════════════════════════════════════════════════════════
   CATEGORY MAPPINGS
════════════════════════════════════════════════════════════════ */

/** Categories that work well with lifestyle mode */
const LIFESTYLE_CATEGORIES = new Set([
  "beauty",
  "skincare",
  "cosmetics",
  "wellness",
  "fitness",
  "health",
  "spa",
  "personal care",
  "haircare",
  "bodycare",
  "fragrance",
  "makeup",
  "grooming",
  "self-care",
  "nutrition",
  "supplements",
]);

/** Categories that work well with narrative mode */
const NARRATIVE_CATEGORIES = new Set([
  "luxury",
  "premium",
  "gifting",
  "jewelry",
  "fashion",
  "home decor",
  "artisanal",
  "handmade",
  "boutique",
  "experience",
  "travel",
  "lifestyle",
]);

/** Keywords in core benefit that suggest lifestyle */
const LIFESTYLE_KEYWORDS = [
  "hydrat",
  "glow",
  "radiant",
  "smooth",
  "nourish",
  "refresh",
  "revitaliz",
  "rejuvenat",
  "natural",
  "organic",
  "clean",
  "gentle",
  "sooth",
  "calm",
  "relax",
];

/** Keywords in core benefit that suggest narrative */
const NARRATIVE_KEYWORDS = [
  "transform",
  "journey",
  "ritual",
  "routine",
  "experience",
  "story",
  "moment",
  "discover",
  "unlock",
  "reveal",
  "embrace",
  "celebrate",
  "indulge",
];

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Decides the creative mode based on strategic core, offer, and category.
 *
 * @param input - Strategic core, offer, and category
 * @returns Mode decision with reason and confidence
 */
export function decideCreativeMode(input: DecideModeInput): DecideModeResult {
  const { strategicCore, offer, category: overrideCategory } = input;
  const category = (overrideCategory || strategicCore.category || "").toLowerCase();
  const coreBenefit = strategicCore.coreBenefit.toLowerCase();

  // Rule 1: Aggressive offer → clean (clear value proposition)
  if (offer?.active && offer.value) {
    const percentMatch = offer.value.match(/(\d+)/);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1], 10);
      if (percent >= 30) {
        return {
          mode: "clean",
          reason: `Aggressive offer (${percent}%) - clear value prop needed`,
          confidence: 0.9,
        };
      }
    }
    // Any active offer with label → clean
    if (offer.type === "BUNDLE" || offer.type === "FREE_SHIP") {
      return {
        mode: "clean",
        reason: `Active ${offer.type} offer - clean presentation`,
        confidence: 0.85,
      };
    }
  }

  // Rule 2: Check for narrative keywords in core benefit
  const hasNarrativeKeyword = NARRATIVE_KEYWORDS.some((kw) =>
    coreBenefit.includes(kw)
  );
  if (hasNarrativeKeyword) {
    return {
      mode: "narrative",
      reason: `Core benefit has narrative trigger: "${coreBenefit.slice(0, 50)}"`,
      confidence: 0.75,
    };
  }

  // Rule 3: Check category for narrative fit
  for (const cat of NARRATIVE_CATEGORIES) {
    if (category.includes(cat)) {
      return {
        mode: "narrative",
        reason: `Category "${category}" fits narrative mode`,
        confidence: 0.7,
      };
    }
  }

  // Rule 4: Check for lifestyle keywords in core benefit
  const hasLifestyleKeyword = LIFESTYLE_KEYWORDS.some((kw) =>
    coreBenefit.includes(kw)
  );
  if (hasLifestyleKeyword) {
    return {
      mode: "lifestyle",
      reason: `Core benefit has lifestyle trigger: "${coreBenefit.slice(0, 50)}"`,
      confidence: 0.75,
    };
  }

  // Rule 5: Check category for lifestyle fit
  for (const cat of LIFESTYLE_CATEGORIES) {
    if (category.includes(cat)) {
      return {
        mode: "lifestyle",
        reason: `Category "${category}" fits lifestyle mode`,
        confidence: 0.7,
      };
    }
  }

  // Rule 6: Check emotional triggers
  if (strategicCore.emotionalTriggers?.length) {
    const triggers = strategicCore.emotionalTriggers.map((t) => t.toLowerCase());
    const hasNarrativeTrigger = triggers.some(
      (t) =>
        t.includes("aspiration") ||
        t.includes("transform") ||
        t.includes("luxury")
    );
    if (hasNarrativeTrigger) {
      return {
        mode: "narrative",
        reason: `Emotional triggers suggest narrative: ${triggers.join(", ")}`,
        confidence: 0.65,
      };
    }

    const hasLifestyleTrigger = triggers.some(
      (t) =>
        t.includes("wellness") ||
        t.includes("self-care") ||
        t.includes("natural")
    );
    if (hasLifestyleTrigger) {
      return {
        mode: "lifestyle",
        reason: `Emotional triggers suggest lifestyle: ${triggers.join(", ")}`,
        confidence: 0.65,
      };
    }
  }

  // Default: clean mode
  return {
    mode: "clean",
    reason: "Default mode - no strong lifestyle/narrative signals",
    confidence: 0.5,
  };
}
