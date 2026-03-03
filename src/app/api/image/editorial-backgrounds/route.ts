import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/utils/errors";
import { withRetry } from "@/lib/utils/retry";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import {
  generateEditorialBackground,
  getEditorialPromptForLayout,
  layoutToEditorialTemplate,
  EDITORIAL_WIDTH,
  EDITORIAL_HEIGHT,
  EDITORIAL_ASPECT_RATIO,
} from "@/lib/render/backgroundEngine";
import { LAYOUT_IDS } from "@/lib/scenes/sceneLibrary";

export const runtime = "nodejs";

/**
 * POST /api/image/editorial-backgrounds
 *
 * Generates editorial-style minimalist backgrounds for Meta Ads.
 * All backgrounds are generated at 1080x1350 (4:5 aspect ratio).
 *
 * Features:
 * - Template-based generation (layout determines prompt)
 * - Minimalist, clean, studio-style backgrounds
 * - Controlled negative space for text placement
 * - No objects, people, or text in backgrounds
 */

/* ── Input Schema ── */

const LayoutSchema = z.object({
  layout_id: z.enum([
    "hero_center",
    "hero_left",
    "hero_right",
    "split_top",
    "split_bottom",
    "diagonal",
    "floating",
    "minimal",
  ]),
  /** Optional scene_id for tracking */
  scene_id: z.string().optional(),
});

const InputSchema = z.object({
  /** Single layout or array of layouts to generate */
  layouts: z.array(LayoutSchema).min(1).max(8),
  /** Enable verbose logging */
  verbose: z.boolean().optional().default(false),
});

/* ── Route Handler ── */

export async function POST(req: Request) {
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

    const { layouts, verbose } = parsed.data;

    console.log(
      `[editorial-backgrounds] Generating ${layouts.length} editorial backgrounds (${EDITORIAL_ASPECT_RATIO})…`
    );

    /* ── Generate backgrounds with concurrency ── */
    const items = await mapWithConcurrency(layouts, 2, async (layout) => {
      const startTime = Date.now();

      try {
        const template = layoutToEditorialTemplate(layout.layout_id);
        const promptUsed = getEditorialPromptForLayout(layout.layout_id);

        if (verbose) {
          console.log(
            `[editorial-backgrounds] Starting: layout=${layout.layout_id} template=${template}`
          );
        }

        const result = await withRetry(
          () =>
            generateEditorialBackground(layout.layout_id, { verbose }),
          { retries: 1, baseDelayMs: 2000 }
        );

        const generationTimeMs = Date.now() - startTime;

        console.log(
          `[editorial-backgrounds] ✓ ${layout.layout_id} → ${template} (${generationTimeMs}ms)`
        );

        return {
          layout_id: layout.layout_id,
          scene_id: layout.scene_id ?? null,
          template,
          dataUrl: result.dataUrl,
          mimeType: result.mimeType,
          model: result.model,
          dimensions: {
            width: EDITORIAL_WIDTH,
            height: EDITORIAL_HEIGHT,
            aspectRatio: EDITORIAL_ASPECT_RATIO,
          },
          promptUsed,
          generationTimeMs,
          error: null,
        };
      } catch (err: any) {
        const generationTimeMs = Date.now() - startTime;

        console.error(
          `[editorial-backgrounds] ✗ Failed for ${layout.layout_id}:`,
          err?.message
        );

        return {
          layout_id: layout.layout_id,
          scene_id: layout.scene_id ?? null,
          template: layoutToEditorialTemplate(layout.layout_id),
          dataUrl: null,
          mimeType: null,
          model: null,
          dimensions: null,
          promptUsed: getEditorialPromptForLayout(layout.layout_id),
          generationTimeMs,
          error: err?.message ?? "Generation failed",
        };
      }
    });

    const successCount = items.filter((i) => i.dataUrl).length;

    console.log(
      `[editorial-backgrounds] Done. ${successCount}/${items.length} succeeded.`
    );

    return NextResponse.json(
      {
        ok: true,
        items,
        meta: {
          requested: layouts.length,
          succeeded: successCount,
          failed: layouts.length - successCount,
          dimensions: {
            width: EDITORIAL_WIDTH,
            height: EDITORIAL_HEIGHT,
            aspectRatio: EDITORIAL_ASPECT_RATIO,
          },
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[editorial-backgrounds] Error:", err);
    return errorResponse(err?.message ?? "Internal server error", 500);
  }
}

/* ── GET: Info endpoint ── */

export async function GET() {
  const templates = LAYOUT_IDS.map((layoutId) => ({
    layoutId,
    template: layoutToEditorialTemplate(layoutId),
    prompt: getEditorialPromptForLayout(layoutId),
  }));

  return NextResponse.json({
    ok: true,
    info: {
      description:
        "Editorial Background Engine V1 - Minimalist backgrounds for Meta Ads",
      dimensions: {
        width: EDITORIAL_WIDTH,
        height: EDITORIAL_HEIGHT,
        aspectRatio: EDITORIAL_ASPECT_RATIO,
      },
      availableLayouts: LAYOUT_IDS,
      templates,
    },
  });
}
