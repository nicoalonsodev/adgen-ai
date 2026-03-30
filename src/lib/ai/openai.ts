import { GoogleGenAI } from "@google/genai";
import { getSceneLibrarySection, getTextureLibrarySection } from "./promptLibrary";
import {
  ZONE_PERCENTAGES as Z,
  buildZonePlacement,
  ABSOLUTE_RULES_ANATOMY,
  ABSOLUTE_RULES_BACKGROUND,
  ABSOLUTE_RULES_TEXT_PRESERVATION,
} from "./promptRules";

// ── Gemini client ────────────────────────────────────────────────────────────
function getGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

// ── Andromeda Knowledge Base ─────────────────────────────────────────────────
const ANDROMEDA_KNOWLEDGE = `
# Guía de Creativos para Meta Andrómeda: Imágenes Estáticas y Copy
 
> **Principio clave:** Andrómeda penaliza la repetición. Si solo cambias el color de fondo de una imagen, el algoritmo lo interpreta como el mismo anuncio y no genera nuevas señales.
 
---
 
## 1. La Regla de Oro: El Anuncio como un Sistema
 
En Andrómeda, las imágenes y los copies no se testean de forma aislada. Funcionan en equipo dentro de un conjunto de anuncios para cubrir todo el embudo de ventas.
 
- **Imagen:** Debe captar la atención según el nivel de conciencia (visualización de la transformación o del dolor).
- **Copy:** Debe articular la Fórmula de Valor de Hormozi para que el cerebro del cliente perciba que el beneficio es mayor al costo.
 
---
 
## 2. Estructura de Creación (Imagen + Copy) por Nivel de Conciencia
 
Para cada Buyer Persona, debes crear imágenes y copies que ataquen diferentes estados mentales.
 
### A. Nivel: Inconsciente (Top of Funnel — TOF)
 
**Objetivo:** Educar sobre un problema que el usuario aún no sabe que tiene.
 
- **Creativo de Imagen:** Usa infografías simples, estadísticas impactantes o fotos que muestren un riesgo latente. No muestres el producto aún.
- **Copy:** Enfocado en el "Sabías que...".
 
> **Ejemplo (Mascotas):** Una imagen de un perro solo en la calle.
> *Copy:* "El 70% de los perros que se pierden no tienen una identificación clara. No esperes a que sea tarde."
 
---
 
### B. Nivel: Consciente del Problema / Solución (Middle of Funnel — MOF)
 
**Objetivo:** Mostrar que tu categoría de producto es la respuesta al dolor del cliente.
 
- **Creativo de Imagen:** Fotos de estilo de vida (lifestyle) usando el producto o comparativas de "Antes vs. Después" (ej. el caos sin el producto vs. la paz con él).
- **Copy:** Resalta la probabilidad de éxito y el resultado soñado.
 
> **Ejemplo:** Imagen de una persona tranquila paseando a su perro.
> *Copy:* "Recupera la tranquilidad. Con nuestro identificador QR, cualquier persona que encuentre a tu mascota puede contactarte en segundos."
 
---
 
### C. Nivel: Muy Consciente (Bottom of Funnel — BOF)
 
**Objetivo:** Cerrar la venta eliminando objeciones finales (precio, confianza, tiempo).
 
- **Creativo de Imagen:** Fotos de producto limpias, capturas de pantalla de testimonios de clientes o gráficas con la oferta (ej. "3 cuotas sin interés").
- **Copy:** Enfoque en reducir el esfuerzo y el tiempo.
 
> **Ejemplo:** Imagen del producto con un sello de "Envío en 24hs".
> *Copy:* "Protege a tu mejor amigo hoy mismo. Compra ahora y recibe tu chapita mañana con envío gratis."
 
---
 
## 3. Ingeniería de la Oferta en el Copy (Fórmula de Hormozi)
 
Para que el generador de copy sea efectivo, cada ángulo debe intentar tocar estas cuatro variables:
 
| Variable | Pregunta clave | Ejemplo |
|---|---|---|
| **Resultado Soñado** | ¿Qué transformación logra el cliente? | "Un hogar organizado" |
| **Probabilidad de Éxito** | ¿Por qué confiar en ti? | "Más de 10,000 clientes felices" |
| **Tiempo** | ¿Qué tan rápido es el beneficio? | "Resultados en 7 días" |
| **Esfuerzo y Sacrificio** | ¿Qué tan fácil es para el cliente? | "Nosotros lo instalamos por ti" |
 
---
 
## 4. Diversidad Creativa en Imágenes (Evitar el baneo de Andrómeda)
 
Andrómeda requiere que las imágenes sean visualmente distintas. Para un mismo Pain Point, debes entregar:
 
1. **Imagen Tipo Gráfica:** Con texto grande y llamativo (Hook visual).
2. **Imagen Tipo Foto Real:** Capturada con celular, que parezca contenido orgánico (UGC estático).
3. **Imagen Tipo Carrusel:** Desglosando los beneficios paso a paso.
`;

// ── Hyper-realistic rules ─────────────────────────────────────────────────────
const HYPER_REALISTIC_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HYPER-REALISTIC MODE — ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This template requires photographic realism. The fields "backgroundPrompt"
and "sceneAction" MUST follow ALL rules below. They override generic instructions.

═══ FOR backgroundPrompt ═══
1. LENS & CAMERA: always name a specific lens.
   "shot on Canon EOS R5, 85mm f/1.4" / "Hasselblad medium format, 90mm macro".
   Match focal length to subject scale.

2. LIGHTING RIG: never say "good lighting". Name the exact setup.
   "single Profoto B10 at 45° camera-left, large octabox, 1-stop fill reflector" OR
   "overcast north-facing window, no direct sun, 5500K cool diffusion".
   Always specify: direction + quality (hard/soft) + color temperature (warm/cool/K).

3. MATERIAL PHYSICS: describe how light behaves on the surface.
   "wet stone with subsurface scatter" / "brushed steel catching directional specular" /
   "matte velvet absorbing all light with zero specular return".

4. DEPTH OF FIELD: always explicit.
   "f/1.8 subject at 60cm, background blurs to gaussian at 2m" OR
   "f/11 full-field sharpness across all planes".

5. NO AI ARTIFACTS: end the prompt with this exact sentence:
   "No digital artifacts, no plastic-looking surfaces, no unnaturally perfect symmetry,
   no floating shadows, no glowing edges. Raw photographic realism only."

═══ FOR sceneAction ═══
1. CASTING: be medically specific.
   Age: "woman, 28–34" not "young woman".
   Skin: "natural pores visible on cheek, no retouching".
   Hair: "2–3 loose strands near temple, not styled-for-shoot".

2. MICRO-EXPRESSION: never say "she looks happy".
   "corners of mouth lifted 3–4mm, eyes narrowed with Duchenne markers — genuine, not posed".
   Body: "weight on left hip, right shoulder 2cm lower, spine at 7° — not model posture".

3. ENVIRONMENT IMPERFECTION: one realistic detail that proves it's not a set.
   "faint condensation ring on marble surface" / "one fabric wrinkle where elbow rests" /
   "ambient dust particles in the light beam".

4. CAMERA & FRAME: explicit always.
   "eye-level, 10° Dutch tilt, subject fills 60% of frame, breathing room on left third".

5. TEMPORAL REALISM: the scene is a captured instant, not a pose.
   "caught mid-movement" / "fraction of a second after turning" / "natural transition between actions".

6. LIGHTING CONTINUITY: subject and background must share the same light source.
   "key light implied in background MUST be same source on subject — shadow directions match".

7. END EVERY sceneAction WITH:
   "No skin smoothing, no perfect teeth whitening, no gravity-defying hair, no impossible fabric draping.
   Documentary photographer catching a real moment. 4K photorealistic. No text, no logos."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

// ── Expert copywriter system prompt ──────────────────────────────────────────
const EXPERT_COPYWRITER_SYSTEM_PROMPT = `
You are an expert direct response copywriter specialized in
persuasive advertising for Spanish-speaking Latin American markets.
You write copy that doesn't look like advertising — it infiltrates
the reader's defenses like a Trojan Horse.

## CORE PHILOSOPHY:
- Benefits over features ALWAYS. People don't want a drill,
  they want the hole. Focus on how the product changes their life.
- Write to ONE person, never a crowd. Use "vos", "tenés", "podés"
  (Argentine/Latin Spanish).
- The goal of the first sentence is to make them read the second.
- Never sound like an ad. Sound like a friend who found something amazing.
- Short punchy sentences. No academic language. No corporate speak.
- Never use inverted punctuation (¿, ¡) — use standard punctuation only.

## FIELD RESPONSIBILITIES IN STATIC ADS:
Each field in the JSON has ONE job. Never bleed roles across fields.
- headline (5-7 words max): HOOK + PROBLEM. Must make them stop scrolling.
  Read it alone — does it stop a thumb mid-scroll? If not, rewrite.
- subheadline (max 2 lines): SOLUTION + PROBABILITY. Why it works for them.
- badge: URGENCY or SOCIAL PROOF. One compelling reason to act now. Max 30 chars.
- bullets (if present): 3 TRANSFORMATION BENEFITS. Implicit before → after.
  Format: emoji + verb + outcome. Never list features.
- cta: ONE ACTION. Zero ambiguity. "Hacé click acá" beats "Descubrí más".

CRITICAL SYSTEM RULE: headline and subheadline must work as a UNIT, not independently.
Read them together — they must tell a micro-story in under 10 seconds.

## PAIN/PROBLEM PRINCIPLES:
- Expose what hurts TODAY specifically
- Show what they're LOSING right now by not having the solution
- Show the RISK of staying the same (future without product)
- Formula: Cuándo (past/present/future) + Quién + Cuál pain
- Make them feel UNDERSTOOD, not sold to

## INTEREST/SOLUTION PRINCIPLES:
- Show massive gap between value and cost
- Address: desired result, nightmare scenario, perceived probability
  of success, time delay, effort/sacrifice, status improvement
- Minimize past failures, show people like them getting results
- Use social proof, credentials, guarantees when available

## PROVEN COPY TEMPLATES:
1. P.A.S (Problem-Agitation-Solution): Expose pain → Agitate it →
   Present solution
2. Caso de éxito: Real result → How they got it → CTA
3. Gancho impactante: Controversial statement → Proof → CTA
4. Curiosidad ciega: Create suspense → Force the click
5. Charla de chimenea: First person story → Natural product mention → CTA
6. Oferta directa: What they get → Why act now

## HEADLINE FORMULAS:
- "X maneras de conseguir [resultado] sin [acción indeseable]"
- "Logramos [resultado] como [experto] incluso sin [expectativa]"
- "Cómo eliminar [problema] sin [lo que odian] en [tiempo específico]"
- "[Acción difícil] en [tiempo específico] incluso si [dificultad]"

## WRITING RULES:
- Use metaphors to illustrate points — they work incredibly well
- Walk the line of controversy — bold claims that grab attention
- Specific numbers > vague claims ("perdí 5kg" > "perdí peso")
- Use "..." to create reading momentum
- Short paragraphs — 1-3 lines max
- Never list features — always translate to life benefits
- Create urgency without desperation
- The reader should feel: "This person gets me exactly"
`;

// Add GUION_STRUCTURE definition (based on the context, it should be a string describing the advertising script structure)
const PRE_CONDITION_RULES = `
PRE-CONDITION — THESE RULES APPLY TO EVERY SINGLE FIELD WITHOUT EXCEPTION:
1. NEVER end any field with "." — no headlines, badges, bullets, subheadlines, CTAs. None.
2. NEVER use inverted punctuation: "¿" and "¡" are FORBIDDEN. Use only "?" and "!" at the END of sentences.
3. These are output validation rules. Violating them = invalid output regardless of content quality.
`.trim();

const GUION_STRUCTURE = `
## ADVERTISING STRUCTURE — 4-STEP GUION FRAMEWORK
Every creative must follow this exact sequence. Never skip or reorder steps.

━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — HOOK
Make the ideal client self-identify immediately.
Choose ONE subtype per creative:

- Identification title
  State exactly who this is for. They read it and think "that's me."
  e.g. "Dueño de agencia online que quiere más llamadas de venta"

- Affirmative question
  A question they answer "sí, ese soy yo" — not a rhetorical question.
  e.g. "¿Tenés una agencia online y querés ver cómo otra consigue más de 500 llamadas por mes?"

- If → Then (with implicit objection removal)
  Structure: "Si [qualifying condition], [benefit] sin [objection they fear]"
  The "sin X" clause is NOT optional — it eliminates the main objection inside the hook itself.
  PATTERN (extract the structure, never copy the sector or numbers):
    "Si tenés una agencia online y no tenés tantas llamadas como te gustaría,
     voy a mostrarte cómo otra agencia consigue más de 500 llamadas por mes
     sin subir contenido."
    "Si sos emprendedor y en los últimos 6 meses no lograste aumentar tus ventas,
     quedate porque esto te va a gustar."
  Rule: qualifying condition must be specific and self-filtering.
        "sin X" must name the exact friction they're afraid of.

- Ridiculous result (with ultra-specific single cause)
  Structure: "[Role] logró [specific metric] gracias a [ONE ultra-specific action/tool]"
  The cause must be a concrete tool, habit, or decision — never a generic method.
  PATTERN (extract the structure, never copy the sector or numbers):
    "Este dueño de agencia consigue más de 500 llamadas por mes pagando menos de $10 cada una,
     gracias a dejar de utilizar Calendly."
    "Este dueño de agencia redujo un 90% su costo por llamada
     gracias a comenzar a utilizar los filtros y la IA de Meta."
  Rule: "gracias a" must name ONE thing. Never "gracias a implementar una estrategia".

━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — PROBLEM / PAIN
Make them feel deeply understood before selling anything. NEVER skip this step.
Expose: what hurts TODAY + what they're LOSING right now + the RISK of staying the same.

Use this formula: Cuándo + Quién + Cuál
  - Past (Cuándo): "errors you already paid for"
  - Present (Cuándo): "what you're losing right now"
  - Future (Cuándo): "where you'll end up if nothing changes"
  - Quién: who witnesses their failure (competitors, clients, team, family)
  - Cuál: the specific pain (income lost, status lost, time wasted, certainty destroyed)

Goal: they should think "this person gets me exactly" — not "I'm being sold to."

━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — INTEREST / SOLUTION
Show a massive gap between the value of your offer and its cost.
Hit ALL six axes — missing even one weakens the perceived value:

  1. Desired result     → What exact transformation does the client achieve?
  2. Nightmare avoided  → What worst-case scenario are they escaping?
  3. Probability        → Why should they trust this will work for them?
                          (social proof, credentials, guarantees, case studies)
  4. Time               → How fast vs. their current path? Show the contrast.
  5. Effort eliminated  → What painful thing do they currently do that you remove?
  6. Status             → How do clients/partners/competitors see them after?

Formula for combining axes:
  Cuál (axis 1 or 2) + Quién (axis 6) + Cuándo (axis 4) = "why they must be interested"
  e.g. "Como tus competidores van a ver mes a mes su calendario vaciarse
        sin entender por qué, mientras el tuyo se llena."

━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — CALL TO ACTION
Direct, simple, zero cleverness. Tell them EXACTLY what to do next.
Optional but powerful: add implicit objection removal with light humor.
PATTERN (extract the register, never copy the specifics):
  "Hacé click en el botón debajo y mirá nuestro caso de estudio.
   Lo mejor de todo es que es gratis, así tu pareja no se enoja
   de que volviste a gastar plata en otro curso."
Rule: CTA must name one action. Tie it to the specific benefit of Step 3.
      The objection removal line must feel like a friend talking, not a marketer.

━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

function buildSystemInstruction(includeAndromeda: boolean = true): string {
  const base = `${PRE_CONDITION_RULES}\n\n---\n\n${GUION_STRUCTURE}\n\n---\n\n${EXPERT_COPYWRITER_SYSTEM_PROMPT}`;
  return includeAndromeda
    ? `${base}\n\n---\n\n${ANDROMEDA_KNOWLEDGE}`
    : base;
}

const VARIANT_ANGLES = [
  "Emotional angle — hook: affirmative question. Pain: present loss. Solution: status improvement",
  "Problem/Solution angle — hook: ridiculous result. Pain: future risk. Solution: specific outcome",
  "Urgency angle — hook: if→then with qualifier. Pain: cost of inaction. Solution: speed of result",
  "Technical benefit angle — hook: identification title. Pain: past errors. Solution: effort elimination",
  "Aspirational angle — hook: ridiculous result. Pain: nightmare scenario. Solution: desired transformation",
] as const;

// ── Sequence variant instructions builder ─────────────────────────────────────
// Used by generateCopyAngles when sequenceSlideRoles is present.
// Replaces the independent VARIANT_ANGLES with a narrative arc instruction.
function buildSequenceVariantInstructions(
  n: number,
  slideRoles: string[],
  copySchema: string[],
  narrativeContext?: string,
): string {
  const ROLE_DEFINITIONS: Record<string, string> = {
    HOOK: "Make the ideal client self-identify immediately. Choose: affirmative question / identification title / if→then qualifier / ridiculous result. Max 7 words. No selling yet.",
    PROBLEMA: "Expose what hurts TODAY. Use: Cuándo (when it happens) + Quién (who witnesses it) + Cuál (the specific pain). Make them feel understood before selling anything.",
    AGITACION: "Paint the worst-case future vividly. 'Si seguís igual...' → specific consequences → urgency to change NOW.",
    SOLUCION: "Present the solution. Hit all 6 axes: desired result, nightmare avoided, probability of success, speed vs current path, effort eliminated, status gained.",
    PRUEBA: "Social proof. Real results, credentials, guarantees that make success feel achievable and risk feel low.",
    CTA: "Direct, simple, zero cleverness. Tell them EXACTLY what to do next. Tie the action to the specific benefit.",
  };

  const roleLines = slideRoles.slice(0, n)
    .map((role, i) => `- Slide ${i + 1} (slideRole="${role}"): ${ROLE_DEFINITIONS[role] ?? role}`)
    .join("\n");

  // slideRole is a copy field — include it in the output schema
  const fieldsWithRole = [...new Set([...copySchema, "slideRole"])].join(", ");

  return `\nThis is a NARRATIVE SEQUENCE in Argentine Spanish (vos/tenés/podés).
Each slide builds emotionally on the previous — the arc must feel like a CONVERSATION, not a list of disconnected ads.
${narrativeContext ? `NARRATIVE DIRECTION FROM USER: ${narrativeContext}\n` : ""}
Generate exactly ${n} slides in this EXACT order:
${roleLines}

CRITICAL SEQUENCE RULES:
- Headlines max 7 words — they render large on screen, brevity is mandatory
- slideRole must be exactly the role name specified above (HOOK, PROBLEMA, AGITACION, SOLUCION, PRUEBA, or CTA)
- Each slide's copy must match its role's emotional register (see role definitions above)
- Write in Argentine Spanish throughout (vos/tenés/podés)

Return a JSON object with key "variants" containing an array of ${n} objects, each with: ${fieldsWithRole}. No markdown, no explanation, only the JSON object.`;
}

// ── Debug metadata returned by each pipeline stage ───────────────────────────
type StageDebug = { systemPrompt: string; userPrompt: string; rawOutput: string };

// ── Shared args type ──────────────────────────────────────────────────────────
// Centralizes the arg shape shared by both pipeline stages.
type GenerateCopyArgs = {
  product: string;
  offer: string;
  targetAudience: string;
  problem: string;
  tone: string;
  templateSchema: string[];
  numberOfVariants?: number;
  templateHint?: string;
  referenceStyle?: string;
  backgroundStyleGuide?: string;
  sorteoData?: {
    premios: string;
    colaboradores: string;
    condiciones: string;
  };
  businessProfile?: {
    nombre?: string;
    rubro?: string;
    propuestaValor?: string;
    diferenciacion?: string;
    clienteIdeal?: string;
    dolores?: string | string[];
    motivaciones?: string | string[];
    tono?: string | string[];
    palabrasSi?: string;
    palabrasNo?: string;
    coloresMarca?: string[];
    category?: string;
  };
  template?: {
    id: string;
    name: string;
    description: string;
    copyZone: string;
    copySchema: string[];
    compositionMode?: string;
    rawBackgroundPrompt?: boolean;
    rawProductPrompt?: boolean;
    useTextureLibrary?: boolean;
    hyperRealisticPrompts?: boolean;
    pipelineV2?: boolean;
    sceneFullBleed?: boolean;
    personScene?: boolean;
    personOnly?: boolean;
    recommendedFor?: string[];
    defaultBackgroundPrompt?: string;
    defaultProductPrompt?: string;
    textSide?: "left" | "right" | "top" | "bottom";
    charLimits?: Record<string, { min?: number; max: number }>;
  };
  sceneExample?: string;
  /** When set, generateCopyAngles generates a narrative sequence instead of independent angle variants. */
  sequenceSlideRoles?: string[];
  /** User-provided narrative direction for the sequence (e.g. "primero el dolor, luego la solución"). */
  narrativeContext?: string;
};

// ── VISUAL_PROMPT_FIELDS ──────────────────────────────────────────────────────
// Fields that belong exclusively to Stage 2 (image prompt generation).
// Everything else is Stage 1 (copy / text fields).
const VISUAL_PROMPT_FIELDS = new Set([
  "backgroundPrompt",
  "backgroundColorHint",
  "sceneAction",
  "scenePrompt",
  "productPrompt",
  "primaryColor",
]);

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — generateCopyAngles
// ─────────────────────────────────────────────────────────────────────────────
// Responsibility: generate ONLY textual copy fields (headline, subheadline,
// badge, bullets, title, etc.). Receives the sceneExample as narrative context
// so the copy is semantically coherent with the visual world, but DOES NOT
// generate any image prompts.
//
// Returns the same single/array shape as the original function so callers
// need zero changes when they only consume copy fields.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCopyAngles(
  args: GenerateCopyArgs
): Promise<{ result: Record<string, unknown> | Record<string, unknown>[]; debug: StageDebug }> {
  const genAI = getGeminiClient();
  const n = args.numberOfVariants ?? 1;
  const tpl = args.template;

  // ── Copy-only schema: strip all visual prompt fields ──────────────────────
  const copySchema = args.templateSchema.filter((f) => !VISUAL_PROMPT_FIELDS.has(f));

  if (copySchema.length === 0) {
    // Nothing to generate in Stage 1 — return empty shells so Stage 2 still runs
    const _emptyDebug: StageDebug = { systemPrompt: "", userPrompt: "", rawOutput: "" };
    if (n > 1) return { result: Array.from({ length: n }, () => ({})), debug: _emptyDebug };
    return { result: {}, debug: _emptyDebug };
  }

  // ── charLimits only for copy fields ───────────────────────────────────────
  const charLimitsBlock =
    tpl?.charLimits && Object.keys(tpl.charLimits).length > 0
      ? `\nCHARACTER LIMITS — STRICT ENFORCEMENT (count includes spaces, punctuation, accents):
${Object.entries(tpl.charLimits)
          .filter(([field]) => copySchema.includes(field))
          .map(([field, limits]) => {
            const { min, max } = limits;
            return min
              ? `- ${field}: EXACTLY ${min}–${max} characters. Below ${min} = REJECTED. Above ${max} = REJECTED.`
              : `- ${field}: MAXIMUM ${max} characters. Above ${max} = REJECTED.`;
          })
          .join("\n")}
MANDATORY: Before outputting JSON, count the characters of each field listed above. If ANY field violates its limit, rewrite it until it fits. A response with fields outside these ranges is INVALID.\n`
      : "";

  const variantInstructions = args.sequenceSlideRoles
      ? buildSequenceVariantInstructions(n, args.sequenceSlideRoles, copySchema, args.narrativeContext)
      : n > 1
      ? `\nGenerate ${n} variants with these different angles:\n${VARIANT_ANGLES.slice(0, n)
          .map((angle, i) => `- Variant ${i + 1}: ${angle}`)
          .join("\n")}\n\nReturn a JSON object with a single key "variants" whose value is an array of ${n} objects, each with the same fields as specified. No markdown, no explanation, only the JSON object.`
      : `\nReturn ONLY a valid JSON object with exactly the fields requested. No markdown, no explanation, no extra text.`;

  const bp = args.businessProfile;
  const formatField = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v.join(", ") : v || "—";

  const brandContextBlock = bp
    ? `BRAND CONTEXT (use this to make copy more specific and on-brand):
- Business name: ${bp.nombre || "—"}
- Industry: ${bp.rubro || "—"}
- Business category: ${bp.category || "—"}
- Value proposition: ${bp.propuestaValor || "—"}
- Differentiation: ${bp.diferenciacion || "—"}
- Ideal client: ${bp.clienteIdeal || "—"}
- Client pain points: ${formatField(bp.dolores)}
- Purchase motivations: ${formatField(bp.motivaciones)}
- Brand tone: ${formatField(bp.tono)}
- Words to USE: ${bp.palabrasSi || "—"}
- Words to AVOID: ${bp.palabrasNo || "—"}
- Brand colors: ${bp.coloresMarca?.length ? bp.coloresMarca.join(", ") : "—"}
Use this brand context to make the copy feel authentic, specific and consistent with the brand voice.

`
    : "";

  const templateContextBlock = tpl
    ? `TEMPLATE CONTEXT:
- Template: ${tpl.name} (${tpl.id})
- Description: ${tpl.description}
- Copy zone: ${tpl.copyZone}
- Scene type: ${tpl.sceneFullBleed ? "full-bleed cinematic scene" : "standard layout"}${tpl.personScene ? ", person in scene" : ""}${tpl.personOnly ? ", person-only (no product)" : ""}
${tpl.recommendedFor?.length ? `- Recommended for categories: ${tpl.recommendedFor.join(", ")}` : ""}
Adapt the copy tone, length, and emotional register to this specific visual format.

`
    : "";

  const sorteoBlock = args.sorteoData
    ? `SORTEO / GIVEAWAY INFO (use this to craft the copy — do NOT invent prizes, collaborators or conditions):
- Premios: ${args.sorteoData.premios || "—"}
- Colaboradores: ${args.sorteoData.colaboradores || "—"}
- Condiciones: ${args.sorteoData.condiciones || "—"}

`
    : "";

  const referenceBlock = args.referenceStyle
    ? `\nREFERENCE CREATIVE STYLE (replicate this):\n${args.referenceStyle}\n`
    : "";

  // Scene example is injected as VISUAL CONTEXT FOR COPY COHERENCE:
  // The copy should feel native to the visual world described in the scene example,
  // but this stage does NOT generate any image prompts.
  const sceneExampleText =
    args.sceneExample ??
    (args.businessProfile?.category
      ? getSceneLibrarySection(args.businessProfile.category)
      : "");

  const sceneContextForCopyBlock = sceneExampleText
    ? `VISUAL CONTEXT (for copy coherence — do NOT generate image prompts here):
The creatives for this campaign will feature scenes like the ones described below.
Write the copy so it feels emotionally coherent with this visual world.
Use the setting, mood, and person archetype as inspiration for the emotional register of the copy.
Do NOT reproduce these descriptions literally — let them inform the tone and angle.
${sceneExampleText}

`
    : "";

  const templateHintBlock = args.templateHint
    ? `TEMPLATE: ${tpl?.name ?? ""} (${tpl?.id ?? ""})${tpl?.copyZone ? ` · Zone: ${tpl.copyZone}` : ""}
TEMPLATE HINT:
${args.templateHint}`
    : "";

  const hasCopyHeavyFields = copySchema.some((f) =>
    ["subheadline", "bullets", "columnTitle", "competitionTitle", "competitionBullets", "disclaimer"].includes(f)
  );
  const systemInstruction = buildSystemInstruction(hasCopyHeavyFields);

  const userPrompt = `Generate COPY (text only) for a visual advertising template.
Output a JSON object with EXACTLY these fields: ${copySchema.join(", ")}
CRITICAL: Do NOT add any field not listed above. Do NOT generate image prompts, backgroundPrompt, sceneAction, or any visual description. Only text copy fields.
${charLimitsBlock}
${templateHintBlock}${templateContextBlock}${brandContextBlock}${sorteoBlock}${referenceBlock}${sceneContextForCopyBlock}USER INFO:
- Product: ${args.product}
- Main offer: ${args.offer}
- Target audience: ${args.targetAudience}
- Problem it solves: ${args.problem}
- Tone: ${args.tone}

${variantInstructions}`;

  console.log(JSON.stringify({
    tag: "[gemini:generateCopyAngles:INPUT]",
    timestamp: new Date().toISOString(),
    model: "gemini-2.5-flash",
    stage: 1,
    numberOfVariants: n,
    schema: copySchema,
    input: {
      product: args.product,
      offer: args.offer,
      targetAudience: args.targetAudience,
      problem: args.problem,
      tone: args.tone,
      templateId: tpl?.id,
      businessName: bp?.nombre,
      category: bp?.category,
    },
    systemInstruction,
    userPrompt,
    fullPromptChars: (systemInstruction + userPrompt).length,
  }, null, 2));

  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      responseMimeType: "application/json",
      temperature: 0.8,
      systemInstruction,
    },
    contents: userPrompt,
  });
  const raw = result.text ?? "";

  console.log(JSON.stringify({
    tag: "[gemini:generateCopyAngles:OUTPUT]",
    timestamp: new Date().toISOString(),
    stage: 1,
    usageMetadata: result.usageMetadata,
    rawResponse: raw,
  }, null, 2));

  const _copyDebug: StageDebug = { systemPrompt: systemInstruction, userPrompt, rawOutput: raw };
  try {
    const parsed = JSON.parse(raw);
    if (n > 1) {
      const variants = parsed.variants;
      if (!Array.isArray(variants)) throw new Error("Invalid JSON from Gemini — missing variants array");
      return { result: variants as Record<string, unknown>[], debug: _copyDebug };
    }
    return { result: parsed as Record<string, unknown>, debug: _copyDebug };
  } catch {
    throw new Error("Invalid JSON from Gemini (Stage 1 — copy angles)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — generateImagePrompts
// ─────────────────────────────────────────────────────────────────────────────
// Responsibility: generate ONLY visual prompt fields (backgroundPrompt,
// sceneAction, scenePrompt, productPrompt, primaryColor, backgroundColorHint).
//
// Receives:
//   - generatedCopy: output from Stage 1 (single object or array of variants)
//   - All original args (template flags, business profile, etc.)
//   - The same sceneExample that Stage 1 received
//
// The generated copy is injected into the prompt so the visual prompts are
// semantically coherent with the angles and messaging already defined.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateImagePrompts(
  args: GenerateCopyArgs,
  generatedCopy: Record<string, unknown> | Record<string, unknown>[]
): Promise<{ result: Record<string, unknown> | Record<string, unknown>[]; debug: StageDebug }> {
  const genAI = getGeminiClient();
  const n = args.numberOfVariants ?? 1;
  const tpl = args.template;

  // ── Visual-only schema ─────────────────────────────────────────────────────
  const visualSchema = args.templateSchema.filter((f) => {
    if (!VISUAL_PROMPT_FIELDS.has(f)) return false;
    // Respect the same rawBackgroundPrompt / rawProductPrompt gates
    if (
      tpl?.rawBackgroundPrompt === true &&
      (f === "backgroundColorHint" || f === "backgroundPrompt")
    ) return false;
    if (
      tpl?.rawProductPrompt === true &&
      (f === "sceneAction" || f === "productPrompt")
    ) return false;
    return true;
  });

  if (visualSchema.length === 0) {
    return { result: generatedCopy, debug: { systemPrompt: "", userPrompt: "", rawOutput: "" } };
  }

  // ── Hyper-realistic mode ───────────────────────────────────────────────────
  const isHyperRealistic =
    tpl?.hyperRealisticPrompts === true &&
    (visualSchema.includes("backgroundPrompt") || visualSchema.includes("sceneAction"));

  const hyperRealisticBlock =
    isHyperRealistic && visualSchema.includes("sceneAction")
      ? HYPER_REALISTIC_RULES
      : "";

  // ── Field rules for visual fields ─────────────────────────────────────────
  const FIELD_RULE: Record<string, string> = {
    backgroundPrompt: tpl?.compositionMode === "scene-with-placeholder"
      ? `- backgroundPrompt: A self-contained English image generation prompt that describes
  a COMPLETE ADVERTISING SCENE — background environment, a real person, AND a generic
  unbranded placeholder product from the category "${args.businessProfile?.category ?? "the product category"}".

  The prompt MUST include ALL of these elements:
  1. ENVIRONMENT: specific setting with surfaces, textures, depth of field, atmosphere
  2. PERSON: age range (e.g. "woman, late 20s"), clothing, pose, natural interaction
     with the placeholder product — holding it, using it, or presenting it
  3. PLACEHOLDER PRODUCT: a generic, unbranded, label-free object appropriate for
     the category. Simple shape, neutral colors. No text, no logos, no brand marks.
     It must look like a stand-in that will be replaced — photorealistic but anonymous.
  4. COPY ZONE: ${buildZonePlacement(
        (tpl?.copyZone ?? "top") as "top" | "bottom" | "left" | "right" | "center",
        "scene"
      )}
  5. LIGHTING: cinematic, photorealistic, matching person and environment.

  Format: single flowing English paragraph, 150–250 chars.
  End with: "No text, no logos. 4K photorealistic."

${ABSOLUTE_RULES_TEXT_PRESERVATION}

${ABSOLUTE_RULES_ANATOMY}

${ABSOLUTE_RULES_BACKGROUND}`
      : isHyperRealistic
        ? `- backgroundPrompt: A self-contained ENGLISH prompt for hyper-realistic background generation.
  Apply ALL hyper-realistic rules: specific lens/camera, exact lighting rig (direction + quality + color temperature), material physics (how light behaves on surfaces), explicit depth of field.
  Describe: surfaces, textures, atmospheric depth, light behavior on materials.
  Must use MUTED, DESATURATED tones — no bright neon, no pure white studios. Mid-tone to moderately dark.
  Max 250 chars. Full English. No people, no products, no text, no logos.
  End with: "No digital artifacts, no plastic-looking surfaces, no unnaturally perfect symmetry, no floating shadows, no glowing edges. Raw photographic realism only."
  IMPORTANT: If a BACKGROUND STYLE GUIDE is provided below, use it as the primary creative reference.`
        : `- backgroundPrompt: A detailed prompt in Spanish to generate a background image. It must follow this exact style:
  "Fondo [tipo de ambiente y superficie], [descripción de textura]. Iluminación [tipo de luz y dirección], generando [descripción de sombras]. Ambiente [adjetivos de atmósfera], tonos [paleta de colores], estética [estilo visual]. Luz [calidad de luz], sombras [descripción]. Superficie uniforme sin objetos, sin texto, sin personas, sin productos. Estilo fotografía publicitaria de [categoría del producto], fondo limpio con profundidad sutil y sensación de [emoción relacionada al producto]."
  The prompt must be in Spanish, detailed, evocative, and adapted to the product category and tone.
  Example for skincare: "Fondo minimalista cálido con pared beige suave y textura lisa tipo estudio fotográfico. Iluminación natural lateral entrando desde una ventana fuera de cuadro, generando sombras difusas y orgánicas con líneas diagonales suaves sobre la pared. Ambiente cálido, tonos arena y crema, estética clean y elegante tipo skincare premium. Luz de tarde ligeramente dorada, sombras suaves y desenfocadas. Superficie uniforme sin objetos, sin texto, sin personas, sin productos. Estilo fotografía publicitaria de cosmética, fondo limpio con profundidad sutil y sensación de calma y cuidado personal."
  CRITICAL FOR LIGHT-TEXT TEMPLATES: The backgroundPrompt MUST generate a light-toned, pale, bright background. Dark typography renders on top — any medium or dark surface will make text unreadable.
  IMPORTANT: If a BACKGROUND STYLE GUIDE is provided below, base this field on it.`,
    productPrompt: `- productPrompt: A creative brief in English that tells Gemini what kind of PERSON to generate and how they NATURALLY USE or interact with the product.
  Structure: [person description] + [emotional/physical state] + [natural product interaction] + [pose and body language details].
  Requirements:
  1. Describe the person specifically: age range, body type hint, clothing style, expression
  2. Describe EXACTLY how they USE the product naturally
  3. Describe their body language and energy
  4. Describe their expression in detail
  5. ALWAYS end with: "right side of canvas only, left half completely clean."`,
    primaryColor: `- primaryColor: Brand color inferred from the industry, product name, and tone. Return as a single hex code (e.g. "#D4A5A5").`,
    backgroundColorHint: `- backgroundColorHint: (optional) ONLY the color palette modifier for the background. Must be a very light, pale tone compatible with dark typography. Return ONLY the color description, max 8 words. Example: 'tonos celeste muy pálido y blanco suave'`,
    sceneAction: tpl?.personOnly === true
      ? `- sceneAction: CRITICAL: Write in ENGLISH only.
  PERSON-ONLY MODE — describe ONLY the person against a transparent/neutral void. No environment, no room, no surfaces, no props, no setting.
  Required elements:
  [1] Person: exact age range (e.g. "woman, 28–34"), gender, clothing style/color, hair, skin tone
  [2] Body language: precise pose, weight distribution, arm position, micro-expression
  [3] Emotional state: specific feeling matching the headline's angle — not generic ("happy") but precise ("quiet relief, corners of mouth lifted 3mm")
  [4] Lighting on person: direction, color temperature, shadow quality on face/body
  [5] Camera: framing (bust/waist-up/full body), lens feel, depth
  ${args.sequenceSlideRoles
        ? "Each slide MUST show the SAME PERSON ARCHETYPE — vary only emotional state, micro-expression, and body language to match the slideRole."
        : "Each variant MUST use a COMPLETELY DIFFERENT person, pose, and emotional state."}
  Target: 50–80 words. End with: "4K photorealistic. No text, no logos."${tpl?.compositionMode === "scene-with-product" ? "\n  The person MUST be ACTIVELY HOLDING or USING the product." : ""}`
      : `- sceneAction: CRITICAL: Write this entire field in ENGLISH only.

  STEP 1 — PRODUCT ASSESSMENT (internal reasoning, do not output):
  Read the product description carefully. Extract any explicit dimensions (height, width, depth, weight)
  if provided — these are ground truth and OVERRIDE any inference. If no dimensions are given, infer
  the real-world size and weight from the product name and category.
  Use the extracted or inferred dimensions to determine the physical presence of the product in the scene
  (how tall it stands, how much space it occupies, whether one person can lift it).
  Then decide the interaction model — the product MUST appear in the scene:
  • SMALL / HANDHELD (cosmetics, supplements, phone, snack, small gadget — or dimensions clearly handheld):
    Person HOLDS the product naturally — in one hand, applying it, examining it, or presenting it.
  • MEDIUM (bottle, bag, book, small appliance — or dimensions suggest two-hand carry):
    Person holds with both hands, cradles it, or places it on a nearby surface while actively interacting with it.
  • LARGE / HEAVY (appliance, furniture, equipment, luggage, bike — or weight/dimensions make lifting impractical):
    Product is placed ON A SURFACE or IN THE ENVIRONMENT. Person stands beside it, leans on it,
    or gestures toward it — interacting without lifting. Include the product's actual dimensions
    in the brief so the AI model renders it at true scale (e.g. "86 cm tall, 48 cm wide, 26 cm deep").
  • SERVICE / DIGITAL / INTANGIBLE (course, app, consulting):
    No physical product visible. Person's expression and body language CARRY the emotional promise of the offer.

  STEP 2 — WRITE THE BRIEF (this is the output):
  A COMPLETE, ready-to-use cinematic photography brief. Include ALL six elements:
  [1] Setting/environment: specific location, surfaces, props, textures, depth of field, atmosphere
  [2] Person: exact age range, gender, clothing style and color, hair, skin tone
  [3] Body language + product interaction: precise pose AND the interaction model chosen in Step 1 — be explicit about what the person is doing with or near the product. If dimensions were extracted, state them explicitly (e.g. "next to the 86 cm tall water heater") so the image model renders the product at true scale
  [4] Lighting: key light source and direction, color temperature (warm/cool/neutral), shadow quality
  [5] Camera feel: lens compression, framing (tight portrait vs. environmental), depth
  [6] Positioning: ${tpl?.textSide
    ? tpl.textSide === "left"
      ? `person MUST be in the RIGHT ${Z.HORIZONTAL_SUBJECT}% of canvas. LEFT ${Z.HORIZONTAL_COPY}% must stay completely empty for text. End with: "right side only, left ${Z.HORIZONTAL_COPY}% completely clean."`
      : tpl.textSide === "right"
      ? `person MUST be in the LEFT ${Z.HORIZONTAL_SUBJECT}% of canvas. RIGHT ${Z.HORIZONTAL_COPY}% must stay completely empty for text. End with: "left side only, right ${Z.HORIZONTAL_COPY}% completely clean."`
      : tpl.textSide === "top"
      ? `person MUST be in the BOTTOM ${Z.VERTICAL_SUBJECT}% of canvas. TOP ${Z.VERTICAL_COPY}% must remain completely clean for text. End with: "bottom ${Z.VERTICAL_SUBJECT}% only, top ${Z.VERTICAL_COPY}% completely clean."`
      : `person MUST be in the TOP ${Z.VERTICAL_SUBJECT}% of canvas. BOTTOM ${Z.VERTICAL_COPY}% must remain completely clean for text. End with: "top ${Z.VERTICAL_SUBJECT}% only, bottom ${Z.VERTICAL_COPY}% completely clean."`
    : "follow the TEMPLATE VISUAL DIRECTION strictly"}
  Target length: 80–100 words — dense and specific, not verbose.
  End with exactly: "4K photorealistic. No text, no logos."`,
    scenePrompt: `- scenePrompt: A COMPLETE SCENE DESCRIPTION in English combining the background environment, a real person, and the product into one cohesive visual narrative.
  Structure: [setting/environment] + [lighting] + [person description] + [natural product interaction] + [mood and color palette] + [camera/framing]
  Max 120 words. Vivid, cinematic, and specific.
  ALWAYS end with: "Subject and product on right side only. Left half must remain completely clean for pre-rendered text."`,
  };

  const dynamicFieldRules = visualSchema.some((f) => FIELD_RULE[f])
    ? `FIELD RULES:\n${visualSchema
        .map((f) => FIELD_RULE[f] ?? null)
        .filter(Boolean)
        .join("\n")}`
    : "";

  // ── Visual coherence rule ──────────────────────────────────────────────────
  const needsCoherence =
    visualSchema.includes("backgroundPrompt") && visualSchema.includes("sceneAction");
  const isPersonOnly = tpl?.personOnly === true;

  const coherenceBlock = needsCoherence
    ? `\nVISUAL COHERENCE RULE — MANDATORY:
backgroundPrompt and sceneAction represent the SAME photograph. Follow this process:
1. DECIDE first: choose ONE unified visual concept — a specific setting, lighting direction, color temperature, and dominant color palette.
2. WRITE sceneAction FIRST (the person/subject).
3. DERIVE backgroundPrompt FROM that same visual concept:${isPersonOnly
      ? `
   personOnly mode: backgroundPrompt = blurred, shallow-DOF version of the environment implied by sceneAction.
   Same color temperature, same mood, same dominant tones — without the person.`
      : `
   backgroundPrompt = the EMPTY version of the same space in sceneAction.
   Same surfaces, same light direction, same color temperature — without the person or product.`}
4. VERIFY: if sceneAction uses warm light (3000-4500K), backgroundPrompt CANNOT use cool/blue tones. A temperature/palette mismatch is INVALID.\n`
    : "";

  // ── Copy context block — the bridge between Stage 1 and Stage 2 ───────────
  // This is the core of the two-stage architecture: inject the generated copy
  // so the visual prompts are semantically aligned with the messaging.
  const buildCopyContextBlock = (copy: Record<string, unknown>, variantIndex?: number): string => {
    const role = typeof copy.slideRole === "string" ? ` — ${copy.slideRole}` : "";
    const label = variantIndex !== undefined ? `Slide ${variantIndex + 1}${role}` : "Generated copy";
    const relevantFields = Object.entries(copy)
      .filter(([k]) => !VISUAL_PROMPT_FIELDS.has(k))
      .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
      .join("\n");
    if (!relevantFields) return "";
    return `GENERATED COPY CONTEXT — ${label} (use this to make visual prompts coherent with the messaging angle):
${relevantFields}

The visual prompts (backgroundPrompt, sceneAction, etc.) MUST reflect the same emotional tone,
target audience state, and narrative angle as the copy above. The image should feel like a natural
container for these words — not a generic product shot, but a scene that amplifies this specific message.

`;
  };

  // ── Scene example (same one used in Stage 1) ──────────────────────────────
  const sceneExampleText =
    args.sceneExample ??
    (args.businessProfile?.category
      ? getSceneLibrarySection(args.businessProfile.category)
      : "");

  const sceneExamplesBlock = sceneExampleText
    ? `SCENE EXAMPLES FOR THIS CATEGORY — extract the photographic style, emotional tone, and person-product dynamic. Adapt the setting and mood to the specific product. Use as creative inspiration for sceneAction and/or scenePrompt:
${sceneExampleText}

`
    : "";

  // ── Texture library ────────────────────────────────────────────────────────
  const textureExample =
    tpl?.useTextureLibrary === true &&
    visualSchema.includes("backgroundPrompt") &&
    args.businessProfile?.category
      ? getTextureLibrarySection(args.businessProfile.category)
      : "";

  const textureExamplesBlock = textureExample
    ? `TEXTURE REFERENCE EXAMPLE:
Study this example. Extract the underlying photographic principles: macro texture quality, lighting direction, surface materiality, depth of field, and color temperature. Apply those principles — do NOT copy literally:
${textureExample}

`
    : "";

const backgroundStyleGuideBlock =
  args.backgroundStyleGuide && visualSchema.includes("backgroundPrompt")
    ? `BACKGROUND STYLE GUIDE — USE AS CREATIVE PRINCIPLES, NOT AS LITERAL OUTPUT:
Extract the underlying intent from this guide (mood, tone, color temperature, atmosphere).
Then EXPRESS those principles as a concrete photographic scene with specific lens, lighting rig, surfaces, and material physics — as required by the HYPER-REALISTIC rules above.
WRONG: copying phrases from this guide into the output.
RIGHT: translating this guide's mood into a specific real-world location with precise technical specs.
---
${args.backgroundStyleGuide}
---

`
    : "";

  const templateVisualDirectionBlock =
    (tpl?.defaultBackgroundPrompt || tpl?.defaultProductPrompt) && !args.templateHint
      ? `TEMPLATE VISUAL DIRECTION (PRIMARY reference for scenePrompt, backgroundPrompt, sceneAction):
${tpl.defaultBackgroundPrompt ? `- Background direction: ${tpl.defaultBackgroundPrompt}` : ""}
${tpl.defaultProductPrompt ? `- Product/person direction: ${tpl.defaultProductPrompt}` : ""}
Adapt the mood, lighting, and environment to match this direction.

`
      : "";

  const bp = args.businessProfile;
  const brandContextBlock = bp
    ? `BRAND CONTEXT:
- Business name: ${bp.nombre || "—"}
- Industry: ${bp.rubro || "—"}
- Business category: ${bp.category || "—"}
- Brand tone: ${Array.isArray(bp.tono) ? bp.tono.join(", ") : bp.tono || "—"}
- Brand colors: ${bp.coloresMarca?.length ? bp.coloresMarca.join(", ") : "—"}
${bp.coloresMarca?.length ? `
IMPORTANT COLOR OVERRIDES:
- primaryColor field: use exactly "${bp.coloresMarca[0]}"
- backgroundColorHint: derive a very light/pale version of these brand colors (${bp.coloresMarca.join(", ")}) that works as a background. Must be compatible with dark typography.
` : ""}

`
    : "";

  // ── Build the user prompt (single variant or multi) ───────────────────────
  let userPrompt: string;

  if (n > 1) {
    const variants = Array.isArray(generatedCopy) ? generatedCopy : [generatedCopy];
    const variantsBlock = variants
      .map((v, i) => buildCopyContextBlock(v, i))
      .join("\n---\n");

    const charLimitsBlock =
      tpl?.charLimits && Object.keys(tpl.charLimits).length > 0
        ? `\nCHARACTER LIMITS for visual fields:
${Object.entries(tpl.charLimits)
            .filter(([field]) => visualSchema.includes(field))
            .map(([field, limits]) => {
              const { min, max } = limits;
              return min
                ? `- ${field}: EXACTLY ${min}–${max} characters.`
                : `- ${field}: MAXIMUM ${max} characters.`;
            })
            .join("\n")}\n`
        : "";

    userPrompt = `Generate VISUAL PROMPTS for ${n} advertising creative variants.
Output a JSON object with a single key "variants" whose value is an array of ${n} objects.
Each object must contain EXACTLY these fields: ${visualSchema.join(", ")}
CRITICAL: Do NOT add any copy text fields (headline, subheadline, badge, etc.). Only visual prompt fields.
${charLimitsBlock}${coherenceBlock}
${dynamicFieldRules}

${variantsBlock}
${templateVisualDirectionBlock}${hyperRealisticBlock}${backgroundStyleGuideBlock}${textureExamplesBlock}${sceneExamplesBlock}${brandContextBlock}USER INFO:
- Product: ${args.product}
- Main offer: ${args.offer}
- Target audience: ${args.targetAudience}
- Problem it solves: ${args.problem}
- Tone: ${args.tone}

${args.sequenceSlideRoles
      ? `NARRATIVE SEQUENCE — visual coherence rules:
This is a sequential narrative arc — the ${args.sequenceSlideRoles.length} slides must feel like a single story told through consecutive frames, not disconnected product shots.
${args.narrativeContext ? `NARRATIVE DIRECTION FROM USER: ${args.narrativeContext}\n` : ""}
VISUAL CONTINUITY — MANDATORY across all slides:
- Same person archetype: identical age range, general appearance, clothing style, and skin tone
- Same environment type: same kind of space (e.g. kitchen, gym, office) — not necessarily identical props
- Same lighting quality and color temperature (warm/cool, hard/soft)
- Same camera feel (lens compression, framing style)

PER-ROLE VISUAL DIRECTION — match the scene's emotional world to the slideRole shown in each copy context block:
- HOOK: person in their everyday environment, unaware or just noticing something — neutral to curious. The scene shows their world BEFORE the problem is named. Environment is familiar and relatable.
- PROBLEMA: person visibly affected by the pain point — tense posture, tight expression, situational friction visible in the scene (messy counter, piled-up task, awkward moment). The environment itself shows the problem.
- AGITACION: heightened tension — the stakes are visible. Person looks caught in the worst version of the situation. The scene amplifies consequences, not just discomfort.
- SOLUCION: the turning point — person encounters or uses the product. Posture opens, micro-expression shifts to relief or focus. The scene shows the solution entering their world.
- PRUEBA: confidence and validation — person in a "after" state, comfortable and in control. Product is naturally integrated, not posed. The scene communicates earned result.
- CTA: person making direct eye contact or gesturing toward the viewer/offer. Energy is decisive and inviting. The scene is clean and action-oriented.

Match scene composition, lighting mood, and environmental details to the specific copy visible in each Slide copy context above.`
      : `CRITICAL FOR sceneAction: Each variant MUST use a COMPLETELY DIFFERENT scenario/setting/location. If one variant uses a bathroom, NONE of the others can. Think of ${n} different LOCATIONS.
Match each variant's visual mood to its corresponding copy angle above.`}
No markdown, no explanation, only the JSON object.`;
  } else {
    const singleCopy = Array.isArray(generatedCopy) ? generatedCopy[0] : generatedCopy;
    const copyContextBlock = buildCopyContextBlock(singleCopy);

    const charLimitsBlock =
      tpl?.charLimits && Object.keys(tpl.charLimits).length > 0
        ? `\nCHARACTER LIMITS for visual fields:
${Object.entries(tpl.charLimits)
            .filter(([field]) => visualSchema.includes(field))
            .map(([field, limits]) => {
              const { min, max } = limits;
              return min
                ? `- ${field}: EXACTLY ${min}–${max} characters.`
                : `- ${field}: MAXIMUM ${max} characters.`;
            })
            .join("\n")}\n`
        : "";

    userPrompt = `Generate VISUAL PROMPTS for an advertising creative.
Output a JSON object with EXACTLY these fields: ${visualSchema.join(", ")}
CRITICAL: Do NOT add any copy text fields. Only visual prompt fields.
${charLimitsBlock}${coherenceBlock}
${dynamicFieldRules}

${copyContextBlock}${templateVisualDirectionBlock}${hyperRealisticBlock}${backgroundStyleGuideBlock}${textureExamplesBlock}${sceneExamplesBlock}${brandContextBlock}USER INFO:
- Product: ${args.product}
- Main offer: ${args.offer}
- Target audience: ${args.targetAudience}
- Problem it solves: ${args.problem}
- Tone: ${args.tone}

Return ONLY a valid JSON object with exactly the fields requested. No markdown, no explanation.`;
  }

  const systemInstruction = `You are an expert AI image prompt engineer and creative director specializing in advertising photography for Latin American markets.
Your task is to generate photorealistic, cinematically precise image prompts that are coherently aligned with the advertising copy and angles provided.
Each prompt must feel like it was written by a veteran creative director who deeply understands the emotional angle of the copy.
Always write sceneAction and scenePrompt in ENGLISH. backgroundPrompt can be in Spanish unless hyper-realistic mode is active.`;

  console.log(JSON.stringify({
    tag: "[gemini:generateImagePrompts:INPUT]",
    timestamp: new Date().toISOString(),
    model: "gemini-2.5-flash",
    stage: 2,
    numberOfVariants: n,
    visualSchema,
    isHyperRealistic,
    needsCoherence,
    input: {
      product: args.product,
      templateId: tpl?.id,
      category: bp?.category,
    },
    systemInstruction,
    userPrompt,
    fullPromptChars: (systemInstruction + userPrompt).length,
  }, null, 2));

  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      responseMimeType: "application/json",
      temperature: 0.75, // slightly lower than Stage 1 — we want precise, grounded visual prompts
      systemInstruction,
    },
    contents: userPrompt,
  });
  const raw = result.text ?? "";

  console.log(JSON.stringify({
    tag: "[gemini:generateImagePrompts:OUTPUT]",
    timestamp: new Date().toISOString(),
    stage: 2,
    usageMetadata: result.usageMetadata,
    rawResponse: raw,
  }, null, 2));

  const _imageDebug: StageDebug = { systemPrompt: systemInstruction, userPrompt, rawOutput: raw };
  try {
    const parsed = JSON.parse(raw);

    if (n > 1) {
      const promptVariants = parsed.variants;
      if (!Array.isArray(promptVariants)) throw new Error("Invalid JSON from Gemini — missing variants array");

      // Merge Stage 1 copy + Stage 2 visual prompts per variant
      const copyVariants = Array.isArray(generatedCopy) ? generatedCopy : [generatedCopy];
      return {
        result: promptVariants.map((visualVariant: Record<string, unknown>, i: number) => ({
          ...(copyVariants[i] ?? {}),
          ...visualVariant,
        })) as Record<string, unknown>[],
        debug: _imageDebug,
      };
    }

    const singleCopy = Array.isArray(generatedCopy) ? generatedCopy[0] : generatedCopy;
    // Merge Stage 1 copy + Stage 2 visual prompts
    return { result: { ...singleCopy, ...parsed } as Record<string, unknown>, debug: _imageDebug };
  } catch {
    throw new Error("Invalid JSON from Gemini (Stage 2 — image prompts)");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateTemplateCopyOpenAI — TWO-STAGE ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for the original monolithic function.
// Orchestrates Stage 1 (copy angles) → Stage 2 (image prompts) sequentially.
// The output shape is identical to the original — callers require zero changes.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTemplateCopyOpenAI(
  args: Parameters<typeof generateCopyAngles>[0]
): Promise<Record<string, unknown> | Record<string, unknown>[]> {
  const tpl = args.template;

  // Check whether there are any visual fields in the schema at all.
  // If not, skip Stage 2 entirely for maximum efficiency.
  const hasVisualFields = args.templateSchema.some((f) => {
    if (!VISUAL_PROMPT_FIELDS.has(f)) return false;
    if (tpl?.rawBackgroundPrompt === true && (f === "backgroundColorHint" || f === "backgroundPrompt")) return false;
    if (tpl?.rawProductPrompt === true && (f === "sceneAction" || f === "productPrompt")) return false;
    return true;
  });

  // ── Sample scene example once for the entire pipeline ────────────────────
  // Both Stage 1 and Stage 2 must share the same scene example so the copy
  // and image prompts are coherent. Sampling here (once) and forwarding via
  // args.sceneExample prevents each stage from independently drawing a
  // different random angle from the library.
  const resolvedArgs: typeof args =
    args.sceneExample == null && args.businessProfile?.category
      ? { ...args, sceneExample: getSceneLibrarySection(args.businessProfile.category) }
      : args;

  console.log(JSON.stringify({
    tag: "[pipeline:TWO_STAGE:START]",
    timestamp: new Date().toISOString(),
    templateId: tpl?.id,
    numberOfVariants: args.numberOfVariants ?? 1,
    hasVisualFields,
    schema: args.templateSchema,
    visualFieldsInSchema: args.templateSchema.filter((f) => VISUAL_PROMPT_FIELDS.has(f)),
  }, null, 2));

  // ── Stage 1: Copy angles ───────────────────────────────────────────────────
  const { result: copyResult, debug: _copyDebug } = await generateCopyAngles(resolvedArgs);

  console.log(JSON.stringify({
    tag: "[pipeline:TWO_STAGE:STAGE1_COMPLETE]",
    timestamp: new Date().toISOString(),
    templateId: tpl?.id,
    hasVisualFields,
    stage1Keys: Array.isArray(copyResult)
      ? Object.keys(copyResult[0] ?? {})
      : Object.keys(copyResult),
  }, null, 2));

  // ── Helper: attach all debug metadata as non-enumerable props ─────────────
  const attachMeta = (
    obj: Record<string, unknown> | Record<string, unknown>[],
    imgDebug: StageDebug,
  ) => {
    Object.defineProperty(obj, "_stage",             { value: "two-stage",            enumerable: false });
    Object.defineProperty(obj, "_systemPrompt",      { value: _copyDebug.systemPrompt, enumerable: false });
    Object.defineProperty(obj, "_userPrompt",        { value: _copyDebug.userPrompt,   enumerable: false });
    Object.defineProperty(obj, "_promptUsed",        { value: _copyDebug.userPrompt,   enumerable: false });
    Object.defineProperty(obj, "_copyRawOutput",     { value: _copyDebug.rawOutput,    enumerable: false });
    Object.defineProperty(obj, "_imageSystemPrompt", { value: imgDebug.systemPrompt,  enumerable: false });
    Object.defineProperty(obj, "_imageUserPrompt",   { value: imgDebug.userPrompt,    enumerable: false });
    Object.defineProperty(obj, "_imageRawOutput",    { value: imgDebug.rawOutput,     enumerable: false });
    return obj;
  };

  // ── Stage 2: Image prompts (only if needed) ────────────────────────────────
  if (!hasVisualFields) {
    console.log(JSON.stringify({
      tag: "[pipeline:TWO_STAGE:SKIP_STAGE2]",
      timestamp: new Date().toISOString(),
      reason: "No visual fields in schema after applying raw* gates",
    }, null, 2));
    return attachMeta(copyResult, { systemPrompt: "", userPrompt: "", rawOutput: "" });
  }

  const { result: finalResult, debug: _imageDebug } = await generateImagePrompts(resolvedArgs, copyResult);

  console.log(JSON.stringify({
    tag: "[pipeline:TWO_STAGE:COMPLETE]",
    timestamp: new Date().toISOString(),
    templateId: tpl?.id,
    finalKeys: Array.isArray(finalResult)
      ? Object.keys(finalResult[0] ?? {})
      : Object.keys(finalResult),
  }, null, 2));

  return attachMeta(finalResult, _imageDebug);
}

// ── analyzeCreativeReference — mantiene OpenAI GPT-4o (vision) ───────────────
import OpenAI from "openai";

export async function analyzeCreativeReference(args: {
  imageBase64: string;
  mimeType: string;
}): Promise<{
  tone: string;
  colorPalette: string;
  mood: string;
  copyStyle: string;
  backgroundStyle: string;
  typographyStyle: string;
  copyAnalysis: {
    headline: string;
    subheadline: string;
    hookType: string;
    ctaStyle: string;
    emotionalTriggers: string;
  };
  sceneAnalysis: {
    subject: string;
    placement: string;
    lighting: string;
    action: string;
    emotion: string;
  };
  recommendations: string;
}> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${args.mimeType};base64,${args.imageBase64}`,
            },
          },
          {
            type: "text",
            text: `Analyze this advertising creative in detail across 4 dimensions: visual style, copy, scene/subject, and reproduction instructions.

Return ONLY a valid JSON object:
{
  "tone": "emotional tone of the copy",
  "colorPalette": "dominant colors and palette description",
  "mood": "overall mood and feeling",
  "copyStyle": "copy writing style description",
  "backgroundStyle": "detailed background description for reproduction",
  "typographyStyle": "typography choices and hierarchy",
  "copyAnalysis": {
    "headline": "describe the headline: length, structure, hook type used, what makes it stop-scroll",
    "subheadline": "describe subheadline role, length, and how it connects to headline",
    "hookType": "identify which hook type: pregunta afirmativa / gancho negativo / resultado ridículo / dato impactante / etc",
    "ctaStyle": "how the CTA or badge is written, tone and urgency level",
    "emotionalTriggers": "list the emotional triggers activated: fear, curiosity, urgency, aspiration, etc"
  },
  "sceneAnalysis": {
    "subject": "who or what is the main visual subject",
    "placement": "where in the canvas: left/right/center/bottom",
    "lighting": "describe lighting: direction, quality, shadows",
    "action": "what is the subject doing or showing",
    "emotion": "what emotion does the visual scene transmit"
  },
  "recommendations": "A detailed paragraph in Spanish with specific instructions to recreate this style. Include: exact color palette, copy tone and hook type to use, background reproduction instructions, typography guidance, scene/subject instructions, and emotional triggers to activate. Be very specific so an AI can replicate this style exactly."
}

No markdown, no explanation, only the JSON object.`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content ?? "{}";
  return JSON.parse(raw);
}

// ── generateSequenceCopy — uses the same two-stage pipeline as individual generation ──
// Stage 1 (generateCopyAngles) generates text copy per slide using narrative role instructions.
// Stage 2 (generateImagePrompts) generates coherent visual prompts with sequence-aware rules.
// This guarantees the same copy quality, scene library usage, and template awareness as
// the GENERATE_COPY pipeline.
export async function generateSequenceCopy(args: {
  product: string;
  offer: string;
  targetAudience: string;
  problem: string;
  tone: string;
  narrative: string;
  slideCount: number;
  sceneWithProduct?: boolean;
  businessProfile?: GenerateCopyArgs["businessProfile"];
  templateMeta?: GenerateCopyArgs["template"];
}): Promise<{
  slides: Array<{
    headline: string;
    subheadline: string;
    badge: string;
    backgroundColorHint: string;
    backgroundPrompt?: string;
    sceneAction: string;
    slideRole: string;
    productPrompt?: string;
  }>;
  debug: {
    copySystemPrompt: string;
    copyUserPrompt: string;
    copyRawOutput: string;
    imageSystemPrompt: string;
    imageUserPrompt: string;
    imageRawOutput: string;
  };
}> {
  const slideRolesByCount: Record<number, string[]> = {
    3: ["HOOK", "PROBLEMA", "CTA"],
    4: ["HOOK", "PROBLEMA", "SOLUCION", "CTA"],
    5: ["HOOK", "PROBLEMA", "AGITACION", "SOLUCION", "CTA"],
    6: ["HOOK", "PROBLEMA", "AGITACION", "SOLUCION", "PRUEBA", "CTA"],
  };
  const slideRoles = slideRolesByCount[args.slideCount] ?? slideRolesByCount[5];

  // Use the template's actual copySchema — identical to getTemplateSchema(templateId) in individual generation.
  // Fallback to a sensible default only when no templateMeta is provided.
  const templateCopySchema = args.templateMeta?.copySchema
    ?? ["headline", "subheadline", "badge", "backgroundColorHint", "sceneAction"];

  // slideRole is always added — Stage 1 determines which narrative role each slide plays.
  // productPrompt added if sceneWithProduct is true and not already in the template schema.
  const seqSchema = [
    ...new Set([
      ...templateCopySchema,
      "slideRole",
      ...(args.sceneWithProduct && !templateCopySchema.includes("productPrompt") ? ["productPrompt"] : []),
    ]),
  ];

  console.log(JSON.stringify({
    tag: "[sequence:generateSequenceCopy:START]",
    timestamp: new Date().toISOString(),
    slideCount: args.slideCount,
    slideRoles,
    sceneWithProduct: args.sceneWithProduct,
    templateId: args.templateMeta?.id,
    schema: seqSchema,
    product: args.product,
    narrative: args.narrative,
  }, null, 2));

  const result = await generateTemplateCopyOpenAI({
    product: args.product,
    offer: args.offer,
    targetAudience: args.targetAudience,
    problem: args.problem,
    tone: args.tone,
    templateSchema: seqSchema,
    numberOfVariants: args.slideCount,
    businessProfile: args.businessProfile,
    template: args.templateMeta,
    sequenceSlideRoles: slideRoles,
    narrativeContext: args.narrative || undefined,
    sceneExample: args.businessProfile?.category
      ? getSceneLibrarySection(args.businessProfile.category)
      : undefined,
  });

  const variants = Array.isArray(result) ? result : [result];

  // Extract debug metadata from non-enumerable properties attached by generateTemplateCopyOpenAI
  const debug = {
    copySystemPrompt: (result as any)._systemPrompt ?? "",
    copyUserPrompt: (result as any)._userPrompt ?? "",
    copyRawOutput: (result as any)._copyRawOutput ?? "",
    imageSystemPrompt: (result as any)._imageSystemPrompt ?? "",
    imageUserPrompt: (result as any)._imageUserPrompt ?? "",
    imageRawOutput: (result as any)._imageRawOutput ?? "",
  };

  console.log(JSON.stringify({
    tag: "[sequence:generateSequenceCopy:COMPLETE]",
    timestamp: new Date().toISOString(),
    variantCount: variants.length,
    slideRoles: variants.map((v) => (v as any).slideRole),
  }, null, 2));

  return {
    slides: variants.map((v, i) => ({
      headline: (v.headline as string) ?? "",
      subheadline: (v.subheadline as string) ?? "",
      badge: (v.badge as string) ?? "",
      backgroundColorHint: (v.backgroundColorHint as string) ?? "",
      ...(v.backgroundPrompt ? { backgroundPrompt: v.backgroundPrompt as string } : {}),
      sceneAction: (v.sceneAction as string) ?? "",
      slideRole: (v.slideRole as string) ?? slideRoles[i] ?? "HOOK",
      ...(args.sceneWithProduct && v.productPrompt
        ? { productPrompt: v.productPrompt as string }
        : {}),
    })),
    debug,
  };
}