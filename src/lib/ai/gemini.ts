import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { ABSOLUTE_RULES_SCENE, ABSOLUTE_RULES_PRODUCT_INJECT, ABSOLUTE_RULES_TEXT_PRESERVATION, ABSOLUTE_RULES_PRODUCT, ABSOLUTE_RULES_BACKGROUND } from "./promptRules";
import { getLibrarySection, type ImageBriefType } from "./promptLibrary";

const MODEL_NANO_BANANA = "gemini-2.5-flash-image";

/** Semaphore to limit concurrent Gemini API calls and avoid mass timeouts */
const GEMINI_MAX_CONCURRENT = 2;
let _geminiActive = 0;
const _geminiQueue: Array<() => void> = [];

async function acquireGeminiSlot(): Promise<void> {
  if (_geminiActive < GEMINI_MAX_CONCURRENT) {
    _geminiActive++;
    return;
  }
  return new Promise<void>((resolve) => {
    _geminiQueue.push(() => {
      _geminiActive++;
      resolve();
    });
  });
}

function releaseGeminiSlot(): void {
  _geminiActive--;
  const next = _geminiQueue.shift();
  if (next) next();
}

function getClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toUpperCase();
  return (
    normalized.includes('"STATUS":"INTERNAL"') ||
    normalized.includes('"CODE":500') ||
    normalized.includes("INTERNAL ERROR") ||
    normalized.includes("UNAVAILABLE") ||
    normalized.includes("DEADLINE_EXCEEDED") ||
    normalized.includes("RESOURCE_EXHAUSTED") ||
    normalized.includes("429") ||
    normalized.includes("503") ||
    // Timeouts propios (withTimeout) y errores de red son transitorios y merecen reintento
    normalized.includes("GEMINI TIMEOUT") ||
    normalized.includes("FETCH FAILED") ||
    normalized.includes("NETWORK")
  );
}

function findImagePart(response: any) {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    const imagePart = parts.find((part: any) => part?.inlineData?.data);
    if (imagePart) return imagePart;
  }
  return null;
}

function collectTextParts(response: any): string {
  const candidates = response?.candidates ?? [];
  const chunks: string[] = [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim().length > 0) {
        chunks.push(part.text.trim());
      }
    }
  }
  return chunks.join("\n");
}

/** Hard timeout per individual Gemini call.
 * Set to 80s so we can fit 2 retries within the 180s route limit.
 * Normal Gemini image generation takes 30-60s; if it hasn't responded by 80s it's stuck. */
const GEMINI_CALL_TIMEOUT_MS = 80_000;

/**
 * Compress a background buffer to JPEG before sending to Gemini.
 * Reduces size from ~2MB PNG → ~80-150KB JPEG, cutting upload time significantly.
 */
async function compressBgForGemini(buf: Buffer): Promise<{ data: string; mimeType: string }> {
  const compressed = await sharp(buf)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { data: compressed.toString("base64"), mimeType: "image/jpeg" };
}

/**
 * Compress a product buffer to PNG before sending to Gemini.
 * Keeps PNG to preserve transparency; resizes to max 768px.
 */
async function compressProductForGemini(buf: Buffer): Promise<{ data: string; mimeType: string }> {
  const compressed = await sharp(buf)
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toBuffer();
  return { data: compressed.toString("base64"), mimeType: "image/png" };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Gemini timeout: ${label} tardó más de ${ms / 1000}s`)),
      ms,
    );
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  request: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  options: { maxAttempts?: number; baseDelayMs?: number; timeoutMs?: number } = {},
) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? GEMINI_CALL_TIMEOUT_MS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await acquireGeminiSlot();
    try {
      const result = await withTimeout(
        ai.models.generateContent(request),
        timeoutMs,
        `intento ${attempt}/${maxAttempts}`,
      );
      releaseGeminiSlot();
      return result;
    } catch (error) {
      releaseGeminiSlot();
      lastError = error;
      console.error(`[gemini] Error en intento ${attempt}/${maxAttempts}:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      const shouldRetry = attempt < maxAttempts && isTransientGeminiError(error);
      if (!shouldRetry) break;
      // Exponential backoff with large jitter to stagger parallel retries
      const jitter = Math.floor(Math.random() * 3000);
      await sleep(baseDelayMs * Math.pow(2, attempt - 1) + jitter);
    }
  }

  throw lastError;
}

export async function nanoBananaInjectProduct(args: {
  backgroundPng: Buffer;
  productPng: Buffer;
  prompt: string;
  aspectRatio?: string;
}): Promise<Buffer> {
  const ai = getClient();

  // Compress before upload — reduces ~4MB total to ~250-500KB, cuts Gemini latency
  const [bg, product] = await Promise.all([
    compressBgForGemini(args.backgroundPng),
    compressProductForGemini(args.productPng),
  ]);

  const MAX_ATTEMPTS = 3;
  let lastTextResponse = "";

  console.log(`[gemini:nanoBananaInjectProduct] model=${MODEL_NANO_BANANA} prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // generateContentWithRetry handles transient network/API errors internally.
    // This outer loop retries the "no image returned" case (safety filter, model refusal, etc.)
    const response = await generateContentWithRetry(ai, {
      model: MODEL_NANO_BANANA,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: bg.mimeType, data: bg.data } },
            { inlineData: { mimeType: product.mimeType, data: product.data } },
            { text: args.prompt },
          ],
        },
      ],
      config: {
        imageConfig: {
          aspectRatio: args.aspectRatio ?? "1:1",
          imageSize: "1K",
        },
        responseModalities: ["IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inlineData?.data);

    if (imgPart?.inlineData?.data) {
      return Buffer.from(imgPart.inlineData.data as string, "base64");
    }

    // Gemini returned a response but no image — capture any text explanation and retry
    lastTextResponse = parts.map((p: any) => p.text).filter(Boolean).join("\n");
    if (attempt < MAX_ATTEMPTS) {
      await sleep(600 * attempt);
    }
  }

  throw new Error(lastTextResponse || "Gemini no devolvió imagen editada.");
}

export async function generateBackground(args: {
  prompt: string;
  aspectRatio?: string;
}): Promise<Buffer> {
  const ai = getClient();
  const MAX_ATTEMPTS = 3;
  let lastTextResponse = "";

  console.log(`[gemini:generateBackground] model=${MODEL_NANO_BANANA} prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);

  // Prefix ensures Gemini treats this as an image generation task, not a conversation
  const imagePrompt = `Generate an image: ${args.prompt}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // generateContentWithRetry handles transient network/API errors internally.
    // This outer loop retries the "no image returned" case (safety filter, model refusal, etc.)
    const response = await generateContentWithRetry(ai, {
      model: MODEL_NANO_BANANA,
      contents: [
        {
          role: "user",
          parts: [{ text: imagePrompt }],
        },
      ],
      config: {
        imageConfig: {
          aspectRatio: args.aspectRatio ?? "1:1",
          imageSize: "1K",
        },
        responseModalities: ["IMAGE"],
      },
    });

    const imagePart = findImagePart(response);
    if (imagePart?.inlineData?.data) {
      return Buffer.from(imagePart.inlineData.data as string, "base64");
    }

    lastTextResponse = collectTextParts(response);
    // Log safety/block diagnostics when no image is returned
    const candidates = response?.candidates ?? [];
    const finishReason = candidates[0]?.finishReason ?? "NO_CANDIDATES";
    const safetyRatings = candidates[0]?.safetyRatings ?? [];
    const promptFeedback = (response as any)?.promptFeedback;
    const blockReason = promptFeedback?.blockReason ?? "none";
    console.warn(
      `[gemini:generateBackground] Sin imagen en intento ${attempt}/${MAX_ATTEMPTS}.`,
      `finishReason=${finishReason} blockReason=${blockReason}`,
      `safetyRatings=${JSON.stringify(safetyRatings).slice(0, 300)}`,
      `text=${lastTextResponse.slice(0, 200)}`,
    );
    if (attempt < MAX_ATTEMPTS) {
      await sleep(600 * attempt);
    }
  }

  throw new Error(lastTextResponse || "Gemini no devolvió imagen de fondo.");
}

export async function generateScene(args: {
  backgroundPng: Buffer;
  prompt: string;
  aspectRatio?: string;
}): Promise<Buffer> {
  const ai = getClient();

  const bg = await compressBgForGemini(args.backgroundPng);

  console.log(`[gemini:generateScene] model=${MODEL_NANO_BANANA} prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);
  const response = await generateContentWithRetry(ai, {
    model: MODEL_NANO_BANANA,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: bg.mimeType, data: bg.data } },
          { text: args.prompt },
        ],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: args.aspectRatio ?? "1:1",
        imageSize: "1K",
      },
      responseModalities: ["IMAGE"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p: any) => p.inlineData?.data);
  if (!imgPart?.inlineData?.data) {
    const text = parts.map((p: any) => p.text).filter(Boolean).join("\n");
    throw new Error(text || "Gemini no devolvió imagen de escena.");
  }
  return Buffer.from(imgPart.inlineData.data as string, "base64");
}

/**
 * Generates an advertising scene where a real person (from an avatar reference)
 * is placed in a background, naturally holding a product.
 *
 * Sends THREE images to Gemini:
 *   Image 1 — background scene
 *   Image 2 — product to be held
 *   Image 3 — avatar (reference for the person's appearance)
 *
 * The creative brief comes from the template's defaultProductPrompt (passed as `prompt`).
 */
export async function generateSceneWithAvatarAndProduct(args: {
  backgroundPng: Buffer;
  productPng: Buffer;
  avatarPng: Buffer;
  prompt: string;
  aspectRatio?: string;
}): Promise<Buffer> {
  const ai = getClient();

  const [bg, product, avatar] = await Promise.all([
    compressBgForGemini(args.backgroundPng),
    compressProductForGemini(args.productPng),
    compressProductForGemini(args.avatarPng),
  ]);

  const MAX_ATTEMPTS = 3;
  let lastText = "";

  console.log(`[gemini:generateSceneWithAvatarAndProduct] model=${MODEL_NANO_BANANA} prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await generateContentWithRetry(ai, {
      model: MODEL_NANO_BANANA,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: bg.mimeType, data: bg.data } },
            { inlineData: { mimeType: product.mimeType, data: product.data } },
            { inlineData: { mimeType: avatar.mimeType, data: avatar.data } },
            { text: args.prompt },
          ],
        },
      ],
      config: {
        imageConfig: {
          aspectRatio: args.aspectRatio ?? "1:1",
          imageSize: "1K",
        },
        responseModalities: ["IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inlineData?.data);

    if (imgPart?.inlineData?.data) {
      return Buffer.from(imgPart.inlineData.data as string, "base64");
    }

    lastText = parts.map((p: any) => p.text).filter(Boolean).join("\n");
    if (attempt < MAX_ATTEMPTS) await sleep(600 * attempt);
  }

  throw new Error(lastText || "Gemini no devolvió imagen de escena con avatar y producto.");
}

/**
 * Generates a generic/unbranded version of a product using Gemini vision.
 * Gemini analyses the original product shape, form factor and proportions,
 * then creates a new clean version with NO text/logos/labels and neutral gray tones.
 * Returns a PNG buffer with the product on a pure-white background.
 */
export async function generateGenericProduct(args: {
  productPng: Buffer;
}): Promise<Buffer> {
  const ai = getClient();

  const prompt = `Analyze the product in this image carefully. Your task is to generate a NEW image of a generic, unbranded version of this EXACT same product.

CRITICAL REQUIREMENTS:
1. SHAPE: The generic product MUST have the EXACT SAME 3D shape, form factor, size, proportions, and material as the original. If it's a jar, generate a jar. If it's a bottle, generate a bottle. Same cap style, same body shape.
2. NO BRANDING: REMOVE ALL text, logos, labels, brand names, and any printed graphics. Every surface must be completely smooth, clean, and blank.
3. COLOR: Use ONLY neutral light-gray tones (#C0C0C0 to #D8D8D8). No colors from the original — everything must be neutral medium gray.
4. 3D QUALITY: The product MUST look SOLID and REAL with:
   - Strong, visible shadows and ambient occlusion ONLY directly beneath the product
   - Clear specular highlights on curved surfaces
   - Visible material texture (matte plastic, glass, metal — match the original material)
   - Full volumetric 3D depth — it must NOT look flat or ghostly
5. BACKGROUND: The background MUST be PURE WHITE (#FFFFFF). Completely solid white with no gradients, no textures, no patterns. The product should clearly contrast against the white.
6. COMPOSITION: Product centered, occupying roughly 60-70% of the frame. One small tight contact shadow directly under the base — NO spreading shadow beyond the product footprint.
7. NOTHING ELSE: No text, no labels, no watermarks, no decorations, no additional objects. ONLY the gray product on white.
8. LIGHTING: Use clean studio lighting — soft diffuse from the left, subtle fill from the right. The product must be well-lit with clear form definition.
9. Think of it as a factory prototype before labeling — a real physical object, just without any branding applied yet.
10. CRITICAL EDGE RULE: The product silhouette MUST have a PERFECTLY SHARP, CLEAN boundary against the white background. ABSOLUTELY NO soft glow, NO ambient haze, NO blur, NO feathering extending beyond the product shape. The edge where product meets white background must be a hard, crisp line. Every pixel outside the product silhouette must be exactly #FFFFFF white.`;

  console.log(`[gemini:generateGenericProduct] model=${MODEL_NANO_BANANA} prompt_chars=${prompt.length}\n${prompt.slice(0, 300)}`);
  const response = await generateContentWithRetry(ai, {
    model: MODEL_NANO_BANANA,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: args.productPng.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
      responseModalities: ["IMAGE"],
    },
  });

  const imagePart = findImagePart(response);
  if (!imagePart?.inlineData?.data) {
    const text = collectTextParts(response);
    throw new Error(text || "Gemini no devolvió imagen de producto genérico.");
  }

  return Buffer.from(imagePart.inlineData.data as string, "base64");
}

/**
 * Analyzes a generated scene and returns the bounding box of the product being held.
 * Used to overlay the original product PNG at the exact position for pixel-perfect fidelity.
 * Returns null if detection fails.
 */
export async function detectProductBoundingBox(args: {
  scenePng: Buffer;
  productPng: Buffer;
}): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const ai = getClient();

  const scene = await compressBgForGemini(args.scenePng);
  const product = await compressProductForGemini(args.productPng);

  const prompt = `You are analyzing an advertising image.
Image 1: a scene of a person holding a product
Image 2: the reference product (what the person should be holding)

Identify the EXACT bounding box of the product the person is holding in Image 1.

Return ONLY a JSON object. All values are fractions from 0.0 to 1.0 relative to image dimensions:
{"x": <left edge>, "y": <top edge>, "width": <product width>, "height": <product height>}

No explanation. No markdown. Only the JSON.`;

  console.log(`[gemini:detectProductBoundingBox] model=${MODEL_NANO_BANANA}`);
  const response = await generateContentWithRetry(ai, {
    model: MODEL_NANO_BANANA,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: scene.mimeType, data: scene.data } },
        { inlineData: { mimeType: product.mimeType, data: product.data } },
        { text: prompt },
      ],
    }],
  });

  const raw = response.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join("") ?? "";

  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const bbox = JSON.parse(cleaned);
    if (
      typeof bbox.x === "number" && typeof bbox.y === "number" &&
      typeof bbox.width === "number" && typeof bbox.height === "number" &&
      bbox.x >= 0 && bbox.y >= 0 && bbox.width > 0 && bbox.height > 0 &&
      bbox.x + bbox.width <= 1.1 && bbox.y + bbox.height <= 1.1
    ) {
      return bbox;
    }
    console.warn("[detectProductBoundingBox] Invalid bbox values:", bbox);
    return null;
  } catch {
    console.warn("[detectProductBoundingBox] Failed to parse bbox:", raw.slice(0, 200));
    return null;
  }
}

export interface CreativeAnalysisResult {
  overallScore: number;
  aspects: {
    visualQuality:    { score: number; feedback: string };
    messageClarity:   { score: number; feedback: string };
    productPresence:  { score: number; feedback: string };
    spellingGrammar:  { score: number; feedback: string };
    imageCoherence:   { score: number; feedback: string };
  };
  criticalIssues: string[];
  highlights: string[];
  summary: string;
}

/**
 * Analyzes a generated creative image and its copy, returning a quality score
 * and detailed feedback across 5 dimensions.
 */
export async function analyzeCreativeQuality(args: {
  creativePng: Buffer;
  productPng?: Buffer;
  copy: Record<string, unknown>;
}): Promise<CreativeAnalysisResult> {
  const ai = getClient();

  const creative = await compressBgForGemini(args.creativePng);
  const product = args.productPng ? await compressProductForGemini(args.productPng) : null;

  const copyText = Object.entries(args.copy)
    .filter(([, v]) => v !== undefined && v !== null && typeof v !== "object")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `Eres un experto en creatividad publicitaria y diseño de ads digitales para redes sociales.
Analiza este creativo publicitario considerando tanto la imagen como los textos del copy.${product ? "\nImage 1: el creativo final. Image 2: el producto de referencia." : ""}

Devuelve ÚNICAMENTE un objeto JSON con este formato exacto (sin markdown, sin explicación):
{
  "overallScore": <número del 1 al 10 con un decimal>,
  "aspects": {
    "visualQuality":   { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "messageClarity":  { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "productPresence": { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "spellingGrammar": { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "imageCoherence":  { "score": <1-10>, "feedback": "<1 oración concisa en español>" }
  },
  "criticalIssues": ["<solo si hay errores graves: faltas ortográficas, producto ausente, texto cortado, persona deformada>"],
  "highlights": ["<1-3 puntos genuinamente positivos del creativo>"],
  "summary": "<resumen ejecutivo en 2 oraciones en español>"
}

TEXTOS DEL CREATIVO:
${copyText}

CRITERIOS DE EVALUACIÓN:
- visualQuality: composición visual, iluminación, que la persona se vea natural y no generada artificialmente, calidad general de la imagen
- messageClarity: ¿el headline y el subheadline comunican claramente el beneficio principal? ¿son convincentes?
- productPresence: ¿el producto es visible en la imagen, reconocible y coherente con el producto de referencia? ¿está correctamente integrado?
- spellingGrammar: revisa TODOS los textos por errores ortográficos, tildes faltantes, errores gramaticales, puntuación incorrecta
- imageCoherence: ¿la persona/avatar se ve natural en el contexto del fondo? ¿la iluminación es coherente? ¿hay elementos incongruentes?

Sé preciso y honesto. Un score de 10 es excepcional, 7-8 es bueno, 5-6 es aceptable, <5 tiene problemas importantes.`;

  console.log(`[gemini:analyzeCreativeQuality] model=${MODEL_NANO_BANANA} copy_fields=${Object.keys(args.copy).length}`);

  const parts: object[] = [
    { inlineData: { mimeType: creative.mimeType, data: creative.data } },
  ];
  if (product) {
    parts.push({ inlineData: { mimeType: product.mimeType, data: product.data } });
  }
  parts.push({ text: prompt });

  const response = await generateContentWithRetry(ai, {
    model: MODEL_NANO_BANANA,
    contents: [{ role: "user", parts }],
  });

  const raw = response.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join("") ?? "";

  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const result = JSON.parse(cleaned) as CreativeAnalysisResult;
    if (typeof result.overallScore !== "number" || !result.aspects) {
      throw new Error("Invalid analysis shape");
    }
    return result;
  } catch {
    throw new Error(`analyzeCreativeQuality: invalid JSON from Gemini: ${raw.slice(0, 200)}`);
  }
}

export async function generateTemplateCopy(args: {
  product: string;
  offer: string;
  targetAudience: string;
  problem: string;
  tone: string;
  templateSchema: string[];
}): Promise<Record<string, unknown>> {
  const ai = getClient();

  const prompt = `You are an expert advertising copywriter specialized in direct response marketing in Spanish, specifically from Argentina.

Generate copy for a visual advertising template that needs these specific fields: ${args.templateSchema.join(", ")}

USER INFO:
- Product: ${args.product}
- Main offer: ${args.offer}
- Target audience: ${args.targetAudience}
- Problem it solves: ${args.problem}
- Tone: ${args.tone}

FIELD RULES:
- title: 3-5 keywords separated by ' · ' max 50 chars
- headline: max 6 words, emotional, ends with period
- subheadline: 1-2 sentences, max 120 chars, benefit-focused
- badge: short offer pill format, max 35 chars
- bullets: array of 3 items, max 40 chars each, start with relevant emoji
- backgroundPrompt: English prompt following this structure:
  '[surface/environment], [lighting], [color palette], soft shadows, no text, no objects, no people, editorial photography style, photorealistic'

Return ONLY a valid JSON object with exactly the fields requested. No markdown, no explanation, no extra text.`;

  console.log(`[gemini:generateTemplateCopy] model=gemini-3.1-flash-image-preview prompt_chars=${prompt.length}\n${prompt.slice(0, 300)}`);
  const response = await generateContentWithRetry(ai, {
    model: "gemini-3.1-flash-image-preview", // was: "gemini-3.1-flash-image-preview-image"
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = response.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join("") ?? "";

  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Invalid JSON from Gemini: ${raw.slice(0, 200)}`);
  }
}

/**
 * Generates a visual image brief using Gemini Flash (text-only, fast).
 * Uses curated prompt libraries as few-shot examples so the output
 * matches the expected style and specificity for each template type.
 *
 * Template types:
 *   "product-only"   → product placed in background, no person
 *   "scene-only"     → person/lifestyle scene, no product visible
 *   "person-product" → person actively holding/using the product
 *
 * Returns a single prompt string ready to be passed to Gemini image generation.
 */
export async function generateImageBriefGemini(args: {
  product: string;
  productCategory: string;
  tone: string;
  briefType: ImageBriefType;
  copyZone?: string;
  businessProfile?: {
    nombre?: string;
    clienteIdeal?: string;
  };
}): Promise<string> {
  const ai = getClient();

  const library = getLibrarySection(args.briefType, args.productCategory);

  const productZone =
    args.copyZone === "right"  ? "left"   :
    args.copyZone === "left"   ? "right"  :
    args.copyZone === "top"    ? "bottom" :
    args.copyZone === "bottom" ? "top"    :
                                 "right";
  const copyZone = args.copyZone ?? "left";

  const brandContext = args.businessProfile?.nombre || args.businessProfile?.clienteIdeal
    ? `Brand: ${args.businessProfile.nombre || ""}. Ideal client: ${args.businessProfile.clienteIdeal || ""}.`
    : "";

  const prompt = `You are a visual prompt engineer specializing in advertising photography direction for Gemini AI image generation.

Your task: generate ONE highly specific visual prompt for a "${args.briefType}" advertising image EDITING operation.

CRITICAL CONTEXT — THIS IS AN EDIT, NOT A NEW GENERATION:
Gemini will receive an EXISTING advertising image and must ADD the subject/product to it.
The canvas has two zones:
- PRODUCT ZONE (${productZone} side): where the subject/product must be placed.
- COPY ZONE (${copyZone} side): contains pre-rendered advertising text, headlines, badges, and graphic elements that are ALREADY in the image. This area is LOCKED. NEVER describe it as "clean", "empty", "clear", or "untouched" — those words may cause the model to erase content. Instead always write: "DO NOT modify or touch the ${copyZone} side."

CONTEXT:
- Product: ${args.product}
- Category: ${args.productCategory}
- Advertising tone: ${args.tone}
${brandContext}

REFERENCE EXAMPLES — follow this style and level of specificity exactly:
${library}

Instructions:
1. Find the example that best matches the category and tone above
2. Adapt it to the actual product — keep the same photographic detail and structure
3. Place the subject/product on the ${productZone} side
4. End the brief with these exact rules (adapt side names to match):
   "${productZone} side only. DO NOT modify or touch the ${copyZone} side — it contains pre-rendered advertising copy that must remain exactly as-is.
   ${ABSOLUTE_RULES_TEXT_PRESERVATION}
   ${ABSOLUTE_RULES_PRODUCT}
   ${ABSOLUTE_RULES_BACKGROUND}"
5. Output ONLY the prompt text — no labels, no explanation, no markdown`;

  console.log(`[gemini:generateImageBriefGemini] model=gemini-2.0-flash briefType=${args.briefType} category=${args.productCategory}`);

  const response = await generateContentWithRetry(ai, {
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p.text).filter(Boolean).join("").trim();

  if (!text) throw new Error("generateImageBriefGemini: empty response from Gemini Flash");
  return text;
}

/**
 * Expands a short sceneAction (from OpenAI) into a full cinematic prompt.
 *
 * OpenAI generates diverse short scene descriptions per variant (e.g.
 * "Man in gym, defeated, head down on bench"). This function takes that
 * seed and expands it into a detailed, photographic-quality prompt using
 * the scene-only library as style reference.
 *
 * Called once per variant — each gets its own expanded prompt.
 */
export async function expandSceneBrief(args: {
  sceneAction: string;
  product: string;
  productCategory: string;
  tone: string;
  copyZone?: string;
  fullBleed?: boolean;
  backgroundPrompt?: string;
  businessProfile?: {
    nombre?: string;
    clienteIdeal?: string;
  };
}): Promise<string> {
  const ai = getClient();

  const library = getLibrarySection("scene-only", args.productCategory);

  const brandContext = args.businessProfile?.nombre || args.businessProfile?.clienteIdeal
    ? `Brand: ${args.businessProfile.nombre || ""}. Ideal client: ${args.businessProfile.clienteIdeal || ""}.`
    : "";

  // Full-bleed: the background is pre-generated separately. The expanded prompt must describe
  // ONLY the person (appearance, pose, expression, clothing) — NOT the environment/setting,
  // because Gemini will receive the pre-generated background as Image 1 and must composite
  // the person INTO it without altering the background.
  const fullBleedInstructions = args.fullBleed
    ? `
CRITICAL — FULL-BLEED COMPOSITE MODE:
A dark cinematic background has ALREADY been generated separately${args.backgroundPrompt ? ` ("${args.backgroundPrompt}")` : ""}.
Gemini will receive that background as an image and must ADD the person to it.
Therefore your prompt must describe ONLY THE PERSON — do NOT describe any environment, room,
setting, furniture, surfaces, or background elements. The background is already done.
Focus exclusively on: the person's appearance, clothing, pose, body language, expression,
and how lighting falls on them (matching a dark cinematic scene).
DO NOT mention kitchens, bathrooms, living rooms, counters, mirrors, gyms, or any setting.
The person should look like they BELONG in a dark, moody, cinematic environment.`
    : "";

  const environmentInstruction = args.fullBleed
    ? `   - Do NOT describe any environment, room, setting, or background — the background is pre-generated
   - Describe lighting ON THE PERSON only (matching dark cinematic mood)`
    : `   - Environment details: textures, props, depth of field, atmosphere`;

  const prompt = `You are a visual prompt engineer specializing in cinematic advertising photography direction.

Your task: expand a SHORT scene description into a FULL, hyper-detailed visual prompt for Gemini AI image generation.
${fullBleedInstructions}

SHORT SCENE DESCRIPTION (from the creative director):
"${args.sceneAction}"

CONTEXT:
- Product category: ${args.productCategory}
- Advertising tone: ${args.tone}
- Product: ${args.product}
${brandContext}

REFERENCE EXAMPLES — match this level of cinematic detail and specificity:
${library}

Instructions:
1. Take the short scene description above and EXPAND it into a rich, cinematic visual prompt
2. Keep the EXACT scenario, setting, and emotion from the short description — do NOT change the concept
3. Add these details that the short description is missing:
   - Exact person description: age range, clothing, body type, hair
   - Precise body language and micro-expressions
   - Specific lighting setup: key light source, direction, color temperature, shadows
${environmentInstruction}
   - Camera/framing: lens feel, depth, composition
4. The person fills the ENTIRE canvas edge-to-edge (full-bleed cinematic portrait)
5. Face should be positioned in the CENTER or CENTER-LOWER area of the canvas (NOT in the top 25%)
6. ANATOMY RULE: The person must have EXACTLY two arms and two hands — correct human anatomy is mandatory. Never describe extra limbs.
7. End with: "4K photorealistic. No text, no logos, no products."
8. Output ONLY the prompt text — no labels, no explanation, no markdown
9. Max 80 words — be dense and specific, not verbose`;

  console.log(`[gemini:expandSceneBrief] model=gemini-2.0-flash category=${args.productCategory} scene="${args.sceneAction.slice(0, 60)}..."`);

  const response = await generateContentWithRetry(ai, {
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p.text).filter(Boolean).join("").trim();

  if (!text) throw new Error("expandSceneBrief: empty response from Gemini Flash");
  return text;
}
