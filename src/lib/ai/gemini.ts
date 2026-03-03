import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const MODEL_NANO_BANANA = "gemini-3.1-flash-image-preview";

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

/** Hard timeout per individual Gemini call — prevents indefinite hangs */
const GEMINI_CALL_TIMEOUT_MS = 150_000; // 150 seconds (API suele tardar 90s bajo carga)

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
  const baseDelayMs = options.baseDelayMs ?? 450;
  const timeoutMs = options.timeoutMs ?? GEMINI_CALL_TIMEOUT_MS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(
        ai.models.generateContent(request),
        timeoutMs,
        `intento ${attempt}/${maxAttempts}`,
      );
    } catch (error) {
      lastError = error;
      console.error(`[gemini] Error en intento ${attempt}/${maxAttempts}:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      const shouldRetry = attempt < maxAttempts && isTransientGeminiError(error);
      if (!shouldRetry) break;
      const jitter = Math.floor(Math.random() * 120);
      await sleep(baseDelayMs * attempt + jitter);
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
  primaryColor?: string;
  backgroundColorHint?: string;
  /** true = send the prompt to Gemini exactly as-is, without any role wrapper or rules */
  rawMode?: boolean;
}): Promise<Buffer> {
  const ai = getClient();

  let builtPrompt: string;

  if (args.rawMode) {
    // Template has rawBackgroundPrompt: true — trust the prompt completely, no wrapper
    builtPrompt = args.prompt;
  } else {
    const colorInstruction = args.backgroundColorHint
      ? `\n\nCOLOR ADJUSTMENT: Shift the palette so that "${args.backgroundColorHint}" becomes the dominant tone. Keep all other details — lighting, textures, surfaces, composition — exactly as described above. The result must remain compatible with dark typography.`
      : args.primaryColor
      ? `\n\nCOLOR ACCENT: The brand's primary color is ${args.primaryColor} — incorporate it as a subtle tonal presence while keeping overall tones light and compatible with dark typography.`
      : "";

    // gemini.ts sets the professional role and absolute prohibitions.
    // The creative brief comes entirely from the template's defaultBackgroundPrompt.
    builtPrompt = `You are a senior advertising art director and product photographer creating premium commercial background imagery for a digital ad.

CREATIVE BRIEF:
${args.prompt}${colorInstruction}

ABSOLUTE RULES — these are non-negotiable and override nothing in the brief, they simply exclude:
- No text, letters, numbers, words, or typography of any kind
- No people, faces, hands, or body parts
- No finished products, bottles, jars, tubes, packaging, or branded objects`;
  }

  const fallbackPrompt = "You are a senior advertising art director. Generate a clean, minimal photorealistic background for a product ad — soft gradient, studio lighting. No text, no people, no products, no packaging.";

  let lastModelText = "";
  for (const prompt of [builtPrompt, fallbackPrompt]) {
    console.log(`[gemini:generateBackground] model=${MODEL_NANO_BANANA} prompt_chars=${prompt.length}\n${prompt.slice(0, 300)}`);
    const response = await generateContentWithRetry(ai, {
      model: MODEL_NANO_BANANA,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
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

    const text = collectTextParts(response);
    if (text) lastModelText = text;
  }

  throw new Error(lastModelText || "Gemini no devolvió imagen de fondo.");
}

export async function generateScene(args: {
  backgroundPng: Buffer;
  prompt: string;
  aspectRatio?: string;
  zoneHint?: "left" | "right" | "top" | "bottom" | "center";
}): Promise<Buffer> {
  const ai = getClient();

  // Build zone-specific placement instructions based on where the TEXT lives.
  // zoneHint tells us where the COPY is, so the person goes on the OTHER side.
  // Margins are intentionally conservative: keep person well inside the scene zone
  // so the feathered blend (applied after) never touches the subject.
  let zonePlacement: string;
  switch (args.zoneHint) {
    case "right":
      zonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the LEFT 42% of the image (left edge to 42% width).
- A clear gap of at least 8% must exist between the right edge of the person and the center line.
- The RIGHT 58% of the image must remain COMPLETELY UNCHANGED — no person, no arm, no hair, no shadow, no alteration of any kind.`;
      break;
    case "top":
      zonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned STRICTLY in the BOTTOM 45% of the image ONLY (below 55% vertical).
- The person's head (top of hair) must NOT go above the 55% vertical line of the image.
- The person MUST be CENTERED HORIZONTALLY.
- The TOP 55% of the image MUST remain COMPLETELY UNTOUCHED — all existing text and decorations preserved pixel-perfect.`;
      break;
    case "bottom":
      zonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the TOP 42% of the image.
- The BOTTOM 58% must remain exactly as the background — no person, no shadow extending there.`;
      break;
    case "center":
      zonePlacement = `PLACEMENT ZONE — guidance:
- The person can be placed centrally, but should be large and prominent.
- Keep the overall composition balanced. Avoid covering any existing text or graphic elements.`;
      break;
    case "left":
    default:
      zonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the RIGHT 42% of the image (from 58% to 100% width).
- A clear gap of at least 8% must exist between the left edge of the person and the center line.
- The LEFT 58% of the image must remain COMPLETELY UNCHANGED — no person, no arm, no hair, no shadow, no alteration of any kind.`;
      break;
  }

  // For zoneHint="top" (testimonio-review), allow the person to hold a product naturally.
  // For all other zones, hands must be empty (product is composited separately via Sharp).
  const holdingRule = args.zoneHint === "top"
    ? `- The person CAN hold a small beauty/wellness product naturally in their hands — this is intentional and expected.`
    : `- DO NOT show anything being held. The person's hands must be empty or in a natural resting pose.`;

  const wrappedPrompt = `You are a professional advertising image compositor. Your task is to add a person to a background scene.

STEP 1 — ANALYZE THE IMAGE FIRST:
Before making any changes, examine the background image carefully and identify:
• Where existing text, labels, badges, icons, or graphic elements are located — these are protected zones, the person must NEVER overlap them
• Where the open, empty space is available for placing the person
• The dominant lighting direction and color temperature of the scene

STEP 2 — COMPOSE WITH PRECISION:
${args.prompt}

${zonePlacement}

ABSOLUTE RULES — violation is not acceptable:
- DO NOT add any product, bottle, jar, tube, dropper, or package UNLESS the prompt explicitly asks for it.
${holdingRule}
- DO NOT add text, logos, watermarks, or labels.
- DO NOT cover, blur, distort, or overlap ANY existing text, stars, icons, or graphic elements in the background — they must remain 100% visible and legible.
- DO NOT alter, recolor, brighten, darken, or modify ANY part of the background — only add the person.
- The person must be FULLY OPAQUE and SOLIDLY VISIBLE — do NOT apply fading, dissolving, transparency, or soft disappearance to any part of the person. The person should look physically present with clear edges.
- Lighting must match the existing background naturally.
- The scene must feel authentic and warm, not overly commercial.`;

  console.log(`[gemini:generateScene] model=${MODEL_NANO_BANANA} prompt_chars=${wrappedPrompt.length}\n${wrappedPrompt.slice(0, 300)}`);
  const response = await generateContentWithRetry(ai, {
    model: MODEL_NANO_BANANA,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: args.backgroundPng.toString("base64") } },
          { text: wrappedPrompt },
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
  copyZone?: "left" | "right" | "top" | "bottom" | "center";
}): Promise<Buffer> {
  const ai = getClient();

  const [bg, product, avatar] = await Promise.all([
    compressBgForGemini(args.backgroundPng),
    compressProductForGemini(args.productPng),
    compressProductForGemini(args.avatarPng),
  ]);

  // Zone-specific constraint — stated prominently at the TOP of the prompt so Gemini prioritizes it.
  const zonePercent =
    args.copyZone === "right" ? "LEFT 42%" :
    args.copyZone === "top"   ? "BOTTOM 45%" :
    args.copyZone === "bottom"? "TOP 42%"    :
                                "RIGHT 42%";

  const zoneCleanSide =
    args.copyZone === "right"
      ? "RIGHT 58% must be COMPLETELY CLEAN — no person, no arm, no hair, no shadow"
      : args.copyZone === "top"
      ? "TOP 55% must be COMPLETELY CLEAN — no person, no arm, no shadow entering from above"
      : args.copyZone === "bottom"
      ? "BOTTOM 58% must be COMPLETELY CLEAN — no person, no arm, no shadow"
      : "LEFT 58% must be COMPLETELY CLEAN — no person, no arm, no hair, no shadow";

  const zoneBodyPosition =
    args.copyZone === "right"
      ? "centered horizontally within the left 30–40% of the canvas"
      : args.copyZone === "top"
      ? "centered horizontally in the lower canvas, body starting at or below 58% from top"
      : args.copyZone === "bottom"
      ? "centered horizontally in the upper canvas, entire body within top 40%"
      : "centered horizontally within the right 60–95% of the canvas";

  const wrappedPrompt = `You are a professional advertising image compositor. You will receive THREE images:
- Image 1: the background scene (scene and lighting reference)
- Image 2: the product (must be held by the person)
- Image 3: person reference photo (face, hair, skin tone, clothing style to match)

================================================================================
PRIMARY RULE — ZONE CONSTRAINT — ENFORCED ABOVE ALL ELSE
================================================================================
The person and product must occupy ONLY the ${zonePercent} of the canvas.
The ${zoneCleanSide} — absolutely no body part, arm, hair, clothing, or shadow may cross this boundary.
Body center: ${zoneBodyPosition}.
Leave a minimum 6% safety gap between any body part and the zone boundary.
THIS OVERRIDES the creative brief if there is any conflict.
================================================================================

================================================================================
SECONDARY RULE — PERSON USES THE PRODUCT — NON-NEGOTIABLE
================================================================================
The person MUST be actively using or interacting with the EXACT product shown in Image 2.
Natural use modes (choose the most fitting for the product category):
  • One hand holds the product at chest/waist height while the other hand applies it to skin
  • Both hands present the product toward the camera, label facing forward
  • Person applies the product to their arm, neck, or face with a natural gesture
Product MUST be:
  - Clearly visible and fully in frame — NEVER hidden or cropped
  - Label / front face toward the camera (slight angle acceptable)
  - Reproduced from Image 2 with exact colors, label text, and shape
Any output where the product from Image 2 is NOT visible and in the person's interaction is INVALID.
================================================================================

STEP 1 — ANALYZE IMAGE 1 CAREFULLY:
Before compositing, examine the background and identify:
• Where existing text, badges, labels, or graphic elements are — they must NEVER be covered
• The exact open space available for the person (within the allowed zone above)
• Lighting direction, color temperature, and ambient light quality

STEP 2 — COMPOSE THE ADVERTISING SCENE:
CREATIVE BRIEF (execute this, but always within the zone constraint above):
${args.prompt}

PERSON — TECHNICAL REQUIREMENTS:
- Match face, hair color/style, skin tone, and general aesthetic EXACTLY from Image 3
- The person must look like the same individual — this is non-negotiable
- FRAMING: show the person from HEAD to at least KNEE — full upright standing posture
- BODY POSITION: the person stands upright and confident; their body is ${zoneBodyPosition}
- FACING: the person faces slightly toward the center of the canvas (toward the text area), body stays inside the allowed zone
- Clothing may adapt to the scene naturally

PRODUCT — TECHNICAL REQUIREMENTS:
- Use ONLY the product from Image 2 — do not invent or substitute any other object
- The person is ACTIVELY USING or interacting with Image 2 — applying to skin, or presenting to camera
- Product at CHEST or TORSO HEIGHT — clearly visible, label facing camera (slight angle is fine)
- Preserve the product's EXACT colors, labels, logo, and proportions — zero alteration
- The product must be FULLY IN FRAME — never cropped or partially out of canvas

ABSOLUTE RULES — VIOLATIONS NOT ACCEPTABLE:
- The person MUST be visibly using, holding, or applying the product from Image 2 — a person with empty hands and no visible product is NOT acceptable
- The person and product must be FULLY OPAQUE and SOLIDLY VISIBLE at 100% opacity — NEVER fading, dissolving, soft edges, or any transparency
- DO NOT cover, blur, or obscure any existing text, labels, or graphic elements from Image 1 — every pixel must remain intact and legible
- DO NOT modify, recolor, darken, blur, or alter ANY part of the background from Image 1 — only add the person and product
- Lighting must match the background scene naturally — same direction, same color temperature
- No added text, watermarks, logos, or extra objects
- Authentic feel — genuine expression, natural posture, not stiff or stock-photo generic`.trim();

  const MAX_ATTEMPTS = 3;
  let lastText = "";

  console.log(`[gemini:generateSceneWithAvatarAndProduct] model=${MODEL_NANO_BANANA} prompt_chars=${wrappedPrompt.length}\n${wrappedPrompt.slice(0, 300)}`);

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
            { text: wrappedPrompt },
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
