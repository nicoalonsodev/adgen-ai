import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const imageDataUrl = String(body?.imageDataUrl ?? "");
    const expectedLines: string[] = Array.isArray(body?.expectedLines) ? body!.expectedLines : [];

    if (!imageDataUrl || expectedLines.length === 0) {
      return NextResponse.json({ ok: false, error: "imageDataUrl and expectedLines are required" }, { status: 400 });
    }

    const prompt = `Leé el texto de la imagen y devolvé JSON con un array 'lines' (ordenadas de arriba a abajo). Devuelve SOLO JSON.\nCompará con expectedLines exacto (case, puntuación, acentos).\nEjemplo de salida: { \"lines\": [\"HEADLINE\", \"SUBHEADLINE\", \"CTA\"] }`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          // multimodal: image + prompt
          content: [
            { type: "input_image", image_url: imageDataUrl },
            { type: "input_text", text: prompt },
          ],
        },
      ],
    });

    const outputText = (response as any).output_text ?? (response as any).output?.[0]?.content?.map((c: any) => c?.text).join("\n");
    if (!outputText) return NextResponse.json({ ok: false, match: false, issues: ["No response from model"] }, { status: 200 });

    // Try to extract JSON from outputText
    let parsed: any = null;
    try {
      const j = outputText.trim();
      // If response is JSON directly
      parsed = JSON.parse(j);
    } catch (e) {
      // try to find first JSON block
      const m = outputText.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch (e) {
          parsed = null;
        }
      }
    }

    if (!parsed || !Array.isArray(parsed.lines)) {
      return NextResponse.json({ ok: true, match: false, issues: ["No lines parsed from vision model"] }, { status: 200 });
    }

    const detected: string[] = parsed.lines.map((s: any) => String(s ?? "").trim());

    const issues: string[] = [];
    let allMatch = true;
    for (let i = 0; i < expectedLines.length; i++) {
      const exp = String(expectedLines[i] ?? "").trim();
      const got = String(detected[i] ?? "").trim();
      if (exp !== got) {
        allMatch = false;
        issues.push(`Line ${i + 1}: expected '${exp}' but got '${got}'`);
      }
    }

    return NextResponse.json({ ok: true, match: allMatch, issues }, { status: 200 });
  } catch (err: any) {
    console.error("qa-verify-image-text error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
