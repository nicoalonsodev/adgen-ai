import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const MODEL = "gemini-2.5-flash"; // multimodal (texto + imágenes)

type AnyObj = Record<string, any>;

function clampInt(n: any, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

async function fileToInlinePart(file: File) {
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_BYTES) {
    throw new Error(
      `Imagen demasiado grande (${Math.round(file.size / 1024)}KB). Máximo 5MB.`
    );
  }
  const ab = await file.arrayBuffer();
  const base64 = Buffer.from(ab).toString("base64");
  return {
    inlineData: {
      mimeType: file.type || "image/jpeg",
      data: base64,
    },
  };
}

function buildPrompt(input: AnyObj) {
  const language = input.language ?? "es";
  const platform = input.platform ?? "meta";

  const variantsFeed = clampInt(input.variantsFeed, 1, 30, 10);
  const variantsUgc = clampInt(input.variantsUgc, 1, 30, 10);

  const business = String(input.business ?? "").trim();
  const offer = String(input.offer ?? "").trim();
  const avatar = String(input.avatar ?? "").trim();
  const objective = String(input.objective ?? "sales").trim();

  const benefits: string[] = Array.isArray(input.benefits) ? input.benefits : [];
  const pains: string[] = Array.isArray(input.pains) ? input.pains : [];
  const objections: string[] = Array.isArray(input.objections) ? input.objections : [];

  const brandTone = String(input.brandTone ?? "friendly").trim();

  const wantTestimonial = Boolean(input.useTestimonial ?? true);
  const wantUGC = Boolean(input.useUGC ?? true);

  return `
You are a senior direct-response copywriter and UGC scriptwriter specialized in Meta ads.

CRITICAL RULES ABOUT IMAGES:
- Do NOT identify the person in the image.
- Do NOT guess sensitive attributes (ethnicity, religion, health, politics, sexual orientation, exact age).
- Do NOT infer personal biography or private details.
- Only use observable non-sensitive cues (vibe, styling, setting, expression, product appearance).
- If the image is unclear: proceed with a neutral, brand-safe tone.

TASK:
Using the provided business context and any attached images (owner face and/or product), generate:
(A) ${variantsFeed} Meta FEED ad variants (hook/headline/body/cta).
(B) ${wantUGC ? variantsUgc : 0} UGC scripts for Reels/Stories (creator-style).
Language: ${language}
Platform: ${platform}

BUSINESS CONTEXT:
Business: ${business}
Offer: ${offer}
Audience avatar: ${avatar}
Objective: ${objective}
Benefits: ${benefits.join(", ")}
Pains: ${pains.join(", ")}
Objections: ${objections.join(", ")}
Brand tone: ${brandTone}

CREATIVE RULES (FEED ADS):
- Strong thumb-stopper hooks (short, punchy).
- Vary persuasion angles: pain relief, desire, proof, urgency, simplicity, authority, objection handling.
- If owner image is provided and wantTestimonial=${wantTestimonial}: include at least 3 variants in first-person testimonial style,
  but DO NOT invent personal facts. You can say "Soy el fundador/representante" without naming or claiming credentials.

CREATIVE RULES (UGC SCRIPTS for Reels/Stories):
- Conversational, human, authentic, short sentences.
- Structure each script:
  1) Hook (0-2s) - pattern interrupt
  2) Problem (2-5s)
  3) Solution/product reveal (5-12s)
  4) Benefits/proof (12-18s)
  5) CTA (18-22s)
- Include: "onScreenText" suggestions (max 6 words each) and "broll" suggestions.
- If owner image is provided: use the visual vibe to select style (friendly/professional/confident) but never mention identity.

OUTPUT FORMAT: JSON ONLY (no markdown).
{
  "feedAds": [
    { "angle": "...", "hook": "...", "headline": "...", "body": "...", "cta": "..." }
  ],
  "ugcScripts": [
    {
      "angle": "...",
      "hook": "...",
      "spoken": ["...","...","..."],
      "onScreenText": ["...","...","..."],
      "broll": ["...","..."],
      "cta": "..."
    }
  ]
}

If wantUGC=false, return "ugcScripts": [].
`.trim();
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON.");
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 415 }
      );
    }

    const form = await req.formData();

    const payloadRaw = form.get("payload");
    if (!payloadRaw || typeof payloadRaw !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing 'payload' (stringified JSON)" },
        { status: 400 }
      );
    }

    const input = safeJsonParse(payloadRaw) as AnyObj;

    const ownerImage = form.get("ownerImage");
    const productImage = form.get("productImage");

    const parts: any[] = [{ text: buildPrompt(input) }];

    if (ownerImage instanceof File && ownerImage.size > 0) {
      parts.push({ text: "OWNER IMAGE (tone/testimonial/UGC vibe reference):" });
      parts.push(await fileToInlinePart(ownerImage));
    }
    if (productImage instanceof File && productImage.size > 0) {
      parts.push({ text: "PRODUCT/OFFER IMAGE (visual cues reference):" });
      parts.push(await fileToInlinePart(productImage));
    }

    const ai = new GoogleGenAI({});
    const resp = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.9,
        responseMimeType: "application/json",
      },
    });

    const outText = resp.text ?? "";
    const parsed = safeJsonParse(outText);

    // sanity minimal (no hard fail, solo robustez)
    if (!parsed.feedAds) parsed.feedAds = [];
    if (!parsed.ugcScripts) parsed.ugcScripts = [];

    return NextResponse.json(parsed, { status: 200 });
  } catch (err: any) {
    console.error("copy generate (multimodal+ugc) error:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
