/**
 * Template: Antes vs Después (Before & After)
 *
 * Inspirado en el estilo "PORE FAVOR — Day 1 vs Day 90":
 *   IZQUIERDA (blanco):   "DÍA 1" + emoji triste 😥 + bullets de problemas
 *   DERECHA  (color):     "DÍA X"  + emoji estrella 🤩 + bullets de resultados
 *   ABAJO CENTER:         producto grande cruzando ambas columnas
 *   CENTRO:               línea vertical punteada divisoria
 *
 * Reutiliza campos existentes del CopyContentSchema:
 *   competitionTitle   → título izquierda (ej: "DÍA 1")
 *   columnTitle        → título derecha   (ej: "DÍA 90")
 *   competitionBullets → problemas/dolor (izquierda, max 4)
 *   bullets            → resultados/beneficios (derecha, max 4)
 *   badge              → opcional, pill superior
 */

import type { LayoutSpec } from "../layoutSpec";
import type { TemplateCopy } from "./classic-editorial";

type AntesDespuesCopy = TemplateCopy & {
  columnTitle?: string;
  competitionTitle?: string;
  competitionBullets?: string[];
};

// ── Layout builder ────────────────────────────────────────────────────────────

export function buildAntesDespuesLayout(
  copy: TemplateCopy,
  canvas = { width: 1080, height: 1080 },
): LayoutSpec {
  const c = copy as AntesDespuesCopy;
  const { width: CW, height: CH } = canvas;

  // ── Column bounds ─────────────────────────────────────────────────────────
  const LEFT_X  = Math.round(CW * 0.04);
  const LEFT_W  = Math.round(CW * 0.42);
  const RIGHT_X = Math.round(CW * 0.54);
  const RIGHT_W = Math.round(CW * 0.42);

  // ── Column titles ("DÍA 1" / "DÍA 90") ───────────────────────────────────
  const TITLE_Y    = Math.round(CH * 0.04);
  const TITLE_FONT = Math.round(CW * 0.048);
  const TITLE_H    = Math.round(TITLE_FONT * 1.3) + 16;

  // ── Emoji row ─────────────────────────────────────────────────────────────
  const EMOJI_Y    = Math.round(CH * 0.12);
  const EMOJI_FONT = Math.round(CW * 0.055);
  const EMOJI_H    = Math.round(EMOJI_FONT * 1.3) + 8;

  // ── Bullet rows ───────────────────────────────────────────────────────────
  const BULLETS_START_Y = Math.round(CH * 0.22);
  const BULLET_GAP      = Math.round(CH * 0.095);
  const BULLET_FONT     = Math.round(CW * 0.020);
  const BULLET_H        = Math.ceil(BULLET_FONT * 1.5 * 3) + 12;

  // ── Badge (bottom center) ─────────────────────────────────────────────────
  const BADGE_FONT = Math.round(CW * 0.022);
  const BADGE_W    = Math.round(CW * 0.72);
  const BADGE_X    = Math.round((CW - BADGE_W) / 2);
  const BADGE_Y    = Math.round(CH * 0.90);
  const BADGE_H    = Math.ceil(BADGE_FONT + 16 * 2) + 4;

  // ── Data ──────────────────────────────────────────────────────────────────
  const beforeBullets = (c.competitionBullets ?? []).slice(0, 4);
  const afterBullets  = (c.bullets ?? []).slice(0, 4);

  // ── Divider dots (simulated with narrow text blocks) ──────────────────────
  const DIVIDER_X     = Math.round(CW * 0.495);
  const DIVIDER_DOT_W = Math.round(CW * 0.01);

  // ── LayoutSpec ────────────────────────────────────────────────────────────

  return {
    version: "1",
    canvas: { width: CW, height: CH },
    safeArea: { margin: Math.round(CW * 0.03) },

    // Product zone: bottom-center, spanning both columns
    product: {
      anchor: "custom",
      x: Math.round(CW * 0.20),
      y: Math.round(CH * 0.58),
      width: Math.round(CW * 0.60),
      height: Math.round(CH * 0.40),
      scale: 1,
      rotation: 0,
    },

    overlays: [
      // Left half — white/very light (problems side)
      {
        type: "solid",
        x: 0,
        y: 0,
        w: Math.round(CW * 0.50),
        h: CH,
        color: "#F8F6F3",
        opacity: 0.95,
      },
      // Right half — brand primary color (results side)
      {
        type: "solid",
        x: Math.round(CW * 0.50),
        y: 0,
        w: Math.round(CW * 0.50),
        h: CH,
        color: c.primaryColor || "#FFE135",
        opacity: 0.92,
      },
      // Vertical dashed divider (simulated with thin solid line)
      {
        type: "solid",
        x: Math.round(CW * 0.498),
        y: Math.round(CH * 0.03),
        w: 2,
        h: Math.round(CH * 0.55),
        color: "#CCCCCC",
        opacity: 0.60,
      },
    ],

    textBlocks: [
      // ── LEFT TITLE: "DÍA 1" ──────────────────────────────────────────────
      {
        id: "subheadline",
        content: c.competitionTitle ?? "DÍA 1",
        x: LEFT_X,
        y: TITLE_Y,
        w: LEFT_W,
        h: TITLE_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "900",
        fontSize: TITLE_FONT,
        color: "#1A1A1A",
        lineHeight: 1.2,
        letterSpacing: 0.02,
        maxLines: 1,
        textTransform: "uppercase" as const,
      },

      // ── RIGHT TITLE: "DÍA 90" ────────────────────────────────────────────
      {
        id: "headline",
        content: c.columnTitle ?? "DÍA 90",
        x: RIGHT_X,
        y: TITLE_Y,
        w: RIGHT_W,
        h: TITLE_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "900",
        fontSize: TITLE_FONT,
        color: "#1A1A1A",
        lineHeight: 1.2,
        letterSpacing: 0.02,
        maxLines: 1,
        textTransform: "uppercase" as const,
      },

      // ── LEFT EMOJI: 😥 ───────────────────────────────────────────────────
      {
        id: "comp_emoji" as "headline",
        content: "😥",
        x: LEFT_X,
        y: EMOJI_Y,
        w: LEFT_W,
        h: EMOJI_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "400",
        fontSize: EMOJI_FONT,
        color: "#1A1A1A",
        lineHeight: 1,
        letterSpacing: 0,
        maxLines: 1,
        textTransform: "none" as const,
      },

      // ── RIGHT EMOJI: 🤩 ──────────────────────────────────────────────────
      {
        id: "result_emoji" as "headline",
        content: "🤩",
        x: RIGHT_X,
        y: EMOJI_Y,
        w: RIGHT_W,
        h: EMOJI_H,
        align: "center",
        fontFamily: "Montserrat",
        fontWeight: "400",
        fontSize: EMOJI_FONT,
        color: "#1A1A1A",
        lineHeight: 1,
        letterSpacing: 0,
        maxLines: 1,
        textTransform: "none" as const,
      },

      // ── BEFORE BULLETS: left column (problems) ───────────────────────────
      ...beforeBullets.map((bullet, idx) => ({
        id: `comp_${idx}` as "headline",
        content: `•  ${bullet}`,
        x: LEFT_X,
        y: BULLETS_START_Y + idx * BULLET_GAP,
        w: LEFT_W,
        h: BULLET_H,
        align: "left" as const,
        fontFamily: "Montserrat",
        fontWeight: "400",
        fontSize: BULLET_FONT,
        color: "#3A3A3A",
        lineHeight: 1.5,
        letterSpacing: 0,
        maxLines: 3,
        textTransform: "none" as const,
      })),

      // ── AFTER BULLETS: right column (results) ────────────────────────────
      ...afterBullets.map((bullet, idx) => ({
        id: `bullet_${idx}` as "headline",
        content: `•  ${bullet}`,
        x: RIGHT_X,
        y: BULLETS_START_Y + idx * BULLET_GAP,
        w: RIGHT_W,
        h: BULLET_H,
        align: "left" as const,
        fontFamily: "Montserrat",
        fontWeight: "500",
        fontSize: BULLET_FONT,
        color: "#1A1A1A",
        lineHeight: 1.5,
        letterSpacing: 0,
        maxLines: 3,
        textTransform: "none" as const,
      })),

      // ── BADGE: bottom center (optional) ───────────────────────────────────
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
                padding: 16,
                opacity: 0.90,
              },
            },
          ]
        : []),
    ],

    confidence: 1,
    rationale:
      "antes-despues — Day 1 vs Day X style: left=problems (white bg), right=results (yellow bg), product centered at bottom spanning both columns",
    warnings: [
      "Product composited at bottom-center spanning both columns via PRODUCT_IA.",
      "4 comparison rows: left=before problems, right=after results.",
    ],
  } as unknown as LayoutSpec;
}
