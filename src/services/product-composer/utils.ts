/**
 * Product Composer Utilities
 *
 * Helper functions for image processing, shadow generation,
 * color matching, and placement calculations.
 */

import sharp from "sharp";

/* ═══════════════════════════════════════════════════════════════
   IMAGE LOADING
═══════════════════════════════════════════════════════════════ */

/**
 * Load image from URL or data URL
 */
export async function loadImageBuffer(source: string): Promise<Buffer> {
  if (source.startsWith("data:")) {
    // Data URL
    const base64 = source.split(",")[1];
    if (!base64) {
      throw new Error("Invalid data URL format");
    }
    return Buffer.from(base64, "base64");
  }

  if (source.startsWith("http://") || source.startsWith("https://")) {
    // Remote URL
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Invalid image source: must be data URL or HTTP(S) URL");
}

/**
 * Get image metadata
 */
export async function getImageMeta(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  channels: number;
}> {
  const meta = await sharp(buffer).metadata();

  return {
    width: meta.width || 0,
    height: meta.height || 0,
    format: meta.format || "unknown",
    hasAlpha: meta.hasAlpha || false,
    channels: meta.channels || 3,
  };
}

/* ═══════════════════════════════════════════════════════════════
   SHADOW GENERATION
═══════════════════════════════════════════════════════════════ */

export interface ShadowOptions {
  blur: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
  color: string;
}

/**
 * Generate a soft shadow from product alpha channel
 */
export async function generateShadow(
  productBuffer: Buffer,
  options: ShadowOptions
): Promise<Buffer> {
  const { blur, opacity, offsetX, offsetY } = options;

  // Extract alpha channel
  const alphaBuffer = await sharp(productBuffer)
    .extractChannel("alpha")
    .toBuffer();

  // Get original dimensions
  const meta = await sharp(productBuffer).metadata();
  const width = meta.width || 100;
  const height = meta.height || 100;

  // Create shadow: black with alpha from product
  // Apply blur and reduce opacity
  const shadow = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      {
        input: alphaBuffer,
        blend: "dest-in",
      },
    ])
    .blur(Math.max(blur, 0.3))
    .modulate({ brightness: 1 })
    .png()
    .toBuffer();

  // Adjust opacity by creating a new image with the shadow at reduced alpha
  const shadowWithOpacity = await sharp(shadow)
    .ensureAlpha(opacity)
    .png()
    .toBuffer();

  // Apply offset by extending the canvas
  const paddedWidth = width + Math.abs(offsetX) * 2;
  const paddedHeight = height + Math.abs(offsetY) * 2;

  const paddedShadow = await sharp({
    create: {
      width: paddedWidth,
      height: paddedHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: shadowWithOpacity,
        left: Math.max(0, offsetX) + Math.abs(offsetX),
        top: Math.max(0, offsetY) + Math.abs(offsetY),
      },
    ])
    .png()
    .toBuffer();

  return paddedShadow;
}

/**
 * Generate simple contact shadow (ellipse below product)
 */
export async function generateContactShadow(
  width: number,
  height: number,
  options: {
    ellipseWidth?: number;
    blur?: number;
    opacity?: number;
  } = {}
): Promise<Buffer> {
  const ellipseW = options.ellipseWidth || width * 0.8;
  const ellipseH = height * 0.08;
  const blur = options.blur || 15;
  const opacity = options.opacity || 0.25;

  // Create SVG ellipse
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <ellipse
        cx="${width / 2}"
        cy="${height - ellipseH / 2}"
        rx="${ellipseW / 2}"
        ry="${ellipseH / 2}"
        fill="rgba(0,0,0,${opacity})"
      />
    </svg>
  `;

  const shadow = await sharp(Buffer.from(svg))
    .blur(Math.max(blur, 0.3))
    .png()
    .toBuffer();

  return shadow;
}

/* ═══════════════════════════════════════════════════════════════
   LUMINANCE / COLOR MATCHING
═══════════════════════════════════════════════════════════════ */

/**
 * Calculate average luminance of an image region
 */
export async function calculateLuminance(
  buffer: Buffer,
  region?: { left: number; top: number; width: number; height: number }
): Promise<number> {
  let img = sharp(buffer);

  if (region) {
    img = img.extract(region);
  }

  // Get stats
  const stats = await img.stats();

  // Calculate luminance using ITU-R BT.709
  const r = stats.channels[0]?.mean || 0;
  const g = stats.channels[1]?.mean || 0;
  const b = stats.channels[2]?.mean || 0;

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance;
}

/**
 * Adjust brightness/gamma to match target luminance
 */
export async function adjustLuminance(
  buffer: Buffer,
  targetLuminance: number,
  strength: number = 0.5
): Promise<Buffer> {
  const currentLuminance = await calculateLuminance(buffer);
  const delta = targetLuminance - currentLuminance;

  // Calculate brightness adjustment
  // Clamp to reasonable range
  const adjustment = 1 + delta * strength;
  const clampedAdjustment = Math.max(0.7, Math.min(1.3, adjustment));

  const adjusted = await sharp(buffer)
    .modulate({ brightness: clampedAdjustment })
    .png()
    .toBuffer();

  return adjusted;
}

/* ═══════════════════════════════════════════════════════════════
   PLACEMENT CALCULATIONS
═══════════════════════════════════════════════════════════════ */

export interface PlacementResult {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * Calculate product placement based on anchor and hints
 */
export function calculatePlacement(
  bgWidth: number,
  bgHeight: number,
  productWidth: number,
  productHeight: number,
  options: {
    anchor?: string;
    x?: number;
    y?: number;
    scale?: number;
    maxWidthRatio?: number;
    maxHeightRatio?: number;
  } = {}
): PlacementResult {
  const {
    anchor = "bottom_center",
    x: customX,
    y: customY,
    scale: customScale,
    maxWidthRatio = 0.65,
    maxHeightRatio = 0.65,
  } = options;

  // Calculate max dimensions
  const maxWidth = bgWidth * maxWidthRatio;
  const maxHeight = bgHeight * maxHeightRatio;

  // Calculate scale to fit within max dimensions
  const scaleToFit = Math.min(
    maxWidth / productWidth,
    maxHeight / productHeight,
    1 // Don't upscale
  );

  // Apply custom scale
  const finalScale = (customScale || 1) * scaleToFit;
  const finalWidth = Math.round(productWidth * finalScale);
  const finalHeight = Math.round(productHeight * finalScale);

  // Calculate position based on anchor
  let x: number;
  let y: number;

  if (customX !== undefined && customY !== undefined) {
    // Custom position (normalized 0-1)
    x = Math.round(customX * bgWidth - finalWidth / 2);
    y = Math.round(customY * bgHeight - finalHeight / 2);
  } else {
    // Anchor-based positioning
    switch (anchor) {
      case "center":
        x = Math.round((bgWidth - finalWidth) / 2);
        y = Math.round((bgHeight - finalHeight) / 2);
        break;

      case "floor":
      case "bottom_center":
        x = Math.round((bgWidth - finalWidth) / 2);
        y = Math.round(bgHeight - finalHeight - bgHeight * 0.05); // 5% from bottom
        break;

      case "table":
        x = Math.round((bgWidth - finalWidth) / 2);
        y = Math.round(bgHeight * 0.35); // 35% from top (table level)
        break;

      case "bottom_left":
        x = Math.round(bgWidth * 0.1);
        y = Math.round(bgHeight - finalHeight - bgHeight * 0.05);
        break;

      case "bottom_right":
        x = Math.round(bgWidth * 0.9 - finalWidth);
        y = Math.round(bgHeight - finalHeight - bgHeight * 0.05);
        break;

      case "top_center":
        x = Math.round((bgWidth - finalWidth) / 2);
        y = Math.round(bgHeight * 0.1);
        break;

      default:
        // Default to bottom center
        x = Math.round((bgWidth - finalWidth) / 2);
        y = Math.round(bgHeight - finalHeight - bgHeight * 0.08);
    }
  }

  // Clamp to canvas bounds
  x = Math.max(0, Math.min(bgWidth - finalWidth, x));
  y = Math.max(0, Math.min(bgHeight - finalHeight, y));

  return {
    x,
    y,
    width: finalWidth,
    height: finalHeight,
    scale: finalScale,
  };
}

/* ═══════════════════════════════════════════════════════════════
   ALPHA CHANNEL UTILITIES
═══════════════════════════════════════════════════════════════ */

/**
 * Ensure image has alpha channel
 */
export async function ensureAlpha(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();

  if (meta.hasAlpha) {
    return buffer;
  }

  // Add alpha channel
  return sharp(buffer).ensureAlpha().png().toBuffer();
}

/**
 * Check if product has valid transparency
 */
export async function hasValidTransparency(buffer: Buffer): Promise<boolean> {
  const meta = await sharp(buffer).metadata();

  if (!meta.hasAlpha) {
    return false;
  }

  // Check alpha channel stats
  const alphaStats = await sharp(buffer).extractChannel("alpha").stats();

  // Should have some transparent and some opaque pixels
  const alphaMin = alphaStats.channels[0]?.min || 255;
  const alphaMax = alphaStats.channels[0]?.max || 0;

  return alphaMin < 50 && alphaMax > 200;
}

/* ═══════════════════════════════════════════════════════════════
   OUTPUT UTILITIES
═══════════════════════════════════════════════════════════════ */

/**
 * Convert buffer to data URL
 */
export function bufferToDataUrl(buffer: Buffer, format: string = "png"): string {
  const base64 = buffer.toString("base64");
  const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return `data:${mimeType};base64,${base64}`;
}
