/**
 * Shared prompt rules — single source of truth.
 * Import these constants in composeWithProductIA.ts and gemini.ts.
 * NEVER copy-paste these rules inline in other files.
 */

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
