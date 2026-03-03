/**
 * Text Renderer Service
 *
 * Renders text overlays using SVG + Sharp.
 * Deterministic, pixel-perfect typography - no AI involved.
 */

import sharp from "sharp";
import type {
  RenderTextRequest,
  RenderTextResult,
  TextElement,
  SafeArea,
  TextRendererConfig,
} from "./types";
import { RenderTextRequestSchema, getTextRendererConfig } from "./types";
import {
  calculateTextLayout,
  createApproximateMeasureFn,
  escapeXml,
  fontWeightToCss,
  generateGradientDef,
  generateShadowFilter,
  getContrastColor,
  parseColor,
  calculateLuminance,
  type LayoutLine,
} from "./utils";
import { createLogger } from "../../lib/logger";
import { createMetrics } from "../../lib/metrics";

// ─────────────────────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────────────────────

const logger = createLogger({ service: "text-renderer" });
const metrics = createMetrics();

// ─────────────────────────────────────────────────────────────────────────────
// SVG Text Renderer
// ─────────────────────────────────────────────────────────────────────────────

interface RenderTextSvgResult {
  svg: string;
  debugLines: Array<{
    elementId: string;
    lineIndex: number;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/**
 * Render text elements to SVG string
 */
function renderTextToSvg(
  elements: TextElement[],
  width: number,
  height: number,
  safeArea: SafeArea,
  autoContrast: boolean,
  backgroundColor?: string,
  debug: boolean = false
): RenderTextSvgResult {
  const measureFn = createApproximateMeasureFn();
  const defs: string[] = [];
  const textGroups: string[] = [];
  const debugLines: RenderTextSvgResult["debugLines"] = [];

  let gradientCounter = 0;
  let filterCounter = 0;

  for (let elemIdx = 0; elemIdx < elements.length; elemIdx++) {
    const element = elements[elemIdx];
    const elementId = element.id || `text-${elemIdx}`;
    
    // Default values for optional fields
    const font = element.font ?? {
      family: "Inter",
      size: 48,
      weight: "700" as const,
      lineHeight: 1.2,
      letterSpacing: 0,
      color: "#FFFFFF",
    };
    const effects = element.effects ?? { opacity: 1 };
    const { align } = element;

    // Calculate layout
    const layout = calculateTextLayout(element, measureFn, safeArea);

    // Determine fill color/gradient
    let fillAttr: string;
    if (effects.gradient) {
      const gradientId = `gradient-${gradientCounter++}`;
      defs.push(generateGradientDef(gradientId, effects.gradient));
      fillAttr = `url(#${gradientId})`;
    } else {
      let textColor = font.color;

      // Auto-contrast adjustment
      if (autoContrast && backgroundColor) {
        const bgColor = parseColor(backgroundColor);
        if (bgColor) {
          const bgLuminance = calculateLuminance(bgColor.r, bgColor.g, bgColor.b);
          const textColorParsed = parseColor(textColor);
          if (textColorParsed) {
            const textLuminance = calculateLuminance(
              textColorParsed.r,
              textColorParsed.g,
              textColorParsed.b
            );
            // If contrast is poor, switch to optimal color
            const lighter = Math.max(bgLuminance, textLuminance);
            const darker = Math.min(bgLuminance, textLuminance);
            const ratio = (lighter + 0.05) / (darker + 0.05);
            if (ratio < 4.5) {
              textColor = getContrastColor(backgroundColor);
            }
          }
        }
      }

      fillAttr = escapeXml(textColor);
    }

    // Shadow filter
    let filterAttr = "";
    if (effects.shadow) {
      const filterId = `shadow-${filterCounter++}`;
      defs.push(
        generateShadowFilter(
          filterId,
          effects.shadow.offsetX,
          effects.shadow.offsetY,
          effects.shadow.blur,
          effects.shadow.color
        )
      );
      filterAttr = `filter="url(#${filterId})"`;
    }

    // Stroke
    let strokeAttrs = "";
    if (effects.stroke && effects.stroke.width > 0) {
      strokeAttrs = `stroke="${escapeXml(effects.stroke.color)}" stroke-width="${effects.stroke.width}"`;
    }

    // Opacity
    const opacityAttr =
      effects.opacity !== undefined && effects.opacity < 1
        ? `opacity="${effects.opacity}"`
        : "";

    // Background box
    if (element.background?.enabled) {
      const bg = element.background;
      const padding = bg.padding || 0;
      textGroups.push(`
    <rect
      x="${element.box.x - padding}"
      y="${element.box.y - padding}"
      width="${element.box.width + padding * 2}"
      height="${Math.min(layout.totalHeight + padding * 2, element.box.height + padding * 2)}"
      rx="${bg.borderRadius}"
      fill="${escapeXml(bg.color)}"
    />`);
    }

    // Text anchor based on alignment
    const textAnchor =
      align === "center" ? "middle" : align === "right" ? "end" : "start";

    // Render each line
    for (let lineIdx = 0; lineIdx < layout.lines.length; lineIdx++) {
      const line = layout.lines[lineIdx];

      // Adjust x for text-anchor
      let x = line.x;
      if (align === "center") {
        x = element.box.x + element.box.width / 2;
      } else if (align === "right") {
        x = element.box.x + element.box.width - (element.box.padding || 0);
      }

      textGroups.push(`
    <text
      x="${x}"
      y="${line.y}"
      font-family="${escapeXml(font.family)}"
      font-size="${font.size}"
      font-weight="${fontWeightToCss(font.weight)}"
      letter-spacing="${font.letterSpacing}"
      text-anchor="${textAnchor}"
      fill="${fillAttr}"
      ${strokeAttrs}
      ${filterAttr}
      ${opacityAttr}
    >${escapeXml(line.text)}</text>`);

      debugLines.push({
        elementId,
        lineIndex: lineIdx,
        text: line.text,
        x: line.x,
        y: line.y,
        width: line.width,
        height: line.height,
      });
    }
  }

  // Debug: draw safe area guides
  let debugSvg = "";
  if (debug) {
    debugSvg = `
    <!-- Safe Area Guides -->
    <rect
      x="${safeArea.left}"
      y="${safeArea.top}"
      width="${width - safeArea.left - safeArea.right}"
      height="${height - safeArea.top - safeArea.bottom}"
      fill="none"
      stroke="#FF00FF"
      stroke-width="2"
      stroke-dasharray="10,5"
    />
    <text x="${safeArea.left + 10}" y="${safeArea.top + 20}" fill="#FF00FF" font-size="14">Safe Area</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${defs.join("\n    ")}
  </defs>
  ${textGroups.join("")}
  ${debugSvg}
</svg>`;

  return { svg, debugLines };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Render Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render text overlay on an image or transparent background
 */
export async function renderText(
  request: RenderTextRequest
): Promise<RenderTextResult> {
  const startTime = Date.now();
  const timings = {
    text_layout_ms: 0,
    render_ms: 0,
    encode_ms: 0,
  };

  // Validate request
  const validated = RenderTextRequestSchema.parse(request);
  const {
    width,
    height,
    backgroundImage,
    backgroundColor,
    safeArea,
    elements,
    format,
    quality,
    autoContrast,
    debug,
  } = validated;

  logger.debug("Starting text render", {
    width,
    height,
    elements: elements.length,
    format,
    autoContrast,
    debug,
  });

  // Step 1: Render text to SVG
  const layoutStart = Date.now();
  const resolvedSafeArea = safeArea ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const { svg, debugLines } = renderTextToSvg(
    elements,
    width,
    height,
    resolvedSafeArea,
    autoContrast,
    backgroundColor,
    debug
  );
  timings.text_layout_ms = Date.now() - layoutStart;

  // Step 2: Create base image
  const renderStart = Date.now();
  let baseImage: sharp.Sharp;

  if (backgroundImage) {
    // Load background image
    let bgBuffer: Buffer;
    if (backgroundImage.startsWith("data:")) {
      // Base64 data URL
      const base64Data = backgroundImage.replace(/^data:image\/\w+;base64,/, "");
      bgBuffer = Buffer.from(base64Data, "base64");
    } else if (
      backgroundImage.startsWith("http://") ||
      backgroundImage.startsWith("https://")
    ) {
      // Remote URL
      const response = await fetch(backgroundImage);
      if (!response.ok) {
        throw new Error(`Failed to fetch background image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      bgBuffer = Buffer.from(arrayBuffer);
    } else {
      // Local file path
      bgBuffer = await sharp(backgroundImage).toBuffer();
    }

    baseImage = sharp(bgBuffer).resize(width, height, { fit: "cover" });
  } else if (backgroundColor) {
    // Solid color background
    const color = parseColor(backgroundColor);
    baseImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: color
          ? { r: color.r, g: color.g, b: color.b, alpha: color.a }
          : { r: 0, g: 0, b: 0, alpha: 1 },
      },
    });
  } else {
    // Transparent background
    baseImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });
  }

  // Step 3: Composite SVG text layer
  const svgBuffer = Buffer.from(svg);
  const composited = baseImage.composite([
    {
      input: svgBuffer,
      top: 0,
      left: 0,
    },
  ]);

  timings.render_ms = Date.now() - renderStart;

  // Step 4: Encode output
  const encodeStart = Date.now();
  let outputBuffer: Buffer;
  let mimeType: string;

  switch (format) {
    case "jpeg":
      outputBuffer = await composited.jpeg({ quality }).toBuffer();
      mimeType = "image/jpeg";
      break;
    case "webp":
      outputBuffer = await composited.webp({ quality }).toBuffer();
      mimeType = "image/webp";
      break;
    case "png":
    default:
      outputBuffer = await composited.png().toBuffer();
      mimeType = "image/png";
      break;
  }

  timings.encode_ms = Date.now() - encodeStart;

  const totalTime = Date.now() - startTime;

  // Record metrics
  metrics.increment("render_total");
  metrics.timing("render_duration_ms", totalTime);
  metrics.timing("layout_duration_ms", timings.text_layout_ms);

  logger.info("Text render complete", {
    width,
    height,
    elements: elements.length,
    format,
    duration_ms: totalTime,
    output_size: outputBuffer.length,
  });

  const result: RenderTextResult = {
    buffer: outputBuffer,
    mimeType,
    width,
    height,
    timing: {
      total_ms: totalTime,
      ...timings,
    },
  };

  if (debug) {
    result.debug = {
      lines: debugLines,
      safeArea: resolvedSafeArea,
    };
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render single text line (convenience wrapper)
 */
export async function renderSingleText(
  text: string,
  options: {
    width: number;
    height: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    align?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    padding?: number;
    format?: "png" | "webp" | "jpeg";
  }
): Promise<Buffer> {
  const {
    width,
    height,
    fontSize = 48,
    fontFamily = "Inter",
    fontWeight = "700",
    color = "#FFFFFF",
    backgroundColor,
    align = "center",
    verticalAlign = "middle",
    padding = 20,
    format = "png",
  } = options;

  const result = await renderText({
    width,
    height,
    backgroundColor,
    elements: [
      {
        text,
        font: {
          family: fontFamily,
          size: fontSize,
          weight: fontWeight as any,
          lineHeight: 1.2,
          letterSpacing: 0,
          color,
        },
        effects: undefined,
        align,
        verticalAlign,
        box: {
          x: padding,
          y: padding,
          width: width - padding * 2,
          height: height - padding * 2,
          padding: 0,
        },
        wordWrap: true,
        ellipsis: true,
      },
    ],
    format,
    quality: 95,
    autoContrast: true,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    debug: false,
  });

  return result.buffer;
}

/**
 * Add text overlay to existing image buffer
 */
export async function addTextOverlay(
  imageBuffer: Buffer,
  text: string,
  options: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    align?: "left" | "center" | "right";
    shadow?: boolean;
  } = {}
): Promise<Buffer> {
  // Get image dimensions
  const meta = await sharp(imageBuffer).metadata();
  const imgWidth = meta.width || 1080;
  const imgHeight = meta.height || 1080;

  const {
    x = 20,
    y = imgHeight - 100,
    width = imgWidth - 40,
    height = 80,
    fontSize = 32,
    fontFamily = "Inter",
    color = "#FFFFFF",
    align = "left",
    shadow = true,
  } = options;

  const result = await renderText({
    width: imgWidth,
    height: imgHeight,
    backgroundImage: `data:image/png;base64,${imageBuffer.toString("base64")}`,
    elements: [
      {
        text,
        font: {
          family: fontFamily,
          size: fontSize,
          weight: "700",
          lineHeight: 1.2,
          letterSpacing: 0,
          color,
        },
        effects: shadow
          ? {
              opacity: 1,
              shadow: {
                offsetX: 0,
                offsetY: 2,
                blur: 4,
                color: "rgba(0,0,0,0.5)",
              },
            }
          : undefined,
        align,
        verticalAlign: "middle",
        box: { x, y, width, height, padding: 0 },
        wordWrap: true,
        ellipsis: true,
      },
    ],
    format: "png",
    quality: 95,
    autoContrast: false,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    debug: false,
  });

  return result.buffer;
}
