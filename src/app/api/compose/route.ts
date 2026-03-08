/**
 * POST /api/compose
 *
 * Product Composer API endpoint.
 * Composites a product image onto a background with shadow generation
 * and optional AI enhancement.
 *
 * Supports:
 * - JSON body with base64 images or URLs
 * - multipart/form-data with file uploads
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { compose, composeWithAutoLayout, composeWithSmartUsage, composeWithPreset, ComposeRequestSchema, type ComposeRequest, type ComposeMode } from "@/services/product-composer";

import { composeWithProductIA } from "@/services/product-composer";
import { composeWithTemplateBeta } from "@/services/product-composer/composeWithTemplateBeta"; // ← AGREGAR
import { generateBackground, analyzeCreativeQuality, generateImageBriefGemini } from "@/lib/ai/gemini";
import { generateTemplateCopyOpenAI, analyzeCreativeReference, generateSequenceCopy } from "@/lib/ai/openai";
import type { ImageBriefType } from "@/lib/ai/promptLibrary";
import { listPresets } from "@/services/product-composer/presets";
import { createLogger, generateRequestId } from "@/lib/logger";
import { createMetrics } from "@/lib/metrics";
import { getUserWithTokens, consumeTokensWithData } from "@/lib/supabase/server";
import { calculateTokensForOperation } from "@/lib/tokens/tokenCalculator";

const logger = createLogger({ service: "api:compose" });
const metrics = createMetrics();

// Cambiar a true para activar verificación y consumo de tokens.
const TOKENS_ENABLED = false;

export const runtime = "nodejs";
export const maxDuration = 180; // 3 minutes — Gemini image generation can be slow

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DebugInfo {
  contentType: string;
  mode: "multipart" | "json";
  backgroundSource: "file" | "prompt" | "url" | "none";
  backgroundBytes: number;
  productBytes: number;
}

interface ComposeJsonBody {
  mode?: "STANDARD" | "AUTO_LAYOUT" | "SMART_USAGE_V1" | "PRESET" | "PRODUCT_IA" | "TEMPLATE_BETA";
  backgroundUrl?: string;
  backgroundPrompt?: string;
  aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9";
  productPngUrl?: string;

  placement?: {
    anchor?: string;
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
    depth?: "near" | "mid" | "far";
    maxWidthRatio?: number;
    maxHeightRatio?: number;
  };

  copy?: {
    headline?: string;
    subheadline?: string;
    cta?: string;
    badge?: string;
    disclaimer?: string;
  };

  style?: ComposeRequest["style"];
  autoLayoutOptions?: { /* ... */ };
  smartUsageOptions?: { /* ... */ };
  presetOptions?: { /* ... */ };

  productIAOptions?: {
    prompt?: string;
    copyZone?: "right" | "left" | "top" | "bottom" | "center" | "full";
    forceSize?: { width: number; height: number };
    includeLayoutSpec?: boolean;
    skipTextRender?: boolean;
    sceneMode?: boolean;
    useAvatarAsScene?: boolean;
    avatarSceneWithProduct?: boolean;
    rawProductPrompt?: boolean;
    personScene?: boolean;
    splitComparison?: boolean;
    useGenericProductClone?: boolean;
    sharpProductOverlay?: Record<string, unknown>;
    /** true = el usuario subió una imagen real de producto (no el PNG transparente de placeholder).
     *  En sceneMode, esto indica a composeWithProductIA que debe enviar la imagen del producto
     *  a Gemini como Image 2 para que lo use como referencia en vez de inventar uno. */
    hasRealProduct?: boolean;
    /** true = scene fills entire canvas (full-bleed) instead of being confined to one zone */
    sceneFullBleed?: boolean;
  };

  templateBetaOptions?: {
    templateId?: string;
    canvas?: { width: number; height: number };
    includeLayoutSpec?: boolean;
  };

  outputFormat?: "png" | "webp" | "jpeg";
  quality?: number;
  useGeminiEdit?: boolean;
  seed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function parseMultipartRequest(
  request: NextRequest
): Promise<{ request: ComposeRequest; generatedBackground?: boolean; debugInfo: DebugInfo }> {
  const formData = await request.formData();
  const debugInfo: DebugInfo = {
    contentType: "multipart/form-data",
    mode: "multipart",
    backgroundSource: "none",
    backgroundBytes: 0,
    productBytes: 0,
  };

// 1. Parsear config PRIMERO
const configStr = formData.get("config") as string | null;
let config: Partial<ComposeJsonBody> = {};
if (configStr) {
  try {
    config = JSON.parse(configStr);
  } catch {
    throw new Error("Invalid JSON in 'config' field");
  }
}

// 2. Validar producto condicionalmente según el modo
const productFile = formData.get("product") as File | null;
const requestedMode = config.mode ?? "STANDARD";
if (!productFile && requestedMode !== "TEMPLATE_BETA") {
  throw new Error("Missing required file: 'product' is required");
}

  // Background file is optional if backgroundPrompt is provided
  const backgroundFile = formData.get("background") as File | null;
  let backgroundBuffer: Buffer;
  let generatedBackground = false;

  if (backgroundFile) {
    // Use uploaded background
    const backgroundArrayBuffer = await backgroundFile.arrayBuffer();
    backgroundBuffer = Buffer.from(backgroundArrayBuffer);
    debugInfo.backgroundSource = "file";
    debugInfo.backgroundBytes = backgroundBuffer.length;
    console.log(`[compose] Background from file: ${backgroundBuffer.length} bytes`);
  } else if (config.backgroundPrompt) {
    // Generate background with Gemini
    console.log(`[compose] Generating background with prompt: ${config.backgroundPrompt.slice(0, 50)}...`);
    backgroundBuffer = await generateBackground({
      prompt: config.backgroundPrompt,
      aspectRatio: config.aspectRatio || "4:5",
    });
    generatedBackground = true;
    debugInfo.backgroundSource = "prompt";
    debugInfo.backgroundBytes = backgroundBuffer.length;
  } else {
    throw new Error(
      "Missing background: provide either 'background' file or 'backgroundPrompt' in config"
    );
  }

  // Validate background buffer
  if (debugInfo.backgroundBytes === 0) {
    throw new Error("Background image is empty (0 bytes)");
  }

  // Convert product to buffer
// 3. Convertir producto a buffer
const productBuffer = productFile
  ? Buffer.from(await productFile.arrayBuffer())
  : Buffer.alloc(0);
debugInfo.productBytes = productBuffer.length;

// 4. Validar buffer — pero solo si NO es TEMPLATE_BETA
if (debugInfo.productBytes === 0 && requestedMode !== "TEMPLATE_BETA") {
  throw new Error("Product image is empty (0 bytes)");
}

  console.log(`[compose] Product: ${productBuffer.length} bytes`);

  // Logo overlay fields (for TEMPLATE_BETA)
  const logoBase64 = formData.get("logoBase64") as string | null;
  const logoMimeType = formData.get("logoMimeType") as string | null;
  const logoDarkBase64 = formData.get("logoDarkBase64") as string | null;
  const logoDarkMimeType = formData.get("logoDarkMimeType") as string | null;
  const logoLightBase64 = formData.get("logoLightBase64") as string | null;
  const logoLightMimeType = formData.get("logoLightMimeType") as string | null;

  // Avatar buffer (for PRODUCT_IA scene templates)
  const avatarFormFile = formData.get("avatarFile") as File | null;
  const avatarBuffer = avatarFormFile ? Buffer.from(await avatarFormFile.arrayBuffer()) : undefined;

  return {
    request: {
      mode: (config.mode as ComposeMode) || "STANDARD",
      backgroundBuffer,
      productBuffer: productBuffer.length > 0 ? productBuffer : undefined,
      placement: config.placement as ComposeRequest["placement"],
      style: config.style as ComposeRequest["style"],
      copy: config.copy,
      autoLayoutOptions: config.autoLayoutOptions as ComposeRequest["autoLayoutOptions"],
      smartUsageOptions: config.smartUsageOptions as ComposeRequest["smartUsageOptions"],
      presetOptions: config.presetOptions as ComposeRequest["presetOptions"],
      outputFormat: config.outputFormat ?? "png",
      quality: config.quality ?? 90,
      useGeminiEdit: config.useGeminiEdit ?? false,
      seed: config.seed,
      logoBase64: logoBase64 ?? undefined,
      logoMimeType: logoMimeType ?? undefined,
      logoDarkBase64: logoDarkBase64 ?? undefined,
      logoDarkMimeType: logoDarkMimeType ?? undefined,
      logoLightBase64: logoLightBase64 ?? undefined,
      logoLightMimeType: logoLightMimeType ?? undefined,
      avatarBuffer,
      productIAOptions: config.productIAOptions as ComposeRequest["productIAOptions"],
      templateBetaOptions: config.templateBetaOptions as any,
    },
    generatedBackground,
    debugInfo,
  };
}

async function parseJsonRequest(request: NextRequest): Promise<{ request: ComposeRequest; generatedBackground?: boolean; debugInfo: DebugInfo }> {
  const body: ComposeJsonBody = await request.json();
  const debugInfo: DebugInfo = {
    contentType: "application/json",
    mode: "json",
    backgroundSource: "none",
    backgroundBytes: 0,
    productBytes: 0,
  };

  // Product is always required
  if (!body.productPngUrl) {
    throw new Error("Missing required field: 'productPngUrl' is required");
  }

  let backgroundUrl = body.backgroundUrl;
  let generatedBackground = false;

  // If no backgroundUrl but has backgroundPrompt, generate with Gemini
  if (!backgroundUrl && body.backgroundPrompt) {
    console.log(`[compose] Generating background with prompt: ${body.backgroundPrompt.slice(0, 50)}...`);
    const result = await generateBackground({
      prompt: body.backgroundPrompt,
      aspectRatio: body.aspectRatio || "4:5",
    });
    backgroundUrl = `data:image/png;base64,${result.toString("base64")}`;
    generatedBackground = true;
    debugInfo.backgroundSource = "prompt";
    debugInfo.backgroundBytes = result.length;
    console.log(`[compose] Background generated successfully`);
  } else if (backgroundUrl) {
    debugInfo.backgroundSource = "url";
    // Can't know bytes until we fetch
  }

  if (!backgroundUrl) {
    throw new Error(
      "Missing background: provide either 'backgroundUrl' or 'backgroundPrompt'"
    );
  }

  return {
    request: {
      mode: (body.mode as ComposeMode) || "STANDARD",
      backgroundUrl,
      productPngUrl: body.productPngUrl,
      placement: body.placement as ComposeRequest["placement"],
      style: body.style as ComposeRequest["style"],
      copy: body.copy,
      autoLayoutOptions: body.autoLayoutOptions as ComposeRequest["autoLayoutOptions"],
      smartUsageOptions: body.smartUsageOptions as ComposeRequest["smartUsageOptions"],
      presetOptions: body.presetOptions as ComposeRequest["presetOptions"],
      outputFormat: body.outputFormat ?? "png",
      quality: body.quality ?? 90,
      productIAOptions: body.productIAOptions as ComposeRequest["productIAOptions"],
      templateBetaOptions: body.templateBetaOptions as any,
      useGeminiEdit: body.useGeminiEdit ?? false,
      seed: body.seed,
    },
    generatedBackground,
    debugInfo,
  };
}

async function parseOperationFromRequest(
  request: NextRequest,
  contentType: string
): Promise<{ operation: string; payload: Record<string, unknown> }> {
  if (contentType.includes("application/json")) {
    const body = await request.clone().json().catch(() => ({}));
    const operation = typeof body?.mode === "string" ? body.mode : "STANDARD";
    return { operation, payload: (body ?? {}) as Record<string, unknown> };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.clone().formData().catch(() => new FormData());
    const configStr = formData.get("config") as string | null;
    let config: Record<string, unknown> = {};

    if (configStr) {
      try {
        config = JSON.parse(configStr) as Record<string, unknown>;
      } catch {
        config = {};
      }
    }

    const operation = typeof config.mode === "string" ? config.mode : "STANDARD";
    return { operation, payload: config };
  }

  return { operation: "STANDARD", payload: {} };
}


// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  logger.info("Compose request received", { requestId });
  metrics.increment("request_total");

  let debugInfo: DebugInfo | undefined;

  try {
    // Determine content type and parse request
    const contentType = request.headers.get("content-type") || "";
    const { operation, payload } = await parseOperationFromRequest(request, contentType);
    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const tokensNeeded = calculateTokensForOperation(operation, payload);

    // Single DB call: fetch user tokens and verify balance in one query
     const cachedUserTokens = TOKENS_ENABLED && tokensNeeded > 0 ? await getUserWithTokens(userId) : null;
    if (TOKENS_ENABLED && tokensNeeded > 0) {
      const tokensRemaining = Number(cachedUserTokens?.tokens_remaining ?? 0);
      if (tokensRemaining < tokensNeeded) {
        return NextResponse.json({ success: false, error: "Insufficient tokens" }, { status: 402 });
      }
    }

    let composeRequest: ComposeRequest;
    let generatedBackground = false;

    // GENERATE_BACKGROUND: early return — does not need product/background parsing
    {
      const clone = request.clone();
      let mode: string | undefined;
      let prompt: string | undefined;
      let aspectRatio: string | undefined;

      if (contentType.includes("application/json")) {
        const body = await clone.json().catch(() => ({}));
        mode = body.mode;
        prompt = body.prompt;
        aspectRatio = body.aspectRatio;
      } else if (contentType.includes("multipart/form-data")) {
        const fd = await clone.formData().catch(() => new FormData());
        const configStr = fd.get("config") as string | null;
        if (configStr) {
          const cfg = JSON.parse(configStr);
          mode = cfg.mode;
          prompt = cfg.prompt;
          aspectRatio = cfg.aspectRatio;
        }
      }

      if (mode === "GENERATE_BACKGROUND") {
        if (!prompt) {
          return NextResponse.json(
            { success: false, error: "Missing config.prompt for GENERATE_BACKGROUND" },
            { status: 400 }
          );
        }
        const buffer = await generateBackground({ prompt, aspectRatio });
        if (cachedUserTokens) await consumeTokensWithData(cachedUserTokens, tokensNeeded, operation);
        return NextResponse.json({
          success: true,
          requestId,
          data: { image: `data:image/png;base64,${buffer.toString("base64")}`, promptUsed: prompt },
        });
      }
    }

    // GENERATE_COPY: early return — text-only, no file parsing needed
    if (contentType.includes("application/json")) {
      const clone = request.clone();
      const body = await clone.json().catch(() => ({}));
      if (body.mode === "GENERATE_COPY") {
        try {
          const fullSchema: string[] = body.templateSchema ?? [];

          // Fields that benefit from Gemini Flash specialization.
          // productPrompt → person+product scene direction
          // sceneAction   → person-only scene direction
          const IMAGE_BRIEF_FIELDS = ["productPrompt", "sceneAction"] as const;
          type ImageField = typeof IMAGE_BRIEF_FIELDS[number];

          // Skip Gemini Flash when:
          // 1. rawProductPrompt: true → template owns the prompt engineering (zone rules, etc.)
          // 2. backgroundPrompt is also in schema → productPrompt must be generated alongside it
          //    by OpenAI to maintain location/lighting coherence (templateHint enforces this).
          const skipImageBrief =
            body.rawProductPrompt === true ||
            (fullSchema.includes("backgroundPrompt") && fullSchema.includes("productPrompt"));

          const imageBriefFields = skipImageBrief
            ? []
            : fullSchema.filter((f): f is ImageField =>
                IMAGE_BRIEF_FIELDS.includes(f as ImageField)
              );
          const copyOnlySchema = fullSchema.filter(f =>
            !IMAGE_BRIEF_FIELDS.includes(f as ImageField)
          );

          const briefType: ImageBriefType =
            imageBriefFields.includes("productPrompt") ? "person-product" :
            imageBriefFields.includes("sceneAction")   ? "scene-only"    :
            "product-only";

          // Capture Gemini Flash input for logging before calling
          const imageBriefInput = imageBriefFields.length > 0
            ? {
                product: body.product ?? "",
                productCategory: (body.businessProfile as any)?.category ?? "",
                tone: body.tone ?? "",
                briefType,
                copyZone: body.copyZone,
                clienteIdeal: (body.businessProfile as any)?.clienteIdeal,
              }
            : null;

          // Run OpenAI (copy) and Gemini Flash (image brief) in parallel when applicable
          const [copyResult, imagePrompt] = await Promise.all([
            generateTemplateCopyOpenAI({
              product: body.product ?? "",
              offer: body.offer ?? "",
              targetAudience: body.targetAudience ?? "",
              problem: body.problem ?? "",
              tone: body.tone ?? "",
              templateSchema: imageBriefFields.length > 0 ? copyOnlySchema : fullSchema,
              numberOfVariants: body.numberOfVariants ?? 1,
              templateHint: body.templateHint,
              businessProfile: body.businessProfile,
              referenceStyle: body.referenceStyle,
              backgroundStyleGuide: body.backgroundStyleGuide,
              sorteoData: body.sorteoData,
            }),
            imageBriefFields.length > 0
              ? generateImageBriefGemini({
                  product: body.product ?? "",
                  productCategory: (body.businessProfile as any)?.category ?? "",
                  tone: body.tone ?? "",
                  briefType,
                  copyZone: body.copyZone,
                  businessProfile: {
                    nombre: (body.businessProfile as any)?.nombre,
                    clienteIdeal: (body.businessProfile as any)?.clienteIdeal,
                  },
                })
              : Promise.resolve(null),
          ]);

          // Merge image brief fields into copy result
          let result = copyResult;
          if (imagePrompt !== null && imageBriefFields.length > 0) {
            const briefPatch = Object.fromEntries(imageBriefFields.map(f => [f, imagePrompt]));
            if (Array.isArray(result)) {
              result = result.map(v => ({ ...v, ...briefPatch }));
            } else {
              result = { ...result, ...briefPatch };
            }
          }

          const imageBriefLog = imagePrompt !== null && imageBriefInput
            ? { input: imageBriefInput, output: imagePrompt }
            : null;

          if (cachedUserTokens) await consumeTokensWithData(cachedUserTokens, tokensNeeded, operation);
          return NextResponse.json({ success: true, data: { copy: result, promptUsed: `Schema: ${fullSchema.join(", ")}`, imageBriefLog } });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return NextResponse.json({ success: false, error: message }, { status: 500 });
        }
      }
    }

    // GENERATE_SEQUENCE_COPY: early return — text-only, no file parsing needed
    if (contentType.includes("application/json")) {
      const clone = request.clone();
      const body = await clone.json().catch(() => ({}));
      if (body.mode === "GENERATE_SEQUENCE_COPY") {
        try {
          const result = await generateSequenceCopy({
            product: body.product ?? "",
            offer: body.offer ?? "",
            targetAudience: body.targetAudience ?? "",
            problem: body.problem ?? "",
            tone: body.tone ?? "",
            narrative: body.narrative ?? "",
            slideCount: body.slideCount ?? 3,
            sceneWithProduct: body.sceneWithProduct === true,
            businessProfile: body.businessProfile,
          });
          if (cachedUserTokens) await consumeTokensWithData(cachedUserTokens, tokensNeeded, operation);
          return NextResponse.json({ success: true, data: { slides: result } });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return NextResponse.json({ success: false, error: message }, { status: 500 });
        }
      }
    }

    // ANALYZE_CREATIVE / ANALYZE_REFERENCE: early return — reads from JSON body
    if (contentType.includes("application/json")) {
      const clone = request.clone();
      const body = await clone.json().catch(() => ({}));

      if (body.mode === "ANALYZE_CREATIVE") {
        try {
          const creative = Buffer.from(body.creativeBase64 ?? "", "base64");
          const product = body.productBase64
            ? Buffer.from(body.productBase64 as string, "base64")
            : undefined;
          const result = await analyzeCreativeQuality({
            creativePng: creative,
            productPng: product,
            copy: (body.copy as Record<string, unknown>) ?? {},
          });
          if (cachedUserTokens) await consumeTokensWithData(cachedUserTokens, tokensNeeded, operation);
          return NextResponse.json({ success: true, data: result });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return NextResponse.json({ success: false, error: message }, { status: 500 });
        }
      }

      if (body.mode === "ANALYZE_REFERENCE") {
        try {
          const result = await analyzeCreativeReference({
            imageBase64: body.imageBase64 ?? "",
            mimeType: body.mimeType ?? "",
          });
          if (cachedUserTokens) await consumeTokensWithData(cachedUserTokens, tokensNeeded, operation);
          return NextResponse.json({ success: true, data: { analysis: result } });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return NextResponse.json({ success: false, error: message }, { status: 500 });
        }
      }
    }

    if (contentType.includes("multipart/form-data")) {
      const parsed = await parseMultipartRequest(request);
      composeRequest = parsed.request;
      generatedBackground = parsed.generatedBackground || false;
      debugInfo = parsed.debugInfo;
    } else if (contentType.includes("application/json")) {
      const parsed = await parseJsonRequest(request);
      composeRequest = parsed.request;
      generatedBackground = parsed.generatedBackground || false;
      debugInfo = parsed.debugInfo;
    } else {
      return NextResponse.json(
        {
          error: "Unsupported Content-Type",
          message: "Use 'application/json' or 'multipart/form-data'",
        },
        { status: 415 }
      );
    }

    // Log debug info
    console.log(`[compose] Debug:`, JSON.stringify(debugInfo));
    console.log("[DEBUG] Parsed request mode:", composeRequest.mode);
    console.log("[DEBUG] backgroundBuffer length:", composeRequest.backgroundBuffer?.length ?? "MISSING");
    console.log("[DEBUG] productBuffer length:", composeRequest.productBuffer?.length ?? "MISSING");

    // Add requestId
    composeRequest.requestId = requestId;

    console.log("[DEBUG] Pre-parse composeRequest:", JSON.stringify({
      mode: composeRequest.mode,
      hasBackgroundBuffer: !!composeRequest.backgroundBuffer,
      backgroundBufferLength: composeRequest.backgroundBuffer?.length ?? 0,
      hasProductBuffer: !!composeRequest.productBuffer,
      hasBackgroundUrl: !!composeRequest.backgroundUrl,
      hasProductPngUrl: !!composeRequest.productPngUrl,
      copyKeys: composeRequest.copy ? Object.keys(composeRequest.copy) : [],
    }, null, 2));

    // Validate with Zod
    let validated;
    try {
      validated = ComposeRequestSchema.parse(composeRequest);
    } catch (zodError: any) {
      console.error("[DEBUG] Zod validation failed:", JSON.stringify(zodError?.errors ?? zodError, null, 2));
      throw zodError;
    }

    // Execute composition based on mode
    let result;
   // Líneas 312-322 — agregar el else if de TEMPLATE_BETA
if (validated.mode === "SMART_USAGE_V1") {
  result = await composeWithSmartUsage(validated);
} else if (validated.mode === "PRESET") {
  result = await composeWithPreset(validated);
} else if (validated.mode === "AUTO_LAYOUT") {
  result = await composeWithAutoLayout(validated);
} else if (validated.mode === "PRODUCT_IA") {
  result = await composeWithProductIA(validated) as any;
} else if (validated.mode === "TEMPLATE_BETA") {                          // ← AGREGAR
  result = await composeWithTemplateBeta(validated, {                     // ← AGREGAR
    templateId: (composeRequest as any).templateBetaOptions?.templateId,  // ← AGREGAR
    canvas: (composeRequest as any).templateBetaOptions?.canvas,          // ← AGREGAR
    includeLayoutSpec: (composeRequest as any).templateBetaOptions?.includeLayoutSpec, // ← AGREGAR
  });                                                                      // ← AGREGAR
} else {
  result = await compose(validated);
}
    const duration = Date.now() - startTime;
    metrics.timing("request_duration_ms", duration);
    metrics.increment("request_success");

    if (!result.success) {
      throw new Error(result.error || "Composition failed");
    }

    logger.info("Compose request completed", {
      requestId,
      duration_ms: duration,
      output_size: result.buffer?.length,
    });

    // Return response based on Accept header
    const acceptHeader = request.headers.get("accept") || "";

    if (acceptHeader.includes("application/json")) {
      // Return JSON with base64 image
      // Handle SMART_USAGE_V1 result format (has imageBase64 instead of buffer)
      const isSmartUsage = validated.mode === "SMART_USAGE_V1";
      const smartResult = result as any; // SmartUsageResult type
      
      const imageData = isSmartUsage
        ? (smartResult.imageBase64 ? `data:image/png;base64,${smartResult.imageBase64}` : undefined)
        : (result.dataUrl || (result.buffer 
            ? `data:image/png;base64,${result.buffer.toString("base64")}`
            : undefined));

      if (cachedUserTokens) await consumeTokensWithData(cachedUserTokens, tokensNeeded, operation);

      return NextResponse.json({
        success: true,
        requestId,
        data: {
          image: imageData,
          imageUrl: result.imageUrl,
          layoutSpec: result.layoutSpec,
           templateId: (result as any).templateId,
          fallbackLayoutUsed: result.fallbackLayoutUsed,
          timings: result.timings,
          cost: result.cost,
          promptUsed: (result as any).promptUsed,
          // SMART_USAGE_V1 specific fields
          ...(isSmartUsage && {
            usage: smartResult.usage,
            anchors: smartResult.anchors,
            placement: smartResult.placement,
            qaResult: smartResult.qaResult,
            repairResult: smartResult.repairResult,
          }),
          debug: {
            ...result.debug,
            route: debugInfo,
          },
        },
      });
    } else {
      // Return raw image
      let outputBuffer: Buffer;
      
      if (validated.mode === "SMART_USAGE_V1") {
        const smartResult = result as any;
        if (!smartResult.imageBase64) {
          throw new Error("No output image generated");
        }
        outputBuffer = Buffer.from(smartResult.imageBase64, "base64");
      } else {
        if (!result.buffer) {
          throw new Error("No output buffer generated");
        }
        outputBuffer = result.buffer;
      }

      const mimeType = 
        validated.outputFormat === "jpeg" ? "image/jpeg" :
        validated.outputFormat === "webp" ? "image/webp" : "image/png";

      if (cachedUserTokens) await consumeTokensWithData(cachedUserTokens, tokensNeeded, operation);

      return new NextResponse(new Uint8Array(outputBuffer), {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": outputBuffer.length.toString(),
          "X-Request-Id": requestId,
          "X-Duration-Ms": duration.toString(),
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.increment("request_error");

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[DEBUG] CAUGHT ERROR stack:", error instanceof Error ? error.stack : String(error));

    logger.error("Compose request failed", {
      requestId,
      duration_ms: duration,
      error: message,
    });

    // Determine status code
    let status = 500;
    if (message.includes("Missing required")) {
      status = 400;
    } else if (message.includes("Invalid")) {
      status = 400;
    } else if (message.includes("Unsupported")) {
      status = 415;
    } else if (message.includes("Insufficient")) {
      status = 402;
    }

    return NextResponse.json(
      {
        success: false,
        requestId,
        error: message,
        duration_ms: duration,
      },
      { status }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    service: "product-composer",
    status: "healthy",
    version: "1.0.0",
    endpoints: {
      POST: {
        description: "Composite product onto background",
        contentTypes: ["application/json", "multipart/form-data"],
        required: {
          json: ["backgroundUrl", "productPngUrl"],
          formData: ["background (file)", "product (file)"],
        },
        optional: ["placement", "style", "outputFormat", "quality", "useGeminiEdit"],
      },
    },
  });
}
