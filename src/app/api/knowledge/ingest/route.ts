import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Modelo recomendado para ingest / normalización
const MODEL = "gpt-4.1-mini";

/**
 * Extrae texto desde distintos tipos de archivo
 */
async function extractTextFromFile(file: File): Promise<string> {
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error("Archivo demasiado grande. Máximo 10MB.");
  }

  const mime = (file.type || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  // PDF
  if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const mod: any = await import("pdf-parse");
    const pdfParse = mod.default ?? mod;
    const out = await pdfParse(buf);
    return String(out?.text ?? "").trim();
  }

  // DOCX
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const out = await mammoth.extractRawText({ buffer: buf });
    return String(out?.value ?? "").trim();
  }

  // Texto plano
  return buf.toString("utf-8").trim();
}

function buildSystemInstruction() {
  return `
Eres un analista senior de marketing y estrategia.
Debes transformar información desordenada de un negocio en un BusinessProfile estructurado.

REGLAS:
- No inventes datos.
- Si falta información, usa null y agrega preguntas en gaps.questions.
- Evita claims peligrosos (salud, finanzas).
- Devuelve SOLO JSON válido que cumpla el schema.
- Idioma por defecto: español.
`.trim();
}

function buildUserInstruction(args: { rawText: string; sourceName?: string }) {
  return `
FUENTE: ${args.sourceName ?? "texto_usuario"}

CONTENIDO:
---
${args.rawText}
---

OBJETIVO:
Generar un BusinessProfile v1.0 listo para:
- generación de copys
- generación de creativos
- anuncios en Meta

Incluí:
- angles (8–30)
- hooks y visualDirections
`.trim();
}

/**
 * ⚠️ SCHEMA VERSIONADO
 * Cambiar el name evita cache interno del validador
 */
const BUSINESS_PROFILE_SCHEMA = {
  name: "business_profile_v1_1",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      version: { type: "string", enum: ["1.0"] },

      identity: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          industry: { type: ["string", "null"] },
          website: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          language: { type: "string", enum: ["es", "en"] },
        },
        required: ["name", "industry", "website", "country", "language"],
      },

      offer: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          type: { type: ["string", "null"] },
          price: { type: ["string", "null"] },
          promo: { type: ["string", "null"] },
          guarantee: { type: ["string", "null"] },
          availability: { type: ["string", "null"] },
        },
        required: ["name", "type", "price", "promo", "guarantee", "availability"],
      },

      audience: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: ["string", "null"] },
          description: { type: "string" },
          pains: { type: "array", items: { type: "string" } },
          desires: { type: "array", items: { type: "string" } },
          objections: { type: "array", items: { type: "string" } },
          triggers: { type: ["array", "null"], items: { type: "string" } },
        },
        required: [
          "name",
          "description",
          "pains",
          "desires",
          "objections",
          "triggers",
        ],
      },

      positioning: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          uniqueMechanism: { type: ["string", "null"] },
          differentiators: { type: "array", items: { type: "string" } },
          competitors: { type: ["array", "null"], items: { type: "string" } },
        },
        required: [
          "category",
          "uniqueMechanism",
          "differentiators",
          "competitors",
        ],
      },

      voice: {
        type: "object",
        additionalProperties: false,
        properties: {
          tone: {
            type: "string",
            enum: [
              "friendly",
              "direct",
              "premium",
              "professional",
              "playful",
              "serious",
              "educational",
              "custom",
            ],
          },
          toneCustom: { type: ["string", "null"] },
          adjectives: { type: "array", items: { type: "string" } },
          do: { type: "array", items: { type: "string" } },
          dont: { type: "array", items: { type: "string" } },
        },
        required: ["tone", "toneCustom", "adjectives", "do", "dont"],
      },

      proof: {
        type: "object",
        additionalProperties: false,
        properties: {
          evidenceTypes: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "testimonials",
                "reviews",
                "case_studies",
                "certifications",
                "expert_endorsement",
                "data",
                "ugc",
                "none",
              ],
            },
          },
          examples: { type: ["array", "null"], items: { type: "string" } },
          constraints: { type: ["array", "null"], items: { type: "string" } },
        },
        required: ["evidenceTypes", "examples", "constraints"],
      },

      compliance: {
        type: "object",
        additionalProperties: false,
        properties: {
          claimRisk: { type: "string", enum: ["low", "medium", "high"] },
          forbiddenClaims: { type: "array", items: { type: "string" } },
          requiredDisclaimers: {
            type: ["array", "null"],
            items: { type: "string" },
          },
        },
        required: ["claimRisk", "forbiddenClaims", "requiredDisclaimers"],
      },

      objectiveDefaults: {
        type: "array",
        items: {
          type: "string",
          enum: ["awareness", "leads", "sales", "traffic", "retention"],
        },
      },

      awarenessLevel: {
        type: ["string", "null"],
        enum: [
          "unaware",
          "problem_aware",
          "solution_aware",
          "product_aware",
          "most_aware",
          null,
        ],
      },

      angles: {
        type: "array",
        minItems: 8,
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            reasoning: { type: "string" },
            keyMessage: { type: "string" },
            hooks: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
            },
            visualDirections: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
            },
          },
          required: [
            "id",
            "label",
            "reasoning",
            "keyMessage",
            "hooks",
            "visualDirections",
          ],
        },
      },

      gaps: {
        type: "object",
        additionalProperties: false,
        properties: {
          missingFields: { type: "array", items: { type: "string" } },
          questions: { type: "array", items: { type: "string" } },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["missingFields", "questions", "confidence"],
      },

      sources: {
        type: ["array", "null"],
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", enum: ["text", "pdf", "doc", "url"] },
            name: { type: ["string", "null"] },
          },
          required: ["type", "name"],
        },
      },

      updatedAtISO: { type: "string" },
    },

    required: [
      "version",
      "identity",
      "offer",
      "audience",
      "positioning",
      "voice",
      "proof",
      "compliance",
      "objectiveDefaults",
      "awarenessLevel",
      "sources",
      "angles",
      "gaps",
      "updatedAtISO",
    ],
  },
};

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 415 }
      );
    }

    const form = await req.formData();
    const text = (form.get("text") as string | null) ?? "";
    const file = form.get("file");

    if (!text && !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Send text or file." },
        { status: 400 }
      );
    }

    let extracted = text.trim();
    let sourceName: string | undefined;

    if (file instanceof File) {
      sourceName = file.name;
      const fileText = await extractTextFromFile(file);
      if (fileText) {
        extracted = extracted
          ? `${extracted}\n\n---\n\n${fileText}`
          : fileText;
      }
    }

    const response = await client.responses.create({
      model: MODEL,
      input: [
        { role: "system", content: buildSystemInstruction() },
        {
          role: "user",
          content: buildUserInstruction({ rawText: extracted, sourceName }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: BUSINESS_PROFILE_SCHEMA.name,
          schema: BUSINESS_PROFILE_SCHEMA.schema,
        },
      },
    });

    const outputText = (response as any).output_text;
    if (!outputText) {
      return NextResponse.json(
        { ok: false, error: "No output returned." },
        { status: 500 }
      );
    }

    const profile = JSON.parse(outputText);
    profile.updatedAtISO = profile.updatedAtISO || new Date().toISOString();

    return NextResponse.json({ ok: true, profile });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
