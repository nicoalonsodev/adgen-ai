import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "creatives";
const THUMB_SIZE = 600; // 600x600 thumbnail 1:1 para la web

export interface UploadCreativeImagesResult {
  originalUrl: string;
  originalPath: string;
  thumbnailUrl: string;
  thumbnailPath: string;
  width: number;
  height: number;
}

/**
 * Sube original + thumbnail en paralelo.
 *
 * Estructura en Storage:
 *   {userId}/{creativeId}/original.png   ← descarga
 *   {userId}/{creativeId}/thumbnail.webp ← mostrar en web
 */
export async function uploadCreativeImages(
  userId: string,
  creativeId: string,
  imageBuffer: Buffer
): Promise<UploadCreativeImagesResult> {
  const basePath = `${userId}/${creativeId}`;

  // Obtener dimensiones del original
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1080;
  const height = metadata.height ?? 1080;

  // Generar thumbnail 1:1 webp en memoria
  const thumbnailBuffer = await sharp(imageBuffer)
    .resize(THUMB_SIZE, THUMB_SIZE, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 82 })
    .toBuffer();

  const originalPath = `${basePath}/original.png`;
  const thumbnailPath = `${basePath}/thumbnail.webp`;

  // Subir original + thumbnail en paralelo
  const [originalResult, thumbnailResult] = await Promise.all([
    supabaseAdmin.storage.from(BUCKET).upload(originalPath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    }),
    supabaseAdmin.storage.from(BUCKET).upload(thumbnailPath, thumbnailBuffer, {
      contentType: "image/webp",
      upsert: true,
    }),
  ]);

  if (originalResult.error)
    throw new Error(`Storage error (original): ${originalResult.error.message}`);
  if (thumbnailResult.error)
    throw new Error(`Storage error (thumbnail): ${thumbnailResult.error.message}`);

  const { data: originalData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(originalPath);
  const { data: thumbnailData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(thumbnailPath);

  return {
    originalUrl: originalData.publicUrl,
    originalPath,
    thumbnailUrl: thumbnailData.publicUrl,
    thumbnailPath,
    width,
    height,
  };
}

/**
 * Genera y sube compressed.webp ON-DEMAND.
 * Solo se llama cuando el usuario la solicita explícitamente.
 * Mantiene resolución original, convierte a webp quality 75.
 */
export async function generateCompressedImage(
  userId: string,
  creativeId: string
): Promise<string> {
  const basePath = `${userId}/${creativeId}`;

  const { data: originalFile, error: downloadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(`${basePath}/original.png`);

  if (downloadError || !originalFile)
    throw new Error(`No se pudo descargar la original: ${downloadError?.message}`);

  const originalBuffer = Buffer.from(await originalFile.arrayBuffer());

  const compressedBuffer = await sharp(originalBuffer)
    .webp({ quality: 75, effort: 6 })
    .toBuffer();

  const compressedPath = `${basePath}/compressed.webp`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(compressedPath, compressedBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError)
    throw new Error(`Storage error (compressed): ${uploadError.message}`);

  // Marcar en DB que ya existe la versión comprimida
  await supabaseAdmin
    .from("creatives")
    .update({ has_compressed: true })
    .eq("id", creativeId);

  const { data } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(compressedPath);

  return data.publicUrl;
}
