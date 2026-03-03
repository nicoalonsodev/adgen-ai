/**
 * POST /api/strategy/scene-plan
 *
 * Wrapper HTTP liviano para buildScenePlan() (determinístico, sin IA).
 * Recibe un strategicCore y devuelve el scenePlan con los 8 prompts.
 *
 * Body: { strategicCore: StrategicCoreOutput }
 * Resp: { ok: true, scenePlan: SceneAdapterOutput }
 */

import { NextRequest, NextResponse } from "next/server";
import { buildScenePlan } from "@/lib/scenes/sceneAdapter";
import { validateSceneAdapterOutput } from "@/lib/ai/schemas/sceneAdapter";
import { errorResponse } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.strategicCore || typeof body.strategicCore !== "object") {
      return errorResponse("strategicCore is required and must be an object.", 400);
    }

    const scenePlan = buildScenePlan(body.strategicCore);

    // Sanity-check the output
    const validationErrors = validateSceneAdapterOutput(scenePlan);
    if (validationErrors.length > 0) {
      return errorResponse("Scene plan validation failed.", 500, validationErrors);
    }

    return NextResponse.json({ ok: true, scenePlan });
  } catch (err: any) {
    console.error("[scene-plan] Error:", err);
    return errorResponse(err?.message ?? "Internal error", 500);
  }
}
