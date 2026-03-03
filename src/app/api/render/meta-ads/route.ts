import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/utils/errors";
import { ensureFontsRegistered } from "@/lib/render/typography";
import {
  CANVAS_W,
  CANVAS_H,
  getLayout,
  drawBackplate,
  drawTextBlock,
  drawBadge,
  fitImageInRect,
  type TextContent,
} from "@/lib/render/layouts";
import {
  drawProductWithIntegration,
  drawDebugBoundingBox,
} from "@/lib/render/productIntegration";
import { applyColorGrade } from "@/lib/render/colorGrading";
import {
  drawSideGradientOverlay,
  drawBottomGradientOverlay,
} from "@/lib/render/overlays";
import type { LayoutId } from "@/lib/scenes/sceneLibrary";

export const runtime = "nodejs";

/* ── Dynamic canvas import (handles native binding issues) ── */

type CanvasModule = typeof import("@napi-rs/canvas");
let cachedCanvas: CanvasModule | null = null;

async function getCanvas(): Promise<CanvasModule> {
  if (cachedCanvas) return cachedCanvas;
  try {
    cachedCanvas = await import("@napi-rs/canvas");
    return cachedCanvas;
  } catch (err: any) {
    throw new Error(
      `Canvas native binding missing. ${err?.message ?? ""}\n` +
      "Reinstall deps: rm -rf node_modules package-lock.json && npm i"
    );
  }
}

/* ── Input schema ── */

const HookVariantSchema = z.object({
  headline: z.string().min(1),
  subheadline: z.string().min(1),
  cta: z.string().min(1),
  badge: z.string().nullable().optional(),
  casing: z.enum(["uppercase", "sentence"]).default("sentence"),
});

const InputSchema = z.object({
  scene_id: z.string().min(1),
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
  background_image: z.string().min(1, "background_image is required (URL or base64 data URL)"),
  product_image: z.string().min(1, "product_image is required (URL or base64 data URL)"),
  logo_image: z.string().min(1, "logo_image is required (URL or base64 data URL)"),
  hookVariant: HookVariantSchema,
  /** Enable debug mode: draws bounding boxes and logs coordinates */
  debug: z.boolean().optional().default(false),
});

type RenderInput = z.infer<typeof InputSchema>;

/* ── Image loading helper ── */

async function loadImageSafe(
  src: string,
  loadImage: CanvasModule["loadImage"]
) {
  // Handle base64 data URLs and regular URLs
  if (src.startsWith("data:")) {
    // Extract the base64 part
    const base64Data = src.split(",")[1];
    if (!base64Data) throw new Error("Invalid data URL");
    const buffer = Buffer.from(base64Data, "base64");
    return loadImage(buffer);
  }

  // Regular URL – fetch and load
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  return loadImage(Buffer.from(arrayBuf));
}

/* ── Route handler ── */

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

    const input: RenderInput = parsed.data;
    const layoutId = input.layout_id as LayoutId;

    console.log(
      `[render/meta-ads] Rendering scene=${input.scene_id} layout=${layoutId}…`
    );

    /* ── Register fonts ── */
    ensureFontsRegistered();

    /* ── Load canvas module dynamically ── */
    const { createCanvas, loadImage } = await getCanvas();

    /* ── Load all images in parallel ── */
    const [bgImage, productImage, logoImage] = await Promise.all([
      loadImageSafe(input.background_image, loadImage),
      loadImageSafe(input.product_image, loadImage),
      loadImageSafe(input.logo_image, loadImage),
    ]);

    /* ── Create canvas ── */
    const canvas = createCanvas(CANVAS_W, CANVAS_H);
    const ctx = canvas.getContext("2d");

    /* ── 1) Draw background (cover) ── */
    {
      const scaleX = CANVAS_W / bgImage.width;
      const scaleY = CANVAS_H / bgImage.height;
      const scale = Math.max(scaleX, scaleY);
      const sw = CANVAS_W / scale;
      const sh = CANVAS_H / scale;
      const sx = (bgImage.width - sw) / 2;
      const sy = (bgImage.height - sh) / 2;
      ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
    }

    /* ── 2) Get layout zones ── */
    const zones = getLayout(layoutId);

    /* ── 3) Draw gradient overlay based on layout ── */
    // Apply side gradient for layouts with text on left/right
    if (layoutId === "hero_left" || layoutId === "diagonal") {
      drawSideGradientOverlay(ctx, CANVAS_W, CANVAS_H, "right", { strength: 0.55 });
    } else if (layoutId === "hero_right") {
      drawSideGradientOverlay(ctx, CANVAS_W, CANVAS_H, "left", { strength: 0.55 });
    } else {
      // For center/top/bottom layouts, apply bottom gradient for text readability
      drawBottomGradientOverlay(ctx, CANVAS_W, CANVAS_H, { strength: 0.50, coverage: 0.45 });
    }

    /* ── 4) Draw product with realistic shadows ── */
    const productFit = fitImageInRect(
      productImage.width,
      productImage.height,
      zones.product
    );
    drawProductWithIntegration(
      ctx,
      productImage,
      productFit.dx,
      productFit.dy,
      productFit.dw,
      productFit.dh,
      {
        contactShadow: {
          widthMultiplier: 1.1,
          heightMultiplier: 0.18,
          centerOpacity: 0.35,
        },
        dropShadow: {
          color: "rgba(0, 0, 0, 0.30)",
          blur: 50,
          offsetX: 10,
          offsetY: 20,
        },
      }
    );

    /* ── 5) Draw backplate behind text ── */
    drawBackplate(ctx, zones.textBlock);

    /* ── 6) Draw text block ── */
    const textContent: TextContent = {
      headline: input.hookVariant.headline,
      subheadline: input.hookVariant.subheadline,
      cta: input.hookVariant.cta,
      badge: input.hookVariant.badge ?? null,
      casing: input.hookVariant.casing ?? "sentence",
    };

    drawTextBlock(ctx, zones.textBlock, textContent);

    /* ── 7) Draw badge (if exists) ── */
    if (textContent.badge) {
      drawBadge(ctx, zones.badge, textContent.badge);
    }

    /* ── 8) Draw logo (top-left, object-fit contain) ── */
    const logoFit = fitImageInRect(
      logoImage.width,
      logoImage.height,
      zones.logo
    );
    ctx.drawImage(logoImage, logoFit.dx, logoFit.dy, logoFit.dw, logoFit.dh);

    /* ── 9) Apply subtle color grade (after all content) ── */
    applyColorGrade(ctx, CANVAS_W, CANVAS_H, {
      overlayOpacity: 0.05,
      vignette: false,
    });

    /* ── 10) Debug mode: draw bounding boxes and log coords ── */
    if (input.debug) {
      drawDebugBoundingBox(ctx, productFit.dx, productFit.dy, productFit.dw, productFit.dh, "rgba(255, 0, 0, 0.6)", "product");
      drawDebugBoundingBox(ctx, zones.textBlock.x, zones.textBlock.y, zones.textBlock.w, zones.textBlock.h, "rgba(0, 255, 0, 0.6)", "text");
      drawDebugBoundingBox(ctx, logoFit.dx, logoFit.dy, logoFit.dw, logoFit.dh, "rgba(0, 0, 255, 0.6)", "logo");

      console.log(`[render/meta-ads] DEBUG - Product: x=${productFit.dx}, y=${productFit.dy}, w=${productFit.dw}, h=${productFit.dh}`);
      console.log(`[render/meta-ads] DEBUG - TextBlock: x=${zones.textBlock.x}, y=${zones.textBlock.y}, w=${zones.textBlock.w}, h=${zones.textBlock.h}`);
      console.log(`[render/meta-ads] DEBUG - Logo: x=${logoFit.dx}, y=${logoFit.dy}, w=${logoFit.dw}, h=${logoFit.dh}`);
    }

    /* ── 8) Export as PNG base64 ── */
    const pngBuffer = canvas.toBuffer("image/png");
    const base64 = pngBuffer.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log(
      `[render/meta-ads] Done. PNG size: ${(pngBuffer.length / 1024).toFixed(0)} KB`
    );

    return NextResponse.json(
      {
        ok: true,
        dataUrl,
        meta: {
          scene_id: input.scene_id,
          layout_id: input.layout_id,
          width: CANVAS_W,
          height: CANVAS_H,
          sizeKB: Math.round(pngBuffer.length / 1024),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[render/meta-ads] Error:", err);
    return errorResponse(err?.message ?? "Internal server error", 500);
  }
}
