/**
 * Deterministic Text Renderer
 * 
 * Renders text blocks from LayoutSpec onto an image using SVG.
 * This is deterministic - same input always produces same output.
 * The AI does NOT draw text, only specifies placement.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import type { TextBlock, Overlay, LayoutSpec } from "./layoutSpec";
import { createLogger } from "@/lib/logger";

// ── Fuentes embebidas (cargadas una vez al iniciar) ──────────────────────────
function loadFontBase64(filename: string): string {
  try {
    const fontPath = path.join(process.cwd(), "public", "fonts", filename);
    return fs.readFileSync(fontPath).toString("base64");
  } catch {
    return ""; // si no encuentra el archivo, el SVG igual renderiza con fallback
  }
}

const FONTS = {
  loraRegular:      loadFontBase64("Lora-Regular.ttf"),
  loraBold:         loadFontBase64("Lora-Bold.ttf"),
  loraSemiBold:     loadFontBase64("Lora-SemiBold.ttf"),
  montserratRegular: loadFontBase64("Montserrat-Regular.ttf"),
  montserratMedium:  loadFontBase64("Montserrat-Medium.ttf"),
  montserratSemiBold: loadFontBase64("Montserrat-SemiBold.ttf"),
  montserratBold:    loadFontBase64("Montserrat-Bold.ttf"),
  interRegular:     loadFontBase64("Inter-Regular.ttf"),
  interSemiBold:    loadFontBase64("Inter-SemiBold.ttf"),
  interBold:        loadFontBase64("Inter-Bold.ttf"),
};

function buildFontFaceDefs(): string {
  return `<style>
    @font-face { font-family: 'Lora'; font-weight: 400; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.loraRegular}') format('truetype'); }
    @font-face { font-family: 'Lora'; font-weight: 600; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.loraSemiBold}') format('truetype'); }
    @font-face { font-family: 'Lora'; font-weight: 700; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.loraBold}') format('truetype'); }
    @font-face { font-family: 'Montserrat'; font-weight: 400; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.montserratRegular}') format('truetype'); }
    @font-face { font-family: 'Montserrat'; font-weight: 500; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.montserratMedium}') format('truetype'); }
    @font-face { font-family: 'Montserrat'; font-weight: 600; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.montserratSemiBold}') format('truetype'); }
    @font-face { font-family: 'Montserrat'; font-weight: 700; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.montserratBold}') format('truetype'); }
    @font-face { font-family: 'Inter'; font-weight: 400; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.interRegular}') format('truetype'); }
    @font-face { font-family: 'Inter'; font-weight: 600; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.interSemiBold}') format('truetype'); }
    @font-face { font-family: 'Inter'; font-weight: 700; font-style: normal;
      src: url('data:font/truetype;base64,${FONTS.interBold}') format('truetype'); }
  </style>`;
}

// Justo después de definir FONTS, agregar temporalmente:
console.log("[fonts] loraRegular length:", FONTS.loraRegular.length);
console.log("[fonts] montserratBold length:", FONTS.montserratBold.length);

const logger = createLogger({ service: "textRenderer" });

/* ═══════════════════════════════════════════════════════════════
   FONT NORMALIZATION

   Sharp uses librsvg + Pango to render SVG. Pango resolves fonts
   via fontconfig — NOT via @font-face data URIs (librsvg 2.x
   ignores those entirely).

   Fonts confirmed available via fc-list on this server:
     "Lora"    — variable serif  (Regular/Medium/SemiBold/Bold)
     "Poppins" — geometric sans  (Regular/Medium/Bold)

   LayoutSpec name → fontconfig name:
     "Playfair Display" → "Lora"
     "Inter"            → "Poppins"
═══════════════════════════════════════════════════════════════ */

function normalizeFontFamily(fontFamily: string): string {
  const key = (fontFamily ?? "").toLowerCase();
  if (key.includes("playfair")) return "Lora";
  if (key.includes("poppins")) return "Montserrat";
  // Inter, Arial, Helvetica → Montserrat
  if (key.includes("inter") || key.includes("arial") || key.includes("helvetica")) return "Montserrat";
  return fontFamily;
}

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface RenderTextOptions {
  /** Base image buffer to render text onto */
  baseImage: Buffer;
  /** Layout specification with text blocks and overlays */
  layout: LayoutSpec;
  /** Use crisp rendering (no anti-aliasing) */
  crisp?: boolean;
  /** Debug mode - draw bounding boxes */
  debug?: boolean;
}

export interface RenderTextResult {
  /** Output image buffer with text */
  buffer: Buffer;
  /** Number of text blocks rendered */
  textBlocksRendered: number;
  /** Number of overlays rendered */
  overlaysRendered: number;
  /** Render time in ms */
  renderTimeMs: number;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN RENDER FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function renderTextOnImage(options: RenderTextOptions): Promise<RenderTextResult> {
  const startTime = Date.now();
  const { baseImage, layout, debug = false } = options;
  
  logger.info("Rendering text on image", {
    textBlocks: layout.textBlocks.length,
    overlays: layout.overlays.length,
  });
  
  // Get base image dimensions
  const baseMeta = await sharp(baseImage).metadata();
  const width = baseMeta.width || layout.canvas.width;
  const height = baseMeta.height || layout.canvas.height;
  
  // Build SVG layers
  const overlaysSvg = generateOverlaysSvg(layout.overlays, width, height);
  const textSvg = generateTextSvg(layout.textBlocks, width, height, debug);
  const decorationsSvg = (layout as any).svgDecorations ?? "";
  
  // Note: fonts resolved by Pango via fontconfig. @font-face base64 not supported by librsvg 2.x.
  // clipPath ensures text never bleeds outside canvas boundary regardless of measurement errors.
const combinedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    ${generateGradientDefs(layout.overlays)}
    <clipPath id="canvas-clip">
      <rect x="0" y="0" width="${width}" height="${height}"/>
    </clipPath>
  </defs>
  ${buildFontFaceDefs()}
  ${overlaysSvg}
  ${decorationsSvg}
  <g clip-path="url(#canvas-clip)">
    ${textSvg}
  </g>
</svg>`;
  
  // Rasterize SVG with resvg (respects @font-face data URIs, no Fontconfig needed)
  const svgBuffer = Buffer.from(combinedSvg);
  const resvg = new Resvg(svgBuffer, { font: { loadSystemFonts: false } });
  const textLayerPng = resvg.render().asPng();

  // Composite rasterized text layer onto base image
  const result = await sharp(baseImage)
    .composite([{ input: textLayerPng, top: 0, left: 0 }])
    .png()
    .toBuffer();
  
  const renderTimeMs = Date.now() - startTime;
  
  logger.debug("Text render complete", {
    textBlocksRendered: layout.textBlocks.length,
    overlaysRendered: layout.overlays.length,
    renderTimeMs,
    outputSize: result.length,
  });
  
  return {
    buffer: result,
    textBlocksRendered: layout.textBlocks.length,
    overlaysRendered: layout.overlays.length,
    renderTimeMs,
  };
}

/* ═══════════════════════════════════════════════════════════════
   OVERLAY SVG GENERATION
═══════════════════════════════════════════════════════════════ */

function generateOverlaysSvg(overlays: Overlay[], canvasWidth: number, canvasHeight: number): string {
  return overlays.map((ov, idx) => {
    switch (ov.type) {
      case "linearGradient":
        return `<rect 
          x="${ov.x}" 
          y="${ov.y}" 
          width="${ov.w}" 
          height="${ov.h}" 
          fill="url(#gradient-${idx})" 
          opacity="${ov.opacity}"
        />`;
      
      case "solid":
        return `<rect 
          x="${ov.x}" 
          y="${ov.y}" 
          width="${ov.w}" 
          height="${ov.h}" 
          fill="${ov.color || 'rgba(0,0,0,0.5)'}" 
          opacity="${ov.opacity}"
        />`;
      
      case "blurRegion":
        return `<rect 
          x="${ov.x}" 
          y="${ov.y}" 
          width="${ov.w}" 
          height="${ov.h}" 
          fill="${ov.color || 'rgba(0,0,0,0.3)'}" 
          opacity="${ov.opacity * 0.7}"
        />`;
      
      default:
        return "";
    }
  }).join("\n");
}

function generateGradientDefs(overlays: Overlay[]): string {
  return overlays.map((ov, idx) => {
    if (ov.type !== "linearGradient") return "";
    
    let x1 = "0%", y1 = "0%", x2 = "0%", y2 = "100%";
    switch (ov.direction) {
      case "top":
        x1 = "0%"; y1 = "100%"; x2 = "0%"; y2 = "0%";
        break;
      case "bottom":
        x1 = "0%"; y1 = "0%"; x2 = "0%"; y2 = "100%";
        break;
      case "left":
        x1 = "100%"; y1 = "0%"; x2 = "0%"; y2 = "0%";
        break;
      case "right":
        x1 = "0%"; y1 = "0%"; x2 = "100%"; y2 = "0%";
        break;
    }
    
    const color = ov.color || "rgba(0,0,0,0.7)";
    
    return `<linearGradient id="gradient-${idx}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient>`;
  }).join("\n");
}

/* ═══════════════════════════════════════════════════════════════
   TEXT SVG GENERATION
═══════════════════════════════════════════════════════════════ */

function generateTextSvg(textBlocks: TextBlock[], canvasWidth: number, canvasHeight: number, debug: boolean): string {
  return textBlocks.map((tb) => {
if (!tb.content || tb.content.trim() === "") return "";
    
    const lines = (tb as any).textBalance
      ? wrapTextBalanced(tb.content, tb.w, tb.fontSize, tb.fontWeight, tb.maxLines, tb.fontFamily)
      : wrapTextPrecise(tb.content, tb.w, tb.fontSize, tb.fontWeight, tb.maxLines, tb.fontFamily);
    const lineHeightPx = tb.fontSize * tb.lineHeight;
    const totalTextHeight = lines.length * lineHeightPx;
    
    const debugRect = debug 
      ? `<rect x="${tb.x}" y="${tb.y}" width="${tb.w}" height="${tb.h}" fill="none" stroke="red" stroke-width="2" stroke-dasharray="4"/>`
      : "";
    
    let background = "";
    if (tb.background && tb.background.type !== "none") {
      const padding = tb.background.padding || 12;
      const radius = tb.background.type === "pill" ? Math.min(totalTextHeight / 2 + padding, tb.background.radius || 24) : (tb.background.radius || 8);
      
      background = `<rect 
        x="${tb.x - padding}" 
        y="${tb.y - padding}" 
        width="${tb.w + padding * 2}" 
        height="${totalTextHeight + padding * 2}" 
        rx="${radius}" 
        ry="${radius}" 
        fill="${tb.background.color || 'rgba(0,0,0,0.7)'}" 
        opacity="${tb.background.opacity || 0.8}"
      />`;
    }
    
    let textAnchor = "start";
    let xPos = tb.x;
    if (tb.align === "center") {
      textAnchor = "middle";
      xPos = tb.x + tb.w / 2;
    } else if (tb.align === "right") {
      textAnchor = "end";
      xPos = tb.x + tb.w;
    }
    
    const stroke = (tb as any).textStroke as { color?: string; width?: number } | undefined;
    const strokeAttrs = stroke
      ? `stroke="${stroke.color ?? "#000000"}" stroke-width="${stroke.width ?? 2}" stroke-linejoin="round" paint-order="stroke fill"`
      : "";
    const boldWeight = (tb as any).boldWeight as string | undefined;

    function applyTransform(t: string): string {
      if (tb.textTransform === "uppercase") return t.toUpperCase();
      if (tb.textTransform === "lowercase") return t.toLowerCase();
      if (tb.textTransform === "capitalize") return capitalizeWords(t);
      return t;
    }

    const textElements = lines.map((line, idx) => {
      const yPos = tb.y + tb.fontSize + (idx * lineHeightPx);
      const hasBold = boldWeight && line.includes("**");

      if (!hasBold) {
        const escapedText = escapeXml(applyTransform(stripBoldMarkers(line)));
        return `<text
          x="${xPos}"
          y="${yPos}"
          font-family="${normalizeFontFamily(tb.fontFamily)}, sans-serif"
          font-size="${tb.fontSize}"
          font-weight="${tb.fontWeight}"
          fill="${tb.color}"
          text-anchor="${textAnchor}"
          letter-spacing="${tb.letterSpacing}em"
          ${strokeAttrs}
        >${escapedText}</text>`;
      }

      const tspans = parseBoldSegments(line)
        .filter(seg => seg.text.length > 0)
        .map(seg => {
          const escaped = escapeXml(applyTransform(seg.text));
          return seg.bold
            ? `<tspan font-weight="${boldWeight}">${escaped}</tspan>`
            : `<tspan>${escaped}</tspan>`;
        })
        .join("");

      return `<text
        x="${xPos}"
        y="${yPos}"
        font-family="${normalizeFontFamily(tb.fontFamily)}, sans-serif"
        font-size="${tb.fontSize}"
        font-weight="${tb.fontWeight}"
        fill="${tb.color}"
        text-anchor="${textAnchor}"
        letter-spacing="${tb.letterSpacing}em"
        xml:space="preserve"
        ${strokeAttrs}
      >${tspans}</text>`;
    }).join("\n");
    
    return `
      ${debugRect}
      ${background}
      ${textElements}
    `;
  }).join("\n");
}

function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, c => c.toUpperCase());
}

/* ═══════════════════════════════════════════════════════════════
   TEXT UTILITIES
═══════════════════════════════════════════════════════════════ */

const CHAR_WIDTHS: Record<string, number> = {
  'i': 0.25, 'l': 0.25, 'I': 0.28, '!': 0.28, '.': 0.28, ',': 0.28, ':': 0.28, ';': 0.28,
  'j': 0.28, 'f': 0.32, 't': 0.35, 'r': 0.38, '1': 0.45,
  's': 0.48, 'c': 0.50, 'a': 0.52, 'e': 0.52, 'o': 0.55, 'n': 0.55, 'u': 0.55,
  'z': 0.48, 'x': 0.50, 'v': 0.50, 'y': 0.50, 'k': 0.52, 'h': 0.55, 'b': 0.55, 'd': 0.55, 'p': 0.55, 'q': 0.55, 'g': 0.55,
  'w': 0.72, 'm': 0.82, 'W': 0.95, 'M': 0.88,
  'A': 0.65, 'B': 0.62, 'C': 0.65, 'D': 0.68, 'E': 0.55, 'F': 0.52, 'G': 0.70, 'H': 0.70,
  'J': 0.45, 'K': 0.62, 'L': 0.52, 'N': 0.70, 'O': 0.72, 'P': 0.58, 'Q': 0.72, 'R': 0.62,
  'S': 0.55, 'T': 0.58, 'U': 0.68, 'V': 0.62, 'X': 0.62, 'Y': 0.58, 'Z': 0.58,
  '0': 0.55, '2': 0.55, '3': 0.55, '4': 0.55, '5': 0.55, '6': 0.55, '7': 0.55, '8': 0.55, '9': 0.55,
  ' ': 0.28, '-': 0.35, '_': 0.50, '/': 0.35, '\\': 0.35, '%': 0.85, '@': 0.90, '&': 0.70,
  '(': 0.35, ')': 0.35, '[': 0.35, ']': 0.35, '{': 0.35, '}': 0.35,
  'á': 0.52, 'é': 0.52, 'í': 0.25, 'ó': 0.55, 'ú': 0.55, 'ñ': 0.55, 'ü': 0.55,
  'Á': 0.65, 'É': 0.55, 'Í': 0.28, 'Ó': 0.72, 'Ú': 0.68, 'Ñ': 0.70, 'Ü': 0.68,
};
const DEFAULT_CHAR_WIDTH = 0.55;

/**
 * Per-family width correction factors — calibrated by rendering test SVGs
 * with Sharp and measuring actual pixel widths on this server.
 *
 * Lora   (maps from "Playfair Display"): factor 0.987 — slightly narrower than Inter
 * Poppins (maps from "Inter"):           factor 1.131 — noticeably wider than Inter
 */
const FONT_FAMILY_FACTORS: Record<string, number> = {
  "lora":             0.987,
  "poppins":          1.131,
  // LayoutSpec names also accepted (normalized at render time, but wrapTextPrecise
  // receives the original name from LayoutSpec so must match here too)
  "playfair display": 0.987,
  "playfair":         0.987,
  "inter":            1.131,  // Inter → Poppins at render time
  "arial":            1.00,
  "helvetica":        1.00,
  "roboto":           1.00,
  "georgia":          1.05,
};

function getFontFamilyFactor(fontFamily: string): number {
  const key = (fontFamily ?? "").toLowerCase().trim();
  for (const [name, factor] of Object.entries(FONT_FAMILY_FACTORS)) {
    if (key.includes(name)) return factor;
  }
  return 1.05; // safe fallback for unknown families
}

function measureTextWidth(text: string, fontSize: number, isBold: boolean, familyFactor: number): number {
  let width = 0;
  for (const char of text) {
    width += (CHAR_WIDTHS[char] ?? DEFAULT_CHAR_WIDTH) * fontSize;
  }
  if (isBold) width *= 1.08;
  return width * familyFactor;
}

/**
 * Wraps text to fit inside maxWidth.
 *
 * KEY FIX: explicit \n in content are treated as hard line-breaks FIRST,
 * then each segment is word-wrapped independently.
 * This ensures smartHeadlineBreak's breaks are always respected.
 */
function wrapTextPrecise(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: string,
  maxLines: number,
  fontFamily: string,
): string[] {
  const isBold = ["bold", "700", "800", "900"].includes(String(fontWeight));
  const familyFactor = getFontFamilyFactor(fontFamily);
  const spaceWidth = measureTextWidth(" ", fontSize, isBold, familyFactor);

  // ── STEP 1: honour explicit hard line-breaks ──────────────────────────────
  const segments = text.split("\n");
  const allLines: string[] = [];

  for (const segment of segments) {
    if (allLines.length >= maxLines) break;

    const words = segment.split(" ").filter(Boolean);

    // Empty segment (e.g. double \n) → blank line
    if (words.length === 0) {
      allLines.push("");
      continue;
    }

    // ── STEP 2: word-wrap within segment ────────────────────────────────────
    let currentLine = "";
    let currentWidth = 0;

    for (const word of words) {
      if (allLines.length >= maxLines) break;

      const wordWidth = measureTextWidth(stripBoldMarkers(word), fontSize, isBold, familyFactor);
      const testWidth = currentLine
        ? currentWidth + spaceWidth + wordWidth
        : wordWidth;

      if (testWidth <= maxWidth) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
        currentWidth = testWidth;
      } else {
        if (currentLine) {
          allLines.push(currentLine);
          if (allLines.length >= maxLines) {
            currentLine = "";
            break;
          }
        }
        currentLine = word;
        currentWidth = wordWidth;
      }
    }

    if (currentLine && allLines.length < maxLines) {
      allLines.push(currentLine);
    }
  }

  // ── Ellipsis on last line if content was truncated ────────────────────────
  if (allLines.length === maxLines) {
    const ellipsisW = measureTextWidth("...", fontSize, isBold, familyFactor);
    let last = allLines[allLines.length - 1];
    let lastW = measureTextWidth(stripBoldMarkers(last), fontSize, isBold, familyFactor);

    if (lastW + ellipsisW > maxWidth) {
      // Trim words until ellipsis fits (strip markers to measure accurately)
      while (last.includes(" ") && measureTextWidth(stripBoldMarkers(last) + "...", fontSize, isBold, familyFactor) > maxWidth) {
        last = last.substring(0, last.lastIndexOf(" "));
      }
      allLines[allLines.length - 1] = stripBoldMarkers(last) + "...";
    }
  }

  return allLines;
}

/**
 * Greedy word-wrap for a single segment (no \n handling).
 * Used as the inner loop for both normal and balanced wrapping.
 */
function wrapGreedySingleSegment(
  words: string[],
  effectiveWidth: number,
  fontSize: number,
  isBold: boolean,
  familyFactor: number,
  maxLines: number,
  spaceWidth: number,
): string[] {
  const lines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;
  for (const word of words) {
    if (lines.length >= maxLines) break;
    const wordWidth = measureTextWidth(stripBoldMarkers(word), fontSize, isBold, familyFactor);
    const testWidth = currentLine ? currentWidth + spaceWidth + wordWidth : wordWidth;
    if (testWidth <= effectiveWidth) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
      currentWidth = testWidth;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length >= maxLines) { currentLine = ""; break; }
      }
      currentLine = word;
      currentWidth = wordWidth;
    }
  }
  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  return lines;
}

/**
 * text-wrap: balance — finds the minimum line width that still fits the text
 * within the same number of natural lines, so all lines are roughly equal length.
 * Falls back to normal wrapping if text has explicit \n or is single-line.
 */
function wrapTextBalanced(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: string,
  maxLines: number,
  fontFamily: string,
): string[] {
  const isBold = ["bold", "700", "800", "900"].includes(String(fontWeight));
  const familyFactor = getFontFamilyFactor(fontFamily);
  const spaceWidth = measureTextWidth(" ", fontSize, isBold, familyFactor);

  // Explicit \n in content → normal wrapping (balance within hard-break segments isn't needed)
  if (text.includes("\n")) {
    return wrapTextPrecise(text, maxWidth, fontSize, fontWeight, maxLines, fontFamily);
  }

  const words = text.split(" ").filter(Boolean);
  if (words.length <= 1) return words.length ? [text] : [];

  // Natural wrap to find how many lines the text needs
  const naturalLines = wrapGreedySingleSegment(words, maxWidth, fontSize, isBold, familyFactor, maxLines, spaceWidth);
  if (naturalLines.length <= 1) return naturalLines;

  const targetLines = naturalLines.length;
  const longestWordW = Math.max(...words.map((w) => measureTextWidth(stripBoldMarkers(w), fontSize, isBold, familyFactor)));

  // Binary search: find minimum effective width that still wraps into targetLines
  let lo = longestWordW;
  let hi = maxWidth;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const lines = wrapGreedySingleSegment(words, mid, fontSize, isBold, familyFactor, maxLines, spaceWidth);
    if (lines.length <= targetLines) hi = mid;
    else lo = mid;
  }

  return wrapGreedySingleSegment(words, hi, fontSize, isBold, familyFactor, maxLines, spaceWidth);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Removes **word** markers, returning plain text */
function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

interface TextSegment { text: string; bold: boolean; }

/**
 * Normalizes spaces around **bold** markers.
 * "la**firmeza**y" → "la **firmeza** y"
 * Already-spaced "la **bold** text" → unchanged (no double spaces added)
 */
function normalizeBoldSpacing(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, (match, _inner, offset, str) => {
    const before = offset > 0 ? str[offset - 1] : '';
    const after = offset + match.length < str.length ? str[offset + match.length] : '';
    const needPre  = before && !/\s/.test(before);
    const needPost = after  && !/[\s.,!?;:\-)\n]/.test(after);
    return `${needPre ? ' ' : ''}${match}${needPost ? ' ' : ''}`;
  });
}

/** Splits a line into plain/bold segments based on **word** markers */
function parseBoldSegments(text: string): TextSegment[] {
  // Normalize first so adjacent text doesn't lose spaces
  let normalized = normalizeBoldSpacing(text);

  // Handle orphaned ** markers that appear when text wrapping splits a bold span across lines.
  // e.g. "**segunda" → "**segunda**"  /  "unidad**." → "**unidad**."
  const markerCount = (normalized.match(/\*\*/g) || []).length;
  if (markerCount % 2 !== 0) {
    if (normalized.startsWith("**")) {
      normalized = normalized + "**"; // close at end
    } else {
      normalized = "**" + normalized; // open at start
    }
  }

  const segments: TextSegment[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) segments.push({ text: normalized.slice(lastIndex, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < normalized.length) segments.push({ text: normalized.slice(lastIndex), bold: false });
  return segments;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER OVERLAYS ONLY (no text)
═══════════════════════════════════════════════════════════════ */

export async function renderOverlaysOnly(options: {
  baseImage: Buffer;
  overlays: Overlay[];
  svgDecorations?: string;
}): Promise<Buffer> {
  const { baseImage, overlays, svgDecorations = "" } = options;
  
  if (overlays.length === 0 && !svgDecorations) {
    return baseImage;
  }
  
  const baseMeta = await sharp(baseImage).metadata();
  const width = baseMeta.width || 1080;
  const height = baseMeta.height || 1350;
  
  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      ${generateGradientDefs(overlays)}
    </defs>
    ${generateOverlaysSvg(overlays, width, height)}
    ${svgDecorations}
  </svg>`;
  
  const svgBuffer = Buffer.from(overlaySvg);
  return sharp(baseImage)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}