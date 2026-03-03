/**
 * Template: Comparacion Split
 *
 * Layout — two columns comparing COMPETITION (left) vs YOUR PRODUCT (right):
 *   TOP BAR  (0%–10%):    badge/offer — full-width centered dark pill
 *   LEFT     (0–48%):     competition — column title (gray) + ✗ weaknesses
 *   RIGHT    (52–100%):   your product — column title (teal) + product zone + ✓ bullets
 *   CENTER:               vertical divider line + "VS" label
 *
 * Layout inspirado en comparativas tipo "Regular vs Personalised" donde
 * el lado negativo (competencia/genérico) queda a la izquierda y el
 * producto propio (branded/premium) a la derecha.
 *
 * TemplateCopy fields:
 *   badge              — top offer pill
 *   columnTitle        — your product name (right, teal) — falls back to title
 *   competitionTitle   — competition label (left, gray) — default "Otros productos"
 *   bullets            — your benefits (right, ✓, max 4)
 *   competitionBullets — their weaknesses (left, ✗, max 4)
 *
 * Dos variantes:
 *   buildComparacionSplitLayout    — fondo beige cálido liso, sin escena generada
 *   buildComparacionSplitIALayout  — escena split generada por PRODUCT_IA:
 *                                    izquierda = productos genéricos/blancos de la categoría
 *                                    derecha   = el producto de la marca (branded, premium)
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

// Extended copy type for this template
type ComparacionCopy = TemplateCopy & {
  columnTitle?: string;
  competitionTitle?: string;
  competitionBullets?: string[];
};

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildComparacionSplitLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const c = copy as ComparacionCopy;
  const { width: CW, height: CH } = canvas;

  // ── Reference: MEENO "US VS THEM" style ────────────────────────────────
  // LEFT = YOUR product (brand primary color background)
  // RIGHT = COMPETITION (light gray background)
  // Logo centered at top → title → column labels → products → numbered rows

  // ── Column bounds ─────────────────────────────────────────────────────────

  const LEFT_X  = Math.round(CW * 0.02);
  const LEFT_W  = Math.round(CW * 0.44);
  const RIGHT_X = Math.round(CW * 0.54);
  const RIGHT_W = Math.round(CW * 0.44);

  // ── Main title — leaves space at top for centered logo (~10% of canvas) ──

  const TITLE_FONT = Math.round(CW * 0.032);           // smaller (was 0.042)
  const TITLE_Y    = Math.round(CH * 0.14);            // space for logo above (logo top=43px + maxH=86px = ~130px)
  const TITLE_H    = Math.round(TITLE_FONT * 1.25 * 2) + 24; // 2-line room

  // ── Column labels ("NOSOTROS" / "ELLOS") ──────────────────────────────────

  const LABEL_FONT = Math.round(CW * 0.025);
  const LABEL_Y    = TITLE_Y + TITLE_H + 8;            // dynamic: right after title
  const LABEL_H    = Math.round(LABEL_FONT * 1.3) + 24;

  // ── Comparison rows (max 4) ───────────────────────────────────────────────

  const ROWS_START_Y = Math.round(CH * 0.52);
  const ROW_GAP      = Math.round(CH * 0.105);
  const BULLET_FONT  = Math.round(CW * 0.019);
  const BULLET_H     = Math.ceil(BULLET_FONT * 1.5 * 3) + 8;

  // ── Number circles (centered between columns) ────────────────────────────

  const NUM_FONT     = Math.round(CW * 0.020);
  const NUM_W        = Math.round(CW * 0.065);
  const NUM_X        = Math.round(CW * 0.468);
  const NUM_OFFSET_Y = Math.round(BULLET_FONT * 0.5);

  // ── Data ──────────────────────────────────────────────────────────────────

  const yourBullets = (c.bullets ?? []).slice(0, 4);
  const compBullets = (c.competitionBullets ?? []).slice(0, 4);
  const maxRows = Math.max(yourBullets.length, compBullets.length);

  // ── LayoutSpec ────────────────────────────────────────────────────────────

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.03) },

    // Product zone: LEFT column (composeSplitComparison places original here)
    product: {
      anchor: "custom",
      x: Math.round(CW * 0.05),
      y: Math.round(CH * 0.23),
      width: Math.round(CW * 0.40),
      height: Math.round(CH * 0.25),
      scale: 1,
      rotation: 0,
    },

    overlays: [
      // Left half — brand primary color (your product side)
      {
        type: "solid",
        x: 0,
        y: 0,
        w: Math.round(CW * 0.50),
        h: CH,
        color: c.primaryColor || "#8B7355",
        opacity: 0.88,
      },
      // Right half — light gray (competition side)
      {
        type: "solid",
        x: Math.round(CW * 0.50),
        y: 0,
        w: Math.round(CW * 0.50),
        h: CH,
        color: "#D0D0D0",
        opacity: 0.92,
      },
    ],

    textBlocks: [
      // ── MAIN TITLE: "NOSOTROS VS ELLOS" centered with dark background ────
      {
        id: "headline",
        content: c.headline ?? "NOSOTROS VS ELLOS",
        x: Math.round(CW * 0.10),
        y: TITLE_Y,
        w: Math.round(CW * 0.80),
        h: TITLE_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "900",
        fontSize: TITLE_FONT,
        color: "#FFFFFF",
        lineHeight: 1.2,
        letterSpacing: 0.02,
        maxLines: 2,
        textTransform: "uppercase" as const,
        background: {
          type: "pill" as const,
          color: "#2C2C2C",
          radius: 12,
          padding: 20,
          opacity: 0.90,
        },
      },

      // ── LEFT LABEL: your product/brand name ───────────────────────────────
      {
        id: "subheadline",
        content: c.columnTitle ?? "NOSOTROS",
        x: Math.round(CW * 0.08),
        y: LABEL_Y,
        w: Math.round(CW * 0.34),
        h: LABEL_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: LABEL_FONT,
        color: "#FFFFFF",
        lineHeight: 1.3,
        letterSpacing: 0.04,
        maxLines: 1,
        textTransform: "uppercase" as const,
        background: {
          type: "pill" as const,
          color: "#FFFFFF",
          radius: 8,
          padding: 10,
          opacity: 0.15,
        },
      },

      // ── RIGHT LABEL: competition name ─────────────────────────────────────
      {
        id: "cta",
        content: c.competitionTitle ?? "ELLOS",
        x: Math.round(CW * 0.58),
        y: LABEL_Y,
        w: Math.round(CW * 0.34),
        h: LABEL_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: LABEL_FONT,
        color: "#3A3A3A",
        lineHeight: 1.3,
        letterSpacing: 0.04,
        maxLines: 1,
        textTransform: "uppercase" as const,
        background: {
          type: "pill" as const,
          color: "#000000",
          radius: 8,
          padding: 10,
          opacity: 0.08,
        },
      },

      // ── YOUR BENEFITS: left column — bold white = winner ──────────────────
      ...yourBullets.map((bullet, idx) => ({
        id: `bullet_${idx}` as "headline",
        content: bullet,
        x: LEFT_X,
        y: ROWS_START_Y + idx * ROW_GAP,
        w: LEFT_W,
        h: BULLET_H,
        align: "center" as const,
        fontFamily: "Montserrat",
        fontWeight: "700",          // ↑ bold (was "500") — visually dominant
        fontSize: BULLET_FONT,
        color: "#FFFFFF",
        lineHeight: 1.5,
        letterSpacing: 0,
        maxLines: 3,
        textTransform: "none" as const,
      })),

      // ── COMPETITION WEAKNESSES: right column — muted gray = loser ─────────
      ...compBullets.map((bullet, idx) => ({
        id: `comp_${idx}` as "headline",
        content: bullet,
        x: RIGHT_X,
        y: ROWS_START_Y + idx * ROW_GAP,
        w: RIGHT_W,
        h: BULLET_H,
        align: "center" as const,
        fontFamily: "Montserrat",
        fontWeight: "400",          // regular weight — visually secondary
        fontSize: BULLET_FONT,
        color: "#7A7A7A",           // ↓ muted gray (was "#3A3A3A") — reads as "loser"
        lineHeight: 1.5,
        letterSpacing: 0,
        maxLines: 3,
        textTransform: "none" as const,
      })),

      // ── NUMBER CIRCLES: white circle centered between columns ─────────────
      ...Array.from({ length: maxRows }, (_, idx) => ({
        id: `num_${idx}` as "headline",
        content: String(idx + 1),
        x: NUM_X,
        y: ROWS_START_Y + idx * ROW_GAP + NUM_OFFSET_Y,
        w: NUM_W,
        h: Math.round(NUM_FONT + 20),
        align: "center" as const,
        fontFamily: "Montserrat",
        fontWeight: "700",
        fontSize: NUM_FONT,
        color: "#1A1A1A",           // dark text on white circle
        lineHeight: 1,
        letterSpacing: 0,
        maxLines: 1,
        textTransform: "none" as const,
        background: {
          type: "pill" as const,
          color: "#FFFFFF",         // white circle
          radius: 50,
          padding: 8,
          opacity: 1,
        },
      })),
    ],

    confidence: 1,
    rationale:
      "comparacion-split v3 — US VS THEM style: left=your product (brand primary color), right=competition (light gray), white numbered circles, centered logo at top",
    warnings: [
      "Product composited via splitComparison: original LEFT (25%x), knockoff RIGHT (75%x).",
      "4 comparison rows with numbered center circles.",
    ],
  } as unknown as LayoutSpec;
}

// ── IA variant ────────────────────────────────────────────────────────────────
/**
 * buildComparacionSplitIALayout
 *
 * Igual que buildComparacionSplitLayout pero con requiresSceneGeneration = true.
 * PRODUCT_IA genera una escena dividida en el fondo:
 *   - Izquierda: resultado agradable relacionado con el producto (piel radiante,
 *     textura suave, persona satisfecha con el resultado)
 *   - Derecha:   comparativa negativa (piel seca/áspera, persona incómoda,
 *     producto genérico barato)
 *
 * Los overlays tienen mayor opacidad para garantizar legibilidad del texto
 * sobre la foto generada.
 */
export function buildComparacionSplitIALayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const c = copy as ComparacionCopy;
  const { width: CW, height: CH } = canvas;

  // LEFT = competencia (productos genéricos), RIGHT = su producto branded
  const LEFT_X  = Math.round(CW * 0.04);
  const LEFT_W  = Math.round(CW * 0.42);
  const RIGHT_X = Math.round(CW * 0.52);
  const RIGHT_W = Math.round(CW * 0.44);

  const COL_TITLE_Y    = Math.round(CH * 0.07);
  const COL_TITLE_FONT = Math.round(CW * 0.030);
  const COL_TITLE_H    = Math.ceil(COL_TITLE_FONT * 1.3 * 2) + 8;

  const BULLETS_START_Y = Math.round(CH * 0.58);
  const BULLET_GAP      = Math.round(CH * 0.065);
  const BULLET_FONT     = Math.round(CW * 0.020);
  const BULLET_H        = Math.ceil(BULLET_FONT * 1.5 * 2) + 8;

  const BADGE_FONT = Math.round(CW * 0.020);
  const BADGE_W    = Math.round(CW * 0.75);
  const BADGE_X    = Math.round((CW - BADGE_W) / 2);
  const BADGE_Y    = Math.round(CH * 0.005);
  const BADGE_H    = Math.ceil(BADGE_FONT + 14 * 2) + 4;

  const VS_FONT = Math.round(CW * 0.018);
  const VS_W    = Math.round(CW * 0.08);
  const VS_X    = Math.round(CW * 0.46);
  const VS_Y    = Math.round(CH * 0.38);
  const VS_H    = Math.ceil(VS_FONT + 8 * 2) + 4;

  const yourBullets = (c.bullets ?? []).slice(0, 3);
  const compBullets = (c.competitionBullets ?? []).slice(0, 3);

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.03) },

    // PRODUCT_IA genera la escena split:
    // izquierda = productos genéricos/blancos de la categoría (en el fondo)
    // derecha   = el producto real de la marca se compone acá
    product: {
      anchor: "custom",
      x: Math.round(CW * 0.54),
      y: Math.round(CH * 0.16),
      width: Math.round(CW * 0.40),
      height: Math.round(CH * 0.40),
      scale: 1,
      rotation: 0,
    },

    overlays: [
      // Left column — tinte gris sobre foto de productos genéricos
      {
        type: "solid",
        x: 0,
        y: 0,
        w: Math.round(CW * 0.48),
        h: CH,
        color: "#F0EBE5",
        opacity: 0.55,
      },
      // Right column — tinte teal suave sobre foto del producto branded
      {
        type: "solid",
        x: Math.round(CW * 0.52),
        y: 0,
        w: Math.round(CW * 0.48),
        h: CH,
        color: "#E8F4F3",
        opacity: 0.50,
      },
      // Línea divisoria central
      {
        type: "solid",
        x: Math.round(CW * 0.496),
        y: Math.round(CH * 0.04),
        w: 1,
        h: Math.round(CH * 0.92),
        color: "#A0A0A0",
        opacity: 0.80,
      },
    ],

    textBlocks: [
      // ── BADGE: dark pill top-center ───────────────────────────────────────
      ...(c.badge
        ? [
            {
              id: "badge" as const,
              content: c.badge,
              x: BADGE_X,
              y: BADGE_Y,
              w: BADGE_W,
              h: BADGE_H,
              align: "center" as const,
              fontFamily: "Montserrat",
              fontWeight: "700" as const,
              fontSize: BADGE_FONT,
              color: "#FFFFFF",
              lineHeight: 1,
              letterSpacing: 0,
              maxLines: 1,
              textTransform: "none" as const,
              background: {
                type: "pill" as const,
                color: "#1A1A1A",
                radius: 28,
                padding: 14,
                opacity: 1,
              },
            },
          ]
        : []),

      // ── LEFT COLUMN TITLE: competencia (gris oscuro sobre fondo claro) ────
      {
        id: "subheadline",
        content: c.competitionTitle ?? "Otros productos",
        x: LEFT_X,
        y: COL_TITLE_Y,
        w: LEFT_W,
        h: COL_TITLE_H,
        align: "center",
        fontFamily: "Playfair Display",
        fontWeight: "400",
        fontSize: COL_TITLE_FONT,
        color: "#4A4A4A",
        lineHeight: 1.3,
        letterSpacing: -0.01,
        maxLines: 2,
        textTransform: "none",
      },

      // ── RIGHT COLUMN TITLE: su producto (teal oscuro sobre fondo claro) ───
      {
        id: "headline",
        content: c.columnTitle ?? c.title ?? "",
        x: RIGHT_X,
        y: COL_TITLE_Y,
        w: RIGHT_W,
        h: COL_TITLE_H,
        align: "center",
        fontFamily: "Playfair Display",
        fontWeight: "700",
        fontSize: COL_TITLE_FONT,
        color: "#2D6E6A",
        lineHeight: 1.3,
        letterSpacing: -0.01,
        maxLines: 2,
        textTransform: "none",
      },

      // ── VS LABEL: centrado en el divisor ──────────────────────────────────
      {
        id: "cta",
        content: "VS",
        x: VS_X,
        y: VS_Y,
        w: VS_W,
        h: VS_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "900",
        fontSize: VS_FONT,
        color: "#1A1A1A",
        lineHeight: 1,
        letterSpacing: 0,
        maxLines: 1,
        textTransform: "none",
        background: {
          type: "pill",
          color: "#FFFFFF",
          radius: 20,
          padding: 8,
          opacity: 1,
        },
      },

      // ── COMPETITION BULLETS: columna izquierda, ✗ ────────────────────────
      ...compBullets.map((bullet, idx) => ({
        id: `comp_${idx}` as "headline",
        content: `✗  ${bullet}`,
        x: LEFT_X,
        y: BULLETS_START_Y + idx * BULLET_GAP,
        w: LEFT_W,
        h: BULLET_H,
        align: "left" as const,
        fontFamily: "Montserrat",
        fontWeight: "400",
        fontSize: BULLET_FONT,
        color: "#5A5A5A",
        lineHeight: 1.5,
        letterSpacing: 0,
        maxLines: 2,
        textTransform: "none" as const,
      })),

      // ── YOUR BULLETS: columna derecha, ✓ ─────────────────────────────────
      ...yourBullets.map((bullet, idx) => ({
        id: `bullet_${idx}` as "headline",
        content: `✓  ${bullet}`,
        x: RIGHT_X,
        y: BULLETS_START_Y + idx * BULLET_GAP,
        w: RIGHT_W,
        h: BULLET_H,
        align: "left" as const,
        fontFamily: "Montserrat",
        fontWeight: "400",
        fontSize: BULLET_FONT,
        color: "#1A1A1A",
        lineHeight: 1.5,
        letterSpacing: 0,
        maxLines: 2,
        textTransform: "none" as const,
      })),
    ],

    confidence: 0.93,
    rationale:
      "TEMPLATE_BETA: comparacion-split-ia — fondo split generado por PRODUCT_IA: izquierda=productos genéricos/blancos, derecha=producto branded. Overlays semitransparentes para mantener legibilidad con texto oscuro.",
    warnings: [
      "El background es una escena split generada por PRODUCT_IA via defaultProductPrompt.",
      "Izquierda: productos genéricos, sin marca, blancos/neutros de la misma categoría.",
      "Derecha: el producto de la marca, branded, colorido, premium, sobre fondo suave.",
      "Los overlays semitransparentes (#F0EBE5 y #E8F4F3) permiten ver la foto manteniendo texto legible.",
    ],
  } as unknown as LayoutSpec;
}
