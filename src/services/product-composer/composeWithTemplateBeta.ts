/**
 * TEMPLATE_BETA mode
 *
 * Pipeline simplificado:
 *   background + copy + templateId → imagen renderizada
 *
 * Sin IA, sin análisis de background, sin placement de producto.
 * Determinístico 100%.
 */

import sharp from "sharp";
import { renderTextOnImage } from "./textRenderer";
import { getTemplate } from "./templates/index";
import { getTemplateMeta } from "./templates/meta";
import type { ComposeRequest } from "./types";

export interface TemplateBetaOptions {
  /** ID del template a usar (default: "classic-editorial-right") */
  templateId?: string;
  /** Tamaño del canvas (default: 1080x1080) */
  canvas?: { width: number; height: number };
  /** Devolver el layoutSpec en la respuesta */
  includeLayoutSpec?: boolean;
}

export async function composeWithTemplateBeta(
  req: ComposeRequest,
  options: TemplateBetaOptions = {},
) {
  const t0 = Date.now();

  if (!req.backgroundBuffer)
    throw new Error("TEMPLATE_BETA requiere backgroundBuffer");

  const templateId = options.templateId ?? "classic-editorial-right";
  const canvas = options.canvas ?? { width: 1080, height: 1080 };

  // 1) Normalizar background al tamaño del canvas
  const bgNormalized = await sharp(req.backgroundBuffer)
    .resize(canvas.width, canvas.height, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  // 2) Construir layout desde el template
  const template = getTemplate(templateId);
  const layout = template.buildLayout(
    {
      title: req.copy?.cta, // línea superior (ingredientes/tagline) para classic-editorial
      headline: req.copy?.headline,
      subheadline: req.copy?.subheadline,
      badge: req.copy?.badge,
      cta: req.copy?.cta, // botón CTA para promo-urgencia-bottom y similares
      bullets: req.copy?.bullets,
      columnTitle: req.copy?.columnTitle,
      competitionTitle: req.copy?.competitionTitle,
      competitionBullets: req.copy?.competitionBullets,
      primaryColor: req.copy?.primaryColor,
      brandColors: req.copy?.brandColors,
    } as Parameters<typeof template.buildLayout>[0],
    canvas,
  );

  // 3) Renderizar texto sobre el background
  const rendered = await renderTextOnImage({
    baseImage: bgNormalized,
    layout,
    debug: false,
  });

  // Templates que no usan logo (layout propio sin espacio para él)
  const meta = getTemplateMeta(templateId);

  // 4) Logo overlay (si el perfil de negocio tiene logo guardado)
  let finalBuffer = rendered.buffer;
  if (req.logoBase64 && !meta?.noLogo) {
    const logoBuffer = Buffer.from(req.logoBase64, "base64");
    const logoMaxW = Math.round(canvas.width * 0.18);
    const logoMaxH = Math.round(canvas.height * 0.08);
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const logoPadding = Math.round(canvas.width * 0.04);

    // Centrar logo horizontalmente para templates que lo requieren en el centro
    const logoMeta = await sharp(resizedLogo).metadata();
    const logoW = logoMeta.width ?? logoMaxW;
    const logoLeft = meta?.logoPosition === "center"
      ? Math.round((canvas.width - logoW) / 2)
      : logoPadding;

    finalBuffer = await sharp(finalBuffer)
      .composite([{ input: resizedLogo, left: logoLeft, top: logoPadding, blend: "over" }])
      .png()
      .toBuffer();
  }

  return {
    success: true,
    buffer: finalBuffer,
    layoutSpec: options.includeLayoutSpec !== false ? layout : undefined,
    templateId: templateId, // ← AGREGAR
    timings: {
      total: Date.now() - t0,
      renderText: rendered.renderTimeMs,
    },
  };
}
