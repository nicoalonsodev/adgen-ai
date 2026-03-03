/**
 * AUTO_LAYOUT Compose Pipeline
 * 
 * Orchestrates the full AUTO_LAYOUT flow:
 * 1. Analyze background with Gemini Vision → LayoutSpec
 * 2. Validate and normalize the layout
 * 3. Apply placement from LayoutSpec
 * 4. Composite product + shadow
 * 5. Render overlays + text
 * 6. Output final image
 */

import sharp from "sharp";
import type { ComposeRequest, ComposeResult, ComposeDebugInfo, AutoLayoutOptions } from "./types";
import type { LayoutSpec } from "./layoutSpec";
import { getPresetLayout, getDefaultPreset, MIN_CONFIDENCE } from "./layoutSpec";
import { analyzeLayoutWithAI, type AutoLayoutResult } from "./autoLayout";
import { validateAndNormalizeLayout, applyTextContent, autoFixComposition, analyzeComposition } from "./layoutValidation";
import { renderTextOnImage, renderOverlaysOnly } from "./textRenderer";
import { 
  loadImageBuffer, 
  getImageMeta, 
  generateShadow, 
  hasValidTransparency, 
  bufferToDataUrl 
} from "./utils";
import { createLogger, generateRequestId } from "@/lib/logger";
import { createMetrics, globalMetrics } from "@/lib/metrics";
import { getStorage, generateStorageKey } from "@/lib/storage";

/* ═══════════════════════════════════════════════════════════════
   MAIN AUTO_LAYOUT COMPOSE 
═══════════════════════════════════════════════════════════════ */

export async function composeWithAutoLayout(request: ComposeRequest): Promise<ComposeResult> {
  const requestId = request.requestId || generateRequestId();
  const logger = createLogger({ service: "compose-auto-layout", requestId });
  const metrics = createMetrics();

  const autoOpts: Partial<AutoLayoutOptions> = request.autoLayoutOptions || {};
  const renderText = autoOpts.renderText !== false;
  const includeLayoutSpec = autoOpts.includeLayoutSpec !== false;
  const minConfidence = autoOpts.minConfidence ?? MIN_CONFIDENCE;

  logger.info("Starting AUTO_LAYOUT composition", {
    renderText,
    includeLayoutSpec,
    presetName: autoOpts.presetName,
    skipAI: autoOpts.skipAI,
  });

  try {
    // STEP 1: Load images
    const { backgroundBuffer, productBuffer } = await metrics.time("load_images", async () => {
      const bg = request.backgroundBuffer || (await loadImageBuffer(request.backgroundUrl!));
      const product = request.productBuffer || (await loadImageBuffer(request.productPngUrl!));
      return { backgroundBuffer: bg, productBuffer: product };
    }) as { backgroundBuffer: Buffer; productBuffer: Buffer };

    if (!backgroundBuffer || backgroundBuffer.length === 0) {
      return { success: false, error: "Background image is empty" };
    }
    if (!productBuffer || productBuffer.length === 0) {
      return { success: false, error: "Product image is empty" };
    }

    // STEP 2: Get metadata
    const bgMeta = await getImageMeta(backgroundBuffer);
    const productMeta = await getImageMeta(productBuffer);

    logger.debug("Images loaded", {
      background: `${bgMeta.width}x${bgMeta.height}`,
      product: `${productMeta.width}x${productMeta.height}`,
    });

    // STEP 3: Get LayoutSpec (AI or preset)
    let layout: LayoutSpec;
    let fallbackUsed = false;
    let aiResult: AutoLayoutResult | undefined;

    if (autoOpts.skipAI && autoOpts.presetName) {
      // Use preset directly
      layout = getPresetLayout(autoOpts.presetName);
      fallbackUsed = false;
      logger.info("Using preset layout", { preset: autoOpts.presetName });
    } else if (autoOpts.skipAI) {
      // Skip AI, use default preset
      layout = getDefaultPreset();
      fallbackUsed = true;
      logger.info("Using default preset layout (AI skipped)");
    } else {
      // Analyze with AI
      aiResult = await metrics.time("analyze_layout", async () => {
        return analyzeLayoutWithAI({
          backgroundBuffer,
          productBuffer,
          productDimensions: { width: productMeta.width, height: productMeta.height },
          canvasWidth: bgMeta.width,
          canvasHeight: bgMeta.height,
          layoutHint: autoOpts.layoutHint,
        });
      }) as AutoLayoutResult;

      layout = aiResult.layout;
      fallbackUsed = aiResult.fallbackUsed;

      if (aiResult.fallbackUsed) {
        logger.warn("AI layout analysis failed, using fallback", {
          error: aiResult.error,
          confidence: layout.confidence,
        });
      } else {
        logger.info("AI layout analysis complete", {
          confidence: layout.confidence,
          latencyMs: aiResult.latencyMs,
        });
      }
    }

    // STEP 4: Validate and normalize layout
    const validation = validateAndNormalizeLayout(layout, {
      strictSafeArea: true,
    });
    layout = validation.normalized;

    if (validation.corrections.length > 0) {
      logger.debug("Layout corrections applied", {
        corrections: validation.corrections,
      });
    }

    // STEP 5: Apply copy content to text blocks
    if (request.copy) {
      layout = applyTextContent(layout, request.copy);
    }

    // STEP 5b: Analyze and auto-fix composition issues
    const compositionAnalysis = analyzeComposition(layout);
    if (compositionAnalysis.score < 0.8) {
      logger.warn("Composition issues detected", {
        score: compositionAnalysis.score,
        issues: compositionAnalysis.issues,
      });
      
      const { layout: fixedLayout, fixes } = autoFixComposition(layout);
      if (fixes.length > 0) {
        layout = fixedLayout;
        logger.info("Auto-fixed composition issues", { fixes });
      }
    }

    // STEP 6: Normalize background
    const normalizedBackground = await metrics.time("normalize_bg", async () => {
      return sharp(backgroundBuffer)
        .rotate()
        .toColorspace("srgb")
        .removeAlpha()
        .png()
        .toBuffer();
    }) as Buffer;

    // STEP 7: Resize product based on LayoutSpec placement
    const productPlacement = layout.product;
    const normalizedProduct = await metrics.time("resize_product", async () => {
      return sharp(productBuffer)
        .rotate()
        .ensureAlpha()
        .toColorspace("srgb")
        .resize(productPlacement.width, productPlacement.height, { fit: "fill" })
        .png()
        .toBuffer();
    }) as Buffer;

    // STEP 8: Generate shadow if enabled and product has transparency
    const hasTransparency = await hasValidTransparency(productBuffer);
    let shadowBuffer: Buffer | undefined;

    if (hasTransparency && productPlacement.shadow?.drop?.enabled) {
      const dropShadow = productPlacement.shadow.drop;
      shadowBuffer = await metrics.time("generate_shadow", async () => {
        return generateShadow(normalizedProduct, {
          blur: dropShadow.blur,
          opacity: dropShadow.opacity,
          offsetX: dropShadow.offsetX,
          offsetY: dropShadow.offsetY,
          color: dropShadow.color,
        });
      }) as Buffer;

      // Resize shadow to include blur padding
      shadowBuffer = await sharp(shadowBuffer)
        .resize(productPlacement.width + dropShadow.blur * 2, productPlacement.height + dropShadow.blur * 2)
        .toBuffer();
    }

    // STEP 9: Composite product onto background
    let compositeBuffer = await metrics.time("compose_product", async () => {
      const layers: sharp.OverlayOptions[] = [];

      // Add shadow layer
      if (shadowBuffer) {
        const shadowMeta = await getImageMeta(shadowBuffer);
        const shadowX = productPlacement.x - Math.round((shadowMeta.width - productPlacement.width) / 2);
        const shadowY = productPlacement.y - Math.round((shadowMeta.height - productPlacement.height) / 2) + 10;
        
        layers.push({
          input: shadowBuffer,
          left: Math.max(0, shadowX),
          top: Math.max(0, shadowY),
          blend: "over",
        });
      }

      // Add product layer
      layers.push({
        input: normalizedProduct,
        left: productPlacement.x,
        top: productPlacement.y,
      });

      return sharp(normalizedBackground)
        .composite(layers)
        .png()
        .toBuffer();
    }) as Buffer;

    // STEP 10: Render overlays
    if (layout.overlays.length > 0) {
      compositeBuffer = await metrics.time("render_overlays", async () => {
        return renderOverlaysOnly({
          baseImage: compositeBuffer,
          overlays: layout.overlays,
        });
      }) as Buffer;
    }

    // STEP 11: Render text blocks
    if (renderText && layout.textBlocks.some(tb => tb.content)) {
      const textResult = await metrics.time("render_text", async () => {
        return renderTextOnImage({
          baseImage: compositeBuffer,
          layout,
          debug: false,
        });
      }) as Awaited<ReturnType<typeof renderTextOnImage>>;
      
      compositeBuffer = textResult.buffer;
      logger.debug("Text rendered", {
        blocksRendered: textResult.textBlocksRendered,
        timeMs: textResult.renderTimeMs,
      });
    }

    // STEP 12: Convert to output format
    const outputBuffer = await metrics.time("encode_output", async () => {
      const img = sharp(compositeBuffer);
      switch (request.outputFormat || "png") {
        case "jpeg":
          return img.jpeg({ quality: request.quality || 90 }).toBuffer();
        case "webp":
          return img.webp({ quality: request.quality || 90 }).toBuffer();
        default:
          return img.png().toBuffer();
      }
    }) as Buffer;

    // STEP 13: Store result
    let imageUrl: string | undefined;
    const storage = getStorage();
    
    try {
      const key = generateStorageKey("auto-composites", request.outputFormat || "png");
      imageUrl = await storage.put(key, outputBuffer, {
        contentType: `image/${request.outputFormat || "png"}`,
      });
    } catch (err) {
      logger.warn("Failed to store composite", {}, err as Error);
    }

    // Record metrics
    const timings = metrics.getTimingsObject();
    metrics.logSummary(`[${requestId}]`);
    
    globalMetrics.record("autoLayout.total_ms", timings.total);
    globalMetrics.record("autoLayout.ai_analyze_ms", timings.analyze_layout || 0);

    // Build debug info
    const debug: ComposeDebugInfo = {
      backgroundSize: { width: bgMeta.width, height: bgMeta.height },
      productOriginalSize: { width: productMeta.width, height: productMeta.height },
      productFinalSize: { width: productPlacement.width, height: productPlacement.height },
      placement: {
        x: productPlacement.x,
        y: productPlacement.y,
        width: productPlacement.width,
        height: productPlacement.height,
      },
      geminiEditUsed: !autoOpts.skipAI && !fallbackUsed,
    };

    logger.info("AUTO_LAYOUT composition complete", {
      fallbackUsed,
      confidence: layout.confidence,
      timings,
    });

    return {
      success: true,
      buffer: outputBuffer,
      dataUrl: bufferToDataUrl(outputBuffer, request.outputFormat || "png"),
      imageUrl,
      layoutSpec: includeLayoutSpec ? layout : undefined,
      fallbackLayoutUsed: fallbackUsed,
      debug,
      timings,
    };
  } catch (err) {
    const error = err as Error;
    logger.error("AUTO_LAYOUT composition failed", {}, error);
    
    globalMetrics.record("autoLayout.errors", 1);

    return {
      success: false,
      error: error.message,
    };
  }
}
