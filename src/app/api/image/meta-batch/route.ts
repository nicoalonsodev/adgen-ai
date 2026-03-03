import { NextResponse } from "next/server";
import { metaBatchSchema } from "@/lib/validations/metaBatch";
import { generateMetaPromptVariants } from "@/lib/ai/metaVariants";
import { generateImageNanoBanana } from "@/lib/ai/gemini";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = metaBatchSchema.parse(body);

    // 1) Generar variantes (prompts) con ángulos publicitarios
    const variants = await generateMetaPromptVariants(input);

    // 2) Generar imágenes con límite de concurrencia
    // Ajustá según tus límites/costo. 3-5 suele ser buen sweet spot.
    const concurrency = 3;

    const items = await mapWithConcurrency(variants, concurrency, async (v) => {
      const out = await generateImageNanoBanana({
        prompt: v.visualPrompt,
        aspectRatio: input.aspectRatio,
      });

      return {
        angle: v.angle,
        headline: v.headline,
        visualPrompt: v.visualPrompt,
        mimeType: out.mimeType,
        dataUrl: `data:${out.mimeType};base64,${out.base64}`,
        model: out.model,
      };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: err.errors },
        { status: 422 }
      );
    }
    console.error("meta-batch error:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
