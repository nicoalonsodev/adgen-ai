import sharp from "sharp";

export const LOGO_CANVAS_W = 600;
export const LOGO_CANVAS_H = 200;

/**
 * Normalizes a logo image to a canonical 600×200 px transparent PNG.
 *
 * Steps:
 *   1. Trim transparent border pixels (alpha threshold 10)
 *   2. Scale to contain inside 600×200 preserving aspect ratio (lanczos3)
 *   3. Composite centered on a 600×200 transparent canvas
 *
 * Supports any format Sharp accepts: PNG, JPG, WebP, SVG.
 */
export async function normalizeLogo(inputBuffer: Buffer): Promise<Buffer> {
  const inputMeta = await sharp(inputBuffer).metadata();
  console.log(`[normalizeLogo] input: ${inputMeta.width}x${inputMeta.height} format=${inputMeta.format}`);

  // 1. Trim transparent/near-transparent border
  const trimmed = await sharp(inputBuffer)
    .trim({ threshold: 10 })
    .toBuffer();

  const { width: trimW = 1, height: trimH = 1 } = await sharp(trimmed).metadata();
  console.log(`[normalizeLogo] after trim: ${trimW}x${trimH}`);

  // 2. Calculate scale for contain inside LOGO_CANVAS_W × LOGO_CANVAS_H
  const scale = Math.min(LOGO_CANVAS_W / trimW, LOGO_CANVAS_H / trimH);
  const resizedW = Math.max(1, Math.round(trimW * scale));
  const resizedH = Math.max(1, Math.round(trimH * scale));

  // 3. Resize with lanczos3 for maximum quality
  const resized = await sharp(trimmed)
    .resize(resizedW, resizedH, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  // 4. Composite centered on transparent 600×200 canvas
  const left = Math.round((LOGO_CANVAS_W - resizedW) / 2);
  const top = Math.round((LOGO_CANVAS_H - resizedH) / 2);

  console.log(`[normalizeLogo] resized to ${resizedW}x${resizedH}, placed at left=${left} top=${top} on 600x200 canvas`);

  return sharp({
    create: {
      width: LOGO_CANVAS_W,
      height: LOGO_CANVAS_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}
