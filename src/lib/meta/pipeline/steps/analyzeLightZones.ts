/**
 * Step: analyzeLightZones
 *
 * Analyzes a background image to find safe areas for text placement.
 * Uses canvas pixel analysis to:
 * - Divide image into 3x3 grid
 * - Calculate luminance and variance per zone
 * - Score each zone for text placement suitability
 *
 * NO AI - pure algorithmic analysis using @napi-rs/canvas.
 */

import { createCanvas, loadImage, type SKRSContext2D, type ImageData as NapiImageData } from "@napi-rs/canvas";
import {
  LightZoneAnalysisSchema,
  type LightZone,
  type LightZoneAnalysis,
} from "../schemas";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════ */

/** Canvas dimensions for Meta Ads */
const CANVAS_W = 1080;
const CANVAS_H = 1350;

/** Grid configuration */
const GRID_COLS = 3;
const GRID_ROWS = 3;

/** Zone positions */
const ZONE_POSITIONS = [
  "top_left",     "top_center",     "top_right",
  "middle_left",  "middle_center",  "middle_right",
  "bottom_left",  "bottom_center",  "bottom_right",
] as const;

/** Luminance thresholds */
const LIGHT_THRESHOLD = 0.62;   // Above this = light background
const DARK_THRESHOLD = 0.42;    // Below this = dark background
const VARIANCE_THRESHOLD = 0.035; // Above this = noisy/busy

/** ITU-R BT.709 luminance coefficients */
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ════════════════════════════════════════════════════════════════
   HELPER: CALCULATE ZONE RECT
════════════════════════════════════════════════════════════════ */

function getZoneRect(row: number, col: number, width: number, height: number): Rect {
  const zoneW = Math.floor(width / GRID_COLS);
  const zoneH = Math.floor(height / GRID_ROWS);

  return {
    x: col * zoneW,
    y: row * zoneH,
    w: zoneW,
    h: zoneH,
  };
}

/* ════════════════════════════════════════════════════════════════
   HELPER: ANALYZE ZONE LUMINANCE
════════════════════════════════════════════════════════════════ */

interface ZoneStats {
  mean: number;
  variance: number;
  sampleCount: number;
}

function analyzeZoneLuminance(
  ctx: SKRSContext2D,
  rect: Rect,
  step: number = 4
): ZoneStats {
  const { x, y, w, h } = rect;

  // Clamp to canvas bounds
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(CANVAS_W, Math.floor(x + w));
  const y1 = Math.min(CANVAS_H, Math.floor(y + h));

  const width = x1 - x0;
  const height = y1 - y0;

  if (width <= 0 || height <= 0) {
    return { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  // Get image data
  let imageData: NapiImageData;
  try {
    imageData = ctx.getImageData(x0, y0, width, height);
  } catch {
    return { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  const data = imageData.data;
  const samples: number[] = [];

  // Sample every `step` pixels
  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      const i = (py * width + px) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate luminance (0-1)
      const luminance = (LUMA_R * r + LUMA_G * g + LUMA_B * b) / 255;
      samples.push(luminance);
    }
  }

  if (samples.length === 0) {
    return { mean: 0.5, variance: 0.1, sampleCount: 0 };
  }

  // Calculate mean
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

  // Calculate variance
  const variance =
    samples.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / samples.length;

  return {
    mean,
    variance,
    sampleCount: samples.length,
  };
}

/* ════════════════════════════════════════════════════════════════
   HELPER: CALCULATE TEXT SAFE SCORE
════════════════════════════════════════════════════════════════ */

/**
 * Calculates how safe a zone is for text placement.
 * Higher score = better for text.
 *
 * Factors:
 * - Low variance (uniform background) = higher score
 * - High/low luminance (clear contrast) = higher score
 * - Middle luminance (hard to read) = lower score
 * - Edge/corner zones = slightly higher (more common for text)
 */
function calculateTextSafeScore(
  stats: ZoneStats,
  position: string
): number {
  let score = 0;

  // 1. Variance score (0-0.4 points)
  // Low variance = uniform = good for text
  if (stats.variance < 0.01) {
    score += 0.4;
  } else if (stats.variance < 0.02) {
    score += 0.3;
  } else if (stats.variance < VARIANCE_THRESHOLD) {
    score += 0.2;
  } else if (stats.variance < 0.05) {
    score += 0.1;
  }
  // High variance = 0 points

  // 2. Luminance contrast score (0-0.4 points)
  // Clear light or dark = good for text
  const lum = stats.mean;
  if (lum > LIGHT_THRESHOLD || lum < DARK_THRESHOLD) {
    score += 0.4;
  } else if (lum > 0.55 || lum < 0.45) {
    score += 0.2;
  } else {
    // Middle luminance = hard to read
    score += 0.05;
  }

  // 3. Position bonus (0-0.2 points)
  // Corners and edges are more common for text placement
  const edgePositions = [
    "top_left", "top_right", "bottom_left", "bottom_right",
    "top_center", "bottom_center", "middle_left", "middle_right",
  ];
  if (edgePositions.includes(position)) {
    score += 0.15;
  }
  // Center is usually for product, not text
  if (position === "middle_center") {
    score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Analyzes a background image to find safe zones for text placement.
 *
 * @param imageDataUrl - Data URL of the background image
 * @returns Light zone analysis with best zone recommendation
 */
export async function analyzeLightZones(
  imageDataUrl: string
): Promise<LightZoneAnalysis> {
  const startTime = Date.now();

  // Load image into canvas
  const image = await loadImage(imageDataUrl);
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");

  // Draw image scaled to canvas
  ctx.drawImage(image, 0, 0, CANVAS_W, CANVAS_H);

  // Analyze each zone
  const zones: LightZone[] = [];
  let totalLuminance = 0;
  let bestZone: LightZone | null = null;
  let bestScore = -1;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const idx = row * GRID_COLS + col;
      const position = ZONE_POSITIONS[idx];
      const rect = getZoneRect(row, col, CANVAS_W, CANVAS_H);

      // Analyze luminance
      const stats = analyzeZoneLuminance(ctx, rect, 4);
      totalLuminance += stats.mean;

      // Calculate text safe score
      const textSafeScore = calculateTextSafeScore(stats, position);

      // Determine recommended text color
      const recommendedTextColor: "dark" | "light" =
        stats.mean > 0.5 ? "dark" : "light";

      // Determine if backplate needed
      const needsBackplate =
        stats.variance > VARIANCE_THRESHOLD ||
        (stats.mean > DARK_THRESHOLD && stats.mean < LIGHT_THRESHOLD);

      const zone: LightZone = {
        position,
        rect,
        luminance: Math.round(stats.mean * 1000) / 1000,
        variance: Math.round(stats.variance * 10000) / 10000,
        textSafeScore: Math.round(textSafeScore * 100) / 100,
        recommendedTextColor,
        needsBackplate,
      };

      zones.push(zone);

      // Track best zone
      if (textSafeScore > bestScore) {
        bestScore = textSafeScore;
        bestZone = zone;
      }
    }
  }

  // Calculate overall image stats
  const meanLuminance = totalLuminance / zones.length;
  const overallVariance =
    zones.reduce((sum, z) => sum + Math.pow(z.luminance - meanLuminance, 2), 0) /
    zones.length;

  let dominantRegion: "dark" | "light" | "mixed";
  if (meanLuminance > LIGHT_THRESHOLD) {
    dominantRegion = "light";
  } else if (meanLuminance < DARK_THRESHOLD) {
    dominantRegion = "dark";
  } else {
    dominantRegion = "mixed";
  }

  const analysisTimeMs = Date.now() - startTime;

  console.log(
    `[analyzeLightZones] Analyzed in ${analysisTimeMs}ms: ` +
    `mean=${meanLuminance.toFixed(3)}, dominant=${dominantRegion}, ` +
    `best=${bestZone?.position} (score=${bestScore.toFixed(2)})`
  );

  const result: LightZoneAnalysis = {
    zones,
    bestZone,
    imageStats: {
      meanLuminance: Math.round(meanLuminance * 1000) / 1000,
      variance: Math.round(overallVariance * 10000) / 10000,
      dominantRegion,
    },
    analysisTimeMs,
  };

  // Validate with schema (sanity check)
  const validated = LightZoneAnalysisSchema.safeParse(result);
  if (!validated.success) {
    console.error("[analyzeLightZones] Schema validation failed:", validated.error);
  }

  return result;
}

/* ════════════════════════════════════════════════════════════════
   UTILITY: GET ZONE BY POSITION
════════════════════════════════════════════════════════════════ */

/**
 * Get a specific zone by position name.
 */
export function getZoneByPosition(
  analysis: LightZoneAnalysis,
  position: LightZone["position"]
): LightZone | undefined {
  return analysis.zones.find((z) => z.position === position);
}

/* ════════════════════════════════════════════════════════════════
   UTILITY: GET SORTED ZONES BY SCORE
════════════════════════════════════════════════════════════════ */

/**
 * Get zones sorted by text safe score (best first).
 */
export function getZonesSortedByScore(
  analysis: LightZoneAnalysis
): LightZone[] {
  return [...analysis.zones].sort((a, b) => b.textSafeScore - a.textSafeScore);
}

/* ════════════════════════════════════════════════════════════════
   UTILITY: GET ZONES FOR SIDE
════════════════════════════════════════════════════════════════ */

/**
 * Get zones on a specific side.
 */
export function getZonesForSide(
  analysis: LightZoneAnalysis,
  side: "left" | "right" | "top" | "bottom"
): LightZone[] {
  const sidePositions: Record<string, string[]> = {
    left: ["top_left", "middle_left", "bottom_left"],
    right: ["top_right", "middle_right", "bottom_right"],
    top: ["top_left", "top_center", "top_right"],
    bottom: ["bottom_left", "bottom_center", "bottom_right"],
  };

  const positions = sidePositions[side] || [];
  return analysis.zones.filter((z) => positions.includes(z.position));
}
