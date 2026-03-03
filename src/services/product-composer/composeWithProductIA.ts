import sharp from "sharp";
import { renderTextOnImage } from "./textRenderer";
import type { ComposeRequest } from "./types";
import type { LayoutSpec } from "./layoutSpec";
import { nanoBananaInjectProduct, generateScene, generateGenericProduct, generateSceneWithAvatarAndProduct, detectProductBoundingBox } from "@/lib/ai/gemini";

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

let bg = req.backgroundBuffer;  // ← esta línea falta

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

    // When useGenericProductClone is set, generate a label-free clone first so the product
    // looks more natural / photo-realistic when held by the person.
    let productForScene = req.productBuffer;
    if (req.productIAOptions?.useGenericProductClone) {
      productForScene = await generateGenericProduct({ productPng: req.productBuffer });
    }

    const scene = await generateSceneWithAvatarAndProduct({
      backgroundPng: bg,
      productPng: productForScene,
      avatarPng,
      prompt: req.productIAOptions?.prompt ?? "",
      aspectRatio,
      copyZone,
    });

    const sceneMeta = await sharp(scene).metadata();
    const normalizedScene = (sceneMeta.width !== targetW || sceneMeta.height !== targetH)
      ? await sharp(scene).resize(targetW, targetH, { fit: "cover" }).png().toBuffer()
      : scene;

    // Overlay the exact original product at the position Gemini chose.
    // Gemini approximates product appearance — this replaces its version with the real branded product.
    let finalScene = normalizedScene;
    try {
      const bbox = await detectProductBoundingBox({ scenePng: normalizedScene, productPng: req.productBuffer });
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

    // Zone-specific placement: copy (text) lives in the stated zone, person goes on the opposite side.
    // Margins are conservative: keep person well inside scene zone to avoid feather-blend dissolving.
    let avatarZonePlacement: string;
    switch (avatarCopyZone) {
      case "top":
        avatarZonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the BOTTOM 42% of the canvas (below 58% vertical).
- The person's head must NOT go above 58% from the top.
- The person fills the full horizontal width of the bottom zone.
- The TOP 58% must remain COMPLETELY UNCHANGED — no person, no arm, no shadow, no alteration.`;
        break;
      case "bottom":
        avatarZonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the TOP 42% of the canvas.
- The BOTTOM 58% must remain exactly as the background — completely clean, no person, no shadows.`;
        break;
      case "right":
        avatarZonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the LEFT 42% of the canvas (left edge to 42% width).
- The RIGHT 58% must remain exactly as the background — completely clean, no person, no arm, no shadow.`;
        break;
      case "left":
      default:
        avatarZonePlacement = `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the RIGHT 42% of the canvas (from 58% to 100% width).
- The LEFT 58% must remain exactly as the background — completely clean, no person, no arm, no shadow.`;
    }

    const avatarPrompt = `
You are a professional advertising image compositor.

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

${avatarZonePlacement}

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
- DO NOT modify, alter, recolor, blur, brighten, darken, or change ANY part of the background. Only add the person.
- Do NOT cover, blur, distort, or touch ANY existing text, badges, labels, or graphic elements — every pixel of pre-existing text and decorations MUST remain perfectly intact and legible.

${req.productIAOptions?.prompt
  ? `Additional creative context: ${req.productIAOptions.prompt}`
  : ""}
    `.trim();

    // Normalize avatar to PNG so Gemini receives the format it expects
    const avatarPng = await sharp(req.avatarBuffer).png().toBuffer();

    const scene = await nanoBananaInjectProduct({
      backgroundPng: bg,
      productPng: avatarPng,
      prompt: avatarPrompt,
      aspectRatio,
    });

    const sceneMeta = await sharp(scene).metadata();
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
    const composed = await composeSplitComparison(bg, req.productBuffer, targetW, targetH);
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
    const userPrompt = req.productIAOptions?.prompt ?? "";
    const sceneCopyZone = req.productIAOptions?.copyZone ?? "left";

    const scene = await generateScene({
      backgroundPng: bg,
      prompt: userPrompt,
      aspectRatio,
      zoneHint: sceneCopyZone as "left" | "right" | "top" | "bottom" | "center",
    });

    const sceneMeta = await sharp(scene).metadata();
    const normalizedScene = (sceneMeta.width !== targetW || sceneMeta.height !== targetH)
      ? await sharp(scene).resize(targetW, targetH, { fit: "cover" }).png().toBuffer()
      : scene;

    // No zone cut: trust Gemini's zone constraint prompts.
    // A hard boundary creates a visible seam because scene lighting adjusts the full canvas.
    return {
      success: true,
      buffer: normalizedScene,
      promptUsed: userPrompt,
      timings: { total: Date.now() - t0, renderText: 0 },
    };
  }

  // 2b) Build product injection prompt
  const userPrompt = req.productIAOptions?.prompt ?? "";
  const copyZone = req.productIAOptions?.copyZone ?? "right";
  const rawProductPrompt = req.productIAOptions?.rawProductPrompt === true;

  const prompt = buildProductIAPrompt({ userPrompt, copyZone, rawMode: rawProductPrompt });

  // 3) NanoBanana: integrate product into background
  const scene = await nanoBananaInjectProduct({
    backgroundPng: bg,
    productPng: req.productBuffer,
    prompt,
     aspectRatio,
  });

  // Forzar dimensiones al canvas original
const sceneMeta = await sharp(scene).metadata();
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
  const genericRaw = await generateGenericProduct({ productPng: productBuffer });

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
}) {
  // ── RAW mode: template's prompt goes to Gemini exactly as-is ────────────
  if (args.rawMode && args.userPrompt) {
    return args.userPrompt;
  }

  // ── FULL mode: template owns the entire prompt ───────────────────────────
  if (args.copyZone === "full" && args.userPrompt) {
    return args.userPrompt;
  }

  // ── TEMPLATE-DIRECTED mode: template's defaultProductPrompt is the creative brief ──
  // gemini.ts / composeWithProductIA.ts only set the professional context and
  // absolute safety rules. The template in index.ts drives the creative direction.
  if (args.userPrompt && args.userPrompt.length > 20) {
    return `You are an expert product photographer and digital compositor specializing in high-end commercial advertising. You will receive two images: a background scene and a product photo.

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
- Preserve the product's exact appearance, colors, labels, and proportions — do NOT alter the product in any way
- The product must always be FULLY VISIBLE and FULLY OPAQUE — never crop, clip, fade, dissolve, or apply transparency to it
- DO NOT modify, alter, recolor, blur, brighten, darken, or change ANY part of the background. The background must remain pixel-perfect except where the product shadow falls.
- The product MUST NOT overlap or cover any existing text, badges, labels, or graphic elements. Place it in open space only.
- Do not erase, modify, or obscure any pre-existing text or graphic elements in the background — every pixel must remain intact`.trim();
  }

  // ── GENERIC FALLBACK: no user prompt — use zone-based rules ─────────────
  const zoneRules =
    args.copyZone === "right"
      ? "- copyZone is RIGHT: product MUST stay within LEFT 38% of canvas, centered in that zone.\n  The right 62% must be COMPLETELY CLEAR — no product, no shadow, no alteration."
      : args.copyZone === "left"
      ? "- copyZone is LEFT: product MUST stay within RIGHT 38% of canvas, centered in that zone.\n  The left 62% must be COMPLETELY CLEAR — no product, no shadow, no alteration."
      : args.copyZone === "bottom"
      ? "- copyZone is BOTTOM: product MUST stay within TOP 52% of canvas.\n  The bottom 48% must be COMPLETELY CLEAR — no product, no shadow."
      : "- copyZone is CENTER: product MUST stay within the center zone between 22% and 68% from top.\n  The top 22% and bottom 32% must be COMPLETELY CLEAR.";

  return `You are an expert product photographer and digital compositor specializing in high-end commercial advertising. You will receive two images: a background scene and a product photo.

STEP 1 — ANALYZE THE BACKGROUND FIRST:
Before placing the product, carefully examine the background image and identify:
• Where existing text, labels, badges, icons, or graphic elements are located — the product must NEVER be placed over them
• Where the open space is available for the product
• The dominant lighting direction, perspective, and surface material

STEP 2 — PLACE THE PRODUCT INTELLIGENTLY:
Place the product naturally into the open space of the background, matching its lighting and perspective.

ZONE CONSTRAINT:
${zoneRules}

COMPOSITION GUIDELINES:
- Place the product WELL INSIDE the available zone — leave at least 10% breathing room from any zone boundary.
- The product must be FULLY OPAQUE and SOLIDLY VISIBLE — do NOT apply fading, dissolving, or transparency.
- Cast a subtle contact shadow only if it stays entirely within the product zone.
- Match the background's lighting direction and color temperature naturally.
- When in doubt about scale, go slightly smaller — negative space reads as premium.

ABSOLUTE RULES:
- No hands, fingers, arms, or body parts — the product must never be held
- No text, logos, watermarks, icons, or decorative symbols
- Preserve the product's exact appearance, colors, labels, and proportions — do NOT alter the product
- Product must be FULLY VISIBLE — never crop or clip it
- DO NOT modify, alter, recolor, blur, or change ANY part of the background. Only add the product.
- The product MUST NOT overlap any existing text or graphic elements — place it in open space only.
- Do not erase or alter any pre-existing text or graphic elements in the background`.trim();
}