/**
 * Product Composer Service
 *
 * Main service for compositing products onto backgrounds
 * with realistic shadows, color matching, and placement.
 *
 * Modes:
 * - MVP: Sharp-only local composition
 * - Advanced: Gemini-assisted relighting/integration
 */

import sharp from "sharp";
import type {
  ComposeRequest,
  ComposeResult,
  ComposeDebugInfo,
  ComposerConfig,
} from "./types";
import { ComposeRequestSchema, getComposerConfig } from "./types";
import {
  loadImageBuffer,
  getImageMeta,
  calculatePlacement,
  generateShadow,
  generateContactShadow,
  calculateLuminance,
  adjustLuminance,
  ensureAlpha,
  hasValidTransparency,
  bufferToDataUrl,
} from "./utils";
import { createLogger, generateRequestId, type Logger } from "@/lib/logger";
import { createMetrics, type MetricsCollector, globalMetrics } from "@/lib/metrics";
import { getStorage, generateStorageKey } from "@/lib/storage";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */

const config: ComposerConfig = getComposerConfig();

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPOSE FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function compose(request: ComposeRequest): Promise<ComposeResult> {
  const requestId = request.requestId || generateRequestId();
  const logger = createLogger({ service: "product-composer", requestId });
  const metrics = createMetrics();

  logger.info("Starting composition", {
    mode: config.mode,
    geminiEnabled: config.enableGemini,
    outputFormat: request.outputFormat,
  });

  try {
    // Validate request
    const validated = ComposeRequestSchema.safeParse(request);
    if (!validated.success) {
      logger.error("Validation failed", {}, new Error(validated.error.message));
      return {
        success: false,
        error: `Validation failed: ${validated.error.message}`,
      };
    }

    // Load images
    const { backgroundBuffer, productBuffer } = await metrics.time(
      "load_images",
      async () => {
        const bg = request.backgroundBuffer || (await loadImageBuffer(request.backgroundUrl!));
        const product = request.productBuffer || (await loadImageBuffer(request.productPngUrl!));
        return { backgroundBuffer: bg, productBuffer: product };
      }
    );

    // Validate buffers
    if (!backgroundBuffer || backgroundBuffer.length === 0) {
      logger.error("Background buffer is empty");
      return {
        success: false,
        error: "Background image is empty or invalid",
      };
    }

    if (!productBuffer || productBuffer.length === 0) {
      logger.error("Product buffer is empty");
      return {
        success: false,
        error: "Product image is empty or invalid",
      };
    }

    // Get metadata
    const bgMeta = await getImageMeta(backgroundBuffer);
    const productMeta = await getImageMeta(productBuffer);

    logger.debug("Images loaded", {
      background: `${bgMeta.width}x${bgMeta.height}`,
      backgroundBytes: backgroundBuffer.length,
      product: `${productMeta.width}x${productMeta.height}`,
      productBytes: productBuffer.length,
      productHasAlpha: productMeta.hasAlpha,
    });

    // STEP 1: Normalize background - use as the base canvas
    // First, verify the background buffer is a valid image
    const bgHeader = backgroundBuffer.slice(0, 8).toString("hex");
    logger.debug("Background buffer header", { header: bgHeader, length: backgroundBuffer.length });
    
    const normalizedBackground = await metrics.time("normalize_background", async (): Promise<Buffer> => {
      // Use sharp to convert whatever format to PNG with NO alpha (background should be opaque)
      const result = await sharp(backgroundBuffer, { failOnError: true })
        .rotate() // Auto-rotate based on EXIF
        .toColorspace("srgb")
        .removeAlpha() // Ensure background is opaque (RGB, not RGBA)
        .png() // Convert to PNG to ensure consistent format
        .toBuffer();
      
      logger.debug("Background normalized", { outputSize: result.length });
      return result;
    }) as Buffer;

    // Get normalized background metadata
    const normalizedBgMeta = await getImageMeta(normalizedBackground);
    logger.debug("Normalized background", {
      width: normalizedBgMeta.width,
      height: normalizedBgMeta.height,
      bytes: normalizedBackground.length,
    });

    // STEP 2: Verify product has transparency
    const hasTransparency = await hasValidTransparency(productBuffer);
    if (!hasTransparency) {
      logger.warn("Product may not have valid transparency");
    }

    // STEP 3: Normalize product - ensure alpha and sRGB
    const normalizedProduct = await metrics.time("normalize_product", async (): Promise<Buffer> => {
      return sharp(productBuffer, { failOnError: true })
        .rotate() // Auto-rotate based on EXIF
        .ensureAlpha() // Ensure alpha channel exists
        .toColorspace("srgb")
        .png()
        .toBuffer();
    }) as Buffer;


    // STEP 4: Calculate placement using NORMALIZED background dimensions
    let placement = calculatePlacement(
      normalizedBgMeta.width,
      normalizedBgMeta.height,
      productMeta.width,
      productMeta.height,
      {
        anchor: request.placement?.anchor,
        x: request.placement?.x,
        y: request.placement?.y,
        scale: request.placement?.scale,
        maxWidthRatio: request.placement?.maxWidthRatio || config.maxProductRatio,
        maxHeightRatio: request.placement?.maxHeightRatio || config.maxProductRatio,
      }
    );

    // --- ABSOLUTE SIZE OVERRIDE (PRESET) ---
    let modeUsed = "SCALE";
    let resolvedProductW = placement.width;
    let resolvedProductH = placement.height;
    let usedScale = placement.scale;
    if (
      request.placement?.width && request.placement?.height &&
      request.placement.width > 0 && request.placement.height > 0
    ) {
      // Override: use absolute size, ignore scale
      placement = {
        ...placement,
        width: request.placement.width,
        height: request.placement.height,
        scale: 1,
      };
      modeUsed = "ABSOLUTE_SIZE";
      resolvedProductW = request.placement.width;
      resolvedProductH = request.placement.height;
      usedScale = 1;
    }

    logger.debug("Placement calculated", {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      scale: placement.scale,
      canvasSize: `${normalizedBgMeta.width}x${normalizedBgMeta.height}`,
      resolvedProductW,
      resolvedProductH,
      usedScale,
      modeUsed,
    });

    // STEP 5: Resize product to final size
    const resizedProduct = await metrics.time("resize_product", async (): Promise<Buffer> => {
      return sharp(normalizedProduct)
        .resize(placement.width, placement.height, { fit: "fill" })
        .png()
        .toBuffer();
    }) as Buffer;

    // STEP 6: Color matching
    let colorMatchedProduct: Buffer = resizedProduct;
    let luminanceDebug: ComposeDebugInfo["luminance"];

    if (request.style?.colorMatch?.enabled !== false) {
      const result = await metrics.time("color_match", async (): Promise<{
        buffer: Buffer;
        bgLuminance: number;
        productLuminance: number;
        adjustment: number;
      }> => {
        // Calculate luminance of the background area where product will be placed
        const bgAreaLuminance = await calculateLuminance(normalizedBackground as Buffer, {
          left: placement.x,
          top: placement.y,
          width: Math.min(placement.width, normalizedBgMeta.width - placement.x),
          height: Math.min(placement.height, normalizedBgMeta.height - placement.y),
        });

        const productLuminance = await calculateLuminance(resizedProduct);
        
        const strength = request.style?.colorMatch?.strength || 0.3;
        const adjusted = await adjustLuminance(resizedProduct, bgAreaLuminance, strength);

        return {
          buffer: adjusted,
          bgLuminance: bgAreaLuminance,
          productLuminance,
          adjustment: bgAreaLuminance - productLuminance,
        };
      }) as { buffer: Buffer; bgLuminance: number; productLuminance: number; adjustment: number };

      colorMatchedProduct = result.buffer;
      luminanceDebug = {
        backgroundArea: result.bgLuminance,
        productOriginal: result.productLuminance,
        adjustment: result.adjustment,
      };
    }

    // STEP 7: Generate shadow - ONLY if product has valid transparency
    let shadowBuffer: Buffer | undefined;

    // Only generate shadow for products with actual transparency
    // Otherwise the shadow would be a solid black rectangle
    const shouldGenerateShadow = 
      request.style?.shadow?.enabled !== false && 
      hasTransparency;

    if (shouldGenerateShadow) {
      shadowBuffer = await metrics.time("generate_shadow", async (): Promise<Buffer> => {
        const shadowOpts = {
          blur: request.style?.shadow?.blur || 20,
          opacity: request.style?.shadow?.opacity || 0.3,
          offsetX: request.style?.shadow?.offsetX || 0,
          offsetY: request.style?.shadow?.offsetY || 10,
          color: request.style?.shadow?.color || "rgba(0,0,0,0.5)",
        };

        // Generate drop shadow
        const dropShadow = await generateShadow(colorMatchedProduct, shadowOpts);

        // Resize shadow to match product
        return sharp(dropShadow)
          .resize(placement.width + shadowOpts.blur * 2, placement.height + shadowOpts.blur * 2)
          .png()
          .toBuffer();
      }) as Buffer;
    } else if (!hasTransparency) {
      logger.info("Skipping shadow generation: product has no valid transparency");
    }

    // STEP 8: Compose final image
    const compositeBuffer = await metrics.time("compose", async (): Promise<Buffer> => {
      const layers: sharp.OverlayOptions[] = [];

      // Add shadow layer (behind product) - use 'over' blend to preserve background
      if (shadowBuffer) {
        const shadowMeta = await getImageMeta(shadowBuffer);
        layers.push({
          input: shadowBuffer,
          left: Math.max(0, placement.x - Math.round((shadowMeta.width - placement.width) / 2)),
          top: Math.max(0, placement.y - Math.round((shadowMeta.height - placement.height) / 2) + 10),
          blend: "over" as const, // Changed from "multiply" to "over" for proper alpha compositing
        });
      }

      // Add product layer
      layers.push({
        input: colorMatchedProduct,
        left: placement.x,
        top: placement.y,
      });

      // CRITICAL: Use normalizedBackground as the base canvas, NOT a black canvas
      logger.debug("Compositing layers", {
        layerCount: layers.length,
        baseCanvas: `${normalizedBgMeta.width}x${normalizedBgMeta.height}`,
        normalizedBgSize: normalizedBackground.length,
        productPosition: `${placement.x},${placement.y}`,
        productSize: colorMatchedProduct.length,
      });

      // Verify the background has content
      const bgHeaderCheck = normalizedBackground.slice(0, 8).toString("hex");
      logger.debug("Verify normalizedBackground", { header: bgHeaderCheck });

      const compositeResult = await sharp(normalizedBackground)
        .composite(layers)
        .png()
        .toBuffer();
      
      logger.debug("Composite result", { size: compositeResult.length });
      return compositeResult;
    }) as Buffer;

    // STEP 9: Advanced mode - Gemini enhancement (if enabled)
    let finalBuffer: Buffer = compositeBuffer;
    let geminiUsed = false;

    if (config.mode === "advanced" && config.enableGemini && request.useGeminiEdit) {
      try {
        const enhanced = await metrics.time("gemini_enhance", async (): Promise<Buffer | null> => {
          return await enhanceWithGemini(compositeBuffer, colorMatchedProduct, logger);
        }) as Buffer | null;

        if (enhanced) {
          finalBuffer = enhanced;
          geminiUsed = true;
        }
      } catch (err) {
        logger.warn("Gemini enhancement failed, using local composite", {}, err as Error);
      }
    }

    // STEP 10: Convert to output format
    const outputBuffer = await metrics.time("encode_output", async (): Promise<Buffer> => {
      const img = sharp(finalBuffer);

      switch (request.outputFormat || "png") {
        case "jpeg":
          return img.jpeg({ quality: request.quality || 90 }).toBuffer();
        case "webp":
          return img.webp({ quality: request.quality || 90 }).toBuffer();
        default:
          return img.png().toBuffer();
      }
    }) as Buffer;

    // Store result (optional)
    let imageUrl: string | undefined;
    const storage = getStorage();
    
    try {
      const key = generateStorageKey("composites", request.outputFormat || "png");
      imageUrl = await storage.put(key, outputBuffer, {
        contentType: `image/${request.outputFormat || "png"}`,
      });
    } catch (err) {
      logger.warn("Failed to store composite", {}, err as Error);
    }

    // Record metrics
    const timings = metrics.getTimingsObject();
    metrics.logSummary(`[${requestId}]`);

    // Record to global metrics
    globalMetrics.record("composer.total_ms", timings.total);
    globalMetrics.record("composer.load_ms", timings.load_images || 0);
    globalMetrics.record("composer.compose_ms", timings.compose || 0);

    // Build debug info
    const debug: ComposeDebugInfo & { productHasTransparency?: boolean; shadowGenerated?: boolean } = {
      backgroundSize: { width: bgMeta.width, height: bgMeta.height },
      productOriginalSize: { width: productMeta.width, height: productMeta.height },
      productFinalSize: { width: placement.width, height: placement.height },
      placement: {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      },
      geminiEditUsed: geminiUsed,
      luminance: luminanceDebug,
      productHasTransparency: hasTransparency,
      shadowGenerated: shouldGenerateShadow,
    };

    logger.info("Composition complete", { timings });

    return {
      success: true,
      buffer: outputBuffer,
      dataUrl: bufferToDataUrl(outputBuffer, request.outputFormat || "png"),
      imageUrl,
      debug,
      timings,
      cost: geminiUsed
        ? { geminiCalls: 1, estimatedCostUsd: 0.01 }
        : { geminiCalls: 0, estimatedCostUsd: 0 },
    };
  } catch (err) {
    const error = err as Error;
    logger.error("Composition failed", {}, error);

    globalMetrics.record("composer.errors", 1);

    return {
      success: false,
      error: error.message,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   GEMINI ENHANCEMENT (ADVANCED MODE)
═══════════════════════════════════════════════════════════════ */

async function enhanceWithGemini(
  compositeBuffer: Buffer,
  productBuffer: Buffer,
  logger: Logger
): Promise<Buffer | null> {
  // Import Gemini client
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({});

  const compositeBase64 = compositeBuffer.toString("base64");

  const prompt = `You are a professional image compositing assistant.

TASK: Enhance the product integration in this composite image.

CRITICAL RULES:
- Do NOT modify, redraw, or distort the product.
- Do NOT add any text.
- Only add subtle lighting adjustments and soft reflections if needed.
- Maintain the exact product shape and details.
- Make the product look naturally integrated into the scene.

If the integration already looks good, return the image unchanged.

Output: return the enhanced image.`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: compositeBase64,
              },
            },
          ],
        },
      ],
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inlineData?.data);

    if (!imgPart) {
      logger.warn("Gemini did not return an image");
      return null;
    }

    const resultBase64 = imgPart.inlineData!.data as string;
    return Buffer.from(resultBase64, "base64");
  } catch (err) {
    logger.error("Gemini API error", {}, err as Error);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════ */

export { ComposeRequestSchema, ComposeModeSchema, CopyContentSchema, AutoLayoutOptionsSchema, SmartUsageOptionsSchema } from "./types";
export type { ComposeRequest, ComposeResult, PlacementHint, CompositionStyle, ComposeMode, CopyContent, AutoLayoutOptions, SmartUsageOptions } from "./types";
export { composeWithAutoLayout } from "./composeAutoLayout";
export { composeWithSmartUsage, type SmartUsageResult } from "./composeSmartUsage";
