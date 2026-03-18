import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripHtml(html: string): string {
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<\/(p|div|h[1-6]|li|section|article|header|footer|main|nav)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// Slug patterns that typically contain business info (about, products, contact)
const RELEVANT_SLUGS = [
  "about", "nosotros", "quienes-somos", "quien-somos", "empresa", "historia",
  "productos", "servicios", "catalogo", "catalogue", "products", "services",
  "soluciones", "solutions", "ofertas", "que-hacemos", "what-we-do",
];

/**
 * Extract internal links from HTML that likely lead to informative subpages.
 * Returns up to `limit` absolute URLs.
 */
function extractSubpageLinks(html: string, base: URL, limit = 3): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const hrefs = html.matchAll(/href\s*=\s*["']([^"'#?]+)["']/gi);
  for (const m of hrefs) {
    if (results.length >= limit) break;
    const raw = m[1].trim();
    if (!raw || raw === "/" || raw.match(/\.(pdf|jpg|png|gif|svg|zip|css|js)$/i)) continue;

    let absolute: string;
    try {
      absolute = new URL(raw, base).toString();
    } catch {
      continue;
    }

    // Must be same origin
    if (!absolute.startsWith(base.origin)) continue;
    // Avoid the homepage itself
    if (absolute === base.toString() || absolute === base.origin + "/") continue;

    const path = absolute.replace(base.origin, "").toLowerCase();
    const isRelevant = RELEVANT_SLUGS.some((slug) => path.includes(slug));
    if (!isRelevant) continue;
    if (seen.has(absolute)) continue;

    seen.add(absolute);
    results.push(absolute);
  }

  return results;
}

/** Fetch a single page and return its stripped text (empty string on failure) */
async function fetchPageText(url: string, ua: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return "";
    const html = await res.text();
    return stripHtml(html);
  } catch {
    return "";
  }
}

function isBrandColor(r: number, g: number, b: number): boolean {
  const isNearWhite = r > 235 && g > 235 && b > 235;
  const isNearBlack = r < 25 && g < 25 && b < 25;
  const isGray = Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && Math.abs(r - b) < 18;
  return !isNearWhite && !isNearBlack && !isGray;
}

/**
 * Fetch external CSS files linked in the HTML (up to `limit` files).
 * Returns combined CSS text, empty string on full failure.
 */
async function fetchExternalCss(html: string, base: URL, ua: string, limit = 3): Promise<string> {
  const urls = new Set<string>();

  // Match <link rel="stylesheet" href="..."> in both attribute orders
  for (const pattern of [
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+href=["']([^"']+\.css[^"'?#]*)["'][^>]*>/gi,
  ]) {
    for (const m of html.matchAll(pattern)) {
      if (urls.size >= limit) break;
      try { urls.add(new URL(m[1], base).toString()); } catch { /* skip */ }
    }
  }

  const texts = await Promise.all(
    [...urls].slice(0, limit).map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": ua, "Accept": "text/css,*/*" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return "";
        return (await res.text()).slice(0, 60000);
      } catch {
        return "";
      }
    })
  );

  return texts.filter(Boolean).join("\n");
}

interface ColorScore { hex: string; count: number; score: number }

/**
 * Count color occurrences across all CSS with context-based weighting.
 * High-priority contexts (root vars, buttons, backgrounds, brand selectors) get 3× weight.
 * Returns top candidates sorted by score descending.
 */
function scoreColors(cssText: string): ColorScore[] {
  const scores = new Map<string, { count: number; score: number }>();
  const hexRe = /#([0-9a-fA-F]{6})\b/g;
  let m: RegExpExecArray | null;

  while ((m = hexRe.exec(cssText)) !== null) {
    const hex = `#${m[1].toUpperCase()}`;
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    if (!isBrandColor(r, g, b)) continue;

    // Context: look at the 250 chars before this hex occurrence
    const before = cssText.slice(Math.max(0, m.index - 250), m.index);
    const isHighPriority = /:root|button|\.btn|background|primary|brand|cta|header|nav|accent|color:/i.test(before);
    const weight = isHighPriority ? 3 : 1;

    const prev = scores.get(hex) ?? { count: 0, score: 0 };
    scores.set(hex, { count: prev.count + 1, score: prev.score + weight });
  }

  return [...scores.entries()]
    .map(([hex, { count, score }]) => ({ hex, count, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

/** Collect all CSS from a page HTML (style tags + inline styles) */
function extractInlineCss(html: string): string {
  const chunks: string[] = [];
  for (const m of html.matchAll(/<style[\s\S]*?>([\s\S]*?)<\/style>/gi)) chunks.push(m[1]);
  for (const m of html.matchAll(/style\s*=\s*["']([^"']+)["']/gi)) chunks.push(m[1]);
  return chunks.join("\n");
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

    let targetUrl: URL;
    try {
      targetUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ ok: false, error: "URL inválida" }, { status: 400 });
    }

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

    const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    let html: string;
    try {
      const fetchRes = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
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

    // Fetch subpages + external CSS in parallel
    const subpageUrls = extractSubpageLinks(html, targetUrl, 3);
    const [subpageTexts, externalCss] = await Promise.all([
      Promise.all(subpageUrls.map((u) => fetchPageText(u, BROWSER_UA))),
      fetchExternalCss(html, targetUrl, BROWSER_UA, 3),
    ]);

    // Budget: 8000 chars for homepage + 2000 per subpage
    const homeText = stripHtml(html).slice(0, 8000);
    const extraText = subpageTexts
      .map((t, i) => t ? `\n--- ${subpageUrls[i]} ---\n${t.slice(0, 2000)}` : "")
      .join("")
      .trim();

    // Score colors from all CSS sources combined
    const inlineCss = extractInlineCss(html);
    const allCss = [inlineCss, externalCss].filter(Boolean).join("\n");
    const topColors = scoreColors(allCss);
    const colorsSection = topColors.length > 0
      ? `\nCOLORES DEL SITIO (ordenados por frecuencia de uso en CSS): ${topColors.map(c => `${c.hex}(score:${c.score})`).join(", ")}\n`
      : "";

    const contentSection = extraText
      ? `${homeText}\n\n[PÁGINAS ADICIONALES ANALIZADAS]\n${extraText}`
      : homeText;

    const prompt = `Sos un experto en marketing digital y branding. Analizá el siguiente contenido de un sitio web y extraé información del negocio para completar un perfil de marca.

CONTENIDO DEL SITIO (${targetUrl.toString()}):
---
${contentSection}
---
${colorsSection}
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
  "tono": "emocional | tecnico | urgente | inspiracional",
  "coloresMarca": ["#HEXCOLOR1", "#HEXCOLOR2"]
}

Para "coloresMarca": los colores están ordenados por frecuencia ponderada de uso en el CSS del sitio (mayor score = más usado). Elegí UNO solo — el color principal de la marca (el más usado en botones, encabezados, CTAs o variables de diseño). Devolvé un array con ese único hex: ["#XXXXXX"]. Si no hay colores provistos o no podés identificar un color de marca claro, devolvé [].
Para el resto de los campos, si no encontrás información suficiente dejalo como string vacío "". No inventes datos.`;

    const resp = await client.responses.create({
      model: "gpt-4o",
      input: prompt,
    });

    const raw = (resp as any).output_text ?? "";
    let parsed: Record<string, unknown> | null = null;

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
