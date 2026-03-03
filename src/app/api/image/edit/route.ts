import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

// Server-only OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: convert File (from formData) to data URL and base64
async function fileToBase64DataUrl(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = (file.type as string) || "image/png";
  const b64 = buf.toString("base64");
  return { mime, b64, dataUrl: `data:${mime};base64,${b64}` };
}

// Recursively search response for image_generation_call result base64
function findImageGenerationBase64(resp: any): string | null {
  if (!resp) return null;

  // Common shape: output array -> items -> content -> { type: 'image_generation_call', result: { b64: '...' } }
  const outputs = resp.output ?? resp.output_text ?? resp.outputs ?? resp?.output ?? [];

  const recurse = (obj: any): string | null => {
    if (!obj) return null;
    if (Array.isArray(obj)) {
      for (const it of obj) {
        const r = recurse(it);
        if (r) return r;
      }
      return null;
    }
    if (typeof obj === "object") {
      // direct tool call style
      if (obj.type === "image_generation_call" && obj.result) {
        // result may contain b64 or base64
        return obj.result?.b64 ?? obj.result?.base64 ?? null;
      }

      // some tool results appear as tool_call or as content entries
      if (obj.tool === "image_generation" && obj.result) {
        return obj.result?.b64 ?? obj.result?.base64 ?? null;
      }

      // scan fields
      for (const v of Object.values(obj)) {
        const r = recurse(v as any);
        if (r) return r;
      }
    }
    return null;
  };

  // try outputs first
  const tryFromOutputs = recurse(outputs);
  if (tryFromOutputs) return tryFromOutputs;

  // fallback: search entire resp
  return recurse(resp);
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const imageFile = form.get("image");
    const promptRaw = form.get("prompt");
    const maskFile = form.get("mask");

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: "Missing 'image' file" }, { status: 400 });
    }

    if (!promptRaw || typeof promptRaw !== "string") {
      return NextResponse.json({ error: "Missing 'prompt' string" }, { status: 400 });
    }

    const prompt = String(promptRaw).trim();
    if (!prompt) return NextResponse.json({ error: "Empty prompt" }, { status: 400 });

    // Convert files to base64/dataUrl for inclusion as inputs
    const imageData = await fileToBase64DataUrl(imageFile as File);
    let maskData = null;
    if (maskFile && maskFile instanceof File) {
      maskData = await fileToBase64DataUrl(maskFile as File);
    }

    // Build inputs for Responses API using tool 'image_generation'
    // We include the image as input_image and the prompt as input_text. If mask provided, include it and explicit instruction.
    const inputContent: any[] = [];
    inputContent.push({ type: "input_image", image_url: imageData.dataUrl });
    if (maskData) inputContent.push({ type: "input_image", image_url: maskData.dataUrl, role: "mask" });
    inputContent.push({ type: "input_text", text: prompt });

    // Call OpenAI Responses with the image_generation tool enabled.
    // Decisions: server-only, pass images inline as data URLs, expect tool to return base64 result as 'b64' or 'base64'.
    const resp = await client.responses.create({
      model: "gpt-5.2",
      tools: [{ type: "image_generation" }],
      input: [
        {
          role: "user",
          content: inputContent,
        },
      ],
    });

    // Parse response and extract base64 produced by the image_generation tool
    const b64 = findImageGenerationBase64(resp as any);
    if (!b64) {
      console.error("add-copy: no image returned", JSON.stringify(resp, null, 2));
      return NextResponse.json({ error: "No image returned by model" }, { status: 502 });
    }

    // Return base64 string only (client will render data:image/png;base64,${b64})
    return NextResponse.json({ b64 }, { status: 200 });
  } catch (err: any) {
    console.error("/api/image/edit error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}

// Notes:
// - Server-only: all OpenAI calls happen here; do not expose API keys to client.
// - We accept files via multipart/form-data, convert to data URLs and include them in the Responses API input.
// - The Responses API tool `image_generation` is expected to return a tool call result containing base64 (b64 or base64).
