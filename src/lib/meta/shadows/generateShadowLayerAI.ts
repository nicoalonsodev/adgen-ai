/**
 * AI Shadow Layer Generator
 *
 * Uses Gemini to generate a transparent shadow layer for product placement.
 * The shadow layer is composited onto the background before final render.
 *
 * IMPORTANT:
 * - This does NOT regenerate the product
 * - The AI only generates a soft shadow/contact shadow
 * - Output is a transparent PNG with same dimensions as background
 */

import { GoogleGenAI } from "@google/genai";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import * as fs from "fs";
import * as path from "path";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

const MODEL = "gemini-2.5-flash-preview-05-20";

const SHADOW_PROMPT = `You are a professional image compositing assistant.

TASK:
Generate ONLY a realistic shadow layer for the already placed product.

INPUTS:
1) Background image
2) Composite preview image (product already placed)

CRITICAL RULES:
- Do NOT modify, redraw, repaint, blur, distort, or regenerate the product.
- Do NOT add any text.
- Do NOT regenerate the full image.
- Output must be a SINGLE PNG with transparent background.
- PNG must have EXACT same resolution as background.
- PNG must contain ONLY the shadow and subtle contact shadow.
- Keep it soft and realistic (advertising style).
- Respect the scene's light direction.
- Do not create overly dark shadows.

If you cannot produce a correct transparent shadow layer,
return this exact JSON:
{ "shadow_png_base64": "" }

OUTPUT FORMAT:
Return JSON only:
{
  "shadow_png_base64": "BASE64_STRING"
}`;

/** Maximum allowed alpha coverage (40%) */
const MAX_ALPHA_COVERAGE = 0.40;

/** PNG magic bytes */
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface GenerateShadowLayerArgs {
  backgroundBuffer: Buffer;
  previewBuffer: Buffer;
  width: number;
  height: number;
}

export interface ShadowLayerResult {
  shadowBuffer: Buffer | null;
  error?: string;
  alphaCoverage?: number;
  timeMs: number;
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: GET GEMINI CLIENT
═══════════════════════════════════════════════════════════════ */

function getClient(): GoogleGenAI {
  return new GoogleGenAI({});
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: VALIDATE PNG HEADER
═══════════════════════════════════════════════════════════════ */

function validatePngHeader(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  return buffer.subarray(0, 8).equals(PNG_HEADER);
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: VALIDATE DIMENSIONS
═══════════════════════════════════════════════════════════════ */

async function validateDimensions(
  buffer: Buffer,
  expectedWidth: number,
  expectedHeight: number
): Promise<{ valid: boolean; actualWidth?: number; actualHeight?: number }> {
  try {
    const img = await loadImage(buffer);
    const valid = img.width === expectedWidth && img.height === expectedHeight;
    return {
      valid,
      actualWidth: img.width,
      actualHeight: img.height,
    };
  } catch {
    return { valid: false };
  }
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: CALCULATE ALPHA COVERAGE
═══════════════════════════════════════════════════════════════ */

async function calculateAlphaCoverage(buffer: Buffer): Promise<number> {
  try {
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    let nonTransparentPixels = 0;
    const totalPixels = img.width * img.height;

    // Count pixels with alpha > 10 (not fully transparent)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) {
        nonTransparentPixels++;
      }
    }

    return nonTransparentPixels / totalPixels;
  } catch {
    return 1.0; // Assume worst case if failed
  }
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: DEBUG SAVE
═══════════════════════════════════════════════════════════════ */

async function debugSave(
  name: string,
  buffer: Buffer
): Promise<void> {
  if (process.env.DEBUG_SHADOW !== "true") return;

  const debugDir = "/tmp/shadow-debug";
  try {
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const filepath = path.join(debugDir, `${name}-${Date.now()}.png`);
    fs.writeFileSync(filepath, buffer);
    console.log(`[shadow-debug] Saved: ${filepath}`);
  } catch (err) {
    console.warn(`[shadow-debug] Failed to save ${name}:`, err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: CREATE PREVIEW IMAGE (BACKGROUND + PRODUCT)
═══════════════════════════════════════════════════════════════ */

/**
 * Create a preview composite of background + product centered.
 * Used to provide context to Gemini for shadow generation.
 */
export async function createPreviewComposite(
  backgroundDataUrl: string,
  productDataUrl: string,
  width: number = 1080,
  height: number = 1350
): Promise<Buffer> {
  const bgImg = await loadImage(backgroundDataUrl);
  const productImg = await loadImage(productDataUrl);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw background scaled to fill
  ctx.drawImage(bgImg, 0, 0, width, height);

  // Calculate product size and position (centered, max 60% of canvas)
  const maxProductWidth = width * 0.6;
  const maxProductHeight = height * 0.6;

  let productW = productImg.width;
  let productH = productImg.height;

  // Scale down if too large
  const scale = Math.min(
    maxProductWidth / productW,
    maxProductHeight / productH,
    1 // Don't scale up
  );

  productW = Math.round(productW * scale);
  productH = Math.round(productH * scale);

  // Center the product
  const productX = Math.round((width - productW) / 2);
  const productY = Math.round((height - productH) / 2);

  // Draw product
  ctx.drawImage(productImg, productX, productY, productW, productH);

  return canvas.toBuffer("image/png");
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: COMPOSITE SHADOW ONTO BACKGROUND
═══════════════════════════════════════════════════════════════ */

export async function compositeShadowOntoBackground(
  backgroundBuffer: Buffer,
  shadowBuffer: Buffer,
  opacity: number = 0.35
): Promise<Buffer> {
  const bgImg = await loadImage(backgroundBuffer);
  const shadowImg = await loadImage(shadowBuffer);

  const canvas = createCanvas(bgImg.width, bgImg.height);
  const ctx = canvas.getContext("2d");

  // Draw background
  ctx.drawImage(bgImg, 0, 0);

  // Apply shadow with multiply blend and opacity
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(shadowImg, 0, 0);

  // Reset
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  return canvas.toBuffer("image/png");
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION: GENERATE SHADOW LAYER
═══════════════════════════════════════════════════════════════ */

/**
 * Generate a transparent shadow layer using Gemini AI.
 *
 * @param args - Background buffer, preview buffer (bg+product), and dimensions
 * @returns Shadow buffer or null if generation failed
 */
export async function generateShadowLayerAI(
  args: GenerateShadowLayerArgs
): Promise<Buffer | null> {
  const startTime = Date.now();
  console.log(`[generateShadowLayerAI] Starting shadow generation (${args.width}x${args.height})…`);

  try {
    const client = getClient();

    // Convert buffers to base64
    const bgBase64 = args.backgroundBuffer.toString("base64");
    const previewBase64 = args.previewBuffer.toString("base64");

    // Debug save inputs
    await debugSave("preview", args.previewBuffer);

    // Call Gemini with multi-image input
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: SHADOW_PROMPT },
            {
              inlineData: {
                mimeType: "image/png",
                data: bgBase64,
              },
            },
            {
              inlineData: {
                mimeType: "image/png",
                data: previewBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const timeMs = Date.now() - startTime;

    // Extract response text
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    let responseText = "";

    for (const part of parts) {
      if ("text" in part && part.text) {
        responseText += part.text;
      }
    }

    if (!responseText) {
      console.warn(`[generateShadowLayerAI] Empty response from Gemini (${timeMs}ms)`);
      return null;
    }

    // Parse JSON
    let parsed: { shadow_png_base64?: string };
    try {
      // Clean potential markdown wrapper
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```\s*$/, "");
      }

      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn(`[generateShadowLayerAI] Failed to parse JSON response (${timeMs}ms)`);
      return null;
    }

    // Check for empty or missing base64
    if (!parsed.shadow_png_base64 || parsed.shadow_png_base64.trim() === "") {
      console.log(`[generateShadowLayerAI] Gemini returned empty shadow (${timeMs}ms)`);
      return null;
    }

    // Decode base64
    let shadowBuffer: Buffer;
    try {
      shadowBuffer = Buffer.from(parsed.shadow_png_base64, "base64");
    } catch {
      console.warn(`[generateShadowLayerAI] Invalid base64 data (${timeMs}ms)`);
      return null;
    }

    // Validate PNG header
    if (!validatePngHeader(shadowBuffer)) {
      console.warn(`[generateShadowLayerAI] Invalid PNG header (${timeMs}ms)`);
      return null;
    }

    // Validate dimensions
    const dimCheck = await validateDimensions(shadowBuffer, args.width, args.height);
    if (!dimCheck.valid) {
      console.warn(
        `[generateShadowLayerAI] Dimension mismatch: expected ${args.width}x${args.height}, ` +
        `got ${dimCheck.actualWidth}x${dimCheck.actualHeight} (${timeMs}ms)`
      );
      return null;
    }

    // Safety check: alpha coverage
    const alphaCoverage = await calculateAlphaCoverage(shadowBuffer);
    if (alphaCoverage > MAX_ALPHA_COVERAGE) {
      console.warn(
        `[generateShadowLayerAI] Alpha coverage too high: ${(alphaCoverage * 100).toFixed(1)}% > ${MAX_ALPHA_COVERAGE * 100}% (${timeMs}ms)`
      );
      return null;
    }

    // Debug save shadow
    await debugSave("shadow", shadowBuffer);

    console.log(
      `[generateShadowLayerAI] Shadow generated successfully ` +
      `(alpha=${(alphaCoverage * 100).toFixed(1)}%, ${timeMs}ms)`
    );

    return shadowBuffer;
  } catch (err: any) {
    const timeMs = Date.now() - startTime;
    console.error(`[generateShadowLayerAI] Error: ${err?.message} (${timeMs}ms)`);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   BARREL EXPORT: Extended result with timing
═══════════════════════════════════════════════════════════════ */

/**
 * Generate shadow layer with full result metadata
 */
export async function generateShadowLayerAIWithResult(
  args: GenerateShadowLayerArgs
): Promise<ShadowLayerResult> {
  const startTime = Date.now();

  try {
    const shadowBuffer = await generateShadowLayerAI(args);
    const timeMs = Date.now() - startTime;

    if (shadowBuffer) {
      const alphaCoverage = await calculateAlphaCoverage(shadowBuffer);
      return {
        shadowBuffer,
        alphaCoverage,
        timeMs,
      };
    }

    return {
      shadowBuffer: null,
      error: "Failed to generate shadow",
      timeMs,
    };
  } catch (err: any) {
    return {
      shadowBuffer: null,
      error: err?.message ?? "Unknown error",
      timeMs: Date.now() - startTime,
    };
  }
}
