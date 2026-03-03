import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const profile = body?.profile ?? {};
    const angle = body?.angle ?? {};
    const style = String(body?.style ?? "premium");

    const prompt = `Generá tres líneas de copy publicitario en español para un anuncio Meta basándote en este perfil y ángulo. Respondé exclusivamente en JSON con keys: line1, line2, line3. Perfil: ${JSON.stringify(
      profile
    )} Ángulo: ${JSON.stringify(angle)} Estilo: ${style}. Línea1 = headline (máx 60 chars). Línea2 = promesa/beneficio (máx 80). Línea3 = oferta/CTA (máx 40).`;

    const resp = await client.responses.create({ model: "gpt-5.2", input: prompt });
    const raw = (resp as any).output_text ?? null;
    let parsed = null;
    if (raw) {
      // Try to extract JSON from the text
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {}
      }
    }

    // Fallback: try to parse structured fields from output
    if (!parsed) {
      const txt = raw ?? (resp as any).output?.map((o: any) => (o?.content?.map((c: any) => c?.text ?? "").join("\n") ?? "")).join("\n") ?? "";
      const lines = txt.split(/\n+/).map((s: string) => s.trim()).filter(Boolean);
      parsed = { line1: lines[0] ?? "", line2: lines[1] ?? "", line3: lines[2] ?? "" };
    }

    return NextResponse.json({ ok: true, copy: parsed }, { status: 200 });
  } catch (err: any) {
    console.error("generate-gpt error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal" }, { status: 500 });
  }
}
