import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripHtml(html: string): string {
  // Remove scripts and styles entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|section|article|header|footer|main|nav)>/gi, "\n");
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const url: string = body?.url ?? "";

    if (!url) {
      return NextResponse.json({ ok: false, error: "URL requerida" }, { status: 400 });
    }

    // Validate and normalize URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ ok: false, error: "URL inválida" }, { status: 400 });
    }

    // Block private IPs / localhost
    const hostname = targetUrl.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local")
    ) {
      return NextResponse.json({ ok: false, error: "URL no permitida" }, { status: 400 });
    }

    // Fetch the page
    let html: string;
    try {
      const fetchRes = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AdGenBot/1.0)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "es,en;q=0.9",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!fetchRes.ok) {
        return NextResponse.json(
          { ok: false, error: `No se pudo acceder al sitio (HTTP ${fetchRes.status})` },
          { status: 422 }
        );
      }

      const contentType = fetchRes.headers.get("content-type") ?? "";
      if (!contentType.includes("html")) {
        return NextResponse.json(
          { ok: false, error: "El sitio no devolvió HTML" },
          { status: 422 }
        );
      }

      html = await fetchRes.text();
    } catch (fetchErr: any) {
      const msg = fetchErr?.name === "TimeoutError"
        ? "El sitio tardó demasiado en responder"
        : "No se pudo acceder al sitio";
      return NextResponse.json({ ok: false, error: msg }, { status: 422 });
    }

    // Extract text and limit size for the AI prompt
    const pageText = stripHtml(html).slice(0, 12000);

    const prompt = `Sos un experto en marketing digital. Analizá el siguiente contenido de un sitio web y extraé información del negocio para completar un perfil de marca.

CONTENIDO DEL SITIO (${targetUrl.toString()}):
---
${pageText}
---

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "nombre": "nombre del negocio o marca",
  "rubro": "industria o rubro (ej: Cosmética y skincare, Software B2B, etc.)",
  "queVendes": "descripción clara de productos o servicios que ofrece",
  "diferenciacion": "qué diferencia a este negocio de la competencia",
  "propuestaUnica": "propuesta única de valor o promesa principal",
  "clienteIdeal": "descripción del cliente o audiencia objetivo",
  "dolores": "problemas o necesidades que resuelve para sus clientes",
  "motivadores": "qué motiva a los clientes a elegir este producto o servicio",
  "palabrasSi": "palabras o frases que usa frecuentemente la marca",
  "palabrasNo": "palabras o frases que evita o que sería inadecuado usar",
  "tono": "emocional | tecnico | urgente | inspiracional"
}

Si no encontrás información suficiente para un campo, dejalo como string vacío "". No inventes datos.`;

    const resp = await client.responses.create({
      model: "gpt-4o",
      input: prompt,
    });

    const raw = (resp as any).output_text ?? "";
    let parsed: Record<string, string> | null = null;

    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        // ignore parse errors
      }
    }

    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "No se pudo interpretar la respuesta de la IA" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: parsed }, { status: 200 });
  } catch (err: any) {
    console.error("scrape-business error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Error interno" }, { status: 500 });
  }
}
