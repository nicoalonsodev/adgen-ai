import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImageNanoBanana } from "@/lib/ai/gemini";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { withRetry } from "@/lib/utils/retry";
import { errorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";

/**
 * POST /api/image/scene-backgrounds
 *
 * Genera 8 imágenes de fondo (una por escena) usando los prompts
 * del sceneAdapter. No genera texto ni producto — solo backgrounds.
 */

const ScenePromptSchema = z.object({
  scene_id: z.string().min(1),
  background_prompt: z.string().min(10),
  background_negative_prompt: z.string(),
});

const InputSchema = z.object({
  scenes: z.array(ScenePromptSchema).min(1).max(8),
  aspectRatio: z
    .enum(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"])
    .default("4:5"),
});

export async function POST(req: Request) {
  try {
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

    const { scenes, aspectRatio } = parsed.data;

    console.log(
      `[scene-backgrounds] Generating ${scenes.length} backgrounds (${aspectRatio})…`
    );

    const items = await mapWithConcurrency(scenes, 3, async (scene) => {
      try {
        const out = await withRetry(
          () =>
            generateImageNanoBanana({
              prompt: scene.background_prompt,
              aspectRatio,
            }),
          { retries: 1, baseDelayMs: 2000 }
        );

        return {
          scene_id: scene.scene_id,
          dataUrl: `data:${out.mimeType};base64,${out.base64}`,
          mimeType: out.mimeType,
          model: out.model,
          error: null,
        };
      } catch (err: any) {
        console.error(
          `[scene-backgrounds] Failed for ${scene.scene_id}:`,
          err?.message
        );
        return {
          scene_id: scene.scene_id,
          dataUrl: null,
          mimeType: null,
          model: null,
          error: err?.message ?? "Generation failed",
        };
      }
    });

    const successCount = items.filter((i) => i.dataUrl).length;
    console.log(
      `[scene-backgrounds] Done. ${successCount}/${items.length} succeeded.`
    );

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (err: any) {
    console.error("[scene-backgrounds] Error:", err);
    return errorResponse(err?.message ?? "Internal server error", 500);
  }
}
