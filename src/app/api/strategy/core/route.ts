import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import {
  STRATEGIC_CORE_SCHEMA,
  type StrategicCoreOutput,
} from "@/lib/ai/schemas/strategicCore";
import { withRetry } from "@/lib/utils/retry";
import { errorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";

/* ── OpenAI client ── */
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.1;
const TOP_P = 1;

/* ── Input validation (Zod) ── */
const OfferSchema = z.object({
  active: z.boolean(),
  type: z.string(),
  value: z.string(),
  deadline_iso: z.string(),
  notes: z.string(),
});

const InputSchema = z.object({
  product_name: z.string().min(1, "product_name is required"),
  product_description: z.string().min(1, "product_description is required"),
  primary_benefit: z.string().min(1, "primary_benefit is required"),
  problem_it_solves: z.string().min(1, "problem_it_solves is required"),
  target_audience: z.string().min(1, "target_audience is required"),
  offer: OfferSchema,
});

type StrategyInput = z.infer<typeof InputSchema>;

/* ── Prompts ── */
function buildSystemPrompt(): string {
  return `
Eres un estratega senior de marketing digital especializado en e-commerce de productos físicos.

Tu trabajo es generar un Strategic Core completo y accionable a partir de la información del producto.

REGLAS:
- No inventes datos que no puedas inferir razonablemente del input.
- Sé específico y concreto: evitá generalidades vacías.
- Cada hook debe ser distinto, impactante y listo para usar como primera línea de un ad.
- Los CTAs deben variar en urgencia e intent.
- Las objeciones deben ser realistas para el tipo de producto y audiencia.
- El awareness level se infiere del tipo de producto y audiencia descrita.
- Idioma: español latinoamericano.
- Devolvé SOLO JSON válido que cumpla el schema.
`.trim();
}

function buildUserPrompt(input: StrategyInput): string {
  const offerBlock = input.offer.active
    ? `
OFERTA ACTIVA:
- Tipo: ${input.offer.type}
- Valor: ${input.offer.value}
- Deadline: ${input.offer.deadline_iso}
- Notas: ${input.offer.notes}
`
    : "Sin oferta activa actualmente.";

  return `
PRODUCTO: ${input.product_name}

DESCRIPCIÓN:
${input.product_description}

BENEFICIO PRINCIPAL: ${input.primary_benefit}

PROBLEMA QUE RESUELVE: ${input.problem_it_solves}

AUDIENCIA OBJETIVO: ${input.target_audience}

${offerBlock}

OBJETIVO:
Generá el Strategic Core completo para este producto, incluyendo:
1. Resumen estratégico con one-liner, ángulo principal y nivel de awareness.
2. 3-6 pilares de mensaje con proof points.
3. 2-5 segmentos de audiencia con pains y desires.
4. Mapa de objeciones (3-10) con severity, reframe y copy snippet.
5. Escalera de awareness (3-5 niveles relevantes) con hooks para cada nivel.
6. 5-15 ángulos creativos con hooks y direcciones visuales.
7. Banco de CTAs (5-15) con intent, urgencia y ángulos compatibles.
8. Estrategia de oferta: urgency level, framing recomendado y deadline copy.
`.trim();
}

/* ── Route handler ── */
export async function POST(req: Request) {
  try {
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
    const input = parsed.data;

    console.log(
      `[strategy/core] Generating strategic core for "${input.product_name}"…`
    );

    /* ── Call OpenAI with Structured Outputs ── */
    const response = await withRetry(
      () =>
        client.responses.create({
          model: MODEL,
          temperature: TEMPERATURE,
          top_p: TOP_P,
          input: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: buildUserPrompt(input) },
          ],
          text: {
            format: {
              type: "json_schema",
              name: STRATEGIC_CORE_SCHEMA.name,
              schema: STRATEGIC_CORE_SCHEMA.schema,
            },
          },
        }),
      { retries: 2, baseDelayMs: 1500 }
    );

    /* ── Extract output ── */
    const outputText = (response as any).output_text;
    if (!outputText) {
      console.error("[strategy/core] No output_text returned from model.");
      return errorResponse("No output returned from model", 500);
    }

    /* ── Parse (guaranteed valid by Structured Outputs) ── */
    const strategicCore: StrategicCoreOutput = JSON.parse(outputText);

    // Ensure timestamp
    strategicCore.generatedAtISO =
      strategicCore.generatedAtISO || new Date().toISOString();

    console.log(
      `[strategy/core] Done. Angles: ${strategicCore.angles.length}, CTAs: ${strategicCore.ctaBank.length}`
    );

    return NextResponse.json({ ok: true, strategicCore }, { status: 200 });
  } catch (err: any) {
    console.error("[strategy/core] Error:", err);
    return errorResponse(err?.message ?? "Internal server error", 500);
  }
}
