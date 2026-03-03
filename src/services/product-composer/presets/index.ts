/**
 * Preset Registry
 * 
 * Central registry for layout presets.
 * Provides:
 * - listPresets(): metadata for UI dropdown
 * - getPreset(id): full preset JSON with Zod validation
 */

import { z } from "zod";
import { PresetSchema, type Preset, type PresetMetadata } from "./types";

/* ═══════════════════════════════════════════════════════════════
   IMPORT PRESETS
═══════════════════════════════════════════════════════════════ */

// Import preset JSONs
import HERO_LEFT_COPY_RIGHT_BADGE_V1 from "./HERO_LEFT_COPY_RIGHT_BADGE_V1.json";

/* ═══════════════════════════════════════════════════════════════
   PRESET REGISTRY MAP
═══════════════════════════════════════════════════════════════ */

// All presets registered here
const PRESETS_RAW: Record<string, unknown> = {
  HERO_LEFT_COPY_RIGHT_BADGE_V1,
};

// Validated preset cache
const validatedPresets: Map<string, Preset> = new Map();

/* ═══════════════════════════════════════════════════════════════
   REGISTRY FUNCTIONS
═══════════════════════════════════════════════════════════════ */

/**
 * List all available presets with metadata for UI display.
 * Does NOT load full preset data - lightweight for dropdown.
 */
export function listPresets(): PresetMetadata[] {
  const metadata: PresetMetadata[] = [];
  
  for (const [id, raw] of Object.entries(PRESETS_RAW)) {
    // Parse just enough for metadata
    const parsed = raw as Record<string, unknown>;
    metadata.push({
      id,
      name: (parsed.name as string) || id,
      description: (parsed.description as string) || "",
      tags: (parsed.tags as string[]) || [],
      supports: (parsed.supports as string[]) || ["4:5"],
      version: (parsed.version as string) || "1.0.0",
    });
  }
  
  return metadata;
}

/**
 * Get preset IDs for quick lookup.
 */
export function listPresetIds(): string[] {
  return Object.keys(PRESETS_RAW);
}

/**
 * Get a preset by ID with full Zod validation.
 * Throws if preset not found or invalid.
 */
export function getPreset(id: string): Preset {
  // Check cache first
  const cached = validatedPresets.get(id);
  if (cached) {
    return cached;
  }
  
  // Lookup raw
  const raw = PRESETS_RAW[id];
  if (!raw) {
    throw new Error(`Preset not found: ${id}. Available: ${Object.keys(PRESETS_RAW).join(", ")}`);
  }
  
  // Validate with Zod
  const result = PresetSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Invalid preset "${id}": ${issues}`);
  }
  
  // Cache and return
  validatedPresets.set(id, result.data);
  return result.data;
}

/**
 * Check if a preset exists.
 */
export function hasPreset(id: string): boolean {
  return id in PRESETS_RAW;
}

/**
 * Get preset variant for specific aspect ratio.
 */
export function getPresetVariant(preset: Preset, aspectRatio: "4:5" | "1:1" | "9:16" | "16:9") {
  if (!preset.variants) {
    return null;
  }
  return preset.variants.find(v => v.aspectRatio === aspectRatio) || null;
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════ */

export { type Preset, type PresetMetadata } from "./types";
export { PresetSchema } from "./types";
