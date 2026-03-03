/**
 * Copy Generator for Meta Ads V1 (Template Engine)
 *
 * Generates multiple copy variants (headline, subheadline, CTA, etc.) using OpenAI.
 * Designed for deterministic, high-quality ad copy generation.
 *
 * Features:
 * - Structured outputs with strict schema
 * - Extended variants for different template types
 * - Automatic sanitization (length limits, banned words)
 * - Temperature 0.3 for consistency
 */

import OpenAI from "openai";
import { z } from "zod";
import {
  CONSTRAINTS,
  sanitizeText,
  sanitizeOfferLabel,
  sanitizeStickerText,
  sanitizeQuote,
  sanitizeAuthor,
  type CopyVariantExtended,
} from "@/lib/meta/spec/creativeSpec";

/* ── OpenAI Client ── */

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.3;

/* ── Types ── */

export interface CopyVariant {
  headline: string;
  subheadline: string;
  cta: string;
}

export interface CopyGeneratorInput {
  productName: string;
  productDescription?: string;
  coreBenefit?: string;
  offer?: {
    active: boolean;
    type: string;
    value?: string;
  };
  count: number;
}

export interface CopyGeneratorResult {
  variants: CopyVariant[];
  generationTimeMs: number;
}

/** Extended input for Template Engine V1 */
export interface ExtendedCopyGeneratorInput extends CopyGeneratorInput {
  /** Hint for template-specific generation */
  templateHint?: "OFFER" | "BEFORE_AFTER" | "QUOTE" | "EDITORIAL";
}

/** Extended result with all template fields */
export interface ExtendedCopyGeneratorResult {
  variants: CopyVariantExtended[];
  generationTimeMs: number;
}

/* ── Local Constraints (for banned words) ── */

const CTA_DEFAULT = "Conocé más";

const BANNED_WORDS = [
  "calidad",
  "moderno",
  "innovador",
  "único",
  "mejor",
  "exclusivo",
  "premium",
  "increíble",
  "perfecto",
  "ideal",
  "fantástico",
  "maravilloso",
  "excelente",
];

/* ── Sanitizers ── */

/**
 * Truncate text by words to fit within maxChars.
 * Adds "…" if truncated.
 */
function truncateByWords(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const words = text.split(/\s+/);
  let result = "";

  for (const word of words) {
    const test = result ? `${result} ${word}` : word;
    if (test.length + 1 > maxChars) break; // +1 for potential "…"
    result = test;
  }

  return result ? `${result}…` : text.slice(0, maxChars - 1) + "…";
}

/**
 * Remove banned words from text.
 */
function removeBannedWords(text: string): string {
  let result = text;
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    result = result.replace(regex, "").replace(/\s{2,}/g, " ").trim();
  }
  return result;
}

/**
 * Sanitize a copy variant to meet all constraints.
 */
function sanitizeVariant(raw: CopyVariant): CopyVariant {
  // Remove banned words
  let headline = removeBannedWords(raw.headline);
  let subheadline = removeBannedWords(raw.subheadline);

  // Truncate to fit using imported CONSTRAINTS
  headline = truncateByWords(headline, CONSTRAINTS.headline.maxChars);
  subheadline = truncateByWords(subheadline, CONSTRAINTS.subheadline.maxChars);

  // CTA is fixed
  const cta = CTA_DEFAULT;

  return { headline, subheadline, cta };
}

/**
 * Sanitize an extended copy variant to meet all constraints.
 */
function sanitizeExtendedVariant(raw: Partial<CopyVariantExtended>): CopyVariantExtended {
  return {
    headline: raw.headline 
      ? sanitizeText(removeBannedWords(raw.headline), CONSTRAINTS.headline.maxChars)
      : "",
    subheadline: raw.subheadline
      ? sanitizeText(removeBannedWords(raw.subheadline), CONSTRAINTS.subheadline.maxChars)
      : undefined,
    badgeText: raw.badgeText
      ? sanitizeOfferLabel(raw.badgeText)
      : undefined,
    stickerText: raw.stickerText
      ? sanitizeStickerText(raw.stickerText)
      : undefined,
    proofType: raw.proofType,
    quote: raw.quote
      ? sanitizeQuote(removeBannedWords(raw.quote))
      : undefined,
    author: raw.author
      ? sanitizeAuthor(raw.author)
      : undefined,
    proofCaption: raw.proofCaption
      ? sanitizeText(raw.proofCaption, CONSTRAINTS.subheadline.maxChars)
      : undefined,
  };
}

/* ── Prompts ── */

function buildSystemPrompt(): string {
  return `
Eres un copywriter experto en publicidad para e-commerce de productos físicos.

Tu trabajo es generar variantes de copy para anuncios de Meta/Instagram.

REGLAS ESTRICTAS:
1. Headline: máximo ${CONSTRAINTS.headline.maxChars} caracteres, máximo 2 líneas
2. Subheadline: máximo ${CONSTRAINTS.subheadline.maxChars} caracteres
3. PROHIBIDO usar estas palabras: ${BANNED_WORDS.join(", ")}
4. Cada variante debe tener un ángulo distinto
5. Sé específico y concreto con los beneficios
6. Usa español latinoamericano
7. Genera copy que genere ACCIÓN, no solo describa

FORMATO DE SALIDA:
Devuelve un array JSON con las variantes solicitadas.
`.trim();
}

function buildExtendedSystemPrompt(): string {
  return `
Eres un copywriter experto en publicidad para e-commerce de productos físicos.

Tu trabajo es generar variantes de copy para anuncios de Meta/Instagram con diferentes formatos.

REGLAS ESTRICTAS:
1. Headline: máximo ${CONSTRAINTS.headline.maxChars} caracteres
2. Subheadline: máximo ${CONSTRAINTS.subheadline.maxChars} caracteres
3. BadgeText (si hay oferta): máximo ${CONSTRAINTS.badgeText.maxChars} caracteres (ej: "50% OFF", "3x2")
4. StickerText: máximo ${CONSTRAINTS.stickerText.maxChars} caracteres (ej: "Tiempo limitado")
5. Quote: máximo ${CONSTRAINTS.quote.maxChars} caracteres
6. Author: máximo ${CONSTRAINTS.author.maxChars} caracteres
7. PROHIBIDO usar estas palabras: ${BANNED_WORDS.join(", ")}
8. Sé específico y concreto con los beneficios
9. Usa español latinoamericano

FORMATO DE SALIDA:
Devuelve un array JSON con las variantes solicitadas.
`.trim();
}

function buildUserPrompt(input: CopyGeneratorInput): string {
  const offerBlock = input.offer?.active
    ? `\nOFERTA ACTIVA: ${input.offer.type} - ${input.offer.value}`
    : "";

  const benefitBlock = input.coreBenefit
    ? `\nBENEFICIO PRINCIPAL: ${input.coreBenefit}`
    : "";

  const descBlock = input.productDescription
    ? `\nDESCRIPCIÓN: ${input.productDescription}`
    : "";

  return `
PRODUCTO: ${input.productName}${descBlock}${benefitBlock}${offerBlock}

Generá ${input.count} variantes de copy para anuncios.

Cada variante debe tener:
- headline: frase de impacto (max ${CONSTRAINTS.headline.maxChars} chars)
- subheadline: beneficio o prueba social (max ${CONSTRAINTS.subheadline.maxChars} chars)

Variá los ángulos:
1. Beneficio directo
2. Problema/solución
3. Prueba social
4. Escasez/urgencia (si hay oferta)
5. Aspiracional
6. Curiosidad

Devuelve JSON con array "variants".
`.trim();
}

/* ── Response Schema ── */

const VariantSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
});

const ResponseSchema = z.object({
  variants: z.array(VariantSchema),
});

/* ── Main Function ── */

/**
 * Generate copy variants for Meta Ads.
 *
 * @param input - Product info and count
 * @returns Array of sanitized copy variants
 */
export async function generateCopyVariants(
  input: CopyGeneratorInput
): Promise<CopyGeneratorResult> {
  const startTime = Date.now();

  console.log(
    `[copyGenerator] Generating ${input.count} variants for "${input.productName}"…`
  );

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input) },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  // Parse and validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse OpenAI response as JSON");
  }

  const validated = ResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[copyGenerator] Validation error:", validated.error);
    throw new Error("OpenAI response does not match expected schema");
  }

  // Sanitize each variant
  const variants = validated.data.variants
    .slice(0, input.count)
    .map((v) =>
      sanitizeVariant({
        headline: v.headline,
        subheadline: v.subheadline,
        cta: CTA_DEFAULT,
      })
    );

  const generationTimeMs = Date.now() - startTime;

  console.log(
    `[copyGenerator] Generated ${variants.length} variants in ${generationTimeMs}ms`
  );

  return { variants, generationTimeMs };
}

/* ── Simple Strategic Core ── */

export interface SimpleStrategicCore {
  coreBenefit: string;
  category: string;
  positioning: string;
  keyProof: string;
}

/**
 * Derive a simple strategic core from product info.
 * Lightweight alternative to full /api/strategy/core.
 */
export async function deriveStrategicCore(
  productName: string,
  productDescription?: string
): Promise<SimpleStrategicCore> {
  console.log(`[copyGenerator] Deriving strategic core for "${productName}"…`);

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `
Eres un estratega de marketing. Analiza el producto y devuelve un JSON con:
- coreBenefit: el beneficio principal en una frase corta
- category: categoría del producto
- positioning: cómo se diferencia
- keyProof: dato clave que lo prueba (ej: "12 horas", "500 usuarios")

Sé conciso y específico. Español latinoamericano.
`.trim(),
      },
      {
        role: "user",
        content: `
PRODUCTO: ${productName}
${productDescription ? `DESCRIPCIÓN: ${productDescription}` : ""}

Devuelve JSON con coreBenefit, category, positioning, keyProof.
`.trim(),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response for strategic core");
  }

  const parsed = JSON.parse(content);

  return {
    coreBenefit: parsed.coreBenefit || "Solución práctica para tu día a día",
    category: parsed.category || "Producto",
    positioning: parsed.positioning || "Diseñado para vos",
    keyProof: parsed.keyProof || "",
  };
}

/* ═══════════════════════════════════════════════════════════════
   EXTENDED COPY GENERATION (TEMPLATE ENGINE V1)
═══════════════════════════════════════════════════════════════ */

/**
 * Build extended user prompt based on template hint
 */
function buildExtendedUserPrompt(input: ExtendedCopyGeneratorInput): string {
  const offerBlock = input.offer?.active
    ? `\nOFERTA ACTIVA: ${input.offer.type} - ${input.offer.value}`
    : "";

  const benefitBlock = input.coreBenefit
    ? `\nBENEFICIO PRINCIPAL: ${input.coreBenefit}`
    : "";

  const descBlock = input.productDescription
    ? `\nDESCRIPCIÓN: ${input.productDescription}`
    : "";

  // Different prompts based on template hint
  let formatInstructions = "";
  
  switch (input.templateHint) {
    case "OFFER":
      formatInstructions = `
Cada variante debe tener:
- headline: frase de impacto (max ${CONSTRAINTS.headline.maxChars} chars)
- subheadline: beneficio o urgencia (max ${CONSTRAINTS.subheadline.maxChars} chars)
- badgeText: texto del badge de oferta (max ${CONSTRAINTS.badgeText.maxChars} chars, ej: "50% OFF", "3x2", "2° al 50%")
- stickerText: texto de urgencia (max ${CONSTRAINTS.stickerText.maxChars} chars, ej: "Solo hoy", "Últimas unidades")`;
      break;

    case "BEFORE_AFTER":
      formatInstructions = `
Cada variante debe tener:
- headline: claim principal de transformación (max ${CONSTRAINTS.headline.maxChars} chars)
- subheadline: beneficio específico (max ${CONSTRAINTS.subheadline.maxChars} chars)
- proofType: "BEFORE_AFTER"
- proofCaption: descripción del resultado (max ${CONSTRAINTS.subheadline.maxChars} chars)`;
      break;

    case "QUOTE":
      formatInstructions = `
Cada variante debe tener:
- headline: puede ser vacío o un claim corto
- proofType: "QUOTE"
- quote: testimonio de cliente (max ${CONSTRAINTS.quote.maxChars} chars, SIN comillas, habla en primera persona)
- author: nombre del cliente (max ${CONSTRAINTS.author.maxChars} chars, ej: "María G.", "Cliente verificado")`;
      break;

    default: // EDITORIAL
      formatInstructions = `
Cada variante debe tener:
- headline: frase de impacto (max ${CONSTRAINTS.headline.maxChars} chars)
- subheadline: beneficio o diferenciador (max ${CONSTRAINTS.subheadline.maxChars} chars)`;
  }

  return `
PRODUCTO: ${input.productName}${descBlock}${benefitBlock}${offerBlock}

Generá ${input.count} variantes de copy para anuncios.

${formatInstructions}

Variá los ángulos entre variantes. Devuelve JSON con array "variants".
`.trim();
}

/* ── Extended Response Schema ── */

const ExtendedVariantSchema = z.object({
  headline: z.string().optional().default(""),
  subheadline: z.string().optional(),
  badgeText: z.string().optional(),
  stickerText: z.string().optional(),
  proofType: z.enum(["BEFORE_AFTER", "QUOTE"]).optional(),
  quote: z.string().optional(),
  author: z.string().optional(),
  proofCaption: z.string().optional(),
});

const ExtendedResponseSchema = z.object({
  variants: z.array(ExtendedVariantSchema),
});

/**
 * Generate extended copy variants for Template Engine V1.
 * Returns variants with all template-specific fields.
 *
 * @param input - Product info, count, and optional template hint
 * @returns Array of sanitized extended copy variants
 */
export async function generateExtendedCopyVariants(
  input: ExtendedCopyGeneratorInput
): Promise<ExtendedCopyGeneratorResult> {
  const startTime = Date.now();

  console.log(
    `[copyGenerator] Generating ${input.count} extended variants for "${input.productName}" (hint: ${input.templateHint || "auto"})…`
  );

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    messages: [
      { role: "system", content: buildExtendedSystemPrompt() },
      { role: "user", content: buildExtendedUserPrompt(input) },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  // Parse and validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse OpenAI response as JSON");
  }

  const validated = ExtendedResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("[copyGenerator] Extended validation error:", validated.error);
    throw new Error("OpenAI response does not match expected extended schema");
  }

  // Sanitize each variant
  const variants = validated.data.variants
    .slice(0, input.count)
    .map((v) => sanitizeExtendedVariant(v));

  const generationTimeMs = Date.now() - startTime;

  console.log(
    `[copyGenerator] Generated ${variants.length} extended variants in ${generationTimeMs}ms`
  );

  return { variants, generationTimeMs };
}
