/**
 * Template Selector – Rules-First Deterministic Selection
 *
 * Selects the appropriate template based on:
 * 1. offer.active → T_BADGE_OFFER_V1
 * 2. proof.type == "BEFORE_AFTER" → T_BEFORE_AFTER_V1
 * 3. proof.type == "QUOTE" → T_QUOTE_TESTIMONIAL_V1
 * 4. default → T_SPLIT_EDITORIAL_V1
 *
 * This is deterministic – no AI involved.
 */

import type {
  TemplateId,
  OfferSchema,
  ProofSchema,
} from "../spec/creativeSpec";
import { z } from "zod";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface TemplateSelectorInput {
  offer?: z.infer<typeof OfferSchema>;
  proof?: z.infer<typeof ProofSchema>;
  /** Optional override – if provided, skip rules */
  forceTemplateId?: TemplateId;
}

export interface TemplateSelectorResult {
  templateId: TemplateId;
  reason: string;
}

/* ═══════════════════════════════════════════════════════════════
   RULES
═══════════════════════════════════════════════════════════════ */

/**
 * Rule definitions in priority order
 */
const TEMPLATE_RULES: Array<{
  id: TemplateId;
  condition: (input: TemplateSelectorInput) => boolean;
  reason: string;
}> = [
  {
    id: "T_BADGE_OFFER_V1",
    condition: (input) => input.offer?.active === true,
    reason: "Active offer detected → Badge Offer template",
  },
  {
    id: "T_BEFORE_AFTER_V1",
    condition: (input) => input.proof?.type === "BEFORE_AFTER",
    reason: "Before/After proof detected → Before After template",
  },
  {
    id: "T_QUOTE_TESTIMONIAL_V1",
    condition: (input) => input.proof?.type === "QUOTE",
    reason: "Quote proof detected → Quote Testimonial template",
  },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN SELECTOR
═══════════════════════════════════════════════════════════════ */

/**
 * Select template deterministically based on rules
 */
export function selectTemplate(
  input: TemplateSelectorInput
): TemplateSelectorResult {
  // Override check
  if (input.forceTemplateId) {
    return {
      templateId: input.forceTemplateId,
      reason: `Forced override: ${input.forceTemplateId}`,
    };
  }

  // Apply rules in priority order
  for (const rule of TEMPLATE_RULES) {
    if (rule.condition(input)) {
      return {
        templateId: rule.id,
        reason: rule.reason,
      };
    }
  }

  // Default fallback
  return {
    templateId: "T_SPLIT_EDITORIAL_V1",
    reason: "Default fallback → Split Editorial template",
  };
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATE METADATA
═══════════════════════════════════════════════════════════════ */

export interface TemplateMetadata {
  id: TemplateId;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
}

export const TEMPLATE_METADATA: Record<TemplateId, TemplateMetadata> = {
  T_SPLIT_EDITORIAL_V1: {
    id: "T_SPLIT_EDITORIAL_V1",
    name: "Split Editorial",
    description: "Product left, text right. Clean editorial look.",
    requiredFields: ["headline", "cta"],
    optionalFields: ["subheadline", "logo"],
  },
  T_BADGE_OFFER_V1: {
    id: "T_BADGE_OFFER_V1",
    name: "Badge Offer",
    description: "Large offer badge + product + urgency sticker.",
    requiredFields: ["headline", "offer.label", "cta"],
    optionalFields: ["subheadline", "sticker", "logo"],
  },
  T_BEFORE_AFTER_V1: {
    id: "T_BEFORE_AFTER_V1",
    name: "Before After",
    description: "Day 1 / Day 30 grid with main claim.",
    requiredFields: ["headline", "proof.day1Label", "proof.day30Label", "cta"],
    optionalFields: ["subheadline", "proof.caption", "logo"],
  },
  T_QUOTE_TESTIMONIAL_V1: {
    id: "T_QUOTE_TESTIMONIAL_V1",
    name: "Quote Testimonial",
    description: "Large quote with author + product.",
    requiredFields: ["proof.quote", "cta"],
    optionalFields: ["proof.author", "headline", "sticker", "logo"],
  },
};

/**
 * Get metadata for a template
 */
export function getTemplateMetadata(templateId: TemplateId): TemplateMetadata {
  return TEMPLATE_METADATA[templateId];
}
