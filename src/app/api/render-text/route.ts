/**
 * POST /api/render-text
 *
 * Text Renderer API endpoint.
 * Renders text overlays using deterministic SVG + Sharp.
 * NO AI involved - pixel-perfect typography.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  renderText,
  RenderTextRequestSchema,
  type RenderTextRequest,
} from "@/services/text-renderer";
import { createLogger, generateRequestId } from "@/lib/logger";
import { createMetrics } from "@/lib/metrics";

const logger = createLogger({ service: "api:render-text" });
const metrics = createMetrics();

export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds max

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RenderTextJsonBody {
  width: number;
  height: number;
  backgroundImage?: string; // URL or base64
  backgroundColor?: string;
  safeArea?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  elements: Array<{
    id?: string;
    text: string;
    font?: {
      family?: string;
      size?: number;
      weight?: string;
      lineHeight?: number;
      letterSpacing?: number;
      color?: string;
    };
    effects?: {
      shadow?: {
        offsetX?: number;
        offsetY?: number;
        blur?: number;
        color?: string;
      };
      stroke?: {
        width?: number;
        color?: string;
      };
      gradient?: {
        type?: "linear" | "radial";
        angle?: number;
        stops: Array<{ offset: number; color: string }>;
      };
      opacity?: number;
    };
    align?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
      padding?: number;
    };
    background?: {
      enabled?: boolean;
      color?: string;
      borderRadius?: number;
      padding?: number;
    };
    maxLines?: number;
    ellipsis?: boolean;
    wordWrap?: boolean;
  }>;
  format?: "png" | "webp" | "jpeg";
  quality?: number;
  autoContrast?: boolean;
  debug?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function parseMultipartRequest(
  request: NextRequest
): Promise<RenderTextRequest> {
  const formData = await request.formData();

  // Optional background image
  const backgroundFile = formData.get("background") as File | null;
  let backgroundImage: string | undefined;

  if (backgroundFile) {
    const buffer = await backgroundFile.arrayBuffer();
    backgroundImage = `data:${backgroundFile.type};base64,${Buffer.from(buffer).toString("base64")}`;
  }

  // Required config JSON
  const configStr = formData.get("config") as string | null;
  if (!configStr) {
    throw new Error("Missing required 'config' field with render configuration");
  }

  let config: RenderTextJsonBody;
  try {
    config = JSON.parse(configStr);
  } catch {
    throw new Error("Invalid JSON in 'config' field");
  }

  // Override background if file was uploaded
  if (backgroundImage) {
    config.backgroundImage = backgroundImage;
  }

  return config as RenderTextRequest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  logger.info("Render text request received", { requestId });
  metrics.increment("request_total");

  try {
    // Determine content type and parse request
    const contentType = request.headers.get("content-type") || "";
    let renderRequest: RenderTextRequest;

    if (contentType.includes("multipart/form-data")) {
      renderRequest = await parseMultipartRequest(request);
    } else if (contentType.includes("application/json")) {
      renderRequest = await request.json();
    } else {
      return NextResponse.json(
        {
          error: "Unsupported Content-Type",
          message: "Use 'application/json' or 'multipart/form-data'",
        },
        { status: 415 }
      );
    }

    // Validate with Zod
    const validated = RenderTextRequestSchema.parse(renderRequest);

    // Execute rendering
    const result = await renderText(validated);

    const duration = Date.now() - startTime;
    metrics.timing("request_duration_ms", duration);
    metrics.increment("request_success");

    logger.info("Render text request completed", {
      requestId,
      duration_ms: duration,
      width: result.width,
      height: result.height,
      output_size: result.buffer.length,
    });

    // Return response based on Accept header
    const acceptHeader = request.headers.get("accept") || "";

    if (acceptHeader.includes("application/json")) {
      // Return JSON with base64 image
      return NextResponse.json({
        success: true,
        requestId,
        data: {
          image: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
          mimeType: result.mimeType,
          width: result.width,
          height: result.height,
          timing: result.timing,
          debug: result.debug,
        },
      });
    } else {
      // Return raw image
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          "Content-Type": result.mimeType,
          "Content-Length": result.buffer.length.toString(),
          "X-Request-Id": requestId,
          "X-Duration-Ms": duration.toString(),
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.increment("request_error");

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    logger.error("Render text request failed", {
      requestId,
      duration_ms: duration,
      error: message,
    });

    // Determine status code
    let status = 500;
    if (message.includes("Missing required")) {
      status = 400;
    } else if (message.includes("Invalid")) {
      status = 400;
    }

    return NextResponse.json(
      {
        success: false,
        requestId,
        error: message,
        duration_ms: duration,
      },
      { status }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check & Documentation
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    service: "text-renderer",
    status: "healthy",
    version: "1.0.0",
    engine: process.env.TEXT_RENDER_ENGINE || "svg",
    endpoints: {
      POST: {
        description: "Render text overlay on image or transparent background",
        contentTypes: ["application/json", "multipart/form-data"],
        required: ["width", "height", "elements"],
        optional: [
          "backgroundImage",
          "backgroundColor",
          "safeArea",
          "format",
          "quality",
          "autoContrast",
          "debug",
        ],
        example: {
          width: 1080,
          height: 1080,
          backgroundColor: "#1a1a1a",
          elements: [
            {
              text: "Hello World",
              font: {
                family: "Inter",
                size: 64,
                weight: "700",
                color: "#FFFFFF",
              },
              align: "center",
              verticalAlign: "middle",
              box: {
                x: 100,
                y: 100,
                width: 880,
                height: 880,
              },
            },
          ],
          format: "png",
          autoContrast: true,
        },
      },
    },
    fontStyles: {
      weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
      defaultFamily: "Inter",
    },
    effects: {
      shadow: "Drop shadow with offset, blur, and color",
      stroke: "Text outline with width and color",
      gradient: "Linear or radial gradient fill",
      opacity: "Text transparency (0-1)",
    },
  });
}
