/**
 * Scene Adapter – Deterministic prompt builder
 *
 * Toma un StrategicCoreOutput y produce 8 background prompts (uno por escena)
 * usando interpolación de reglas + datos del Strategic Core.
 *
 * Sin IA. 100% determinístico.
 */

import { SCENE_LIBRARY, type SceneId, type SceneTemplate } from "./sceneLibrary";
import type { StrategicCoreOutput } from "@/lib/ai/schemas/strategicCore";
import {
  type SceneAdapterOutput,
  type ScenePrompt,
  validateSceneAdapterOutput,
} from "@/lib/ai/schemas/sceneAdapter";

/* ── Negative prompt fijo para backgrounds ── */
const BG_NEGATIVE_PROMPT =
  "no text, no logo, no watermark, no brand names, no labels, no typography";

/* ── Negative space → prompt fragment ── */
const NEGATIVE_SPACE_INSTRUCTIONS: Record<string, string> = {
  right: "large empty negative space on the right side of the frame for text overlay",
  left: "large empty negative space on the left side of the frame for text overlay",
  top: "large empty negative space at the top of the frame for text overlay",
  bottom: "large empty negative space at the bottom of the frame for text overlay",
  top_right: "large empty negative space in the top-right area for text overlay",
  top_left: "large empty negative space in the top-left area for text overlay",
};

/* ── Scene intent descriptions ── */
const SCENE_INTENT: Record<SceneId, string> = {
  AUTHORITY:
    "credibility and trust, professional and authoritative environment, institutional feel",
  BENEFIT:
    "product benefit in action, lifestyle context showing the positive outcome",
  DIFFERENTIAL:
    "product uniqueness and standout quality, clean comparison-friendly backdrop",
  OBJECTION:
    "approachable and reassuring mood, empathy-driven context that neutralizes doubt",
  OFFER:
    "promotional energy, deal excitement, vibrant and attention-grabbing commercial mood",
  URGENCY:
    "time pressure and scarcity, dramatic and bold atmosphere that drives immediate action",
  SOCIAL_PROOF:
    "community and real-world validation, authentic everyday context, testimonial-friendly",
  ASPIRATIONAL:
    "aspirational lifestyle, emotional desire, cinematic and premium feeling",
};

/* ── Helpers ── */

/** Extrae la emoción dominante del strategic core. */
function getDominantEmotion(core: StrategicCoreOutput): string {
  // Inferimos de los desires del primer segmento + awareness level
  const desires = core.audienceSegments[0]?.desires ?? [];
  const pains = core.audienceSegments[0]?.pains ?? [];

  if (desires.length > 0) {
    // Tomamos la primera desire como proxy de emoción aspiracional
    return desires[0].toLowerCase();
  }
  if (pains.length > 0) {
    return `relief from ${pains[0].toLowerCase()}`;
  }
  return "satisfaction and confidence";
}

/** Extrae el posicionamiento de precio del core. */
function getPricePositioning(core: StrategicCoreOutput): string {
  const urgency = core.offerStrategy.urgencyLevel;
  const framing = core.offerStrategy.recommendedFraming;

  if (urgency === "high") return "premium deal, high-value positioning";
  if (urgency === "medium") return "competitive value, smart purchase";
  if (framing) return framing;
  return "quality product, fair price";
}

/** Extrae la categoría del producto del one-liner. */
function getProductCategory(core: StrategicCoreOutput): string {
  // Usamos el ángulo principal como proxy de categoría
  return core.strategicSummary.primaryAngle;
}

/** Obtiene el mejor ángulo para una escena dada. */
function getBestAngleForScene(
  scene: SceneTemplate,
  core: StrategicCoreOutput
): { label: string; visualDirection: string } {
  // Mapeo de scene_id a lo que buscamos en los ángulos
  const sceneToAngleHint: Record<SceneId, string[]> = {
    AUTHORITY: ["authority", "expert", "trust", "credib"],
    BENEFIT: ["benefit", "result", "outcome", "transform"],
    DIFFERENTIAL: ["different", "unique", "vs", "compar", "stand"],
    OBJECTION: ["objection", "doubt", "worry", "risk", "guarantee"],
    OFFER: ["offer", "deal", "price", "discount", "promo"],
    URGENCY: ["urgent", "scarc", "limit", "last", "now", "deadline"],
    SOCIAL_PROOF: ["social", "proof", "testimon", "review", "community"],
    ASPIRATIONAL: ["aspir", "dream", "lifestyle", "premium", "desire"],
  };

  const hints = sceneToAngleHint[scene.scene_id];

  // Buscar el ángulo más relevante
  for (const angle of core.angles) {
    const searchText =
      `${angle.label} ${angle.reasoning}`.toLowerCase();
    if (hints.some((h) => searchText.includes(h))) {
      return {
        label: angle.label,
        visualDirection: angle.visualDirections[0] ?? "",
      };
    }
  }

  // Fallback: usar el primer ángulo
  const fallback = core.angles[0];
  return {
    label: fallback?.label ?? "general",
    visualDirection: fallback?.visualDirections[0] ?? "",
  };
}

/** Obtiene la objeción principal para OBJECTION scene. */
function getTopObjection(core: StrategicCoreOutput): string {
  const highSeverity = core.objectionMap.find((o) => o.severity === "high");
  return truncate(highSeverity?.reframe ?? core.objectionMap[0]?.reframe ?? "", 120);
}

/** Trunca un string a maxLen caracteres (corta en último espacio). */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const cut = str.lastIndexOf(" ", maxLen);
  return str.slice(0, cut > 0 ? cut : maxLen);
}

/** Construye el background prompt para una escena. */
function buildBackgroundPrompt(
  scene: SceneTemplate,
  core: StrategicCoreOutput
): string {
  const category = getProductCategory(core);
  const emotion = getDominantEmotion(core);
  const pricePos = getPricePositioning(core);
  const angleInfo = getBestAngleForScene(scene, core);
  const negSpaceInstruction =
    NEGATIVE_SPACE_INSTRUCTIONS[scene.negative_space] ??
    "large empty negative space for text overlay";
  const intent = SCENE_INTENT[scene.scene_id];

  // Partes del prompt
  const parts: string[] = [];

  // 1) Formato y aspecto
  parts.push(
    "Professional advertising photograph, 1080x1350 portrait format, high resolution"
  );

  // 2) Intent de la escena
  parts.push(`Scene intent: ${intent}`);

  // 3) Lighting + palette de la scene library
  parts.push(
    `Lighting: ${scene.lighting_style}. Color palette: ${scene.palette_hint}`
  );

  // 4) Contexto del producto (sin mostrar el producto)
  parts.push(
    `Context: environment that evokes ${truncate(category, 80)}, ${truncate(emotion, 60)}`
  );

  // 5) Visual direction del ángulo más relevante
  if (angleInfo.visualDirection) {
    parts.push(`Visual direction: ${truncate(angleInfo.visualDirection, 120)}`);
  }

  // 6) Escena-specific additions
  switch (scene.scene_id) {
    case "OFFER":
    case "URGENCY":
      parts.push(
        `Commercial energy: ${pricePos}. Bold, attention-grabbing composition`
      );
      break;
    case "OBJECTION":
      parts.push(
        `Reassuring tone: ${getTopObjection(core)}. Calming, trustworthy atmosphere`
      );
      break;
    case "SOCIAL_PROOF":
      parts.push(
        "Authentic, real-world setting. Warm community feeling, everyday environment"
      );
      break;
    case "ASPIRATIONAL":
      parts.push(
        `Aspirational mood: elevated lifestyle, cinematic depth of field, ${emotion}`
      );
      break;
    case "AUTHORITY":
      parts.push(
        "Clean professional backdrop, institutional credibility, expert environment"
      );
      break;
    default:
      break;
  }

  // 7) Negative space (siempre al final)
  parts.push(negSpaceInstruction);

  // 8) No product directive
  parts.push(
    "Do NOT include the product itself. Do NOT show hands holding objects. Background/environment only"
  );

  // Clamp to 900 chars safety net
  const raw = parts.join(". ").replace(/\.\./, ".");
  return raw.length > 900 ? raw.slice(0, 897) + "..." : raw;
}

/* ── Main function ── */

/**
 * Genera un plan de 8 escenas con background prompts determinísticos
 * a partir del StrategicCoreOutput.
 *
 * @throws Error si la validación del output falla.
 */
export function buildScenePlan(
  strategicCore: StrategicCoreOutput
): SceneAdapterOutput {
  const productName = strategicCore.strategicSummary.oneLiner;

  const scenes: ScenePrompt[] = SCENE_LIBRARY.map((scene) => ({
    scene_id: scene.scene_id,
    layout_id: scene.layout_id,
    negative_space: scene.negative_space,
    background_prompt: buildBackgroundPrompt(scene, strategicCore),
    background_negative_prompt: BG_NEGATIVE_PROMPT,
    rules: { ...scene.rules },
  }));

  const output: SceneAdapterOutput = {
    product_name: productName,
    scenes,
    generated_at_iso: new Date().toISOString(),
  };

  // Validate
  const errors = validateSceneAdapterOutput(output);
  if (errors.length > 0) {
    throw new Error(
      `SceneAdapter validation failed:\n${errors.join("\n")}`
    );
  }

  return output;
}
