import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/utils/errors";

// Copy generation
import {
  generateExtendedCopyVariants,
  deriveStrategicCore,
  type ExtendedCopyGeneratorInput,
} from "@/lib/ai/copyGenerator";

// Template Engine V1
import {
  type CreativeSpec,
  type TemplateId,
  type StylePackId,
  type OfferType,
  TEMPLATE_IDS,
  STYLE_PACK_IDS,
  CREATIVE_MODES,
} from "@/lib/meta/spec/creativeSpec";
import { selectTemplate } from "@/lib/meta/selectors/templateSelector";
import { selectStylePack } from "@/lib/meta/selectors/styleSelector";
import { renderCreative } from "@/lib/meta/render/engine";
import {
  generateArtDirection,
  getDepthModePrompt,
} from "@/lib/meta/artDirection/generateArtDirection";
import {
  generateScenePlan,
  type ScenePlan,
} from "@/lib/meta/scene/scenePlan";

// Background generation
import {
  generateEditorialBackground,
  generateSceneBackground,
} from "@/lib/render/backgroundEngine";

// Creative Mode Pipeline
import {
  orchestratePipeline,
  type CreativeModeInput,
  type OrchestratorResult,
} from "@/lib/meta/pipeline";

// Shadow Layer
import {
  generateShadowLayerAI,
  compositeShadowOntoBackground,
  createPreviewComposite,
} from "@/lib/meta/shadows";

export const runtime = "nodejs";

/**
 * POST /api/meta/v1/generate
 *
 * Template Engine V1 – One-click creative generation.
 *
 * User provides:
 * - product_name (required)
 * - product_image_src (required, data URL)
 * - logo_src (optional, data URL)
 * - product_description (optional)
 * - offer (optional)
 * - proof (optional) – for testimonials/before-after
 * - count (default 6, max 10)
 *
 * System automatically:
 * 1. Derives strategic core (OpenAI)
 * 2. Selects template + style (rules-first)
 * 3. Generates extended copy variants (OpenAI)
 * 4. Generates background (Gemini)
 * 5. Builds CreativeSpec + renders (Canvas)
 */

/* ════════════════════════════════════════════════════════════════
   INPUT SCHEMA
════════════════════════════════════════════════════════════════ */

const OfferInputSchema = z.object({
  active: z.boolean(),
  type: z.enum(["PERCENT", "BUNDLE", "FREE_SHIP"]).default("PERCENT"),
  value: z.string().optional(),
  label: z.string().optional(),
});

const ProofInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("BEFORE_AFTER"),
    day1Label: z.string().default("Día 1"),
    day30Label: z.string().default("Día 30"),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("QUOTE"),
    quote: z.string(),
    author: z.string().optional(),
  }),
]);

const InputSchema = z.object({
  product_name: z.string().min(1, "product_name is required"),
  product_description: z.string().optional(),
  product_image_src: z
    .string()
    .min(1, "product_image_src is required")
    .refine(
      (s) => s.startsWith("data:image/"),
      "product_image_src must be a data URL (data:image/...)"
    ),
  logo_src: z
    .string()
    .refine(
      (s) => !s || s.startsWith("data:image/"),
      "logo_src must be a data URL if provided"
    )
    .optional(),
  offer: OfferInputSchema.optional(),
  proof: ProofInputSchema.optional(),
  count: z.number().int().min(1).max(10).default(6),
  // Creative mode selection
  creative_mode: z.enum(["auto", "clean", "lifestyle", "narrative"]).default("auto"),
  // Shadow mode: off, ai (uses Gemini to generate shadow layer)
  shadow_mode: z.enum(["off", "ai"]).default("off"),
  // Dev mode overrides
  force_template: z.enum(TEMPLATE_IDS).optional(),
  force_style: z.enum(STYLE_PACK_IDS).optional(),
});

type GenerateInput = z.infer<typeof InputSchema>;

/* ════════════════════════════════════════════════════════════════
   OUTPUT TYPES
════════════════════════════════════════════════════════════════ */

interface Creative {
  templateId: string;
  headline: string;
  subheadline: string;
  cta: string;
  pngBase64: string;
  /** Creative-level metadata (new) */
  metadata?: {
    mode?: string;
    narrativeTag?: string;
  };
}

interface GenerateResponse {
  ok: true;
  creatives: Creative[];
  meta: {
    count: number;
    totalTimeMs: number;
    templateId: TemplateId;
    stylePackId: StylePackId;
    /** Creative mode used */
    mode?: string;
    /** Scene brief summary */
    scene?: {
      environment: string;
      mood: string;
      light: string;
    };
    /** Typography plan summary */
    typography?: {
      textColor: string;
      position: string;
      useBackplate: boolean;
    };
    stages: {
      coreTimeMs: number;
      copyTimeMs: number;
      backgroundTimeMs: number;
      renderTimeMs: number;
      /** Pipeline stages (new) */
      pipelineTimeMs?: number;
      /** Shadow generation time */
      shadowTimeMs?: number;
    };
    /** Shadow layer info */
    shadow?: {
      applied: boolean;
      mode: string;
    };
  };
}

/* ════════════════════════════════════════════════════════════════
   ROUTE HANDLER
════════════════════════════════════════════════════════════════ */

export async function POST(req: Request) {
  const pipelineStart = Date.now();

  try {
    /* ── Parse & validate ── */
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input: GenerateInput = parsed.data;
    const count = input.count;

    console.log(`[meta/v1/generate] Starting Template Engine V1 for "${input.product_name}" (${count} creatives)…`);

    /* ════════════════════════════════════════════════════════════════
       STAGE 1: Strategic Core
    ════════════════════════════════════════════════════════════════ */
    const coreStart = Date.now();
    console.log("[meta/v1/generate] Stage 1: Deriving strategic core…");

    const core = await deriveStrategicCore(
      input.product_name,
      input.product_description
    );

    const coreTimeMs = Date.now() - coreStart;
    console.log(`[meta/v1/generate] Core: "${core.coreBenefit}" | Category: "${core.category}" (${coreTimeMs}ms)`);

    /* ════════════════════════════════════════════════════════════════
       STAGE 2: Select Template + Style (Rules-First)
    ════════════════════════════════════════════════════════════════ */
    console.log("[meta/v1/generate] Stage 2: Selecting template and style…");

    const templateResult = selectTemplate({
      offer: input.offer,
      proof: input.proof,
      forceTemplateId: input.force_template,
    });

    const styleResult = selectStylePack({
      offer: input.offer,
      category: core.category,
      forcePackId: input.force_style,
    });

    console.log(`[meta/v1/generate] Template: ${templateResult.templateId} (${templateResult.reason})`);
    console.log(`[meta/v1/generate] Style: ${styleResult.packId} (${styleResult.reason})`);

    /* ════════════════════════════════════════════════════════════════
       STAGE 2.5: Creative Mode Pipeline
    ════════════════════════════════════════════════════════════════ */
    const pipelineStart2 = Date.now();
    console.log(`[meta/v1/generate] Stage 2.5: Running creative mode pipeline (mode: ${input.creative_mode})…`);

    // Run the creative mode orchestrator
    let pipelineResult: OrchestratorResult | null = null;
    try {
      pipelineResult = await orchestratePipeline({
        productName: input.product_name,
        productDescription: input.product_description,
        strategicCore: {
          coreBenefit: core.coreBenefit,
          category: core.category,
        },
        offer: input.offer ? {
          active: input.offer.active,
          type: input.offer.type,
          value: input.offer.value,
        } : undefined,
        selectedTemplateId: templateResult.templateId,
        stylePackId: styleResult.packId,
        creativeModeInput: input.creative_mode as CreativeModeInput,
        verbose: false,
      });
      
      console.log(`[meta/v1/generate] Pipeline: mode=${pipelineResult.mode}, template=${pipelineResult.templateId}`);
    } catch (err: any) {
      console.error("[meta/v1/generate] Pipeline failed, using fallback:", err?.message);
    }

    const pipelineTimeMs = Date.now() - pipelineStart2;

    /* ════════════════════════════════════════════════════════════════
       STAGE 3: Generate Extended Copy Variants
    ════════════════════════════════════════════════════════════════ */
    const copyStart = Date.now();
    console.log(`[meta/v1/generate] Stage 3: Generating ${count} copy variants…`);

    // Determine template hint for copy generation
    let templateHint: ExtendedCopyGeneratorInput["templateHint"] = "EDITORIAL";
    if (input.offer?.active) templateHint = "OFFER";
    else if (input.proof?.type === "BEFORE_AFTER") templateHint = "BEFORE_AFTER";
    else if (input.proof?.type === "QUOTE") templateHint = "QUOTE";

    const copyResult = await generateExtendedCopyVariants({
      productName: input.product_name,
      productDescription: input.product_description,
      coreBenefit: core.coreBenefit,
      offer: input.offer,
      count,
      templateHint,
    });

    const copyTimeMs = Date.now() - copyStart;
    console.log(`[meta/v1/generate] Generated ${copyResult.variants.length} variants (${copyTimeMs}ms)`);

    /* ════════════════════════════════════════════════════════════════
       STAGE 4: Background (use pipeline result or fallback)
    ════════════════════════════════════════════════════════════════ */
    const bgStart = Date.now();
    let backgroundDataUrl: string;
    let foregroundDataUrl: string | undefined;

    // Use pipeline background if available
    if (pipelineResult?.backgroundDataUrl) {
      backgroundDataUrl = pipelineResult.backgroundDataUrl;
      console.log(`[meta/v1/generate] Stage 4: Using pipeline background (mode: ${pipelineResult.mode})`);
    } else {
      // Fallback to legacy scene/editorial background
      console.log("[meta/v1/generate] Stage 4: Generating fallback background…");
      
      const primaryScenePlan = generateScenePlan(0);
      console.log(`[meta/v1/generate] Scene: ${primaryScenePlan.sceneType}/${primaryScenePlan.surface}`);

      try {
        const sceneResult = await generateSceneBackground(primaryScenePlan, {
          verbose: false,
          skipForeground: false,
        });
        backgroundDataUrl = sceneResult.dataUrl;
        foregroundDataUrl = sceneResult.foreground?.dataUrl;
      } catch (err: any) {
        console.warn(`[meta/v1/generate] Scene generation failed, using editorial: ${err?.message}`);
        
        let layoutId: "hero_left" | "hero_center" | "floating" = "hero_left";
        if (templateResult.templateId === "T_BEFORE_AFTER_V1") {
          layoutId = "hero_center";
        } else if (templateResult.templateId === "T_QUOTE_TESTIMONIAL_V1") {
          layoutId = "floating";
        }

        const fallbackResult = await generateEditorialBackground(layoutId, {
          verbose: false,
        });
        backgroundDataUrl = fallbackResult.dataUrl;
      }
    }

    const backgroundTimeMs = Date.now() - bgStart;
    console.log(`[meta/v1/generate] Background ready (${backgroundTimeMs}ms)`);

    /* ════════════════════════════════════════════════════════════════
       STAGE 4.5: AI Shadow Layer (optional)
    ════════════════════════════════════════════════════════════════ */
    let shadowTimeMs = 0;
    let shadowApplied = false;

    if (input.shadow_mode === "ai") {
      const shadowStart = Date.now();
      console.log("[meta/v1/generate] Stage 4.5: Generating AI shadow layer…");

      try {
        // Create preview composite (background + product centered)
        const previewBuffer = await createPreviewComposite(
          backgroundDataUrl,
          input.product_image_src,
          1080,
          1350
        );

        // Decode background to buffer
        const bgBase64 = backgroundDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const backgroundBuffer = Buffer.from(bgBase64, "base64");

        // Generate shadow layer
        const shadowBuffer = await generateShadowLayerAI({
          backgroundBuffer,
          previewBuffer,
          width: 1080,
          height: 1350,
        });

        if (shadowBuffer) {
          // Composite shadow onto background
          const compositeBuffer = await compositeShadowOntoBackground(
            backgroundBuffer,
            shadowBuffer,
            0.35 // opacity
          );

          // Convert back to data URL
          backgroundDataUrl = `data:image/png;base64,${compositeBuffer.toString("base64")}`;
          shadowApplied = true;
          console.log(`[meta/v1/generate] Shadow layer applied successfully`);
        } else {
          console.log(`[meta/v1/generate] Shadow generation returned null, continuing without shadow`);
        }
      } catch (err: any) {
        console.warn(`[meta/v1/generate] Shadow generation failed: ${err?.message}`);
        // Continue without shadow - non-blocking error
      }

      shadowTimeMs = Date.now() - shadowStart;
      console.log(`[meta/v1/generate] Shadow stage completed (${shadowTimeMs}ms, applied=${shadowApplied})`);
    }

    /* ════════════════════════════════════════════════════════════════
       STAGE 5: Build Specs + Render Creatives
    ════════════════════════════════════════════════════════════════ */
    const renderStart = Date.now();
    console.log(`[meta/v1/generate] Stage 5: Rendering ${copyResult.variants.length} creatives…`);

    const creatives: Creative[] = [];
    const ctaLabel = "Conocé más";

    for (let i = 0; i < copyResult.variants.length; i++) {
      const variant = copyResult.variants[i];

      try {
        // Generate art direction for this variant index
        const artDirection = generateArtDirection(i);

        // Generate scene plan for this variant index
        const scenePlan = generateScenePlan(i);

        // Determine template: use pipeline template for lifestyle/narrative, otherwise original
        const finalTemplateId = pipelineResult?.templateId || templateResult.templateId;

        // Build CreativeSpec for this variant
        const spec: CreativeSpec = {
          product: {
            name: input.product_name,
            imageSrc: input.product_image_src,
            logoSrc: input.logo_src,
          },
          claims: {
            headline: variant.headline || input.product_name,
            subheadline: variant.subheadline,
          },
          cta: {
            label: ctaLabel,
          },
          style: {
            packId: styleResult.packId,
          },
          layout: {
            templateId: finalTemplateId,
          },
          bg: {
            imageSrc: backgroundDataUrl,
          },
          artDirection,
          scenePlan,
          // New fields from pipeline
          creativeMode: pipelineResult?.mode,
          typographyPlan: pipelineResult?.typographyPlan || undefined,
          narrativeAngle: pipelineResult?.narrativeAngle || undefined,
        };

        // Add offer if present
        if (input.offer?.active) {
          spec.offer = {
            active: true,
            type: input.offer.type as OfferType,
            value: input.offer.value,
            label: variant.badgeText || input.offer.label || input.offer.value,
          };

          // Add sticker from variant
          if (variant.stickerText) {
            spec.sticker = { text: variant.stickerText };
          }
        }

        // Add proof if present
        if (input.proof) {
          if (input.proof.type === "BEFORE_AFTER") {
            spec.proof = {
              type: "BEFORE_AFTER",
              day1Label: input.proof.day1Label,
              day30Label: input.proof.day30Label,
              caption: variant.proofCaption || input.proof.caption,
            };
          } else if (input.proof.type === "QUOTE") {
            spec.proof = {
              type: "QUOTE",
              quote: variant.quote || input.proof.quote,
              author: variant.author || input.proof.author,
            };
          }
        }

        // Render
        const renderResult = await renderCreative(spec);

        if (!renderResult.success || !renderResult.buffer) {
          console.error(`[meta/v1/generate] Render failed for creative ${i + 1}:`, renderResult.error);
          continue;
        }

        const pngBase64 = `data:image/png;base64,${renderResult.buffer.toString("base64")}`;

        creatives.push({
          templateId: finalTemplateId,
          headline: spec.claims.headline,
          subheadline: spec.claims.subheadline || "",
          cta: ctaLabel,
          pngBase64,
          // Include metadata for creative mode
          metadata: pipelineResult ? {
            mode: pipelineResult.mode,
            narrativeTag: pipelineResult.narrativeAngle?.tag_label,
          } : undefined,
        });

        console.log(`[meta/v1/generate] Rendered creative ${i + 1}/${copyResult.variants.length} (${renderResult.renderTimeMs}ms)`);
      } catch (err: any) {
        console.error(`[meta/v1/generate] Failed to render creative ${i + 1}:`, err?.message);
        // Continue with next variant
      }
    }

    const renderTimeMs = Date.now() - renderStart;
    const totalTimeMs = Date.now() - pipelineStart;

    console.log(
      `[meta/v1/generate] Pipeline complete: ${creatives.length}/${count} creatives in ${totalTimeMs}ms`
    );

    /* ── Return response ── */
    const response: GenerateResponse = {
      ok: true,
      creatives,
      meta: {
        count: creatives.length,
        totalTimeMs,
        templateId: pipelineResult?.templateId || templateResult.templateId,
        stylePackId: styleResult.packId,
        // New metadata
        mode: pipelineResult?.mode,
        scene: pipelineResult?.sceneBrief ? {
          environment: pipelineResult.sceneBrief.environment,
          mood: pipelineResult.sceneBrief.mood,
          light: pipelineResult.sceneBrief.light,
        } : undefined,
        typography: pipelineResult?.typographyPlan ? {
          textColor: pipelineResult.typographyPlan.textColor,
          position: pipelineResult.typographyPlan.position,
          useBackplate: pipelineResult.typographyPlan.useBackplate,
        } : undefined,
        stages: {
          coreTimeMs,
          copyTimeMs,
          backgroundTimeMs,
          renderTimeMs,
          pipelineTimeMs,
          shadowTimeMs: shadowTimeMs > 0 ? shadowTimeMs : undefined,
        },
        shadow: input.shadow_mode === "ai" ? {
          applied: shadowApplied,
          mode: input.shadow_mode,
        } : undefined,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error("[meta/v1/generate] Pipeline error:", err);
    return errorResponse(err?.message ?? "Internal server error", 500);
  }
}

/* ════════════════════════════════════════════════════════════════
   GET: Info
════════════════════════════════════════════════════════════════ */

export async function GET() {
  return NextResponse.json({
    ok: true,
    info: {
      name: "Meta Template Engine V1",
      description: "Generate Meta ad creatives with template selection and creative modes",
      version: "2.1.0",
      templates: TEMPLATE_IDS,
      stylePacks: STYLE_PACK_IDS,
      creativeModes: ["auto", "clean", "lifestyle", "narrative"],
      shadowModes: ["off", "ai"],
      input: {
        product_name: "string (required)",
        product_image_src: "data:image/png;base64,... (required)",
        product_description: "string (optional)",
        logo_src: "data:image/png;base64,... (optional)",
        offer: "{ active: boolean, type: PERCENT|BUNDLE|FREE_SHIP, value?: string, label?: string } (optional)",
        proof: "{ type: BEFORE_AFTER|QUOTE, ... } (optional)",
        count: "number 1-10 (default: 6)",
        creative_mode: "auto|clean|lifestyle|narrative (default: auto)",
        shadow_mode: "off|ai (default: off) - AI generates transparent shadow layer",
        force_template: "TemplateId (dev override)",
        force_style: "StylePackId (dev override)",
      },
      output: {
        creatives: [
          {
            templateId: "T_SPLIT_EDITORIAL_V1 | T_LIFESTYLE_HERO_V1 | T_NARRATIVE_HERO_V1 | ...",
            headline: "string",
            subheadline: "string",
            cta: "string",
            pngBase64: "data:image/png;base64,...",
            metadata: {
              mode: "clean|lifestyle|narrative",
              narrativeTag: "string (narrative mode only)",
            },
          },
        ],
        meta: {
          templateId: "selected template",
          stylePackId: "selected style pack",
          mode: "resolved creative mode",
          scene: "{ environment, mood, light } (lifestyle/narrative)",
          typography: "{ textColor, position, useBackplate }",
          shadow: "{ applied: boolean, mode: string }",
        },
      },
      pipeline: [
        "1. Derive strategic core (OpenAI)",
        "2. Select template + style (rules-first)",
        "2.5. Creative mode pipeline (decide mode, scene brief, narrative angle, light zones, typography)",
        "3. Generate extended copy variants (OpenAI)",
        "4. Generate background (Gemini - mode-aware)",
        "4.5. AI Shadow Layer (optional - generates transparent shadow via Gemini)",
        "5. Build CreativeSpec + render (Canvas)",
      ],
      templateRules: {
        T_BADGE_OFFER_V1: "offer.active = true",
        T_BEFORE_AFTER_V1: "proof.type = BEFORE_AFTER",
        T_QUOTE_TESTIMONIAL_V1: "proof.type = QUOTE",
        T_LIFESTYLE_HERO_V1: "creative_mode = lifestyle",
        T_NARRATIVE_HERO_V1: "creative_mode = narrative",
        T_SPLIT_EDITORIAL_V1: "default / clean mode",
      },
      creativeModeRules: {
        auto: "System decides based on category, core benefit, and offer",
        clean: "Editorial backgrounds, standard templates",
        lifestyle: "Contextual scenes with props, natural lighting",
        narrative: "Story-driven scenes with emotional triggers, tag labels",
      },
      shadowModeRules: {
        off: "No AI shadow - default behavior",
        ai: "Gemini generates transparent shadow layer, composited at 35% opacity",
      },
    },
  });
}
