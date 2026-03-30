import { GoogleGenAI } from "@google/genai";

function getGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

export interface ProductInfo {
  product?: string;
  offer?: string;
  audience?: string;
  problem?: string;
  tone?: "emocional" | "tecnico" | "urgente" | "inspiracional";
}

export async function extractProductInfoFromText(rawText: string): Promise<ProductInfo> {
  const genAI = getGeminiClient();

  const prompt = `Sos un experto en marketing digital. Analizá el siguiente texto sobre un producto o negocio y extraé información estructurada.

TEXTO:
---
${rawText}
---

Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, sin bloques de código, sin texto extra antes ni después. Usá exactamente esta estructura:
{"product":"...","offer":"...","audience":"...","problem":"...","tone":"emocional"}

Reglas:
- product: nombre y descripción concisa del producto/servicio (máx 80 chars)
- offer: oferta o promoción principal, o string vacío si no hay
- audience: público objetivo, o string vacío si no se menciona
- problem: problema principal que resuelve, máx 80 chars
- tone: EXACTAMENTE uno de estos valores: emocional, tecnico, urgente, inspiracional
- Si no tenés info para un campo, dejá string vacío`;

  console.log(`[productExtractor] Llamando Gemini model=${GEMINI_TEXT_MODEL} textLength=${rawText.length}`);

  const result = await genAI.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  // Log the full result structure to diagnose
  const finishReason = (result as any).candidates?.[0]?.finishReason;
  const rawText1: string = (result as any).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const rawText2: string = typeof (result as any).text === "string" ? (result as any).text : "";
  console.log(`[productExtractor] finishReason=${finishReason} text1Len=${rawText1.length} text2Len=${rawText2.length}`);
  console.log(`[productExtractor] text1="${rawText1.slice(0, 400)}"`);

  const raw = (rawText1 || rawText2).trim();

  // Strip markdown code fences if Gemini adds them despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  console.log(`[productExtractor] cleaned="${cleaned.slice(0, 400)}"`);

  const validTones = ["emocional", "tecnico", "urgente", "inspiracional"] as const;

  try {
    const parsed = JSON.parse(cleaned) as ProductInfo;
    if (!validTones.includes(parsed.tone as typeof validTones[number])) {
      parsed.tone = "emocional";
    }
    console.log(`[productExtractor] Parsed OK: product="${parsed.product}" tone="${parsed.tone}"`);
    return parsed;
  } catch (e) {
    console.error(`[productExtractor] JSON.parse falló. cleaned="${cleaned}" error=${e}`);
    // Last resort: try to extract JSON with regex
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as ProductInfo;
        if (!validTones.includes(parsed.tone as typeof validTones[number])) {
          parsed.tone = "emocional";
        }
        console.log(`[productExtractor] Parsed via regex OK: product="${parsed.product}"`);
        return parsed;
      } catch {
        // ignore
      }
    }
    return { tone: "emocional" };
  }
}
