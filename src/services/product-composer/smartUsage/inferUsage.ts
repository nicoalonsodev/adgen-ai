/**
 * Infer Usage Plan
 * 
 * Uses Gemini text model to infer a UsagePlan from product info.
 * Returns ONLY structured JSON - no free-form generation.
 */

import { GoogleGenAI } from "@google/genai";
import { UsagePlan, UsagePlanSchema } from "./types";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "inferUsage" });

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */

const INFERENCE_MODEL = "gemini-2.0-flash";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface InferUsageInput {
  productName: string;
  productDescription: string;
}

/* ═══════════════════════════════════════════════════════════════
   PROMPT
═══════════════════════════════════════════════════════════════ */

function buildInferencePrompt(input: InferUsageInput): string {
  return `Sos un estratega creativo de publicidad para productos de skincare/bodycare.
Analizá el producto y devolvé ÚNICAMENTE un JSON con el plan de uso óptimo.

PRODUCTO:
- Nombre: ${input.productName}
- Descripción: ${input.productDescription}

REGLAS:
1. archetype SIEMPRE es "apply_skin" (no hay otras opciones por ahora)
2. primaryEmotion: elegí según el beneficio principal del producto
   - "comfort" → hidratación, suavidad, alivio de sequedad
   - "confidence" → anti-edad, firmeza, reducción de manchas
   - "relief" → anti-inflamatorio, calmante, alivio de irritación
3. sceneType: elegí según el momento de uso típico
   - "bathroom_morning" → productos de rutina diaria, limpieza, protección solar
   - "bedroom_soft" → productos nocturnos, tratamientos intensivos, relax
4. camera: elegí según el tamaño del producto y área de aplicación
   - "medium_close" → productos corporales, cremas grandes
   - "closeup" → productos faciales, serums, productos pequeños
5. negativeSpacePreference: elegí según composición visual óptima
   - "top_left" → para textos largos, titulares extensos
   - "top_right" → para textos cortos, CTAs prominentes
6. surfaceRequired: SIEMPRE true (necesitamos superficie para apoyar producto)
7. interactionRequired: SIEMPRE true (mano aplicando producto)

RESPUESTA (solo JSON, sin markdown):
{
  "archetype": "apply_skin",
  "primaryEmotion": "comfort" | "confidence" | "relief",
  "sceneType": "bathroom_morning" | "bedroom_soft",
  "camera": "medium_close" | "closeup",
  "negativeSpacePreference": "top_left" | "top_right",
  "surfaceRequired": true,
  "interactionRequired": true
}`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function inferUsage(input: InferUsageInput): Promise<UsagePlan> {
  const startTime = Date.now();
  
  logger.info("Inferring usage plan", {
    productName: input.productName,
  });
  
  try {
    const ai = new GoogleGenAI({});
    const prompt = buildInferencePrompt(input);
    
    const response = await ai.models.generateContent({
      model: INFERENCE_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2, // Low temperature for consistent structured output
        maxOutputTokens: 500,
      },
    });
    
    const latencyMs = Date.now() - startTime;
    const rawText = response.text?.trim() || "";
    
    logger.debug("Raw inference response", {
      responseLength: rawText.length,
      latencyMs,
    });
    
    // Extract JSON from response
    const jsonStr = extractJson(rawText);
    if (!jsonStr) {
      logger.error("Failed to extract JSON from response", { rawText });
      return getDefaultUsagePlan();
    }
    
    // Parse and validate
    const parsed = JSON.parse(jsonStr);
    const validated = UsagePlanSchema.safeParse(parsed);
    
    if (!validated.success) {
      logger.error("UsagePlan validation failed", {
        errors: validated.error.issues,
        parsed,
      });
      return getDefaultUsagePlan();
    }
    
    logger.info("Usage plan inferred successfully", {
      usagePlan: validated.data,
      latencyMs,
    });
    
    return validated.data;
    
  } catch (error) {
    logger.error("inferUsage failed", { error });
    return getDefaultUsagePlan();
  }
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */

/**
 * Extract JSON from potentially markdown-wrapped response
 */
function extractJson(text: string): string | null {
  // Try direct parse first
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue to extraction
  }
  
  // Try to find JSON block
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  
  // Try to find object pattern
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }
  
  return null;
}

/**
 * Default usage plan for fallback
 */
function getDefaultUsagePlan(): UsagePlan {
  return {
    archetype: "apply_skin",
    primaryEmotion: "comfort",
    sceneType: "bathroom_morning",
    camera: "medium_close",
    negativeSpacePreference: "top_left",
    surfaceRequired: true,
    interactionRequired: true,
  };
}
