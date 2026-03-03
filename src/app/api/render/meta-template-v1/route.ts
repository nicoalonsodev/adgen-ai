import { NextResponse } from "next/server";
import { z } from "zod";
import { renderTemplateV1, CANVAS_W, CANVAS_H } from "@/lib/render/templates/templateV1";

export const runtime = "nodejs";

/**
 * POST /api/render/meta-template-v1
 *
 * Renders a Meta Ad creative using Template V1 (1080×1350).
 * Returns PNG image directly or as base64 JSON.
 *
 * Layout:
 * - Background: full bleed cover
 * - Logo: top-left (max 140x60)
 * - Product: hero centered with subtle shadow
 * - Text panel: bottom overlay with headline, subheadline, CTA
 */

/* ── Input validation ── */

const ImageSrcSchema = z.object({
  src: z.string().min(1, "Image source is required"),
});

const InputSchema = z.object({
  background: ImageSrcSchema,
  product: ImageSrcSchema,
  logo: ImageSrcSchema.optional(),
  headline: z
    .string()
    .min(5, "Headline must be at least 5 characters")
    .max(80, "Headline must not exceed 80 characters"),
  subheadline: z
    .string()
    .max(60, "Subheadline must not exceed 60 characters")
    .optional(),
  cta: z
    .string()
    .min(2, "CTA must be at least 2 characters")
    .max(24, "CTA must not exceed 24 characters"),
  /** If true, returns base64 JSON instead of binary PNG */
  returnBase64: z.boolean().optional().default(false),
});

export type TemplateV1RequestBody = z.infer<typeof InputSchema>;

/* ── Error response helper ── */

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, details },
    { status }
  );
}

/* ── Route handler ── */

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    /* ── Parse JSON body ── */
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    /* ── Validate input ── */
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const input = parsed.data;

    console.log(
      `[meta-template-v1] Rendering: headline="${input.headline.slice(0, 30)}…" cta="${input.cta}"`
    );

    /* ── Render template ── */
    let pngBuffer: Buffer;
    try {
      pngBuffer = await renderTemplateV1({
        background: input.background,
        product: input.product,
        logo: input.logo,
        headline: input.headline,
        subheadline: input.subheadline,
        cta: input.cta,
      });
    } catch (err: any) {
      console.error("[meta-template-v1] Render error:", err?.message);

      // Check if it's an image loading error
      if (err?.message?.includes("fetch") || err?.message?.includes("load")) {
        return errorResponse(`Failed to load image: ${err.message}`, 400);
      }

      return errorResponse(err?.message ?? "Render failed", 500);
    }

    const renderTimeMs = Date.now() - startTime;
    const sizeKB = Math.round(pngBuffer.length / 1024);

    console.log(
      `[meta-template-v1] Done. Size: ${sizeKB}KB, Time: ${renderTimeMs}ms`
    );

    /* ── Return response ── */
    if (input.returnBase64) {
      const base64 = pngBuffer.toString("base64");
      return NextResponse.json(
        {
          ok: true,
          dataUrl: `data:image/png;base64,${base64}`,
          meta: {
            width: CANVAS_W,
            height: CANVAS_H,
            sizeKB,
            renderTimeMs,
          },
        },
        { status: 200 }
      );
    }

    // Return binary PNG
    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": pngBuffer.length.toString(),
        "X-Render-Time-Ms": renderTimeMs.toString(),
        "X-Image-Size-KB": sizeKB.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[meta-template-v1] Unexpected error:", err);
    return errorResponse(err?.message ?? "Internal server error", 500);
  }
}

/* ── GET: Info endpoint ── */

export async function GET() {
  return NextResponse.json({
    ok: true,
    info: {
      name: "Meta Template V1",
      description: "Deterministic 1080×1350 template for Meta Ads",
      dimensions: {
        width: CANVAS_W,
        height: CANVAS_H,
        aspectRatio: "4:5",
      },
      input: {
        background: "{ src: string } - URL or data URL (required)",
        product: "{ src: string } - PNG with transparency (required)",
        logo: "{ src: string } - PNG with transparency (optional)",
        headline: "string - 5-80 chars (required)",
        subheadline: "string - 0-60 chars (optional)",
        cta: "string - 2-24 chars (required)",
        returnBase64: "boolean - return base64 JSON instead of binary PNG (optional)",
      },
      layout: {
        logo: "top-left, max 140x60",
        product: "hero centered, y: 170-650",
        panel: "bottom overlay, y: 760, h: 510, rounded 32px",
      },
    },
  });
}
