/**
 * testimonio-review
 * ─────────────────
 * Layout tipo testimonial / review con estrellas.
 *
 * Estructura (9:16 default — adaptable a 4:5 y 1:1):
 *   ┌──────────────────────┐
 *   │      ★ ★ ★ ★ ★      │  ← 5 estrellas SVG (accentColor)
 *   │                      │
 *   │  "Cita textual del   │  ← headline (Lora 400, centrado)
 *   │   testimonio aquí"   │
 *   │                      │
 *   │     — Nombre         │  ← badge (Montserrat 500, centrado)
 *   │                      │
 *   │   ┌──────────────┐   │
 *   │   │   PERSONA    │   │  ← productZone (sceneGeneration)
 *   │   │  (generada)  │   │
 *   │   └──────────────┘   │
 *   └──────────────────────┘
 *
 * Pipeline:
 *   GENERATE_COPY → GENERATE_BACKGROUND (solid color) →
 *   TEMPLATE_BETA (stars SVG + quote + attribution) →
 *   PRODUCT_IA sceneMode (genera persona en la mitad inferior)
 *
 * requiresSceneGeneration = true
 * copyZone = "center" (texto centrado, persona abajo)
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

/* ------------------------------------------------------------------ */
/*  SVG: 5 estrellas de rating                                        */
/* ------------------------------------------------------------------ */

function generateStarsSvg(
  CW: number,
  CH: number,
  accentColor: string,
  count: number = 5
): string {
  const size = Math.round(CW * 0.054); // diámetro estrella ~58px @1080 (era 0.038 → más grande)
  const gap = Math.round(CW * 0.014); // separación ~15px @1080
  const totalW = count * size + (count - 1) * gap;
  const x0 = Math.round((CW - totalW) / 2);
  const cy = Math.round(CH * 0.14); // centro vertical de las estrellas (debajo del logo ~12%)
  const strokeW = Math.max(2, Math.round(size * 0.06)); // grosor del borde

  const starPoints = (cx: number, cy: number, r: number): string => {
    const ri = r * 0.38; // radio interior
    const pts: string[] = [];
    for (let i = 0; i < 5; i++) {
      // Punto exterior
      const oa = -Math.PI / 2 + (2 * Math.PI * i) / 5;
      pts.push(
        `${(cx + r * Math.cos(oa)).toFixed(1)},${(cy + r * Math.sin(oa)).toFixed(1)}`
      );
      // Punto interior
      const ia = oa + Math.PI / 5;
      pts.push(
        `${(cx + ri * Math.cos(ia)).toFixed(1)},${(cy + ri * Math.sin(ia)).toFixed(1)}`
      );
    }
    return pts.join(" ");
  };

  let svg = "";
  for (let i = 0; i < count; i++) {
    const cx = x0 + i * (size + gap) + size / 2;
    // Fill blanco para máximo contraste sobre cualquier fondo de color; stroke con color de marca
    svg += `<polygon points="${starPoints(cx, cy, size / 2)}" fill="#FFFFFF" stroke="${accentColor}" stroke-width="${strokeW}" />`;
  }
  return svg;
}

/* ------------------------------------------------------------------ */
/*  Build layout                                                       */
/* ------------------------------------------------------------------ */

export function buildTestimonioReviewLayout(
  copy: TemplateCopy,
  canvas: { width: number; height: number }
): LayoutSpec {
  const CW = canvas.width;
  const CH = canvas.height;
  const isStory = CH / CW > 1.5; // 9:16
  const isTall = CH / CW > 1.2; // 4:5 o más alto

  // primaryColor from copy takes priority (brand color), fallback to accentColor, then default pink
  const accent =
    (copy as Record<string, unknown>).primaryColor as string ??
    (copy as Record<string, unknown>).accentColor as string ??
    "#E91E8C";

  /* ---------- texto del testimonio (comillas tipográficas) ---------- */
  const raw = (copy.headline ?? "").trim();
  const needsQuotes =
    raw.length > 0 && !raw.startsWith("\u201C") && !raw.startsWith('"');
  const quoteText = needsQuotes ? `\u201C${raw}\u201D` : raw;

  /* ---------- atribución ---------- */
  const attr = (copy.badge ?? "").trim();
  const attribution =
    attr.length > 0
      ? attr.startsWith("-") || attr.startsWith("\u2014")
        ? attr
        : `\u2014 ${attr}`
      : "";

  /* ---------- SVG estrellas ---------- */
  const starsSvg = generateStarsSvg(CW, CH, accent);

  /* ---------- posiciones adaptativas (% del canvas) ---------- */
  // quoteY starts at 19% — below logo (~12%) + stars (~14%) + gap
  const quoteY = 19;
  const quoteH = isStory ? 28 : isTall ? 28 : 26;
  const attrY  = 48; // after quote ends at ~45-47%
  const personY = isStory ? 54 : isTall ? 53 : 52;
  const personH = isStory ? 46 : isTall ? 47 : 48;

  /* ---------- tipografía ---------- */
  const quoteFontSize = Math.round(
    CW * (isStory ? 0.048 : isTall ? 0.050 : 0.052)
  );
  const attrFontSize = Math.round(CW * 0.032);

  return {
    canvas: { width: CW, height: CH },
    overlays: [],
    textBlocks: [
      {
        id: "headline",
        content: quoteText,
        x: Math.round(CW * 0.08),
        y: Math.round(CH * quoteY / 100),
        w: Math.round(CW * 0.84),
        h: Math.round(CH * quoteH / 100),
        fontFamily: "Lora",
        fontSize: quoteFontSize,
        fontWeight: "400",
        color: "#1A1A1A",
        align: "center",
        lineHeight: 1.4,
        maxLines: 8,
        letterSpacing: 0,
        textTransform: "none",
      },
      // {
      //   id: "badge",
      //   content: attribution,
      //   x: Math.round(CW * 0.20),
      //   y: Math.round(CH * attrY / 100),
      //   w: Math.round(CW * 0.60),
      //   h: Math.round(CH * 0.06),
      //   fontFamily: "Montserrat",
      //   fontSize: attrFontSize,
      //   fontWeight: "500",
      //   color: "#1A1A1A",
      //   align: "center",
      //   lineHeight: 1.2,
      //   maxLines: 2,
      //   letterSpacing: 0,
      //   textTransform: "none",
      // },
    ],
    productZone: {
      x: Math.round(CW * 0.05),
      y: Math.round(CH * personY / 100),
      width: Math.round(CW * 0.90),
      height: Math.round(CH * personH / 100),
    },
    svgDecorations: starsSvg,
  } as unknown as LayoutSpec;
}
