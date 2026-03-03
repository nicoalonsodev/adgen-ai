/**
 * Analyze Scene Anchors
 * 
 * Uses Gemini vision model to analyze background image and extract
 * structural anchors for product placement.
 * Returns ONLY structured JSON - no free-form generation.
 */

import { GoogleGenAI } from "@google/genai";
import { SceneAnchors, SceneAnchorsSchema } from "./types";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "analyzeSceneAnchors" });

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */

const VISION_MODEL = "gemini-2.0-flash";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface AnalyzeSceneInput {
  backgroundBuffer: Buffer;
  canvasWidth: number;
  canvasHeight: number;
}

export interface AnalyzeSceneResult {
  anchors: SceneAnchors;
  model: string;
  latencyMs: number;
}

/* ═══════════════════════════════════════════════════════════════
   PROMPT
═══════════════════════════════════════════════════════════════ */

function buildAnalysisPrompt(canvasWidth: number, canvasHeight: number): string {
  return `Sos un sistema de visión computacional especializado en análisis de escenas para composición de imágenes publicitarias.

Analizá la imagen y devolvé ÚNICAMENTE un JSON con los "anchors" estructurales de la escena.

CANVAS: ${canvasWidth}x${canvasHeight}px

INSTRUCCIONES:
1. surfaceLineY: Coordenada Y donde hay una superficie horizontal visible (mesa, mostrador, piso, mueble)
   - Si hay superficie clara → devolver el Y exacto en píxeles
   - Si no hay superficie → omitir el campo

2. clearArea: Región sin elementos visuales importantes, ideal para colocar producto
   - Buscar zonas con poco detalle, colores uniformes, sin rostros ni manos
   - Devolver { x, y, w, h } en píxeles absolutos

3. handRegion: Si hay una mano visible en la imagen
   - Devolver { x, y, w, h } del bounding box de la mano
   - Si no hay mano → omitir el campo

4. lighting: Analizar la iluminación de la escena
   - direction: "left" | "right" | "center" (de dónde viene la luz principal)
   - softness: 0.0 (dura, contrastada) a 1.0 (suave, difusa)

5. confidence: Tu confianza en el análisis (0.0 - 1.0)
   - 0.9+ para escenas muy claras con superficie y áreas definidas
   - 0.7-0.9 para escenas con algunos elementos ambiguos
   - <0.7 para escenas complejas o confusas

RESPUESTA (solo JSON, sin markdown):
{
  "surfaceLineY": 850,
  "clearArea": { "x": 64, "y": 100, "w": 400, "h": 300 },
  "handRegion": { "x": 500, "y": 400, "w": 200, "h": 150 },
  "lighting": { "direction": "left", "softness": 0.7 },
  "confidence": 0.85
}

IMPORTANTE:
- Todas las coordenadas son en píxeles absolutos
- clearArea debe estar dentro del canvas con margen de 64px
- Si no detectás algo con certeza, omitilo del JSON
- NUNCA devuelvas markdown, solo JSON puro`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

export async function analyzeSceneAnchors(input: AnalyzeSceneInput): Promise<AnalyzeSceneResult> {
  const startTime = Date.now();
  
  logger.info("Analyzing scene anchors", {
    canvasSize: `${input.canvasWidth}x${input.canvasHeight}`,
    imageSize: input.backgroundBuffer.length,
  });
  
  try {
    const ai = new GoogleGenAI({});
    const prompt = buildAnalysisPrompt(input.canvasWidth, input.canvasHeight);
    
    // Prepare image
    const bgBase64 = input.backgroundBuffer.toString("base64");
    const bgMime = detectMime(input.backgroundBuffer);
    
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: bgMime, data: bgBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    });
    
    const latencyMs = Date.now() - startTime;
    const rawText = response.text?.trim() || "";
    
    logger.debug("Raw analysis response", {
      responseLength: rawText.length,
      latencyMs,
    });
    
    // Extract and parse JSON
    const jsonStr = extractJson(rawText);
    if (!jsonStr) {
      logger.error("Failed to extract JSON from vision response", { rawText });
      return {
        anchors: getDefaultAnchors(input.canvasWidth, input.canvasHeight),
        model: VISION_MODEL,
        latencyMs,
      };
    }
    
    const parsed = JSON.parse(jsonStr);
    const validated = SceneAnchorsSchema.safeParse(parsed);
    
    if (!validated.success) {
      logger.error("SceneAnchors validation failed", {
        errors: validated.error.issues,
        parsed,
      });
      return {
        anchors: getDefaultAnchors(input.canvasWidth, input.canvasHeight),
        model: VISION_MODEL,
        latencyMs,
      };
    }
    
    logger.info("Scene anchors analyzed successfully", {
      hasSurface: validated.data.surfaceLineY !== undefined,
      hasClearArea: validated.data.clearArea !== undefined,
      hasHand: validated.data.handRegion !== undefined,
      lightingDirection: validated.data.lighting.direction,
      confidence: validated.data.confidence,
      latencyMs,
    });
    
    return {
      anchors: validated.data,
      model: VISION_MODEL,
      latencyMs,
    };
    
  } catch (error) {
    logger.error("analyzeSceneAnchors failed", { error });
    return {
      anchors: getDefaultAnchors(input.canvasWidth, input.canvasHeight),
      model: VISION_MODEL,
      latencyMs: Date.now() - startTime,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */

/**
 * Detect MIME type from buffer magic bytes
 */
function detectMime(buffer: Buffer): string {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return "image/jpeg";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";
  return "image/png"; // default
}

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
 * Default anchors for fallback
 */
function getDefaultAnchors(canvasWidth: number, canvasHeight: number): SceneAnchors {
  return {
    surfaceLineY: Math.round(canvasHeight * 0.75),
    clearArea: {
      x: 64,
      y: 64,
      w: Math.round(canvasWidth * 0.4),
      h: Math.round(canvasHeight * 0.3),
    },
    lighting: {
      direction: "left",
      softness: 0.7,
    },
    confidence: 0.5,
  };
}
