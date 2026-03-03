import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { withRetry } from "@/lib/utils/retry";
import { errorResponse } from "@/lib/utils/errors";
import { SCENE_IDS } from "@/lib/scenes/sceneLibrary";
import type { StrategicCoreOutput } from "@/lib/ai/schemas/strategicCore";
import type { SceneAdapterOutput } from "@/lib/ai/schemas/sceneAdapter";
import {
  HOOKS_BY_SCENE_SCHEMA,
  HOOKS_SCENE_REPAIR_SCHEMA,
  validateHookBySceneOutput,
  type HookBySceneOutput,
  type SceneHooks,
} from "@/lib/ai/schemas/hooksByScene";

export const runtime = "nodejs";

/* ── OpenAI client ── */
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.2;
const TOP_P = 1;
const MAX_REPAIR_ROUNDS = 3;

/* ── Input validation ── */
const InputSchema = z.object({
  strategicCore: z.any().refine(
    (v) => v && typeof v === "object" && v.version === "1.0" && Array.isArray(v.angles),
    { message: "strategicCore must be a valid StrategicCoreOutput" }
  ),
  scenePlan: z.any().refine(
    (v) => v && typeof v === "object" && Array.isArray(v.scenes) && v.scenes.length === 8,
    { message: "scenePlan must be a valid SceneAdapterOutput with 8 scenes" }
  ),
});

/* ── Prompts ── */

function buildSystemPrompt(): string {
  return `
Eres un copywriter senior de performance para Meta Ads (e-commerce productos físicos).
Generás hooks y copy para overlay de 8 escenas creativas.

REGLAS ABSOLUTAS:
- 8 escenas, cada una con 2 variantes: A (funcional/racional) y B (emocional/aspiracional).
- Variante A: beneficio concreto, mecanismo, dato funcional. Tono directo.
- Variante B: emoción, aspiración, transformación personal. Tono empático.
- Ambas variantes deben ser balanceadas y de alta calidad.
- Sin emojis. Sin saltos de línea.
- hook: máximo 42 caracteres. Impactante, corto (3-7 palabras).
- subheadline: máximo 64 caracteres. Complementa el hook con beneficio o mecanismo.
- cta: máximo 18 caracteres. Verbo claro.
- badge: máximo 20 caracteres o null.
- Idioma: español latinoamericano.

REGLAS DE CASING:
- OFFER, URGENCY y OBJECTION: hook en MAYÚSCULAS.
- AUTHORITY, BENEFIT, DIFFERENTIAL, SOCIAL_PROOF, ASPIRATIONAL: hook en Sentence case (NO mayúsculas).

REGLAS DE BADGE:
- badge solo en OFFER, URGENCY y SOCIAL_PROOF. En las demás escenas: null.

REGLAS DE CTA:
- CTA tipo "Ver oferta" SOLO en OFFER y URGENCY, y SOLO si hay oferta activa.
- En las demás escenas usar CTAs genéricos (Descubrí más, Conocé más, etc.).

Devolvé SOLO JSON válido que cumpla el schema.
`.trim();
}

function buildUserPrompt(
  core: StrategicCoreOutput,
  scenePlan: SceneAdapterOutput
): string {
  const summary = core.strategicSummary;
  const pillars = core.messagingPillars.map((p) => `${p.pillar}: ${p.description}`).join("\n");
  const segments = core.audienceSegments
    .map((s) => `${s.label}: pains=[${s.pains.slice(0, 3).join(", ")}] desires=[${s.desires.slice(0, 3).join(", ")}]`)
    .join("\n");
  const objections = core.objectionMap
    .slice(0, 5)
    .map((o) => `"${o.objection}" → ${o.reframe}`)
    .join("\n");
  const angles = core.angles
    .map((a) => `${a.id}: ${a.label} — hooks: ${a.hooks.slice(0, 3).join(" | ")}`)
    .join("\n");

  const offerActive = core.offerStrategy.hasActiveOffer;
  const offerBlock = offerActive
    ? `Oferta activa: ${core.offerStrategy.recommendedFraming}. Deadline: ${core.offerStrategy.deadlineCopy ?? "N/A"}`
    : "Sin oferta activa. NO usar CTAs de oferta.";

  const sceneList = scenePlan.scenes
    .map((s) => {
      const rules = s.rules;
      return `- ${s.scene_id} (layout: ${s.layout_id}): uppercase=${rules.allow_uppercase}, badge=${rules.allow_badge}, offer_cta=${rules.allow_offer_cta}`;
    })
    .join("\n");

  return `
PRODUCTO: ${summary.oneLiner}
ÁNGULO PRINCIPAL: ${summary.primaryAngle}
AWARENESS: ${summary.awarenessLevel}

PILARES:
${pillars}

SEGMENTOS:
${segments}

OBJECIONES TOP:
${objections}

ÁNGULOS DISPONIBLES:
${angles}

${offerBlock}

ESCENAS (con reglas):
${sceneList}

OBJETIVO:
Generá 8 escenas con 2 variantes cada una (A funcional, B emocional).
Asigná el angle_id más relevante a cada escena.
Cumplí estrictamente las reglas de casing, badge y CTA por escena.
`.trim();
}

function buildRepairPrompt(
  badScene: SceneHooks,
  errors: string[],
  hasActiveOffer: boolean
): string {
  return `
Corregí esta escena para cumplir las reglas.
NO cambies scene_id ni angle_id.
Corregí SOLO lo necesario en las variantes.

Errores encontrados:
- ${errors.join("\n- ")}

Reglas recordatorio:
- hook <= 42 chars, subheadline <= 64 chars, cta <= 18 chars, badge <= 20 chars o null
- Sin emojis
- OFFER/URGENCY/OBJECTION: hook en MAYÚSCULAS
- Otras escenas: hook en Sentence case
- badge solo en OFFER/URGENCY/SOCIAL_PROOF (null en las demás)
- CTA "Ver oferta" solo en OFFER/URGENCY con oferta activa (activa: ${hasActiveOffer})

Escena actual (JSON):
${JSON.stringify(badScene, null, 2)}

Devolvé SOLO JSON válido.
`.trim();
}

/* ── Safe JSON parse ── */

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Intenta extraer el JSON si hay texto adicional
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Intenta limpiar caracteres de control y reintentar
        const cleaned = text
          .slice(start, end + 1)
          .replace(/[\x00-\x1F\x7F]/g, " ")
          .replace(/,\s*([}\]])/g, "$1"); // trailing commas
        return JSON.parse(cleaned);
      }
    }
    throw new Error(`Model did not return valid JSON. Preview: ${text.slice(0, 200)}`);
  }
}

/* ── Generate initial batch ── */

async function generateHooksBatch(
  core: StrategicCoreOutput,
  scenePlan: SceneAdapterOutput
): Promise<HookBySceneOutput> {
  const response = await withRetry(
    () =>
      client.responses.create({
        model: MODEL,
        temperature: TEMPERATURE,
        top_p: TOP_P,
        input: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(core, scenePlan) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: HOOKS_BY_SCENE_SCHEMA.name,
            schema: HOOKS_BY_SCENE_SCHEMA.schema,
          },
        },
      }),
    { retries: 2, baseDelayMs: 1500 }
  );

  const outputText = (response as any).output_text;
  if (!outputText) throw new Error("No output returned from model.");
  return safeJsonParse(outputText) as HookBySceneOutput;
}

/* ── Repair single scene ── */

async function repairScene(
  badScene: SceneHooks,
  errors: string[],
  hasActiveOffer: boolean
): Promise<SceneHooks> {
  const response = await client.responses.create({
    model: MODEL,
    temperature: 0.1,
    top_p: TOP_P,
    input: [
      {
        role: "system",
        content:
          "Reparás copy de hooks para escenas de Meta Ads cumpliendo restricciones. Devolvé SOLO JSON válido.",
      },
      {
        role: "user",
        content: buildRepairPrompt(badScene, errors, hasActiveOffer),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: HOOKS_SCENE_REPAIR_SCHEMA.name,
        schema: HOOKS_SCENE_REPAIR_SCHEMA.schema,
      },
    },
  });

  const outputText = (response as any).output_text;
  if (!outputText) throw new Error("No repair output returned.");
  return safeJsonParse(outputText) as SceneHooks;
}

/* ── Route handler ── */

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("Missing OPENAI_API_KEY", 500);
    }

    /* ── Parse & validate input ── */
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const strategicCore = parsed.data.strategicCore as StrategicCoreOutput;
    const scenePlan = parsed.data.scenePlan as SceneAdapterOutput;
    const hasActiveOffer = strategicCore.offerStrategy.hasActiveOffer;

    console.log(
      `[hooks-by-scene] Generating hooks for "${strategicCore.strategicSummary.oneLiner}"…`
    );

    /* ── 1) Generate initial batch ── */
    let output = await generateHooksBatch(strategicCore, scenePlan);

    /* ── 2) Validate + repair loop (up to MAX_REPAIR_ROUNDS) ── */
    for (let round = 0; round < MAX_REPAIR_ROUNDS; round++) {
      const check = validateHookBySceneOutput(output, hasActiveOffer);

      if (check.ok) {
        console.log(
          `[hooks-by-scene] Validation passed on round ${round} (0=first gen).`
        );
        break;
      }

      console.log(
        `[hooks-by-scene] Round ${round + 1}/${MAX_REPAIR_ROUNDS}: ${check.errors.length} errors in ${check.invalidSceneIds.length} scenes. Repairing…`
      );

      // Repair only invalid scenes
      const repairedScenes: SceneHooks[] = [];

      for (const scene of output.scenes) {
        if (!check.invalidSceneIds.includes(scene.scene_id)) {
          repairedScenes.push(scene);
          continue;
        }

        // Collect errors for this specific scene
        const sceneErrors = check.errors.filter((e) =>
          e.startsWith(scene.scene_id)
        );

        try {
          const fixed = await repairScene(scene, sceneErrors, hasActiveOffer);
          // Re-validate the repaired scene alone
          const miniOutput: HookBySceneOutput = {
            version: "1.0",
            scenes: [fixed],
            generated_at_iso: "",
          };
          const recheck = validateHookBySceneOutput(miniOutput, hasActiveOffer);
          repairedScenes.push(recheck.ok ? fixed : scene); // fallback to original if repair fails
        } catch (err) {
          console.warn(
            `[hooks-by-scene] Repair failed for ${scene.scene_id}:`,
            err
          );
          repairedScenes.push(scene); // keep original
        }
      }

      output.scenes = repairedScenes;
    }

    // Ensure timestamp
    output.generated_at_iso =
      output.generated_at_iso || new Date().toISOString();

    // Final validation (log only, don't block response)
    const finalCheck = validateHookBySceneOutput(output, hasActiveOffer);
    if (!finalCheck.ok) {
      console.warn(
        `[hooks-by-scene] Final output has ${finalCheck.errors.length} remaining issues:`,
        finalCheck.errors.slice(0, 5)
      );
    }

    console.log(
      `[hooks-by-scene] Done. ${output.scenes.length} scenes, ${output.scenes.length * 2} variants.`
    );

    return NextResponse.json({ ok: true, hooksByScene: output }, { status: 200 });
  } catch (err: any) {
    console.error("[hooks-by-scene] Error:", err);
    return errorResponse(err?.message ?? "Internal server error", 500);
  }
}
