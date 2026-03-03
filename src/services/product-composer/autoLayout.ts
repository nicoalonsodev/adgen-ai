/**
 * Auto Layout Service
 * 
 * Uses Gemini Vision to analyze background (and optionally product) images,
 * then outputs a JSON LayoutSpec with optimal product placement, text blocks,
 * and overlays recommendations.
 * 
 * The AI NEVER draws or edits pixels - it only returns structured JSON.
 */

import { GoogleGenAI } from "@google/genai";
import {
  LayoutSpec,
  LayoutSpecSchema,
  getDefaultPreset,
  MIN_CONFIDENCE,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_SAFE_MARGIN,
} from "./layoutSpec";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ service: "autoLayout" });

/* ═══════════════════════════════════════════════════════════════
   MODELS
═══════════════════════════════════════════════════════════════ */

// Use flash model for vision analysis - fast and capable
const LAYOUT_VISION_MODEL = "gemini-2.0-flash";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

export interface AutoLayoutRequest {
  /** Background image buffer (PNG or JPEG) */
  backgroundBuffer: Buffer;
  /** Optional product image buffer - if provided, AI considers product dimensions */
  productBuffer?: Buffer;
  /** Product bounding box for size estimation (if known) */
  productDimensions?: { width: number; height: number };
  /** Canvas dimensions */
  canvasWidth?: number;
  canvasHeight?: number;
  /** Preferred layout style hint */
  layoutHint?: "minimal" | "bold" | "elegant" | "playful";
  /** Language for copy placeholder suggestions */
  language?: "es" | "en";
}

export interface AutoLayoutResult {
  layout: LayoutSpec;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
  fallbackUsed: boolean;
  error?: string;
}

/* ═══════════════════════════════════════════════════════════════
   PROMPT
═══════════════════════════════════════════════════════════════ */

function buildLayoutPrompt(req: AutoLayoutRequest): string {
  const cw = req.canvasWidth ?? DEFAULT_CANVAS_WIDTH;
  const ch = req.canvasHeight ?? DEFAULT_CANVAS_HEIGHT;
  const margin = DEFAULT_SAFE_MARGIN;
  
  const productInfo = req.productDimensions 
    ? `El producto PNG tiene ${req.productDimensions.width}x${req.productDimensions.height}px. Escalalo para que ocupe entre 40-60% del alto del canvas (impacto visual sin abrumar).`
    : "No conozco las dimensiones exactas del producto, asumí un tamaño medio (~500x600px).";

  const styleHint = req.layoutHint 
    ? `Estilo preferido: ${req.layoutHint}.` 
    : "";

  return `Sos un diseñador senior especializado en ads de alto rendimiento para Meta/Instagram. 
Analizá la imagen de fondo y devolvé ÚNICAMENTE un JSON con el layout óptimo.

========== REGLAS DE ORO PARA ADS PROFESIONALES ==========
1. **PRODUCTO PROMINENTE**: El producto debe ser el protagonista (scale entre 0.5-0.8, nunca menor a 0.4)
2. **TEXTO CON SOMBRA**: Siempre agregá textShadow al headline para legibilidad profesional
3. **JERARQUÍA VISUAL**: Headline grande (56-72px), subheadline menor (28-36px), CTA destacado
4. **OVERLAYS SUTILES**: Usa opacity baja (0.2-0.4) para overlays - deben mejorar legibilidad sin ser obvios
5. **CTA OBLIGATORIO**: Siempre incluí un botón CTA con background tipo "pill"
6. **COLORES SEGUROS**: Para fondos claros usa #1A1A1A, para oscuros #FFFFFF. El CTA en color vibrante (#2563EB, #059669, #DC2626)

========== CANVAS ==========
- Dimensiones: ${cw}x${ch}px
- Safe margin: ${margin}px en todos los bordes
- Área segura: x>=${margin}, y>=${margin}, x+w<=${cw-margin}, y+h<=${ch-margin}

========== PRODUCTO ==========
${productInfo}
- Ubicalo donde tenga máximo impacto visual
- Evitá que tape rostros o elementos importantes del fondo
- Scale recomendado: 0.5-0.7 (producto visible y protagonista)

========== TEXT BLOCKS ==========
- HEADLINE: Tipografía bold (fontWeight: "800"), fontSize: 48-64, con textShadow sutil
- SUBHEADLINE: fontWeight: "400", fontSize: 24-32
- CTA: Con background pill, color vibrante, texto corto ("Comprar", "Ver más", "Descubrir")
- Asegurate que el texto NO solape con el producto
${styleHint}

========== OVERLAYS ==========
- Usá overlays SOLO si son necesarios para legibilidad
- linearGradient: opacity máxima 0.4, preferí que se desvanezca naturalmente
- El overlay debe ser casi imperceptible pero efectivo

========== RESPUESTA JSON ==========
{
  "version": "1",
  "canvas": { "width": ${cw}, "height": ${ch} },
  "safeArea": { "margin": ${margin} },
  "product": {
    "anchor": "bottom_center" | "center" | "center_left" | "center_right",
    "x": number,
    "y": number,
    "width": number,
    "height": number,
    "scale": number (0.4-0.9),
    "rotation": 0,
    "shadow": {
      "drop": { "enabled": true, "blur": 25, "opacity": 0.35, "offsetX": 0, "offsetY": 12, "color": "rgba(0,0,0,0.5)" },
      "contact": { "enabled": false }
    }
  },
  "textBlocks": [
    { 
      "id": "headline", 
      "x": number, "y": number, "w": number, "h": number, 
      "align": "left", 
      "color": "#1A1A1A", 
      "fontFamily": "Inter", 
      "fontWeight": "800", 
      "fontSize": 56, 
      "maxLines": 3, 
      "lineHeight": 1.1, 
      "letterSpacing": -0.02,
      "textTransform": "none"
    },
    { 
      "id": "subheadline", 
      "fontWeight": "400", 
      "fontSize": 28,
      "maxLines": 2
    },
    { 
      "id": "cta", 
      "fontWeight": "700", 
      "fontSize": 20,
      "color": "#FFFFFF",
      "background": { "type": "pill", "color": "#2563EB", "radius": 24, "padding": 16, "opacity": 1 }
    }
  ],
  "overlays": [
    { "type": "linearGradient", "x": 0, "y": 0, "w": ${cw}, "h": 350, "opacity": 0.25, "direction": "bottom", "color": "rgba(255,255,255,0.8)" }
  ],
  "confidence": 0.0-1.0,
  "rationale": "Explicación breve",
  "warnings": []
}

SOLO JSON, SIN MARKDOWN. Si confidence < 0.55, se usará preset.`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FUNCTION
═══════════════════════════════════════════════════════════════ */

function getGeminiClient() {
  return new GoogleGenAI({});
}

export async function analyzeLayoutWithAI(req: AutoLayoutRequest): Promise<AutoLayoutResult> {
  const startTime = Date.now();
  
  try {
    const ai = getGeminiClient();
    const prompt = buildLayoutPrompt(req);
    
    // Build content parts with image(s)
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    
    // Add background image
    const bgBase64 = req.backgroundBuffer.toString("base64");
    const bgMime = detectMime(req.backgroundBuffer);
    imageParts.push({
      inlineData: { mimeType: bgMime, data: bgBase64 },
    });
    
    // Optionally add product image
    if (req.productBuffer) {
      const prodBase64 = req.productBuffer.toString("base64");
      const prodMime = detectMime(req.productBuffer);
      imageParts.push({
        inlineData: { mimeType: prodMime, data: prodBase64 },
      });
    }

    logger.info("Calling Gemini Vision for layout analysis", {
      model: LAYOUT_VISION_MODEL,
      backgroundSize: req.backgroundBuffer.length,
      hasProduct: !!req.productBuffer,
      productDimensions: req.productDimensions,
    });

    const response = await ai.models.generateContent({
      model: LAYOUT_VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            ...imageParts,
            { text: prompt },
          ],
        },
      ],
      config: {
        temperature: 0.3, // Low temperature for consistent structure
        maxOutputTokens: 2000,
      },
    });

    const latencyMs = Date.now() - startTime;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    
    // Extract JSON from response (handle potential markdown wrapping)
    const json = extractJson(text);
    
    if (!json) {
      logger.warn("Gemini returned non-JSON response", { text: text.substring(0, 500) });
      return {
        layout: getDefaultPreset(),
        model: LAYOUT_VISION_MODEL,
        latencyMs,
        fallbackUsed: true,
        error: "No JSON in response",
      };
    }
    
    // Parse and validate with Zod
    const parseResult = LayoutSpecSchema.safeParse(json);
    
    if (!parseResult.success) {
      logger.warn("LayoutSpec validation failed", { 
        errors: parseResult.error.issues.slice(0, 5),
        raw: JSON.stringify(json).substring(0, 500),
      });
      return {
        layout: getDefaultPreset(),
        model: LAYOUT_VISION_MODEL,
        latencyMs,
        fallbackUsed: true,
        error: `Validation failed: ${parseResult.error.issues[0]?.message}`,
      };
    }
    
    const layout = parseResult.data;
    
    // Check confidence threshold
    if (layout.confidence < MIN_CONFIDENCE) {
      logger.info("Layout confidence below threshold, using fallback", {
        confidence: layout.confidence,
        threshold: MIN_CONFIDENCE,
      });
      return {
        layout: getDefaultPreset(),
        model: LAYOUT_VISION_MODEL,
        latencyMs,
        fallbackUsed: true,
        error: `Low confidence: ${layout.confidence}`,
      };
    }
    
    logger.info("Layout analysis successful", {
      confidence: layout.confidence,
      textBlocks: layout.textBlocks.length,
      overlays: layout.overlays.length,
      latencyMs,
    });
    
    return {
      layout,
      model: LAYOUT_VISION_MODEL,
      latencyMs,
      fallbackUsed: false,
    };
    
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    
    logger.error("Auto layout analysis failed", { error: message, latencyMs });
    
    return {
      layout: getDefaultPreset(),
      model: LAYOUT_VISION_MODEL,
      latencyMs,
      fallbackUsed: true,
      error: message,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function detectMime(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return "image/jpeg";
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return "image/webp";
  }
  return "image/png"; // default
}

function extractJson(text: string): Record<string, unknown> | null {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // ok, try to extract
  }
  
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      // continue
    }
  }
  
  // Try to find JSON object
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.substring(braceStart, braceEnd + 1));
    } catch {
      // continue
    }
  }
  
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════ */

export { LAYOUT_VISION_MODEL };
