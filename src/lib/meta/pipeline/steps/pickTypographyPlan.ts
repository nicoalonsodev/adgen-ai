/**
 * Step: pickTypographyPlan
 *
 * Algorithmically determines typography settings based on light zone analysis.
 * NO AI - pure rule-based decision making.
 *
 * Determines:
 * - Text color (dark/light)
 * - Shadow settings
 * - Overlay gradient
 * - Alignment and position
 * - Backplate usage
 */

import type { LightZoneAnalysis, LightZone, TypographyPlan } from "../schemas";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════ */

/** Text color hex values */
const DARK_TEXT = {
  primary: "#101418",
  secondary: "#3A3F47",
};

const LIGHT_TEXT = {
  primary: "#F6F2EA",
  secondary: "#D8D4CC",
};

/** Shadow configurations */
const SHADOW_DARK = {
  color: "rgba(0, 0, 0, 0.25)",
  blur: 8,
  offsetX: 0,
  offsetY: 2,
};

const SHADOW_LIGHT = {
  color: "rgba(255, 255, 255, 0.15)",
  blur: 6,
  offsetX: 0,
  offsetY: 1,
};

/** Overlay gradient configurations */
const OVERLAY_DARK = {
  color: "rgba(0, 0, 0, 0.45)",
};

const OVERLAY_LIGHT = {
  color: "rgba(255, 255, 255, 0.35)",
};

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface BrandHints {
  /** Preferred text alignment */
  preferredAlignment?: "left" | "center" | "right";
  /** Preferred text position */
  preferredPosition?: TypographyPlan["position"];
  /** Force specific text color */
  forceTextColor?: "dark" | "light";
  /** Force backplate */
  forceBackplate?: boolean;
}

export interface PickTypographyPlanInput {
  lightZones: LightZoneAnalysis;
  brandHints?: BrandHints;
  /** Scene brief's preferred text area */
  sceneTextPreference?: string;
}

/* ════════════════════════════════════════════════════════════════
   HELPER: MAP SCENE PREFERENCE TO POSITION
════════════════════════════════════════════════════════════════ */

function mapScenePreferenceToPosition(
  preference?: string
): TypographyPlan["position"] | undefined {
  const mapping: Record<string, TypographyPlan["position"]> = {
    top: "top_center",
    bottom: "bottom_center",
    left: "middle_left",
    right: "middle_right",
    top_left: "top_left",
    top_right: "top_right",
    bottom_left: "bottom_left",
    bottom_right: "bottom_right",
  };

  return preference ? mapping[preference] : undefined;
}

/* ════════════════════════════════════════════════════════════════
   HELPER: FIND BEST ZONE FOR POSITION
════════════════════════════════════════════════════════════════ */

function findBestZoneForPosition(
  zones: LightZone[],
  targetPositions: LightZone["position"][]
): LightZone | undefined {
  const candidates = zones.filter((z) => targetPositions.includes(z.position));
  if (candidates.length === 0) return undefined;

  // Sort by textSafeScore descending
  return candidates.sort((a, b) => b.textSafeScore - a.textSafeScore)[0];
}

/* ════════════════════════════════════════════════════════════════
   HELPER: GET GRADIENT DIRECTION
════════════════════════════════════════════════════════════════ */

function getGradientDirection(
  position: TypographyPlan["position"]
): "top" | "bottom" | "left" | "right" {
  if (position.includes("top")) return "top";
  if (position.includes("bottom")) return "bottom";
  if (position.includes("left")) return "left";
  return "right";
}

/* ════════════════════════════════════════════════════════════════
   HELPER: GET ALIGNMENT FROM POSITION
════════════════════════════════════════════════════════════════ */

function getAlignmentFromPosition(
  position: TypographyPlan["position"]
): "left" | "center" | "right" {
  if (position.includes("left")) return "left";
  if (position.includes("right")) return "right";
  return "center";
}

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Picks typography settings based on light zone analysis.
 *
 * @param input - Light zones and optional brand hints
 * @returns Typography plan
 */
export function pickTypographyPlan(
  input: PickTypographyPlanInput
): TypographyPlan {
  const { lightZones, brandHints, sceneTextPreference } = input;

  // 1. Determine target position
  let targetPosition: TypographyPlan["position"];

  // Priority 1: Brand hints
  if (brandHints?.preferredPosition) {
    targetPosition = brandHints.preferredPosition;
  }
  // Priority 2: Scene brief preference
  else if (sceneTextPreference) {
    const mapped = mapScenePreferenceToPosition(sceneTextPreference);
    targetPosition = mapped || "middle_left";
  }
  // Priority 3: Best zone from analysis
  else if (lightZones.bestZone) {
    // Map zone position to typography position
    const zonePos = lightZones.bestZone.position;
    const positionMapping: Record<LightZone["position"], TypographyPlan["position"]> = {
      top_left: "top_left",
      top_center: "top_center",
      top_right: "top_right",
      middle_left: "middle_left",
      middle_center: "bottom_left", // Avoid center, fallback to bottom-left
      middle_right: "middle_right",
      bottom_left: "bottom_left",
      bottom_center: "bottom_center",
      bottom_right: "bottom_right",
    };
    targetPosition = positionMapping[zonePos];
  }
  // Default: left side
  else {
    targetPosition = "middle_left";
  }

  // 2. Get the zone for this position
  const positionToZone: Record<TypographyPlan["position"], LightZone["position"][]> = {
    top_left: ["top_left", "middle_left"],
    top_center: ["top_center", "top_left", "top_right"],
    top_right: ["top_right", "middle_right"],
    middle_left: ["middle_left", "top_left", "bottom_left"],
    middle_right: ["middle_right", "top_right", "bottom_right"],
    bottom_left: ["bottom_left", "middle_left"],
    bottom_center: ["bottom_center", "bottom_left", "bottom_right"],
    bottom_right: ["bottom_right", "middle_right"],
  };

  const candidatePositions = positionToZone[targetPosition] || ["middle_left"];
  const targetZone = findBestZoneForPosition(lightZones.zones, candidatePositions);

  // 3. Determine text color
  let textColor: "dark" | "light";
  if (brandHints?.forceTextColor) {
    textColor = brandHints.forceTextColor;
  } else if (targetZone) {
    textColor = targetZone.recommendedTextColor;
  } else {
    // Use overall image stats
    textColor = lightZones.imageStats.meanLuminance > 0.5 ? "dark" : "light";
  }

  // 4. Determine if backplate needed
  let useBackplate: boolean;
  if (brandHints?.forceBackplate !== undefined) {
    useBackplate = brandHints.forceBackplate;
  } else if (targetZone) {
    useBackplate = targetZone.needsBackplate;
  } else {
    useBackplate = lightZones.imageStats.dominantRegion === "mixed";
  }

  // 5. Determine shadow
  const shadowBase = textColor === "dark" ? SHADOW_DARK : SHADOW_LIGHT;
  const shadowEnabled = !useBackplate; // Use shadow when no backplate

  // 6. Determine overlay gradient
  // Use gradient when no backplate and zone has high variance
  const overlayEnabled =
    !useBackplate &&
    targetZone &&
    targetZone.variance > 0.02;

  const gradientDirection = getGradientDirection(targetPosition);
  const gradientColor =
    textColor === "dark" ? OVERLAY_LIGHT.color : OVERLAY_DARK.color;

  // 7. Determine alignment
  let alignment: "left" | "center" | "right";
  if (brandHints?.preferredAlignment) {
    alignment = brandHints.preferredAlignment;
  } else {
    alignment = getAlignmentFromPosition(targetPosition);
  }

  // 8. Build typography plan
  const plan: TypographyPlan = {
    textColor,
    primaryHex: textColor === "dark" ? DARK_TEXT.primary : LIGHT_TEXT.primary,
    secondaryHex: textColor === "dark" ? DARK_TEXT.secondary : LIGHT_TEXT.secondary,
    shadow: {
      enabled: shadowEnabled,
      color: shadowEnabled ? shadowBase.color : undefined,
      blur: shadowEnabled ? shadowBase.blur : undefined,
      offsetX: shadowEnabled ? shadowBase.offsetX : undefined,
      offsetY: shadowEnabled ? shadowBase.offsetY : undefined,
    },
    overlayGradient: {
      enabled: overlayEnabled ?? false,
      direction: overlayEnabled ? gradientDirection : undefined,
      opacity: overlayEnabled ? 0.4 : undefined,
      color: overlayEnabled ? gradientColor : undefined,
    },
    alignment,
    position: targetPosition,
    useBackplate,
  };

  console.log(
    `[pickTypographyPlan] Picked: position=${targetPosition}, ` +
    `color=${textColor}, backplate=${useBackplate}, shadow=${shadowEnabled}, ` +
    `gradient=${overlayEnabled}`
  );

  return plan;
}
