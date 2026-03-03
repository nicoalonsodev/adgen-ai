/**
 * StrategicCoreOutput – JSON Schema para OpenAI Structured Outputs.
 *
 * Genera el Strategic Core de un producto e-commerce físico:
 *   → messaging pillars, audience segments, objection map,
 *     awareness ladder, angles, hooks y CTA bank.
 *
 * Versión: 1.0
 */

export const STRATEGIC_CORE_SCHEMA = {
  name: "strategic_core_v1_0",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      version: { type: "string", enum: ["1.0"] },

      /* ── Resumen Estratégico ── */
      strategicSummary: {
        type: "object",
        additionalProperties: false,
        properties: {
          oneLiner: {
            type: "string",
            description:
              "Frase de una línea que resume la propuesta de valor central del producto.",
          },
          primaryAngle: {
            type: "string",
            description:
              "Ángulo principal recomendado para comunicar el producto.",
          },
          awarenessLevel: {
            type: "string",
            enum: [
              "unaware",
              "problem_aware",
              "solution_aware",
              "product_aware",
              "most_aware",
            ],
            description:
              "Nivel de awareness predominante de la audiencia objetivo.",
          },
        },
        required: ["oneLiner", "primaryAngle", "awarenessLevel"],
      },

      /* ── Pilares de Mensaje ── */
      messagingPillars: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            pillar: {
              type: "string",
              description: "Nombre corto del pilar (ej. 'Resultados rápidos').",
            },
            description: {
              type: "string",
              description: "Explicación de por qué este pilar es relevante.",
            },
            proofPoints: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              description:
                "Evidencias o argumentos que soportan este pilar.",
            },
          },
          required: ["id", "pillar", "description", "proofPoints"],
        },
      },

      /* ── Segmentos de Audiencia ── */
      audienceSegments: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            label: {
              type: "string",
              description: "Nombre descriptivo del segmento.",
            },
            description: { type: "string" },
            pains: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
            },
            desires: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
            },
            bestPillarIds: {
              type: "array",
              items: { type: "string" },
              description:
                "IDs de los messagingPillars más efectivos para este segmento.",
            },
          },
          required: [
            "id",
            "label",
            "description",
            "pains",
            "desires",
            "bestPillarIds",
          ],
        },
      },

      /* ── Mapa de Objeciones ── */
      objectionMap: {
        type: "array",
        minItems: 3,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            objection: {
              type: "string",
              description: 'La objeción textual (ej. "Es muy caro").',
            },
            severity: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            reframe: {
              type: "string",
              description:
                "Re-encuadre o respuesta estratégica a la objeción.",
            },
            copySnippet: {
              type: "string",
              description:
                "Fragmento de copy listo para usar que responde la objeción.",
            },
          },
          required: ["objection", "severity", "reframe", "copySnippet"],
        },
      },

      /* ── Escalera de Awareness ── */
      awarenessLadder: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            level: {
              type: "string",
              enum: [
                "unaware",
                "problem_aware",
                "solution_aware",
                "product_aware",
                "most_aware",
              ],
            },
            goal: {
              type: "string",
              description: "Objetivo comunicacional en este nivel.",
            },
            messageTone: {
              type: "string",
              description: "Tono recomendado (ej. educativo, directo).",
            },
            sampleHook: {
              type: "string",
              description:
                "Ejemplo de hook optimizado para este nivel de awareness.",
            },
          },
          required: ["level", "goal", "messageTone", "sampleHook"],
        },
      },

      /* ── Ángulos Creativos ── */
      angles: {
        type: "array",
        minItems: 5,
        maxItems: 15,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            reasoning: {
              type: "string",
              description: "Por qué este ángulo funciona para el producto.",
            },
            targetSegmentIds: {
              type: "array",
              items: { type: "string" },
              description:
                "IDs de audienceSegments a los que apunta este ángulo.",
            },
            hooks: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 5,
            },
            visualDirections: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 4,
            },
          },
          required: [
            "id",
            "label",
            "reasoning",
            "targetSegmentIds",
            "hooks",
            "visualDirections",
          ],
        },
      },

      /* ── Banco de CTAs ── */
      ctaBank: {
        type: "array",
        minItems: 5,
        maxItems: 15,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            cta: {
              type: "string",
              description: 'Texto del CTA (ej. "Comprá ahora con 30% OFF").',
            },
            intent: {
              type: "string",
              enum: [
                "purchase",
                "learn_more",
                "sign_up",
                "add_to_cart",
                "contact",
                "download",
              ],
            },
            urgency: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            bestForAngleIds: {
              type: "array",
              items: { type: "string" },
              description:
                "IDs de angles con los que este CTA combina mejor.",
            },
          },
          required: ["cta", "intent", "urgency", "bestForAngleIds"],
        },
      },

      /* ── Oferta (eco del input enriquecido) ── */
      offerStrategy: {
        type: "object",
        additionalProperties: false,
        properties: {
          hasActiveOffer: { type: "boolean" },
          urgencyLevel: {
            type: "string",
            enum: ["none", "low", "medium", "high"],
          },
          recommendedFraming: {
            type: "string",
            description:
              "Cómo encuadrar la oferta en los copies (ej. escasez, exclusividad).",
          },
          deadlineCopy: {
            type: ["string", "null"],
            description:
              "Texto sugerido para el deadline (ej. 'Solo hasta el viernes').",
          },
        },
        required: [
          "hasActiveOffer",
          "urgencyLevel",
          "recommendedFraming",
          "deadlineCopy",
        ],
      },

      /* ── Metadata ── */
      generatedAtISO: { type: "string" },
    },

    required: [
      "version",
      "strategicSummary",
      "messagingPillars",
      "audienceSegments",
      "objectionMap",
      "awarenessLadder",
      "angles",
      "ctaBank",
      "offerStrategy",
      "generatedAtISO",
    ],
  },
} as const;

/**
 * Tipo TypeScript inferido del schema.
 * Useful para tipar la respuesta parseada en la route.
 */
export interface StrategicCoreOutput {
  version: "1.0";
  strategicSummary: {
    oneLiner: string;
    primaryAngle: string;
    awarenessLevel: string;
  };
  messagingPillars: Array<{
    id: string;
    pillar: string;
    description: string;
    proofPoints: string[];
  }>;
  audienceSegments: Array<{
    id: string;
    label: string;
    description: string;
    pains: string[];
    desires: string[];
    bestPillarIds: string[];
  }>;
  objectionMap: Array<{
    objection: string;
    severity: "low" | "medium" | "high";
    reframe: string;
    copySnippet: string;
  }>;
  awarenessLadder: Array<{
    level: string;
    goal: string;
    messageTone: string;
    sampleHook: string;
  }>;
  angles: Array<{
    id: string;
    label: string;
    reasoning: string;
    targetSegmentIds: string[];
    hooks: string[];
    visualDirections: string[];
  }>;
  ctaBank: Array<{
    cta: string;
    intent: string;
    urgency: "low" | "medium" | "high";
    bestForAngleIds: string[];
  }>;
  offerStrategy: {
    hasActiveOffer: boolean;
    urgencyLevel: "none" | "low" | "medium" | "high";
    recommendedFraming: string;
    deadlineCopy: string | null;
  };
  generatedAtISO: string;
}
