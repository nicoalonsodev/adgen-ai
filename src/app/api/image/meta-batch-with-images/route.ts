import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Modelo imagen (el que venías usando)
const IMAGE_MODEL = "gemini-2.5-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;

type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fileToInlineData(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return {
    mimeType: file.type || "image/png",
    data: buf.toString("base64"),
  };
}

function buildCreativePrompt(args: {
  profile: any;
  angle: any;
  aspectRatio: AspectRatio;
  finalBrief?: string;
  hasOwnerImage: boolean;
  hasProductImage: boolean;
}) {
  const { profile, angle, aspectRatio, finalBrief, hasOwnerImage, hasProductImage } = args;

  const businessName = profile?.identity?.name ?? "la marca";
  const offerName = profile?.offer?.name ?? "la oferta";
  const promo = profile?.offer?.promo ?? null;

  const audienceDesc = profile?.audience?.description ?? "";
  const pains = (profile?.audience?.pains ?? []).slice(0, 4);
  const desires = (profile?.audience?.desires ?? []).slice(0, 4);

  const tone = profile?.voice?.tone ?? "professional";
  const adjectives = (profile?.voice?.adjectives ?? []).slice(0, 5);

  const differentiators = (profile?.positioning?.differentiators ?? []).slice(0, 5);

  const forbiddenClaims = (profile?.compliance?.forbiddenClaims ?? []).slice(0, 8);

  const angleLabel = angle?.label ?? angle?.id ?? "angle";
  const keyMessage = angle?.keyMessage ?? "";
  const hooks: string[] = (angle?.hooks ?? []).slice(0, 5);
  const visualDirections: string[] = (angle?.visualDirections ?? []).slice(0, 8);

  const ratioHint =
    aspectRatio === "9:16"
      ? "vertical 9:16 (Stories/Reels)"
      : aspectRatio === "4:5"
      ? "vertical 4:5 (Meta Feed)"
      : aspectRatio === "1:1"
      ? "square 1:1"
      : "horizontal 16:9";

  // Instrucciones de uso de imágenes de referencia
  const ownerRef = hasOwnerImage
    ? `- Usa la imagen del dueño/representante como referencia visual para el rostro/persona (sin identificar; solo contexto creativo). Mantén rasgos generales.`
    : `- No hay imagen de dueño: usa un modelo genérico acorde al público.`;

  const productRef = hasProductImage
    ? `- Usa la imagen del producto/oferta como referencia visual del producto (forma/colores/packaging).`
    : `- No hay imagen de producto: representa el producto de forma genérica y coherente.`;

  const rawPrompt = `
Genera una imagen estilo thumbnail de YouTube/Instagram (alta conversión), cinematográfica, hiper nítida, con iluminación Orange & Teal dramática y alto contraste. Realistic photo, NOT AI-looking.

## CONTEXTO DE NEGOCIO
Marca/Negocio: ${businessName}
Oferta: ${offerName}${promo ? ` (Promo: ${promo})` : ""}
Público objetivo: ${audienceDesc}
Dolores: ${pains.join(" | ")}
Deseos: ${desires.join(" | ")}
Posicionamiento / diferenciales: ${differentiators.join(" | ")}
Tono: ${tone}
Adjetivos de voz: ${adjectives.join(" | ")}

## ÁNGULO DE VENTA
Ángulo: ${angleLabel}
Mensaje central: ${keyMessage}
Hooks sugeridos: ${hooks.join(" | ")}

Dirección visual específica del ángulo:
${visualDirections.map((v) => `- ${v}`).join("\n")}

## ESCENA VISUAL (OBLIGATORIO)
Genera UNA escena visual única y dinámica para esta variante. Evita escenas genéricas.

REGLAS CLAVE:
- El sujeto debe estar realizando UNA ACCIÓN FÍSICA CLARA (no pose neutra).
- Manos visibles interactuando con objetos reales.
- Postura corporal activa o expresiva.
- La escena debe transmitir movimiento, tensión o intención clara.

## ACCIÓN DEL SUJETO
Elige UNA acción concreta, por ejemplo:
- señalando algo importante
- usando activamente una laptop u objeto
- comparando dos cosas
- reaccionando con sorpresa, estrés o determinación
- rompiendo, separando o manipulando elementos
Evitar poses pasivas o estáticas.

## OBJETOS / PROPS
Incluye entre 1 y 3 objetos físicos relevantes:
- laptop, tablet, cables, notebook, herramientas, documentos, caja, dispositivos
- los objetos deben ser usados activamente, no solo decorativos

## CÁMARA Y ENCUADRE
Usa un encuadre cinematográfico distinto para cada variante:
- primerísimo primer plano emocional
- plano medio dinámico con ligera inclinación (dutch angle)
- cámara baja (hero shot)
- cámara lateral 45°
- plano cerrado con profundidad de campo extrema
Evitar plano medio frontal repetido.

## ENERGÍA VISUAL
Define claramente la energía de la escena:
- caótica / intensa
- enfocada / precisa
- aspiracional / limpia
- urgente / tensa
- calmada pero poderosa
La energía debe reflejarse en la postura, la luz y la composición.

## COMPOSICIÓN
- Formato: ${ratioHint}
- Sujeto humano en primer plano (pecho/rostro), expresión emocional (sorpresa/estrés/confianza) según el ángulo.
- Fondo con profundidad (bokeh / blur), ambiente tech/estudio/oficina.
- CRÍTICO: Ensure the top 1/3 of the image is a clean, out-of-focus background for text placement.
- Dejar espacio negativo claro en la parte superior (30–40% del alto) para texto overlay posterior.
- Evitar que el fondo sea ruidoso o con elementos distractores en el área superior.
${ownerRef}
${productRef}

## ESTILO VISUAL & ILUMINACIÓN
- Look thumbnail "pro", hiperrealista, moderno, estilo YouTube/Meta de alta conversión.
- Orange and Teal lighting (naranja cálido en sujeto, azul/cian en fondo).
- Cyberpunk cinematic lighting: luces neón cian/magenta/azul como rim light y acentos.
- Color grading teal/purple, rim light intenso, detalle alto.
- Iluminación dramática con alto contraste que detiene el scroll.

## REALISMO (EVITAR EFECTO IA)
- Avoid plastic skin textures, add natural skin pores and realistic depth of field.
- Texturas de piel naturales con poros visibles, NO piel plástica o artificial.
- Profundidad de campo realista (bokeh natural, no artificial).
- Detalles en ojos, cabello y ropa con textura real.

## REGLAS CRÍTICAS
⛔ NO TEXT, NO LETTERS, NO WORDS, NO LOGOS, NO WATERMARKS.
⛔ No incluir pantallas, carteles o superficies con texto legible.
⛔ Evitar claims prohibidos: ${forbiddenClaims.join(" | ") || "promesas absolutas, curas, garantizado"}

${finalBrief ? `## BRIEF ADICIONAL DEL USUARIO\n${finalBrief}\n` : ""}

Salida: genera únicamente la imagen final, estilo ad creativo cinematográfico listo para Meta.
`.trim();
  // Eliminar líneas que contengan instrucciones de copy para no pasarlas a Gemini
  const forbiddenLineRe = /^\s*(headline:|texto:|hook:)\s*/i;
  const cleaned = rawPrompt
    .split("\n")
    .filter((l) => !forbiddenLineRe.test(l))
    .join("\n")
    .trim();

  return cleaned;
}
async function geminiGenerateImage(args: {
  prompt: string;
  ownerInline?: { mimeType: string; data: string };
  productInline?: { mimeType: string; data: string };
}) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const parts: any[] = [{ text: args.prompt }];

  // Inyectamos una instrucción fuerte para evitar texto en la imagen
  parts.push({ text: 'CRITICAL RULE: NO TEXT, NO LETTERS, NO WORDS, NO LOGOS, NO WATERMARKS IN THE IMAGE. Leave clean space for overlay.' });

  // Adjuntamos imágenes como contexto (multimodal)
  if (args.ownerInline) {
    parts.push({
      inlineData: {
        mimeType: args.ownerInline.mimeType,
        data: args.ownerInline.data,
      },
    });
  }

  if (args.productInline) {
    parts.push({
      inlineData: {
        mimeType: args.productInline.mimeType,
        data: args.productInline.data,
      },
    });
  }

  const body = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  };

  // Retry simple ante 429
  let lastErr: any = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) return data;

    lastErr = data;

    const status = data?.error?.status;
    const code = data?.error?.code;

    // 429 / RESOURCE_EXHAUSTED
    if (res.status === 429 || status === "RESOURCE_EXHAUSTED" || code === 429) {
      await sleep(1200 * (attempt + 1));
      continue;
    }

    throw new Error(JSON.stringify(data?.error ?? data));
  }

  throw new Error(JSON.stringify(lastErr?.error ?? lastErr ?? { error: "Gemini error" }));
}

function extractFirstInlineImage(data: any): { mimeType: string; base64: string } | null {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inlineData = p?.inlineData;
    if (inlineData?.data) {
      return {
        mimeType: inlineData?.mimeType ?? "image/png",
        base64: inlineData.data,
      };
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 415 }
      );
    }

    const form = await req.formData();
    const payloadRaw = form.get("payload");

    if (!payloadRaw || typeof payloadRaw !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing payload (JSON string) in form-data" },
        { status: 400 }
      );
    }

    const payload = JSON.parse(payloadRaw);
    const profile = payload?.profile;
    const variants = Math.max(1, Math.min(30, Number(payload?.variants ?? 12)));
    const aspectRatio = (payload?.aspectRatio ?? "4:5") as AspectRatio;
    const finalBrief = typeof payload?.finalBrief === "string" ? payload.finalBrief : undefined;

    if (!profile) {
      return NextResponse.json({ ok: false, error: "payload.profile is required" }, { status: 400 });
    }

    const angles: any[] = Array.isArray(profile?.angles) ? profile.angles : [];
    if (!angles.length) {
      return NextResponse.json(
        { ok: false, error: "profile.angles is empty. Run ingest first." },
        { status: 400 }
      );
    }

    const ownerImage = form.get("ownerImage");
    const productImage = form.get("productImage");

    const ownerInline = ownerImage instanceof File ? await fileToInlineData(ownerImage) : undefined;
    const productInline = productImage instanceof File ? await fileToInlineData(productImage) : undefined;

    // Selección de ángulos (tomamos los primeros N; podrías randomizar luego)
    const selectedAngles = angles.slice(0, variants);

    const items = [];
    for (let i = 0; i < selectedAngles.length; i++) {
      const angle = selectedAngles[i];

      const prompt = buildCreativePrompt({
        profile,
        angle,
        aspectRatio,
        finalBrief,
        hasOwnerImage: !!ownerInline,
        hasProductImage: !!productInline,
      });

      const geminiResp = await geminiGenerateImage({
        prompt,
        ownerInline,
        productInline,
      });

      const img = extractFirstInlineImage(geminiResp);
      if (!img) {
        // Si no devolvió inline image, devolvemos error parcial pero no rompemos todo
        items.push({
          angle: angle?.id ?? `angle_${i + 1}`,
          headline: (angle?.hooks?.[0] ?? angle?.keyMessage ?? "").slice(0, 120),
          dataUrl: "",
          mimeType: "",
          model: IMAGE_MODEL,
          error: "No image returned by model",
        });
        continue;
      }

      const dataUrl = `data:${img.mimeType};base64,${img.base64}`;

      items.push({
        angle: angle?.id ?? `angle_${i + 1}`,
        headline: (angle?.hooks?.[0] ?? angle?.keyMessage ?? "").slice(0, 120),
        dataUrl,
        mimeType: img.mimeType,
        model: IMAGE_MODEL,
      });

      // Pequeña pausa para evitar rate-limit agresivo
      await sleep(250);
    }

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (err: any) {
    console.error("meta-batch-with-images error:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
