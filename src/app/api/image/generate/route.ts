import { NextResponse } from "next/server";
import { imageGenerateSchema } from "@/lib/validations/image";
import { generateImageNanoBanana } from "@/lib/ai/gemini";
import { withRetry } from "@/lib/utils/retry";

export const runtime = "nodejs"; // recomendado para SDKs y buffers

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = imageGenerateSchema.parse(body);

    const out = await withRetry(
      () =>
        generateImageNanoBanana({
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
        }),
      { retries: 2, baseDelayMs: 1200 }
    );

    return NextResponse.json(
      {
        mimeType: out.mimeType,
        base64: out.base64,
        dataUrl: `data:${out.mimeType};base64,${out.base64}`,
        model: out.model,
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: err.errors },
        { status: 422 }
      );
    }

    // Logueo mínimo sin secretos
    console.error("Image generate error:", err?.message ?? err);

    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
