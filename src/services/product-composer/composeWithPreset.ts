/**
 * Compose with Preset
 * 
 * Orchestrates composition using a predefined layout preset.
 * NO AI - pure parametric computation.
 * 
 * Pipeline:
 * 1. Load preset from registry
 * 2. Convert preset → LayoutSpec (presetToLayout)
 * 3. Apply copy content
 * 4. Validate/normalize
 * 5. Render overlays + product + text with Sharp
 */

import sharp from "sharp";
import type { ComposeRequest } from "./types";
import type { LayoutSpec } from "./layoutSpec";
import { presetToLayout } from "./presetToLayout";
import { validateAndNormalizeLayout, autoFixComposition, applyTextContent, scaleLayoutToCanvas, flowPresetCopy } from "./layoutValidation";
import { renderTextOnImage, renderOverlaysOnly } from "./textRenderer";
import { compose as baseCompose } from "./composer";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "composeWithPreset" });

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface ComposePresetResult {
  success: boolean;
  buffer?: Buffer;
  dataUrl?: string;
  layoutSpec?: LayoutSpec;
  presetUsed?: string;
  aspectRatioVariant?: string;
  timings?: Record<string, number>;
  error?: string;
  debug?: Record<string, unknown>;
}

interface AlphaBoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

async function getAlphaBoundingBox(buffer: Buffer): Promise<AlphaBoundingBox> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const imageWidth = info.width;
  const imageHeight = info.height;

  let minX = imageWidth;
  let minY = imageHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const index = (y * imageWidth + x) * channels + 3;
      const alpha = data[index];

      if (alpha > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return {
      top: 0,
      left: 0,
      width: imageWidth,
      height: imageHeight,
    };
  }

  return {
    top: minY,
    left: minX,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function composeWithPreset(request: ComposeRequest): Promise<ComposePresetResult> {
  const timings: Record<string, number> = {};
  const startTime = Date.now();
  
  try {
    const presetOptions = request.presetOptions;
    if (!presetOptions?.presetId) {
      throw new Error("presetOptions.presetId is required for PRESET mode");
    }
    
    const presetId = presetOptions.presetId;
    const renderText = presetOptions.renderText ?? true;
    const includeLayoutSpec = presetOptions.includeLayoutSpec ?? true;
    
    logger.info("Starting PRESET compose", { presetId, renderText });
    
    // 1) Get background and product buffers
    let backgroundBuffer: Buffer;
    if (request.backgroundBuffer) {
      backgroundBuffer = request.backgroundBuffer;
    } else if (request.backgroundUrl) {
      const response = await fetch(request.backgroundUrl);
      backgroundBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      throw new Error("No background provided");
    }

    let productBuffer: Buffer;
    if (request.productBuffer) {
      productBuffer = request.productBuffer;
    } else if (request.productPngUrl) {
      const response = await fetch(request.productPngUrl);
      productBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      throw new Error("No product provided");
    }

    // 2) Get image metadata
    let bgMeta = await sharp(backgroundBuffer).metadata();
    const productMeta = await sharp(productBuffer).metadata();

    // --- FORCE TARGET CANVAS ---
    let targetCanvas = { width: 1080, height: 1350 };
    if (request.presetOptions?.aspectRatio === "1:1") {
      targetCanvas = { width: 1080, height: 1080 };
    }
    const backgroundMetaBefore = { width: bgMeta.width, height: bgMeta.height };
    if (bgMeta.width !== targetCanvas.width || bgMeta.height !== targetCanvas.height) {
      backgroundBuffer = await sharp(backgroundBuffer).resize(targetCanvas.width, targetCanvas.height, { fit: "cover" }).toBuffer();
      bgMeta = await sharp(backgroundBuffer).metadata();
    }
    const backgroundMetaAfter = { width: bgMeta.width, height: bgMeta.height };

    // Siempre usar targetCanvas
    const canvas = targetCanvas;
    const productSize = { width: productMeta.width, height: productMeta.height };

    const alphaBoxStart = Date.now();
    const alphaBoundingBox = await getAlphaBoundingBox(productBuffer);
    timings.alphaBoundingBox = Date.now() - alphaBoxStart;
    
    logger.debug("Image metadata", {
      canvas,
      productSize,
      alphaBoundingBox,
      alphaHeightRatio: alphaBoundingBox.height / productSize.height,
    });
    
    // 3) Convert preset to LayoutSpec
    const presetStart = Date.now();
    const presetResult = presetToLayout({
      presetId,
      canvas,
      productMeta: productSize,
      productContentBox: alphaBoundingBox,
      copy: request.copy || {},
    });
    timings.presetToLayout = Date.now() - presetStart;

    const originalCanvas = {
      width: presetResult.layout.canvas.width,
      height: presetResult.layout.canvas.height,
    };
    const scaledCanvas = {
      width: canvas.width,
      height: canvas.height,
    };
    const scaleX = scaledCanvas.width / Math.max(1, originalCanvas.width);
    const scaleY = scaledCanvas.height / Math.max(1, originalCanvas.height);

    const scaleLayoutStart = Date.now();
    let layout = presetResult.layout;
    if (originalCanvas.width !== canvas.width || originalCanvas.height !== canvas.height) {
      layout = scaleLayoutToCanvas(layout, canvas.width, canvas.height);
    }
    timings.scaleLayout = Date.now() - scaleLayoutStart;

    logger.debug("Preset converted to layout", {
      presetUsed: presetResult.presetUsed,
      aspectRatioVariant: presetResult.aspectRatioVariant,
      productScale: presetResult.computedProductScale,
      originalCanvas,
      scaledCanvas,
      scaleX,
      scaleY,
      backgroundMetaBefore,
      backgroundMetaAfter,
      targetCanvas,
    });
    
    // 4) Apply copy content
    const applyStart = Date.now();
    layout = applyTextContent(layout, request.copy || {});
    timings.applyTextContent = Date.now() - applyStart;


    // 5) Validate and normalize
    const validateStart = Date.now();
    const validationResult = validateAndNormalizeLayout(layout, {
      enforceProductHeightRule: true,
      enforcePresetBadgeNoOverlap: true,
    });
    layout = validationResult.normalized;
    timings.validateLayout = Date.now() - validateStart;

    // 5b) FINAL flowPresetCopy to guarantee stacking after validation
    const flowCopyStart = Date.now();
    layout = flowPresetCopy(layout);
    timings.flowPresetCopy = Date.now() - flowCopyStart;

    if (validationResult.warnings.length > 0) {
      logger.warn("Layout validation warnings", { warnings: validationResult.warnings });
    }

    // 6) Auto-fix if needed
    const fixStart = Date.now();
    const fixResult = autoFixComposition(layout);
    layout = fixResult.layout;
    timings.autoFix = Date.now() - fixStart;

    if (fixResult.fixes.length > 0) {
      logger.info("Applied auto-fixes", { fixes: fixResult.fixes });
    }
    
    // 7) Render overlays onto background
    const overlayStart = Date.now();
    let composedBuffer = await renderOverlaysOnly({
      baseImage: backgroundBuffer,
      overlays: layout.overlays,
    });
    timings.renderOverlays = Date.now() - overlayStart;
    
    // 8) Compose product onto background
    const composeStart = Date.now();
    const composeResult = await baseCompose({
      ...request,
      backgroundBuffer: composedBuffer,
      mode: "STANDARD",
      placement: {
        anchor: "custom",
        x: layout.product.x / canvas.width,
        y: layout.product.y / canvas.height,
        scale: layout.product.scale,
        rotation: layout.product.rotation,
        maxWidthRatio: layout.product.width / canvas.width,
        maxHeightRatio: layout.product.height / canvas.height,
      },
      style: {
        shadow: layout.product.shadow?.drop ? {
          enabled: layout.product.shadow.drop.enabled,
          blur: layout.product.shadow.drop.blur,
          opacity: layout.product.shadow.drop.opacity,
          offsetX: layout.product.shadow.drop.offsetX,
          offsetY: layout.product.shadow.drop.offsetY,
          color: layout.product.shadow.drop.color,
        } : undefined,
      },
    });
    timings.composeProduct = Date.now() - composeStart;
    
    if (!composeResult.success || !composeResult.buffer) {
      throw new Error(composeResult.error || "Product composition failed");
    }
    
    // 9) Render text if enabled
    let finalBuffer = composeResult.buffer;
    if (renderText && layout.textBlocks.length > 0) {
      const textStart = Date.now();
      const textResult = await renderTextOnImage({
        baseImage: finalBuffer,
        layout,
      });
      finalBuffer = textResult.buffer;
      timings.renderText = Date.now() - textStart;
    }
    
    // 10) Output format handling
    const formatStart = Date.now();
    const outputFormat = request.outputFormat || "png";
    const quality = request.quality || 90;
    
    let outputBuffer: Buffer;
    let sharpOutput = sharp(finalBuffer);
    
    switch (outputFormat) {
      case "jpeg":
        outputBuffer = await sharpOutput.jpeg({ quality }).toBuffer();
        break;
      case "webp":
        outputBuffer = await sharpOutput.webp({ quality }).toBuffer();
        break;
      default:
        outputBuffer = await sharpOutput.png({ compressionLevel: 6 }).toBuffer();
    }
    timings.outputFormat = Date.now() - formatStart;
    
    timings.total = Date.now() - startTime;
    
    logger.info("PRESET compose completed", {
      presetId,
      timings,
      outputSize: outputBuffer.length,
    });
    
    return {
      success: true,
      buffer: outputBuffer,
      dataUrl: `data:image/${outputFormat};base64,${outputBuffer.toString("base64")}`,
      layoutSpec: includeLayoutSpec ? layout : undefined,
      presetUsed: presetResult.presetUsed,
      aspectRatioVariant: presetResult.aspectRatioVariant,
      timings,
      debug: {
        productScale: presetResult.computedProductScale,
        alphaBoundingBox,
        originalCanvas,
        scaledCanvas,
        scaleX,
        scaleY,
        textBlockCount: layout.textBlocks.length,
        overlayCount: layout.overlays.length,
        fixes: fixResult.fixes,
        warnings: validationResult.warnings,
      },
    };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("PRESET compose failed", { error: message });
    
    timings.total = Date.now() - startTime;
    
    return {
      success: false,
      error: message,
      timings,
    };
  }
}
