import sharp from "sharp";
import { renderTextOnImage } from "./textRenderer";
import type { ComposeRequest } from "./types";
import type { LayoutSpec } from "./layoutSpec";
import { nanoBananaInjectProduct, generateScene, generateGenericProduct, generateSceneWithAvatarAndProduct, detectProductBoundingBox } from "@/lib/ai/gemini";
import { ABSOLUTE_RULES_SCENE, ABSOLUTE_RULES_PRODUCT_INJECT, ABSOLUTE_RULES_ANATOMY, buildZonePlacement } from "@/lib/ai/promptRules";

function buildScenePrompt(sceneAction: string, copyZone: string, hasRealProduct = false, opts?: { fullBleed?: boolean }): string {
  const zone = copyZone as "left" | "right" | "top" | "bottom" | "center";

  const productRule = hasRealProduct
    ? `- You are also provided the product image as Image 2. IF the scene description implies a product, use ONLY the EXACT product shown in Image 2 — never invent, substitute, or hallucinate a different product. If the scene does not require a product, the person's hands must be empty.`
    : `- DO NOT add any product, bottle, jar, tube, dropper, or package UNLESS the prompt explicitly asks for it.`;

  const holdingRule = hasRealProduct
    ? `- If the scene implies a product in use, the person may hold or interact with it naturally — but ONLY the product from Image 2.`
    : zone === "top" || zone === "bottom"
      ? `- The person CAN hold a small beauty/wellness product naturally in their hands — this is intentional and expected.`
      : `- DO NOT show anything being held. The person's hands must be empty or in a natural resting pose.`;

  const fullBleedContext = opts?.fullBleed
    ? `\nFULL-BLEED SCENE — The person should fill the entire canvas, like a cinematic portrait.
This is NOT a split layout — the scene is edge-to-edge. A dark overlay will be applied AFTER generation
to ensure text legibility, so the generated image should be a clean, full-frame portrait/scene.\n`
    : "";

  return `You are a professional advertising image compositor. Your task is to add a person to a background scene.

STEP 1 — ANALYZE THE IMAGE FIRST:
Before making any changes, examine the background image carefully and identify:
• Where existing text, labels, badges, icons, or graphic elements are located — these are protected zones, the person must NEVER overlap them
• Where the open, empty space is available for placing the person
• The dominant lighting direction and color temperature of the scene
${fullBleedContext}
STEP 2 — COMPOSE WITH PRECISION:
${sceneAction}

${buildZonePlacement(zone, "scene", { fullBleed: opts?.fullBleed })}

${ABSOLUTE_RULES_SCENE}
${productRule}
${holdingRule}
- DO NOT add text, logos, watermarks, or labels.
- The person must be FULLY OPAQUE and SOLIDLY VISIBLE — do NOT apply fading, dissolving, transparency, or soft disappearance to any part of the person. The person should look physically present with clear edges.
- Lighting must match the existing background naturally.
- The scene must feel authentic and warm, not overly commercial.`.trim();
}

function buildAvatarScenePrompt(userPrompt: string, copyZone: string): string {
  const zone = copyZone as "left" | "right" | "top" | "bottom" | "center";
  return `You are a professional advertising image compositor.

You will receive TWO images:
- Image 1: the background scene
- Image 2: a photo of a person (avatar)

STEP 1 — ANALYZE IMAGE 1 FIRST:
Before compositing, carefully examine the background and identify:
• Where existing text, labels, badges, icons, or graphic elements are located — these must NEVER be covered
• Where the open, empty space is available for placing the person
• The dominant lighting direction and color temperature of the scene

STEP 2 — INTEGRATE THE PERSON:
Naturally composite the person from Image 2 into the open space of Image 1.

${buildZonePlacement(zone, "avatar")}

INTEGRATION RULES:
- Match the lighting direction and color temperature of the background to the person naturally.
- The person should feel like they belong in the scene — same ambient light, natural shadows.
- The person must be FULLY OPAQUE and SOLIDLY VISIBLE — do NOT apply fading, dissolving, soft disappearance, or transparency to any part of the person. The person must look physically present with confident, clear edges.
- The person must be fully visible from head to at least knee level, not cropped at top.
- Maintain the person's original appearance, face, and clothing.
- Do NOT add any products, objects, text, or logos.

STRICT PROHIBITIONS:
- Do NOT paste the person as a flat cutout — blend them naturally into the scene.
- Do NOT change the person's appearance or clothing.
- Do NOT add text, watermarks, or decorative elements.
${ABSOLUTE_RULES_SCENE}${userPrompt ? `\n\nAdditional creative context: ${userPrompt}` : ""}`.trim();
}

function buildAvatarWithProductPrompt(
  productPrompt: string,
  copyZone: string,
  rawMode: boolean,
): string {
  const zone = copyZone as "left" | "right" | "top" | "bottom" | "center";

  if (rawMode) {
    return `You are a professional advertising image compositor. You will receive THREE images:
- Image 1: the background scene (lighting and environment reference)
- Image 2: the product (must be held or used by the person)
- Image 3: person reference photo — MANDATORY: match this person's face, hair color/style, skin tone, and general aesthetic EXACTLY. The person must look like the same individual.

CREATIVE BRIEF — execute this exactly:
${productPrompt}

ABSOLUTE RULES — VIOLATIONS NOT ACCEPTABLE:
- Replicate the person's appearance from Image 3 — face, hair, skin tone, clothing style must match
- The person and product must be FULLY OPAQUE and SOLIDLY VISIBLE at 100% opacity — NEVER fading, dissolving, soft edges, or any transparency
- Lighting must match the background scene naturally — same direction, same color temperature
- No added text, watermarks, logos, or extra objects
${ABSOLUTE_RULES_SCENE}`.trim();
  }

  const zoneBodyPosition =
    zone === "right"  ? "centered horizontally within the left 30–40% of the canvas"
    : zone === "top"  ? "centered horizontally in the lower canvas, body starting at or below 58% from top"
    : zone === "bottom" ? "centered horizontally in the upper canvas, entire body within top 40%"
    : "centered horizontally within the right 60–95% of the canvas";

  return `You are a professional advertising image compositor. You will receive THREE images:
- Image 1: the background scene (scene and lighting reference)
- Image 2: the product (must be held by the person)
- Image 3: person reference photo (face, hair, skin tone, clothing style to match)

${buildZonePlacement(zone, "product")}

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
${productPrompt}

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
- Lighting must match the background scene naturally — same direction, same color temperature
- No added text, watermarks, logos, or extra objects
- Authentic feel — genuine expression, natural posture, not stiff or stock-photo generic
${ABSOLUTE_RULES_SCENE}`.trim();
}

// ─── Main composer ───────────────────────────────────────────────────────────

export async function composeWithProductIA(req: ComposeRequest) {
  const t0 = Date.now();

  if (!req.backgroundBuffer) {
    throw new Error("PRODUCT_IA requires backgroundBuffer");
  }
  if (!req.productBuffer) {
    throw new Error("PRODUCT_IA requires productBuffer");
  }

const bgMeta = await sharp(req.backgroundBuffer).metadata();
const targetW = req.productIAOptions?.forceSize?.width ?? bgMeta.width ?? 1080;
const targetH = req.productIAOptions?.forceSize?.height ?? bgMeta.height ?? 1080;

let bg = req.backgroundBuffer;

if (bgMeta.width !== targetW || bgMeta.height !== targetH) {
  bg = await sharp(req.backgroundBuffer)
    .resize(targetW, targetH, { fit: "cover" })
    .png()
    .toBuffer();
}

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const divisor = gcd(targetW, targetH);
const aspectRatio = `${targetW / divisor}:${targetH / divisor}`;

  // Avatar-as-scene WITH product: use avatar as reference to generate person holding the product
  // Used by sceneWithProduct templates (e.g. persona-producto-left).
  if (req.productIAOptions?.avatarSceneWithProduct && req.avatarBuffer && req.productBuffer) {
    const avatarPng = await sharp(req.avatarBuffer).png().toBuffer();
    const copyZone = (req.productIAOptions?.copyZone ?? "left") as "left" | "right" | "top" | "bottom" | "center";
    const rawMode = req.productIAOptions?.rawProductPrompt === true;

    // When useGenericProductClone is set, generate a label-free clone first so the product
    // looks more natural / photo-realistic when held by the person.
    let productForScene = req.productBuffer;
    if (req.productIAOptions?.useGenericProductClone) {
      productForScene = await generateGenericProduct({ productPng: req.productBuffer, apiKeys: req.apiKeys });
    }

    const avatarWithProductPrompt = buildAvatarWithProductPrompt(
      req.productIAOptions?.prompt ?? "",
      copyZone,
      rawMode,
    );

    const scene = await generateSceneWithAvatarAndProduct({
      backgroundPng: bg,
      productPng: productForScene,
      avatarPng,
      prompt: avatarWithProductPrompt,
      aspectRatio,
      apiKeys: req.apiKeys,
    });

    const sceneMeta = await sharp(scene).metadata();
    if (sceneMeta.width !== targetW || sceneMeta.height !== targetH) {
      console.log(`[normalizedScene] ${sceneMeta.width}×${sceneMeta.height} → ${targetW}×${targetH} (fit:cover)`);
    }
    const normalizedScene = (sceneMeta.width !== targetW || sceneMeta.height !== targetH)
      ? await sharp(scene).resize(targetW, targetH, { fit: "cover" }).png().toBuffer()
      : scene;

    // Re-overlay the real branded product ONLY when useGenericProductClone was used.
    // In that case Gemini drew a label-free placeholder — we need to replace it with the real one.
    // When Gemini already received the actual product image, its output is the final one;
    // running bbox detection + overlay would layer a second copy on top → visible duplication.
    let finalScene = normalizedScene;
    if (req.productIAOptions?.useGenericProductClone) {
      try {
        const bbox = await detectProductBoundingBox({ scenePng: normalizedScene, productPng: req.productBuffer, apiKeys: req.apiKeys });
        if (bbox) {
          const left = Math.round(bbox.x * targetW);
          const top = Math.round(bbox.y * targetH);
          const productW = Math.round(bbox.width * targetW);
          const productH = Math.round(bbox.height * targetH);
          const productResized = await sharp(req.productBuffer)
            .resize(productW, productH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
          finalScene = await sharp(normalizedScene)
            .composite([{ input: productResized, left, top }])
            .png()
            .toBuffer();
          console.log(`[composeWithProductIA] product overlay applied at (${left},${top}) ${productW}x${productH}`);
        } else {
          console.warn("[composeWithProductIA] product bbox detection returned null, using Gemini scene as-is");
        }
      } catch (err) {
        console.warn("[composeWithProductIA] product bbox detection failed, using Gemini scene as-is:", err);
      }
    }

    return {
      success: true,
      buffer: finalScene,
      promptUsed: req.productIAOptions?.prompt ?? "",
      timings: { total: Date.now() - t0, renderText: 0 },
    };
  }

  // Avatar-as-scene: composite the avatar into the background via Gemini (natural lighting + blending)
  if (req.productIAOptions?.useAvatarAsScene && req.avatarBuffer) {
    const avatarCopyZone = req.productIAOptions?.copyZone ?? "left";

    const avatarPrompt = buildAvatarScenePrompt(
      req.productIAOptions?.prompt ?? "",
      avatarCopyZone,
    );

    // Normalize avatar to PNG so Gemini receives the format it expects
    const avatarPng = await sharp(req.avatarBuffer).png().toBuffer();

    const scene = await nanoBananaInjectProduct({
      backgroundPng: bg,
      productPng: avatarPng,
      prompt: avatarPrompt,
      aspectRatio,
      apiKeys: req.apiKeys,
    });

    const sceneMeta = await sharp(scene).metadata();
    if (sceneMeta.width !== targetW || sceneMeta.height !== targetH) {
      console.log(`[normalizedScene] ${sceneMeta.width}×${sceneMeta.height} → ${targetW}×${targetH} (fit:cover)`);
    }
    const normalizedScene = (sceneMeta.width !== targetW || sceneMeta.height !== targetH)
      ? await sharp(scene).resize(targetW, targetH, { fit: "cover" }).png().toBuffer()
      : scene;

    return {
      success: true,
      buffer: normalizedScene,
      promptUsed: avatarPrompt,
      timings: { total: Date.now() - t0, renderText: 0 },
    };
  }

  // 2a-split) Pure Sharp compositing — no Gemini, no hands ever
  if (req.productIAOptions?.splitComparison === true) {
    const composed = await composeSplitComparison(bg, req.productBuffer, targetW, targetH, req.apiKeys);
    return {
      success: true,
      buffer: composed,
      promptUsed: "split-comparison (pure Sharp, no Gemini)",
      timings: { total: Date.now() - t0, renderText: 0 },
    };
  }

  // 2a) Scene mode: generate person/scene without product injection
  const isSceneMode = req.productIAOptions?.sceneMode === true;

  if (isSceneMode) {
    const sceneAction = req.productIAOptions?.prompt ?? "";
    const sceneCopyZone = req.productIAOptions?.copyZone ?? "left";
    const hasRealProduct = req.productIAOptions?.hasRealProduct === true;
    const sceneFullBleed = req.productIAOptions?.sceneFullBleed === true;

    let scene: Buffer;
    let fullPromptUsed: string;

    if (hasRealProduct && req.productBuffer) {
      // El usuario subió una imagen real de producto: enviamos background + producto a Gemini
      // para que use el producto real como referencia y no invente uno propio.
      fullPromptUsed = buildScenePrompt(sceneAction, sceneCopyZone, true, { fullBleed: sceneFullBleed });
      console.log(`[composeWithProductIA:sceneMode] hasRealProduct=true fullBleed=${sceneFullBleed} → usando nanoBananaInjectProduct con producto real`);
      scene = await nanoBananaInjectProduct({
        backgroundPng: bg,
        productPng: req.productBuffer,
        prompt: fullPromptUsed,
        aspectRatio,
        apiKeys: req.apiKeys,
      });
    } else {
      // Sin producto: solo se envía el fondo y Gemini genera la escena con persona
      fullPromptUsed = buildScenePrompt(sceneAction, sceneCopyZone, false, { fullBleed: sceneFullBleed });
      scene = await generateScene({
        backgroundPng: bg,
        prompt: fullPromptUsed,
        aspectRatio,
        apiKeys: req.apiKeys,
      });
    }

    const sceneMeta = await sharp(scene).metadata();
    if (sceneMeta.width !== targetW || sceneMeta.height !== targetH) {
      console.log(`[normalizedScene] ${sceneMeta.width}×${sceneMeta.height} → ${targetW}×${targetH} (fit:cover)`);
    }
    const normalizedScene = (sceneMeta.width !== targetW || sceneMeta.height !== targetH)
      ? await sharp(scene).resize(targetW, targetH, { fit: "cover" }).png().toBuffer()
      : scene;

    // No zone cut: trust Gemini's zone constraint prompts.
    // A hard boundary creates a visible seam because scene lighting adjusts the full canvas.
    return {
      success: true,
      buffer: normalizedScene,
      promptUsed: fullPromptUsed,
      timings: { total: Date.now() - t0, renderText: 0 },
    };
  }

  // 2b) Build product injection prompt
  const userPrompt = req.productIAOptions?.prompt ?? "";
  const copyZone = req.productIAOptions?.copyZone ?? "right";
  const rawProductPrompt = req.productIAOptions?.rawProductPrompt === true;
  const replaceExistingProduct = req.productIAOptions?.replaceExistingProduct === true;

  if (replaceExistingProduct) {
    console.log("[PRODUCT_REPLACE] replacing placeholder product in scene");
  }

  const prompt = buildProductIAPrompt({ userPrompt, copyZone, rawMode: rawProductPrompt, personScene: req.productIAOptions?.personScene === true, replaceExistingProduct });
  console.log(`[compose:buildProductIAPrompt] copyZone=${copyZone} rawMode=${rawProductPrompt} personScene=${req.productIAOptions?.personScene} replaceExistingProduct=${replaceExistingProduct} prompt="${prompt.slice(0, 120).replace(/\n/g, " ")}..."`);

  // 3) NanoBanana: integrate product into background
  const scene = await nanoBananaInjectProduct({
    backgroundPng: bg,
    productPng: req.productBuffer,
    prompt,
    aspectRatio,
    apiKeys: req.apiKeys,
  });

  // Forzar dimensiones al canvas original
const sceneMeta = await sharp(scene).metadata();
if (sceneMeta.width !== targetW || sceneMeta.height !== targetH) {
  console.log(`[normalizedScene] ${sceneMeta.width}×${sceneMeta.height} → ${targetW}×${targetH} (fit:cover)`);
}
const normalizedScene = (sceneMeta.width !== targetW || sceneMeta.height !== targetH)
  ? await sharp(scene).resize(targetW, targetH, { fit: "cover" }).png().toBuffer()
  : scene;

  // No zone cut: trust Gemini's zone constraint prompts.
  // Hard boundaries create a visible seam when Gemini slightly alters background
  // colors/lighting near the product — the original bg and Gemini output never match perfectly.
  let protectedScene = normalizedScene;

  // Sharp re-overlay: restore original product sharpness after Gemini composite.
  // Gemini over-blends the product on macro-texture backgrounds (e.g. producto-hero-top).
  // We re-place the original product PNG at the exact expected position to guarantee crispness.
  if (req.productIAOptions?.sharpProductOverlay && req.productBuffer) {
    const { sizePct, centerX, centerY, rotation = 0 } = req.productIAOptions.sharpProductOverlay;
    const productW = Math.round(targetW * sizePct);

    // Resize to target width keeping aspect ratio
    let sharpProduct = await sharp(req.productBuffer)
      .resize(productW, null, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();

    // Rotate if needed (transparent background for corners)
    if (rotation !== 0) {
      sharpProduct = await sharp(sharpProduct)
        .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    }

    const pMeta = await sharp(sharpProduct).metadata();
    const pW = pMeta.width ?? productW;
    const pH = pMeta.height ?? productW;
    const left = Math.max(0, Math.round(targetW * centerX - pW / 2));
    const top  = Math.max(0, Math.round(targetH * centerY - pH / 2));

    protectedScene = await sharp(protectedScene)
      .composite([{ input: sharpProduct, left, top, blend: "over" }])
      .png()
      .toBuffer();
  }

  if (req.productIAOptions?.skipTextRender) {
    return {
      success: true,
      buffer: protectedScene,
      promptUsed: prompt,
      timings: { total: Date.now() - t0, renderText: 0 },
    };
  }

  // 4) Layout (copy on the right)
  const layout = buildCopyRightLayout({
    width: targetW,
    height: targetH,
    copy: req.copy ?? {},
  });

  // 5) Deterministic text render
  const textRes = await renderTextOnImage({
    baseImage: protectedScene,
    layout,
    debug: false,
  });

  const total = Date.now() - t0;

  return {
    success: true,
    buffer: textRes.buffer,
    promptUsed: prompt,
    layoutSpec:
      req.productIAOptions?.includeLayoutSpec === false ? undefined : layout,
    timings: {
      total,
      renderText: textRes.renderTimeMs,
    },
    debug: {
      targetCanvas: { width: targetW, height: targetH },
      backgroundMetaBefore: { width: bgMeta.width, height: bgMeta.height },
      copyZone,
    },
  };
}

/**
 * Smart line-breaks for premium editorial headlines.
 * Keeps 1-word last lines from looking accidental.
 */
function smartHeadlineBreak(text: string) {
  if (!text) return text;

  // Rule 1: if contains " cuando ", force break there
  const t1 = text.replace(/\s+cuando\s+/i, "\ncuando ");

  // Rule 2: if still too long and no break exists, try breaking near middle by words
  if (!t1.includes("\n") && t1.length > 26) {
    const words = t1.split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      const mid = Math.floor(words.length / 2);
      return [...words.slice(0, mid), "\n" + words.slice(mid).join(" ")].join(" ");
    }
  }

  return t1;
}

// ─── Character widths (mirrors textRenderer.ts CHAR_WIDTHS) ─────────────────
const LAYOUT_CHAR_WIDTHS: Record<string, number> = {
  "i": 0.25, "l": 0.25, "I": 0.28, "!": 0.28, ".": 0.28, ",": 0.28, ":": 0.28, ";": 0.28,
  "j": 0.28, "f": 0.32, "t": 0.35, "r": 0.38, "1": 0.45,
  "s": 0.48, "c": 0.50, "a": 0.52, "e": 0.52, "o": 0.55, "n": 0.55, "u": 0.55,
  "z": 0.48, "x": 0.50, "v": 0.50, "y": 0.50, "k": 0.52, "h": 0.55, "b": 0.55,
  "d": 0.55, "p": 0.55, "q": 0.55, "g": 0.55, "w": 0.72, "m": 0.82, "W": 0.95, "M": 0.88,
  "A": 0.65, "B": 0.62, "C": 0.65, "D": 0.68, "E": 0.55, "F": 0.52, "G": 0.70, "H": 0.70,
  "J": 0.45, "K": 0.62, "L": 0.52, "N": 0.70, "O": 0.72, "P": 0.58, "Q": 0.72, "R": 0.62,
  "S": 0.55, "T": 0.58, "U": 0.68, "V": 0.62, "X": 0.62, "Y": 0.58, "Z": 0.58,
  "0": 0.55, "2": 0.55, "3": 0.55, "4": 0.55, "5": 0.55, "6": 0.55, "7": 0.55, "8": 0.55, "9": 0.55,
  " ": 0.28, "-": 0.35, "%": 0.85, "&": 0.70,
  "á": 0.52, "é": 0.52, "í": 0.25, "ó": 0.55, "ú": 0.55, "ñ": 0.55,
  "Á": 0.65, "É": 0.55, "Ó": 0.72, "Ú": 0.68, "Ñ": 0.70,
};
const LAYOUT_CHAR_DEFAULT = 0.55;

/**
 * Must match FONT_FAMILY_FACTORS in textRenderer.ts.
 * Uses Lora (1.10) for serif and Poppins (1.02) for sans — the fonts
 * that are actually embedded and rendered by librsvg on this server.
 */
const LAYOUT_FAMILY_FACTORS: Record<string, number> = {
  "lora":             1.10,
  "playfair display": 1.10,
  "playfair":         1.10,
  "inter":            1.131,
  "arial":            1.00,
  "helvetica":        1.00,
};

function layoutMeasureText(
  text: string,
  fontSize: number,
  fontWeight: string,
  fontFamily: string,
): number {
 const isBold = ["bold", "600", "700", "800", "900"].includes(String(fontWeight));
  const key = (fontFamily ?? "").toLowerCase();
  let factor = 1.05;
  for (const [name, f] of Object.entries(LAYOUT_FAMILY_FACTORS)) {
    if (key.includes(name)) { factor = f; break; }
  }
  let width = 0;
  for (const char of text) {
    width += (LAYOUT_CHAR_WIDTHS[char] ?? LAYOUT_CHAR_DEFAULT) * fontSize;
  }
  if (isBold) width *= 1.08;
  return width * factor;
}

function buildCopyRightLayout(args: {
  width: number;
  height: number;
  copy: any;
}): LayoutSpec {
  const { width: W, height: H } = args;
  // All positions as fixed % of canvas — no dynamic math that can go wrong.
  // At 1080x1350: values in comments show pixel equivalents.

  // ── COPY ZONE geometry ──────────────────────────────────────────────────
  // Right half: x=50%, right margin=4%, so w=46% (~497px)
const copyX = Math.round(W * 0.46);  // empieza en 453px
const copyW = Math.round(W * 0.64)     // 497px  (stays within 1080)

  // ── HEADLINE: adaptive font, positioned at ~28% from top ────────────────
  const HEADLINE_FAMILY = "Playfair Display";
  const HEADLINE_WEIGHT = "700";

  const headlineRaw = args.copy.headline ?? "";
  const headlineWithPeriod = headlineRaw && !headlineRaw.match(/[.!?]$/)
    ? headlineRaw + "."
    : headlineRaw;
  const brokenHeadline = smartHeadlineBreak(headlineWithPeriod);
  const longestLine = brokenHeadline
    .split("\n")
    .reduce((a, b) => (a.length > b.length ? a : b), "");

  let headlineFontSize = 136;
  while (
    headlineFontSize > 96 &&
    layoutMeasureText(longestLine, headlineFontSize, HEADLINE_WEIGHT, HEADLINE_FAMILY) > copyW
  ) {
    headlineFontSize -= 2;
  }

  const headlineLineHeight = 1.15;
  const lineCount = brokenHeadline.split("\n").length;
  const headlineHeightPx = Math.ceil(headlineFontSize * headlineLineHeight * lineCount);

  // Fixed Y: headline starts at 40% of canvas height
  const headlineY = Math.round(H * 0.40);

  // Subheadline: 24px gap below headline
  const subY = headlineY + headlineHeightPx + 24;

  return {
    version: "1",
    canvas: { width: W, height: H },
    safeArea: { margin: Math.round(H * 0.053) },

    product: {
      anchor: "custom",
      x: 0, y: 0, width: 0, height: 0, scale: 1, rotation: 0,
    },

    overlays: [
      {
        type: "linearGradient",
        x: 0, y: 0, w: W, h: H,
        opacity: 0.38,
        color: "rgba(255,255,255,1)",
        direction: "right",
      },
    ],

    textBlocks: [
      // ── TOP BAR: ingredients — full width, centered at ~9% from top ──────
      {
        id: "cta",
       content: args.copy.cta ?? args.copy.title ?? "",
        x: 0,
        y: Math.round(H * 0.09),   // 122px
        w: W,
        h: 48,
        align: "center",
        fontFamily: "Inter",
        fontWeight: "700",
        fontSize: 25,
        color: "#5A5A5A",
        maxLines: 1,
        lineHeight: 1,
        letterSpacing: 0.06,
        textTransform: "none",
      },

      // ── HEADLINE — right column, ~35% from top ───────────────────────────
      {
        id: "headline",
        content: brokenHeadline,
        x: copyX,
        y: headlineY,
        w: copyW,
        h: headlineHeightPx + 6,
        align: "left",
        fontFamily: HEADLINE_FAMILY,
        fontWeight: HEADLINE_WEIGHT,
        fontSize: headlineFontSize,
        lineHeight: headlineLineHeight,
        letterSpacing: -0.02,
        color: "#1A1A1A",
        maxLines: 4,
        textTransform: "none",
      },

      // ── SUBHEADLINE — right column, directly below headline ──────────────
      {
        id: "subheadline",
        content: args.copy.subheadline ?? "",
        x: copyX,
        y: subY,
        w: copyW,
        h: Math.round(H * 0.14),   // 189px — enough for 3 lines
        align: "left",
        fontFamily: "Inter",
        fontWeight: "400",
        fontSize: 24,
        color: "#555555",
        maxLines: 3,
        lineHeight: 1.55,
        letterSpacing: 0,
        textTransform: "none",
      },

      // ── BOTTOM BAR: offer badge — full width pill, 5% from bottom ────────
      {
        id: "badge",
content: args.copy.badge ?? "",
        x: Math.round(W * 0.05),
        y: Math.round(H * 0.895),  // 1209px — clear of bottom edge
        w: Math.round(W * 0.90),   // 972px
        h: 64,
        align: "center",
        color: "#FFFFFF",
        fontFamily: "Inter",
        fontWeight: "700",
        fontSize: 21,
        maxLines: 1,
        lineHeight: 1,
        letterSpacing: 0.01,
        textTransform: "none",
        background: {
          type: "pill",
          color: "#00B5AD",
          radius: 32,
          padding: 16,
          opacity: 1,
        },
      },
    ],

    confidence: 1,
    rationale: "PRODUCT_IA: 3-zone layout — fixed positions, right copy column",
    warnings: [],
  } as any;
}

/**
 * Split comparison composition — places the original product on the LEFT and a
 * Gemini-generated generic/unbranded version on the RIGHT.
 * Gemini analyzes the product shape and generates a similar but brandless copy.
 */
async function composeSplitComparison(
  bg: Buffer,
  productBuffer: Buffer,
  targetW: number,
  targetH: number,
  apiKeys?: string[],
): Promise<Buffer> {
  // ── Left product (original — YOUR product) ─────────────────────────────
  // Slightly larger bounding box so DermaLisse reads bigger than the generic
  const leftMaxW = Math.round(targetW * 0.30);
  const leftMaxH = Math.round(targetH * 0.26);

  const leftProduct = await sharp(productBuffer)
    .ensureAlpha()
    .resize(leftMaxW, leftMaxH, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  const leftMeta = await sharp(leftProduct).metadata();
  const leftW = leftMeta.width!;
  const leftH = leftMeta.height!;
  // Center at 25% x, 40% y (moved down to stay below column labels)
  const leftLeft = Math.round(targetW * 0.25) - Math.round(leftW / 2);
  const leftTop  = Math.round(targetH * 0.40) - Math.round(leftH / 2);

  // ── Right product (Gemini-generated generic version) ────────────────────
  // Ask Gemini to generate a similar product with NO text/logos, neutral gray.
  // It returns the product on a white background; we remove the white.
  const genericRaw = await generateGenericProduct({ productPng: productBuffer, apiKeys });

  // Generic is 75% of the branded size → DermaLisse reads ~33% bigger
  const rightMaxW = Math.round(leftMaxW * 0.75);
  const rightMaxH = Math.round(leftMaxH * 0.75);

  const genericResized = await sharp(genericRaw)
    .resize(rightMaxW, rightMaxH, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  // Smart background removal: detect background color from edge pixels,
  // then remove pixels close to that color. Works for white, black, gray, or any bg.
  const { data: rawPixels, info } = await sharp(genericResized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleaned = Buffer.from(rawPixels);
  const totalPixels = info.width * info.height;
  const w = info.width;
  const h = info.height;

  // Sample edge pixels (top/bottom rows + left/right columns) to detect bg color
  const edgeOffsets: number[] = [];
  for (let x = 0; x < w; x++) {
    edgeOffsets.push(x * 4);                          // top row
    edgeOffsets.push(((h - 1) * w + x) * 4);          // bottom row
  }
  for (let y = 1; y < h - 1; y++) {
    edgeOffsets.push((y * w) * 4);                    // left column
    edgeOffsets.push((y * w + w - 1) * 4);            // right column
  }

  let sumR = 0, sumG = 0, sumB = 0;
  for (const off of edgeOffsets) {
    sumR += cleaned[off];
    sumG += cleaned[off + 1];
    sumB += cleaned[off + 2];
  }
  const n = edgeOffsets.length;
  const bgR = Math.round(sumR / n);
  const bgG = Math.round(sumG / n);
  const bgB = Math.round(sumB / n);

  // Remove pixels within a color-distance threshold of the detected background.
  // Higher thresholds = more aggressive removal = cleaner product edges, less bleed.
  const HARD_THRESHOLD = 42;  // fully transparent (was 30)
  const SOFT_THRESHOLD = 78;  // transition zone for anti-aliasing (was 50)
  for (let i = 0; i < totalPixels; i++) {
    const off = i * 4;
    const dr = cleaned[off] - bgR;
    const dg = cleaned[off + 1] - bgG;
    const db = cleaned[off + 2] - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < HARD_THRESHOLD) {
      cleaned[off + 3] = 0; // fully transparent
    } else if (dist < SOFT_THRESHOLD) {
      // Soft fade for anti-aliasing at product edges
      const t = (SOFT_THRESHOLD - dist) / (SOFT_THRESHOLD - HARD_THRESHOLD);
      cleaned[off + 3] = Math.round(cleaned[off + 3] * (1 - t));
    }
  }

  const competitorFinal = await sharp(cleaned, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const rightMeta = await sharp(competitorFinal).metadata();
  const rightW = rightMeta.width!;
  const rightH = rightMeta.height!;
  // Center at 75% x, 40% y (aligned with branded product)
  const rightLeft = Math.round(targetW * 0.75) - Math.round(rightW / 2);
  const rightTop  = Math.round(targetH * 0.40) - Math.round(rightH / 2);

  return sharp(bg)
    .composite([
      { input: leftProduct,     left: leftLeft,  top: leftTop,  blend: "over" },
      { input: competitorFinal, left: rightLeft, top: rightTop, blend: "over" },
    ])
    .png()
    .toBuffer();
}

function buildProductIAPrompt(args: {
  userPrompt?: string;
  copyZone: "right" | "left" | "top" | "bottom" | "center" | "full";
  rawMode?: boolean;
  /** true when the scene intentionally includes a person (e.g. persona-producto-left without avatar).
   *  Enables ABSOLUTE_RULES_ANATOMY. Never set for product-only templates. */
  personScene?: boolean;
  /** true = Image 1 already contains a placeholder product; replace it with Image 2.
   *  When false/undefined, behaviour is identical to the existing product-inject flow. */
  replaceExistingProduct?: boolean;
}) {
  // Replacement preamble — injected at the very start when Image 1 has a placeholder product.
  // Empty string when replaceExistingProduct is false/undefined → zero impact on existing behaviour.
  const replacementBlock = args.replaceExistingProduct
    ? `CRITICAL TASK — PRODUCT REPLACEMENT:
Image 1 contains a scene with a person and a PLACEHOLDER product (generic, unbranded).
Image 2 is the REAL product that must replace it.

Your task:
- Identify the placeholder product in Image 1
- Replace it completely with the real product from Image 2
- Maintain the EXACT same position, scale, and orientation of the placeholder
- Preserve all lighting, shadows, and reflections to match the scene
- The person's pose, hands, and interaction with the product must remain natural
- The rest of the scene (background, person, environment) must remain IDENTICAL
- Only the product changes — nothing else

`
    : "";

  // ── RAW mode: template's prompt goes to Gemini mostly as-is ─────────────
  // We still append the universal text-preservation rule so no template can
  // accidentally skip it, even when it owns the creative direction.
  if (args.rawMode && args.userPrompt) {
    return `${replacementBlock}${args.userPrompt}

${ABSOLUTE_RULES_PRODUCT_INJECT}${args.personScene ? `\n${ABSOLUTE_RULES_ANATOMY}` : ""}`.trim();
  }

  // ── FULL mode: template owns the entire prompt ───────────────────────────
  if (args.copyZone === "full" && args.userPrompt) {
    return `${replacementBlock}${args.userPrompt}

${ABSOLUTE_RULES_PRODUCT_INJECT}${args.personScene ? `\n${ABSOLUTE_RULES_ANATOMY}` : ""}`.trim();
  }

  // ── TEMPLATE-DIRECTED mode: template's defaultProductPrompt is the creative brief ──
  // gemini.ts / composeWithProductIA.ts only set the professional context and
  // absolute safety rules. The template in index.ts drives the creative direction.
  if (args.userPrompt && args.userPrompt.length > 20) {
    return `${replacementBlock}You are an expert product photographer and digital compositor specializing in high-end commercial advertising. You will receive two images: a background scene and a product photo.

STEP 1 — ANALYZE THE BACKGROUND FIRST:
Before placing the product, carefully examine the background image and identify:
• Where existing text, labels, badges, icons, or graphic elements are located — the product must NEVER be placed over them
• Where the open space is available for the product
• The dominant lighting direction, perspective, and surface material of the scene

STEP 2 — CREATIVE BRIEF (execute exactly as described):
${args.userPrompt}

ABSOLUTE RULES — always enforced, no exceptions:
- No hands, fingers, arms, or body parts of any kind
- No text, logos, watermarks, icons, sparkles, or decorative symbols
- The product MUST NOT overlap or cover any existing text, badges, labels, or graphic elements. Place it in open space only.
${ABSOLUTE_RULES_PRODUCT_INJECT}`.trim();
  }

  // ── GENERIC FALLBACK: no user prompt — use zone-based rules ─────────────
  // buildZonePlacement handles all 5 copyZone values correctly (including "top",
  // which previously fell through to the "center" default — now fixed).
  const zoneConstraint = buildZonePlacement(
    args.copyZone as "left" | "right" | "top" | "bottom" | "center",
    "product",
  );

  return `${replacementBlock}You are an expert product photographer and digital compositor specializing in high-end commercial advertising. You will receive two images: a background scene and a product photo.

STEP 1 — ANALYZE THE BACKGROUND FIRST:
Before placing the product, carefully examine the background image and identify:
• Where existing text, labels, badges, icons, or graphic elements are located — the product must NEVER be placed over them
• Where the open space is available for the product
• The dominant lighting direction, perspective, and surface material

STEP 2 — PLACE THE PRODUCT INTELLIGENTLY:
Place the product naturally into the open space of the background, matching its lighting and perspective.

${zoneConstraint}

COMPOSITION GUIDELINES:
- Place the product WELL INSIDE the available zone — leave at least 10% breathing room from any zone boundary.
- The product must be FULLY OPAQUE and SOLIDLY VISIBLE — do NOT apply fading, dissolving, or transparency.
- Cast a subtle contact shadow only if it stays entirely within the product zone.
- Match the background's lighting direction and color temperature naturally.
- When in doubt about scale, go slightly smaller — negative space reads as premium.

ABSOLUTE RULES:
- No hands, fingers, arms, or body parts — the product must never be held
- No text, logos, watermarks, icons, or decorative symbols
- The product MUST NOT overlap any existing text or graphic elements — place it in open space only.
${ABSOLUTE_RULES_PRODUCT_INJECT}`.trim();
}