import { GoogleGenAI } from "@google/genai";
import type { MetaBatchValidatedInput } from "@/lib/validations/metaBatch";
import type { MetaPromptVariant } from "@/types/adImage";
import { META_ANGLES, type MetaAngle } from "@/lib/angles/metaAngles";

const TEXT_MODEL = "gemini-2.5-flash";

function getClient() {
  return new GoogleGenAI({});
}

function buildMetaPromptSpec(input: MetaBatchValidatedInput, angles: MetaAngle[]) {
  const style = input.brandStyle?.trim()
    ? `Brand style: ${input.brandStyle.trim()}.`
    : "Brand style: premium, clean, modern.";

  const base = input.basePrompt?.trim()
    ? `Extra context: ${input.basePrompt.trim()}`
    : "";

  return `
You are a senior Meta ads creative strategist.

TASK:
Create EXACTLY ${angles.length} distinct ad image concepts for Meta (Facebook/Instagram),
ONE concept per angle, using this exact angle list (no repeats, no missing):
${JSON.stringify(angles)}

Return ONLY valid JSON: an array of objects with fields:
- angle (must be one of the provided angles, exactly)
- headline (Spanish overlay text, max 6 words, punchy, ad-like)
- visualPrompt (English prompt optimized for image generation)

INPUT:
Product: ${input.product}
Offer: ${input.offer}
Audience: ${input.audience}
${style}
${base}

CONSTRAINTS (for each concept):
- visualPrompt must specify composition, background, lighting, camera, props, mood.
- Must include: "leave negative space for text overlay".
- High-performing Meta creative: high contrast, clear focal point, minimal clutter.
- Avoid exaggerated or regulated claims; keep brand-safe.
- No watermarks, no logos unless asked.
- Each concept must strongly reflect its angle.

OUTPUT: JSON array ONLY.
`.trim();
}

function safeParseJsonArray(text: string): any[] | null {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateMetaPromptVariants(
  input: MetaBatchValidatedInput
): Promise<MetaPromptVariant[]> {
  // si variants no viene, generamos TODOS los ángulos
  const n = input.variants ?? META_ANGLES.length;
  const angles = META_ANGLES.slice(0, n);

  const ai = getClient();
  const prompt = buildMetaPromptSpec(input, angles);

  const resp = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.9,
      responseMimeType: "application/json",
    },
  });

  const raw = resp.text ?? "";
  const arr = safeParseJsonArray(raw);
  if (!arr) throw new Error("No pude parsear JSON de variantes desde Gemini.");

  // Normalización + “garantía”: ordenamos según nuestra lista y filtramos extras
  const byAngle = new Map<string, MetaPromptVariant>();
  for (const item of arr) {
    if (item?.angle && item?.headline && item?.visualPrompt) {
      byAngle.set(String(item.angle), {
        angle: String(item.angle),
        headline: String(item.headline),
        visualPrompt: String(item.visualPrompt),
      });
    }
  }

  const result: MetaPromptVariant[] = angles
    .map((a) => byAngle.get(a))
    .filter(Boolean) as MetaPromptVariant[];

  if (result.length !== angles.length) {
    const missing = angles.filter((a) => !byAngle.has(a));
    throw new Error(`Faltan ángulos: ${missing.join(", ")}`);
  }

  return result;
}
