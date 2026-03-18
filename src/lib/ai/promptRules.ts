/**
 * Shared prompt rules — single source of truth.
 * Import these constants in composeWithProductIA.ts and gemini.ts.
 * NEVER copy-paste these rules inline in other files.
 */

// ─── Zone percentages ─────────────────────────────────────────────────────────

/**
 * Single source of truth for zone boundary percentages.
 * Change one value here → all placement strings in buildZonePlacement update automatically.
 */
export const ZONE_PERCENTAGES = {
  HORIZONTAL_SUBJECT: 42,  // width % of the subject zone (horizontal splits)
  HORIZONTAL_COPY:    58,  // width % of the copy zone (horizontal splits)
  VERTICAL_SUBJECT:   45,  // height % of the subject zone (scene/product modes)
  VERTICAL_COPY:      55,  // height % of the copy zone (scene/product modes)
  AVATAR_SUBJECT:     42,  // height % of the avatar zone (avatar mode)
  AVATAR_COPY:        58,  // height % of the copy zone (avatar mode)
} as const;

// ─── Zone inversion ───────────────────────────────────────────────────────────

/**
 * Single source of truth for copyZone → productZone inversion.
 * "Where the copy lives" → "where the person/product goes".
 * Replaces 5 parallel implementations across gemini.ts and composeWithProductIA.ts.
 */
export function resolvePlacementZone(
  copyZone: string,
): "left" | "right" | "top" | "bottom" | "center" {
  switch (copyZone) {
    case "right":  return "left";
    case "left":   return "right";
    case "top":    return "bottom";
    case "bottom": return "top";
    case "center": return "center";
    default:       return "right";
  }
}

// ─── Zone placement constraint builder ───────────────────────────────────────

/**
 * Builds the "PLACEMENT ZONE" constraint block for Gemini image prompts.
 * copyZone is WHERE THE TEXT LIVES — the person/product goes on the opposite side.
 * This function handles the inversion internally for all modes.
 *
 * Moved from composeWithProductIA.ts — now the single shared implementation.
 * Import this in composeWithProductIA.ts and gemini.ts; never redefine locally.
 */
export function buildZonePlacement(
  copyZone: "left" | "right" | "top" | "bottom" | "center",
  mode: "scene" | "product" | "avatar",
  opts?: { fullBleed?: boolean },
): string {
  const Z = ZONE_PERCENTAGES;

  if (mode === "scene") {
    // Full-bleed: person covers the entire canvas, but avoids blocking headline/logo areas with face/body center
    if (opts?.fullBleed) {
      const avoidZone = copyZone === "top"
        ? `================================================================================
ABSOLUTE POSITION RULE — NON-NEGOTIABLE
================================================================================
- The person FILLS THE ENTIRE CANVAS — full-bleed, edge-to-edge, cinematic framing.
- The TOP 30% of the canvas is reserved for a text headline and logo. This zone MUST remain visually clear.
- The person's FACE must be positioned ENTIRELY BELOW the 30% vertical line — face center must be at or below 40% from the top.
- The person's body, arms, hair, and silhouette MAY extend into the top 30% — ONLY the FACE must stay below.
- The TOP-LEFT corner (first 15% width × 12% height) is reserved for the logo — do NOT place the face or any focal element there.
- A composition where the face appears in the top 30% is INVALID and will be rejected.
================================================================================`
        : copyZone === "bottom"
        ? `- The person FILLS THE ENTIRE CANVAS — full-bleed, edge-to-edge, cinematic framing.
- IMPORTANT: the BOTTOM 25% of the image will have a text overlay. Position the person's FACE in the upper-center of the canvas so text reads clearly over legs, torso, or negative space.
- The person's body MAY extend into the bottom area — only the FACE should avoid being directly behind the text.`
        : copyZone === "left"
        ? `- The person FILLS THE ENTIRE CANVAS — full-bleed, edge-to-edge, cinematic framing.
- IMPORTANT: the LEFT ${Z.VERTICAL_SUBJECT}% will have a text overlay. Position the person's FACE in the right-center of the canvas so text reads clearly.
- The person's body MAY extend into the left area — only the FACE should avoid being directly behind the text.`
        : copyZone === "right"
        ? `- The person FILLS THE ENTIRE CANVAS — full-bleed, edge-to-edge, cinematic framing.
- IMPORTANT: the RIGHT ${Z.VERTICAL_SUBJECT}% will have a text overlay. Position the person's FACE in the left-center of the canvas so text reads clearly.
- The person's body MAY extend into the right area — only the FACE should avoid being directly behind the text.`
        : `- The person FILLS THE ENTIRE CANVAS — full-bleed, edge-to-edge, cinematic framing.
- Keep the person large and prominent, centered. Avoid placing the face directly behind any existing text or graphic elements.`;
      return avoidZone;
    }

    switch (copyZone) {
      case "right":
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the LEFT ${Z.HORIZONTAL_SUBJECT}% of the image (left edge to ${Z.HORIZONTAL_SUBJECT}% width).
- A clear gap of at least 8% must exist between the right edge of the person and the center line.
- The RIGHT ${Z.HORIZONTAL_COPY}% of the image must remain COMPLETELY UNCHANGED — no person, no arm, no hair, no shadow, no alteration of any kind.`;
      case "top":
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned STRICTLY in the BOTTOM ${Z.VERTICAL_SUBJECT}% of the image ONLY (below ${Z.VERTICAL_COPY}% vertical).
- The person's head (top of hair) must NOT go above the ${Z.VERTICAL_COPY}% vertical line of the image.
- The person MUST be CENTERED HORIZONTALLY.
- The TOP ${Z.VERTICAL_COPY}% of the image MUST remain COMPLETELY UNTOUCHED — all existing text and decorations preserved pixel-perfect.`;
      case "bottom":
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the TOP ${Z.VERTICAL_SUBJECT}% of the image (above ${Z.VERTICAL_SUBJECT}% vertical).
- The person's feet must NOT go below the ${Z.VERTICAL_SUBJECT}% vertical line of the image.
- The person MUST be CENTERED HORIZONTALLY.
- The BOTTOM ${Z.VERTICAL_COPY}% of the image MUST remain COMPLETELY UNTOUCHED — all existing text and decorations preserved pixel-perfect.`;
      case "center":
        return `PLACEMENT ZONE — guidance:
- The person can be placed centrally, but should be large and prominent.
- Keep the overall composition balanced. Avoid covering any existing text or graphic elements.`;
      case "left":
      default:
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the RIGHT ${Z.HORIZONTAL_SUBJECT}% of the image (from ${Z.HORIZONTAL_COPY}% to 100% width).
- A clear gap of at least 8% must exist between the left edge of the person and the center line.
- The LEFT ${Z.HORIZONTAL_COPY}% of the image must remain COMPLETELY UNCHANGED — no person, no arm, no hair, no shadow, no alteration of any kind.`;
    }
  }

  if (mode === "avatar") {
    switch (copyZone) {
      case "top":
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the BOTTOM ${Z.AVATAR_SUBJECT}% of the canvas (below ${Z.AVATAR_COPY}% vertical).
- The person's head must NOT go above ${Z.AVATAR_COPY}% from the top.
- The person fills the full horizontal width of the bottom zone.
- The TOP ${Z.AVATAR_COPY}% must remain COMPLETELY UNCHANGED — no person, no arm, no shadow, no alteration.`;
      case "bottom":
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the TOP ${Z.AVATAR_SUBJECT}% of the canvas.
- The BOTTOM ${Z.AVATAR_COPY}% must remain exactly as the background — completely clean, no person, no shadows.`;
      case "right":
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the LEFT ${Z.AVATAR_SUBJECT}% of the canvas (left edge to ${Z.AVATAR_SUBJECT}% width).
- The RIGHT ${Z.AVATAR_COPY}% must remain exactly as the background — completely clean, no person, no arm, no shadow.`;
      case "left":
      default:
        return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the RIGHT ${Z.AVATAR_SUBJECT}% of the canvas (from ${Z.AVATAR_COPY}% to 100% width).
- The LEFT ${Z.AVATAR_COPY}% must remain exactly as the background — completely clean, no person, no arm, no shadow.`;
    }
  }

  // mode === "product"
  const zonePercent =
    copyZone === "right"  ? `LEFT ${Z.HORIZONTAL_SUBJECT}%`   :
    copyZone === "top"    ? `BOTTOM ${Z.VERTICAL_SUBJECT}%` :
    copyZone === "bottom" ? `TOP ${Z.HORIZONTAL_SUBJECT}%`    :
                            `RIGHT ${Z.HORIZONTAL_SUBJECT}%`;

  const zoneCleanSide =
    copyZone === "right"
      ? `RIGHT ${Z.HORIZONTAL_COPY}% must be COMPLETELY CLEAN — no person, no arm, no hair, no shadow`
      : copyZone === "top"
      ? `TOP ${Z.VERTICAL_COPY}% must be COMPLETELY CLEAN — no person, no arm, no shadow entering from above`
      : copyZone === "bottom"
      ? `BOTTOM ${Z.HORIZONTAL_COPY}% must be COMPLETELY CLEAN — no person, no arm, no shadow`
      : `LEFT ${Z.HORIZONTAL_COPY}% must be COMPLETELY CLEAN — no person, no arm, no hair, no shadow`;

  const zoneBodyPosition =
    copyZone === "right"
      ? `centered horizontally within the left 30–40% of the canvas`
      : copyZone === "top"
      ? `centered horizontally in the lower canvas, body starting at or below ${Z.AVATAR_COPY}% from top`
      : copyZone === "bottom"
      ? `centered horizontally in the upper canvas, entire body within top 40%`
      : `centered horizontally within the right 60–95% of the canvas`;

  return `================================================================================
PRIMARY RULE — ZONE CONSTRAINT — ENFORCED ABOVE ALL ELSE
================================================================================
The person and product must occupy ONLY the ${zonePercent} of the canvas.
The ${zoneCleanSide} — absolutely no body part, arm, hair, clothing, or shadow may cross this boundary.
Body center: ${zoneBodyPosition}.
Leave a minimum 6% safety gap between any body part and the zone boundary.
THIS OVERRIDES the creative brief if there is any conflict.
================================================================================`;
}

export const ABSOLUTE_RULES_TEXT_PRESERVATION = `ABSOLUTE RULES — violation is not acceptable:
- All pre-existing text, badges, labels, stars, icons, and graphic elements
  must remain perfectly intact and legible — do NOT erase, cover, blur,
  distort, or modify them in any way.`;

export const ABSOLUTE_RULES_ANATOMY = `- The person must have EXACTLY two arms and two hands —
  correct human anatomy is mandatory. Never generate extra limbs.`;

export const ABSOLUTE_RULES_PRODUCT = `- Preserve the product's exact appearance, colors, labels,
  and proportions — do NOT alter the product in any way.
- The product must always be FULLY VISIBLE and FULLY OPAQUE —
  never crop, clip, fade, dissolve, or apply transparency to it.`;

export const ABSOLUTE_RULES_BACKGROUND = `- DO NOT modify, alter, recolor, blur, brighten, darken,
  or change ANY part of the background. Only add the requested element.`;

/** Combined ruleset for scene generation (person + product + background) */
export const ABSOLUTE_RULES_SCENE = [
  ABSOLUTE_RULES_TEXT_PRESERVATION,
  ABSOLUTE_RULES_ANATOMY,
  ABSOLUTE_RULES_BACKGROUND,
].join("\n");

/** Combined ruleset for product injection */
export const ABSOLUTE_RULES_PRODUCT_INJECT = [
  ABSOLUTE_RULES_TEXT_PRESERVATION,
  ABSOLUTE_RULES_PRODUCT,
  ABSOLUTE_RULES_BACKGROUND,
].join("\n");
