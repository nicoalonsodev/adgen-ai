/**
 * Render Engine – Main orchestrator for template rendering
 *
 * Takes a CreativeSpec and renders the appropriate template.
 * Acts as the single entry point for all rendering.
 */

import type { CreativeSpec, TemplateId } from "../spec/creativeSpec";
import { validateCreativeSpec } from "../spec/creativeSpec";
import {
  renderTemplateSplitEditorialV1,
  renderTemplateBadgeOfferV1,
  renderTemplateBeforeAfterV1,
  renderTemplateQuoteTestimonialV1,
  renderTemplateLifestyleHeroV1,
  renderTemplateNarrativeHeroV1,
} from "./templates";

/* ═══════════════════════════════════════════════════════════════
   TEMPLATE REGISTRY
═══════════════════════════════════════════════════════════════ */

type TemplateRenderer = (spec: CreativeSpec) => Promise<Buffer>;

const TEMPLATE_RENDERERS: Record<TemplateId, TemplateRenderer> = {
  T_SPLIT_EDITORIAL_V1: renderTemplateSplitEditorialV1,
  T_BADGE_OFFER_V1: renderTemplateBadgeOfferV1,
  T_BEFORE_AFTER_V1: renderTemplateBeforeAfterV1,
  T_QUOTE_TESTIMONIAL_V1: renderTemplateQuoteTestimonialV1,
  // New templates for creative mode system
  T_LIFESTYLE_HERO_V1: renderTemplateLifestyleHeroV1,
  T_NARRATIVE_HERO_V1: renderTemplateNarrativeHeroV1,
};

/* ═══════════════════════════════════════════════════════════════
   RENDER RESULT
═══════════════════════════════════════════════════════════════ */

export interface RenderResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  templateId: TemplateId;
  renderTimeMs: number;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN RENDER FUNCTION
═══════════════════════════════════════════════════════════════ */

/**
 * Render a creative from its spec
 *
 * @param spec - The CreativeSpec to render
 * @returns RenderResult with buffer or error
 */
export async function renderCreative(spec: CreativeSpec): Promise<RenderResult> {
  const startTime = Date.now();
  const templateId = spec.layout.templateId;

  try {
    // Validate spec
    const validation = validateCreativeSpec(spec);
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid spec: ${JSON.stringify(validation.errors)}`,
        templateId,
        renderTimeMs: Date.now() - startTime,
      };
    }

    // Get renderer
    const renderer = TEMPLATE_RENDERERS[templateId];
    if (!renderer) {
      return {
        success: false,
        error: `Unknown template: ${templateId}`,
        templateId,
        renderTimeMs: Date.now() - startTime,
      };
    }

    // Render
    const buffer = await renderer(spec);

    return {
      success: true,
      buffer,
      templateId,
      renderTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? "Unknown render error",
      templateId,
      renderTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Render a creative and return base64 data URL
 */
export async function renderCreativeToBase64(
  spec: CreativeSpec
): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  const result = await renderCreative(spec);

  if (!result.success || !result.buffer) {
    return {
      success: false,
      error: result.error,
    };
  }

  const dataUrl = `data:image/png;base64,${result.buffer.toString("base64")}`;

  return {
    success: true,
    dataUrl,
  };
}

/**
 * Check if a template can handle a given spec
 * (validates required fields for that template)
 */
export function canRenderWithTemplate(
  templateId: TemplateId,
  spec: Partial<CreativeSpec>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Common required fields
  if (!spec.product?.imageSrc) missing.push("product.imageSrc");
  if (!spec.bg?.imageSrc) missing.push("bg.imageSrc");
  if (!spec.claims?.headline && templateId !== "T_QUOTE_TESTIMONIAL_V1") {
    missing.push("claims.headline");
  }
  if (!spec.cta?.label) missing.push("cta.label");

  // Template-specific requirements
  switch (templateId) {
    case "T_BADGE_OFFER_V1":
      if (!spec.offer?.label) missing.push("offer.label");
      break;

    case "T_BEFORE_AFTER_V1":
      if (spec.proof?.type !== "BEFORE_AFTER") missing.push("proof.type=BEFORE_AFTER");
      if (spec.proof?.type === "BEFORE_AFTER") {
        if (!spec.proof.day1Label) missing.push("proof.day1Label");
        if (!spec.proof.day30Label) missing.push("proof.day30Label");
      }
      break;

    case "T_QUOTE_TESTIMONIAL_V1":
      if (spec.proof?.type !== "QUOTE") missing.push("proof.type=QUOTE");
      if (spec.proof?.type === "QUOTE" && !spec.proof.quote) {
        missing.push("proof.quote");
      }
      break;
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
