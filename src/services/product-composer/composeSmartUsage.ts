/**
 * SMART_USAGE_V1 Compose Pipeline
 *
 * Fully automatic pipeline for "apply_skin" archetype with:
 * - Structured contracts (Zod schemas)
 * - AI returns ONLY structured JSON
 * - Deterministic rendering
 * - QA scoring and auto-repair
 *
 * Pipeline:
 * 1. inferUsage() → UsagePlan JSON
 * 2. generateSceneFromUsage() → background Buffer
 * 3. analyzeSceneAnchors() → SceneAnchors JSON
 * 4. computePlacement() → PlacementOutput (pure math)
 * 5. compose() → composited image
 * 6. renderText() → text overlays
 * 7. qaScore() → QAScoreResult (heuristics)
 * 8. repairIfNeeded() → repair if score < threshold
 */

import sharp from "sharp";
import type {
  ComposeRequest,
} from "./types";
import {
  inferUsage,
  analyzeSceneAnchors,
  computePlacement,
  qaScore,
  repairIfNeeded,
  type UsagePlan,
  type SceneAnchors,
  type PlacementOutput,
  type QAScoreResult,
  type RepairResult,
  SMART_USAGE_CONSTANTS,
} from "./smartUsage";
import {
  loadImageBuffer,
  getImageMeta,
  generateShadow,
  hasValidTransparency,
} from "./utils";
import { createLogger, generateRequestId } from "@/lib/logger";
import { createMetrics } from "@/lib/metrics";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface SmartUsageOptions {
  /** Product name for usage inference */
  productName: string;
  /** Product description for usage inference */
  productDescription: string;
  /** Skip AI inference and use provided usage plan */
  skipInference?: boolean;
  /** Pre-computed usage plan (if skipInference) */
  usagePlan?: UsagePlan;
  /** QA threshold (default 0.75) */
  qaThreshold?: number;
  /** Enable auto-repair if QA score is low */
  enableRepair?: boolean;
}

export interface SmartUsageResult {
  success: boolean;
  error?: string;
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  usage?: UsagePlan;
  anchors?: SceneAnchors;
  placement?: PlacementOutput;
  qaResult?: QAScoreResult;
  repairResult?: RepairResult;
  timings?: {
    inferUsage: number;
    generateScene: number;
    analyzeAnchors: number;
    computePlacement: number;
    compose: number;
    renderText: number;
    qaScore: number;
    repair: number;
    total: number;
  };
}

interface GenerateSceneFromUsageInput {
  usage: UsagePlan;
  width?: number;
  height?: number;
}

/* ═══════════════════════════════════════════════════════════════
   SCENE GENERATION FROM USAGE PLAN
═══════════════════════════════════════════════════════════════ */

/**
 * Maps UsagePlan to scene generation parameters and creates background
 * This is a placeholder - integrate with your actual scene generation system
 */
async function generateSceneFromUsage(
  input: GenerateSceneFromUsageInput
): Promise<{ buffer: Buffer; promptUsed: string }> {
  const { usage, width = 1080, height = 1350 } = input;

  // Map UsagePlan to scene prompt components
  const sceneTypeMap: Record<string, string> = {
    bathroom_morning: "clean modern bathroom in soft morning light, white tiles, minimalist",
    bedroom_soft: "cozy bedroom with soft natural light, neutral tones, warm atmosphere",
  };

  const cameraMap: Record<string, string> = {
    medium_close: "medium close up shot",
    closeup: "intimate closeup shot",
  };

  const emotionMap: Record<string, string> = {
    comfort: "cozy and comfortable atmosphere",
    confidence: "bright and confident atmosphere",
    relief: "calm and soothing atmosphere",
  };

  const negativeSpaceMap: Record<string, string> = {
    top_left: "clear empty space in top left area for product placement",
    top_right: "clear empty space in top right area for product placement",
  };

  // Build prompt
  const sceneDescription = sceneTypeMap[usage.sceneType] || "clean minimalist background";
  const cameraAngle = cameraMap[usage.camera] || "medium shot";
  const emotionVibes = emotionMap[usage.primaryEmotion] || "pleasant atmosphere";
  const negativeSpace = negativeSpaceMap[usage.negativeSpacePreference] || "with negative space";

  const prompt = [
    `Professional skincare product photography scene,`,
    `${sceneDescription},`,
    `${cameraAngle},`,
    `${emotionVibes},`,
    `${negativeSpace},`,
    usage.surfaceRequired ? "visible surface/shelf for product placement," : "",
    "soft diffused lighting, high-end editorial style,",
    "8k quality, photorealistic, shallow depth of field",
  ]
    .filter(Boolean)
    .join(" ");

  // For now, this is a placeholder that creates a gradient background
  // TODO: Integrate with generateSceneBackground or imagen API
  console.log(`[generateSceneFromUsage] Would generate scene with prompt: ${prompt}`);

  // Create placeholder gradient background
  // Replace this with actual AI image generation
  const gradient = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background:
        usage.sceneType === "bathroom_morning"
          ? { r: 245, g: 248, b: 250, alpha: 1 }
          : { r: 250, g: 245, b: 240, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return {
    buffer: gradient,
    promptUsed: prompt,
  };
}

/* ═══════════════════════════════════════════════════════════════
   CORE COMPOSITION LOGIC
═══════════════════════════════════════════════════════════════ */

async function composeProductOnBackground(
  backgroundBuffer: Buffer,
  productBuffer: Buffer,
  placement: PlacementOutput
): Promise<Buffer> {
  const bgMeta = await sharp(backgroundBuffer).metadata();
  const productMeta = await sharp(productBuffer).metadata();

  const bgWidth = bgMeta.width || 1080;
  const bgHeight = bgMeta.height || 1350;
  const productWidth = productMeta.width || 300;
  const productHeight = productMeta.height || 300;

  // Calculate scaled dimensions
  const scaledWidth = Math.round(productWidth * placement.scale);
  const scaledHeight = Math.round(productHeight * placement.scale);

  // Scale product
  const scaledProduct = await sharp(productBuffer)
    .resize(scaledWidth, scaledHeight, { fit: "inside" })
    .png()
    .toBuffer();

  // Generate shadow using shadowPreset
  let shadowBuffer: Buffer | undefined;
  const { shadowPreset } = placement;

  if (shadowPreset && shadowPreset.opacity > 0) {
    const canAddShadow = await hasValidTransparency(scaledProduct);
    if (canAddShadow) {
      shadowBuffer = await generateShadow(scaledProduct, {
        offsetX: 0,
        offsetY: shadowPreset.offsetY,
        blur: shadowPreset.blur,
        opacity: shadowPreset.opacity,
        color: "#000000",
      });
    }
  }

  // Build composite layers
  const layers: sharp.OverlayOptions[] = [];

  // Add shadow layer
  if (shadowBuffer) {
    const shadowMeta = await sharp(shadowBuffer).metadata();
    const shadowWidth = shadowMeta.width || scaledWidth;
    const shadowHeight = shadowMeta.height || scaledHeight;

    // Shadow position (offset by shadowPreset.offsetY)
    const shadowX = Math.max(
      0,
      Math.min(bgWidth - shadowWidth, placement.x)
    );
    const shadowY = Math.max(
      0,
      Math.min(bgHeight - shadowHeight, placement.y + shadowPreset.offsetY)
    );

    layers.push({
      input: shadowBuffer,
      left: Math.round(shadowX),
      top: Math.round(shadowY),
    });
  }

  // Add product layer
  const productX = Math.max(0, Math.min(bgWidth - scaledWidth, placement.x));
  const productY = Math.max(0, Math.min(bgHeight - scaledHeight, placement.y));

  layers.push({
    input: scaledProduct,
    left: Math.round(productX),
    top: Math.round(productY),
  });

  // Composite all layers
  const composed = await sharp(backgroundBuffer)
    .composite(layers)
    .png()
    .toBuffer();

  return composed;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SMART_USAGE_V1 ORCHESTRATOR
═══════════════════════════════════════════════════════════════ */

export async function composeWithSmartUsage(
  request: ComposeRequest
): Promise<SmartUsageResult> {
  const requestId = request.requestId || generateRequestId();
  const logger = createLogger({ service: "compose-smart-usage", requestId });
  const metrics = createMetrics();

  // Extract smartUsageOptions from request or use defaults
  const rawOpts = request.smartUsageOptions;
  const opts: SmartUsageOptions = {
    productName: rawOpts?.productName || "Product",
    productDescription: rawOpts?.productDescription || "A skincare product",
    skipInference: rawOpts?.skipInference || false,
    usagePlan: rawOpts?.usagePlan,
    qaThreshold: rawOpts?.qaThreshold ?? SMART_USAGE_CONSTANTS.QA_THRESHOLD,
    enableRepair: rawOpts?.enableRepair !== false,
  };

  const timings: SmartUsageResult["timings"] = {
    inferUsage: 0,
    generateScene: 0,
    analyzeAnchors: 0,
    computePlacement: 0,
    compose: 0,
    renderText: 0,
    qaScore: 0,
    repair: 0,
    total: 0,
  };

  const totalStart = Date.now();

  logger.info("Starting SMART_USAGE_V1 composition", {
    productName: opts.productName,
    skipInference: opts.skipInference,
    qaThreshold: opts.qaThreshold,
    enableRepair: opts.enableRepair,
  });

  try {
    // STEP 1: Infer Usage Plan (or use provided)
    let usage: UsagePlan;
    const inferStart = Date.now();

    if (opts.skipInference && opts.usagePlan) {
      usage = opts.usagePlan;
      logger.info("Using provided usage plan", { archetype: usage.archetype });
    } else {
      usage = await inferUsage({
        productName: opts.productName,
        productDescription: opts.productDescription,
      });
      logger.info("Usage plan inferred", {
        archetype: usage.archetype,
        emotion: usage.primaryEmotion,
        sceneType: usage.sceneType,
      });
    }
    timings.inferUsage = Date.now() - inferStart;

    // STEP 2: Load or generate background + product
    const generateStart = Date.now();

    let backgroundBuffer: Buffer;
    let scenePromptUsed = "";

    if (request.backgroundBuffer || request.backgroundUrl) {
      // Use provided background
      backgroundBuffer =
        request.backgroundBuffer ||
        (await loadImageBuffer(request.backgroundUrl!));
      logger.info("Using provided background");
    } else {
      // Generate scene from usage plan
      const sceneResult = await generateSceneFromUsage({ usage });
      backgroundBuffer = sceneResult.buffer;
      scenePromptUsed = sceneResult.promptUsed;
      logger.info("Generated scene from usage plan");
    }

    const productBuffer =
      request.productBuffer ||
      (await loadImageBuffer(request.productPngUrl!));

    timings.generateScene = Date.now() - generateStart;

    // Validate buffers
    if (!backgroundBuffer || backgroundBuffer.length === 0) {
      return { success: false, error: "Background image is empty" };
    }
    if (!productBuffer || productBuffer.length === 0) {
      return { success: false, error: "Product image is empty" };
    }

    // Get image metadata
    const bgMeta = await getImageMeta(backgroundBuffer);
    const productMeta = await getImageMeta(productBuffer);

    // STEP 3: Analyze Scene Anchors
    const anchorsStart = Date.now();
    const anchorsResult = await analyzeSceneAnchors({
      backgroundBuffer,
      canvasWidth: bgMeta.width,
      canvasHeight: bgMeta.height,
    });
    const anchors = anchorsResult.anchors;
    timings.analyzeAnchors = Date.now() - anchorsStart;

    logger.info("Scene anchors analyzed", {
      surfaceLineY: anchors.surfaceLineY,
      lighting: anchors.lighting,
      confidence: anchors.confidence,
    });

    // STEP 4: Compute Placement (pure math, no AI)
    const placementStart = Date.now();
    let placement = computePlacement({
      usage,
      anchors,
      productMeta: { width: productMeta.width, height: productMeta.height },
      canvas: { width: bgMeta.width, height: bgMeta.height },
    });
    timings.computePlacement = Date.now() - placementStart;

    logger.info("Placement computed", {
      x: placement.x,
      y: placement.y,
      scale: placement.scale,
    });

    // STEP 5: Compose product on background
    const composeStart = Date.now();
    let composedBuffer = await composeProductOnBackground(
      backgroundBuffer,
      productBuffer,
      placement
    );
    timings.compose = Date.now() - composeStart;

    // STEP 6: Render text overlays (if copy provided)
    // NOTE: Text rendering is skipped in SMART_USAGE_V1 for simplicity.
    // The pipeline focuses on product placement. Text can be added in post-processing.
    const renderStart = Date.now();
    // Skip text rendering for now - can be integrated later with proper LayoutSpec
    timings.renderText = Date.now() - renderStart;

    // STEP 7: QA Scoring (heuristics, no AI)
    const qaStart = Date.now();
    let qaResult = qaScore({
      placement,
      productMeta: { width: productMeta.width, height: productMeta.height },
      canvas: { width: bgMeta.width, height: bgMeta.height },
      anchors,
    });
    timings.qaScore = Date.now() - qaStart;

    const qaPassed = qaResult.score >= (opts.qaThreshold ?? SMART_USAGE_CONSTANTS.QA_THRESHOLD);

    logger.info("QA score computed", {
      score: qaResult.score,
      passed: qaPassed,
      issues: qaResult.issues,
    });

    // STEP 8: Repair if needed
    const repairStart = Date.now();
    let repairResult: RepairResult | undefined;

    if (!qaPassed && opts.enableRepair) {
      logger.info("QA score below threshold, attempting repair", {
        score: qaResult.score,
        threshold: opts.qaThreshold,
      });

      repairResult = repairIfNeeded({
        placement,
        productMeta: { width: productMeta.width, height: productMeta.height },
        canvas: { width: bgMeta.width, height: bgMeta.height },
        anchors,
        currentScore: qaResult,
      });

      if (repairResult.repaired && repairResult.newPlacement) {
        // Re-compose with repaired placement
        placement = repairResult.newPlacement;

        const recomposeStart = Date.now();
        composedBuffer = await composeProductOnBackground(
          backgroundBuffer,
          productBuffer,
          placement
        );

        // Re-score
        qaResult = qaScore({
          placement,
          productMeta: { width: productMeta.width, height: productMeta.height },
          canvas: { width: bgMeta.width, height: bgMeta.height },
          anchors,
        });

        timings.compose += Date.now() - recomposeStart;

        logger.info("Repair completed", {
          newScore: qaResult.score,
          actions: repairResult.actions,
          regenerateScene: repairResult.regenerateScene,
        });
      }
    }
    timings.repair = Date.now() - repairStart;
    timings.total = Date.now() - totalStart;

    // Convert to base64 for output
    const imageBase64 = composedBuffer.toString("base64");

    logger.info("SMART_USAGE_V1 composition completed", {
      totalTimeMs: timings.total,
      qaScore: qaResult.score,
      repaired: repairResult?.repaired || false,
    });

    return {
      success: true,
      imageBase64,
      width: bgMeta.width,
      height: bgMeta.height,
      usage,
      anchors,
      placement,
      qaResult,
      repairResult,
      timings,
    };
  } catch (error: any) {
    logger.error("SMART_USAGE_V1 composition failed", {}, error);

    return {
      success: false,
      error: error?.message || "Unknown error in SMART_USAGE_V1 pipeline",
      timings,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════ */

export { generateSceneFromUsage };
