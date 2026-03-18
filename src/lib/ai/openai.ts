 import OpenAI from "openai";
import { getSceneLibrarySection, getTextureLibrarySection } from "./promptLibrary";
import { ZONE_PERCENTAGES as Z } from "./promptRules";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

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
   Documentary photographer catching a real moment. 4K photorealistic. No text, no logos, no products."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

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

## ADVERTISING STRUCTURE:
1. HOOK — Stop the scroll. Make the ideal client identify themselves.
2. PROBLEM/PAIN — Show you understand their exact situation and
   what they're losing.
3. INTEREST/SOLUTION — Make them see a huge gap between value and cost.
4. CTA — Simple and direct. Tell them exactly what to do.

## HOOK TYPES (choose based on angle):
- Identificación: "Dueño de [negocio]..." client identifies themselves
- Pregunta afirmativa: questions they answer "sí, ese soy yo"
- Si...entonces: "Si tenés X, entonces puedo ayudarte a Y"
- Resultado ridículo: shocking specific result with credibility
- Gancho negativo: "Si no hacés esto, nunca vas a lograr X"
- Gancho cotilla: "X persona hace esto que vos también podés hacer"
- Gancho fórmula: "Cómo conseguí X resultado en Y tiempo"
- Gancho sabías qué: "¿Sabés por qué no estás logrando X?"
- Gancho objeto mágico: present the product as THE solution
- Gancho 1 cosa: "Solo hay una cosa que puede lograr X"
- Gancho situación: "Si yo tuviera [problema], haría esto..."
- Gancho resultados: "Perdí X kilos en Y días sin Z"
- Gancho negar: "Nunca deberías hacer X si querés Y"
- Gancho todo el mundo: "Todo el mundo habla de esto..."
- Gancho reto: "El 99% de la gente hace esto mal..."

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

const VARIANT_ANGLES = [
  "Emotional angle — connects with feelings and personal transformation",
  "Problem/Solution angle — highlights the pain point and how it's solved",
  "Urgency angle — creates FOMO, limited time or stock",
  "Technical benefit angle — specific ingredients, results, data",
  "Aspirational angle — the life/identity after using the product",
] as const;

export async function generateTemplateCopyOpenAI(args: {
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
  /** Full template metadata for richer context */
  template?: {
    id: string;
    name: string;
    description: string;
    copyZone: string;
    copySchema: string[];
    /** "product-inject" | "scene-only" | "scene-with-product" | "split-comparison" | "none" */
    compositionMode?: string;
    /** true = resolveBgPrompt() ignores backgroundColorHint/backgroundPrompt — skip generating them */
    rawBackgroundPrompt?: boolean;
    /** true = effectivePrompt uses defaultProductPrompt — skip generating sceneAction/productPrompt */
    rawProductPrompt?: boolean;
    /** true = inject a texture example from texture-library.md as few-shot reference for backgroundPrompt */
    useTextureLibrary?: boolean;
     hyperRealisticPrompts?: boolean; 
    pipelineV2?: boolean;
    sceneFullBleed?: boolean;
    personScene?: boolean;
    personOnly?: boolean;
    recommendedFor?: string[];
    defaultBackgroundPrompt?: string;
    defaultProductPrompt?: string;
    /** Fixed layout side — drives sceneAction positioning in FIELD_RULE item [6]. Never in copySchema. */
    textSide?: "left" | "right" | "top" | "bottom";
  };
  /**
   * Pre-fetched scene example from scenesLibrary.md (via promptLibrary.ts getSceneLibrarySection).
   * When provided, skips the internal getSceneLibrarySection call and uses this directly.
   * Useful when the caller already resolved the scene (e.g. to log it or reuse across calls).
   */
  sceneExample?: string;
}): Promise<Record<string, unknown> | Record<string, unknown>[]> {
  const client = getClient();
  const n = args.numberOfVariants ?? 1;
  const tpl = args.template;

  // ── Filtered schema ──────────────────────────────────────────────────────────
  // Remove fields that never reach the pipeline because template flags bypass them,
  // so GPT doesn't spend tokens generating content that is always discarded.
  //
  // rawBackgroundPrompt:true → resolveBgPrompt() returns the template's pre-defined
  //   background before reading copy.backgroundColorHint or copy.backgroundPrompt.
  //
  // rawProductPrompt:true → effectivePrompt in buildProductIAOptions() uses
  //   defaultProductPrompt directly, ignoring copy.sceneAction and copy.productPrompt.
  const filteredSchema = args.templateSchema.filter((field) => {
    if (
      tpl?.rawBackgroundPrompt === true &&
      (field === "backgroundColorHint" || field === "backgroundPrompt")
    )
      return false;
    if (
      tpl?.rawProductPrompt === true &&
      (field === "sceneAction" || field === "productPrompt")
    )
      return false;
    return true;
  });

  // ── Hyper-realistic mode ────────────────────────────────────────────────────
  // Gate: opt-in via hyperRealisticPrompts flag on template metadata.
  // Only injects the block when at least one visual field is actually in schema —
  // avoids wasted tokens on templates where backgroundPrompt/sceneAction are filtered.
  const isHyperRealistic =
    tpl?.hyperRealisticPrompts === true &&
    (filteredSchema.includes("backgroundPrompt") || filteredSchema.includes("sceneAction"));

  const hyperRealisticBlock = isHyperRealistic ? HYPER_REALISTIC_RULES : "";
  // ────────────────────────────────────────────────────────────────────────────

  // ── Dynamic field rules ──────────────────────────────────────────────────────
  // Only includes fields with dynamic runtime logic (tpl flags, ZONE_PERCENTAGES,
  // industry-color tables). Simple copy fields (title, headline, subheadline, badge,
  // bullets, columnTitle, competitionTitle, competitionBullets, disclaimer, cta) are
  // fully owned by templateHint and omitted here to avoid conflicts and wasted tokens.
  const FIELD_RULE: Record<string, string> = {
    backgroundPrompt: `- backgroundPrompt: A detailed prompt in Spanish to generate a background image. It must follow this exact style:
  "Fondo [tipo de ambiente y superficie], [descripción de textura]. Iluminación [tipo de luz y dirección], generando [descripción de sombras]. Ambiente [adjetivos de atmósfera], tonos [paleta de colores], estética [estilo visual]. Luz [calidad de luz], sombras [descripción]. Superficie uniforme sin objetos, sin texto, sin personas, sin productos. Estilo fotografía publicitaria de [categoría del producto], fondo limpio con profundidad sutil y sensación de [emoción relacionada al producto]."
  The prompt must be in Spanish, detailed, evocative, and adapted to the product category and tone provided by the user.
  Example for skincare: "Fondo minimalista cálido con pared beige suave y textura lisa tipo estudio fotográfico. Iluminación natural lateral entrando desde una ventana fuera de cuadro, generando sombras difusas y orgánicas con líneas diagonales suaves sobre la pared. Ambiente cálido, tonos arena y crema, estética clean y elegante tipo skincare premium. Luz de tarde ligeramente dorada, sombras suaves y desenfocadas. Superficie uniforme sin objetos, sin texto, sin personas, sin productos. Estilo fotografía publicitaria de cosmética, fondo limpio con profundidad sutil y sensación de calma y cuidado personal."
  CRITICAL FOR LIGHT-TEXT TEMPLATES: The backgroundPrompt MUST generate a light-toned, pale, bright background. Dark typography renders on top — any medium or dark surface will make text unreadable. This constraint overrides creative adaptation: even if sceneAction describes a bathroom with white tiles, a dark room, or a moody environment, the backgroundPrompt MUST remain light, airy and soft. No tile grids, no strong patterns, no dark walls, no saturated surfaces. If the scene is a bathroom → generate a soft blurred white studio, not literal bathroom tiles. Abstract the environment, don't reproduce it literally.
  IMPORTANT: If a BACKGROUND STYLE GUIDE is provided below, you MUST base this field on it. Keep the same visual composition, textures, and mood from the style guide, but adapt the color palette and atmosphere to the product category and tone. Do not copy it verbatim — personalize it. The style guide is a creative constraint, not a template to copy literally.`,
    productPrompt: `- productPrompt: A creative brief in English that tells Gemini what kind of PERSON to generate and how they NATURALLY USE or interact with the product. This is NOT a hand-only prompt — describe a FULL PERSON actively using the product.
  Structure: [person description] + [emotional/physical state] + [natural product interaction — using, applying, or presenting] + [pose and body language details].
  CRITICAL REQUIREMENTS for the prompt you generate:
  1. Describe the person specifically: age range, body type hint, clothing style, expression — make it vivid and human
  2. Describe EXACTLY how they USE the product naturally — choose the most authentic for the product category:
     • One hand holds it at chest height while the other hand applies or touches their skin (most natural for skincare/beauty)
     • Both hands present the product to camera with label visible (most impactful for awareness)
     • Person applies it to their arm, neck or face with a genuine self-care gesture
  3. Describe their body language and energy: standing upright, weight on one leg, arm slightly extended, leaning slightly forward, etc.
  4. Describe their expression in detail: genuine smile, look of relief, discovery, determination, etc.
  5. ALWAYS end with this exact phrase: "right side of canvas only, left half completely clean."
  Examples by tone:
  - Emotional/skincare: "A warm woman in her late 30s, natural makeup, wearing a soft linen blouse. She holds the product in her right hand at chest height while her left hand gently applies the cream to her forearm — a tender natural self-care gesture. Grateful warm smile, weight slightly on her back foot. right side of canvas only, left half completely clean."
  - Urgency/fitness: "A fit woman in her 30s in athletic wear, standing tall with confident energy. She holds the product extended toward the viewer in her right hand, product label fully visible, while her left hand touches her skin with conviction. Intense determined gaze directly at the camera. right side of canvas only, left half completely clean."
  - Aspirational/luxury: "An elegant woman in her 40s, wearing smart casual attire. She presents the product with both hands at waist height, label facing forward, looking at the camera with a serene proud expression — as if sharing her beauty discovery. Graceful posture, head slightly tilted. right side of canvas only, left half completely clean."
  Adapt the description to match the angle's emotional direction and the product category. Make each angle feel distinct in energy and body language.`,
    primaryColor: `- primaryColor: Brand color inferred from the industry, product name, and tone. Return as a single hex code (e.g. "#D4A5A5"). Choose a color that matches the brand identity:
  skincare/beauty → warm rose or dusty mauve (#D4A5A5, #C4889F)
  wellness/natural → sage green or earthy olive (#7BAE8A, #A8B87A)
  fitness/sport → bold blue or energetic orange (#1A3C8F, #E8722A)
  food/beverage → warm amber or terracotta (#E8722A, #C0612B)
  tech/innovation → teal or electric blue (#00B5AD, #2C7BE5)
  fashion/luxury → deep burgundy or warm gold (#8B2252, #C9A84C)
  professional services → navy or charcoal (#1A3C8F, #4A4A4A)
  home/decor → warm terracotta or sage (#C0612B, #7BAE8A)
  When in doubt, match the dominant product color.`,
    backgroundColorHint: `- backgroundColorHint: (optional) ONLY the color palette modifier for the background. Must be a very light, pale tone compatible with dark typography. Choose based on the emotional angle:
  - Emotional/aspirational: warm tones (beige rosado, crema, melocotón muy pálido)
  - Problem/solution: neutral cool (blanco roto, gris muy claro, celeste pálido)
  - Urgency: slightly warmer neutral (beige claro, crema tostada)
  - Technical benefit: clean cool (blanco puro, gris perla, celeste muy claro)
  Return ONLY the color description, max 8 words.
  Example: 'tonos celeste muy pálido y blanco suave'
  Example: 'beige rosado cálido muy claro'
  Example: 'blanco puro con toque crema'`,
    sceneAction: `- sceneAction: CRITICAL: Write this entire field in ENGLISH only. Gemini image generation performs significantly better with English prompts. Never write sceneAction in Spanish, regardless of the brand language.
  A COMPLETE, ready-to-use cinematic photography brief for an AI image generation model. DO NOT write a short description — write the FULL, detailed prompt.
  CRITICAL: Each variant MUST use a COMPLETELY DIFFERENT scenario, setting, and visual concept. NEVER repeat the same location, prop, or lighting setup across variants. Think like a creative director building a diverse campaign.
  Required structure — include ALL six elements:
  [1] Setting/environment: specific location, surfaces, props, textures, depth of field, atmosphere
  [2] Person: exact age range, gender, clothing style and color, hair, skin tone
  [3] Body language: precise pose, weight distribution, arm position, micro-expression
  [4] Lighting: key light source and direction, color temperature (warm/cool/neutral), shadow quality
  [5] Camera feel: lens compression, framing (tight portrait vs. environmental), depth
  [6] Positioning: ${tpl?.textSide
    ? tpl.textSide === "left"
      ? `person MUST be in the RIGHT ${Z.HORIZONTAL_SUBJECT}% of canvas (from ${Z.HORIZONTAL_COPY}% to right edge). LEFT ${Z.HORIZONTAL_COPY}% must stay completely empty for text. End the prompt with: "right side only, left ${Z.HORIZONTAL_COPY}% completely clean."`
      : tpl.textSide === "right"
      ? `person MUST be in the LEFT ${Z.HORIZONTAL_SUBJECT}% of canvas (left edge to ${Z.HORIZONTAL_SUBJECT}%). RIGHT ${Z.HORIZONTAL_COPY}% must stay completely empty for text. End the prompt with: "left side only, right ${Z.HORIZONTAL_COPY}% completely clean."`
      : tpl.textSide === "top"
      ? `person MUST be in the BOTTOM ${Z.VERTICAL_SUBJECT}% of canvas (below ${Z.VERTICAL_COPY}% vertical). TOP ${Z.VERTICAL_COPY}% must remain completely clean for text. End the prompt with: "bottom ${Z.VERTICAL_SUBJECT}% only, top ${Z.VERTICAL_COPY}% completely clean."`
      : `person MUST be in the TOP ${Z.VERTICAL_SUBJECT}% of canvas (above ${Z.VERTICAL_SUBJECT}% vertical). BOTTOM ${Z.VERTICAL_COPY}% must remain completely clean for text. End the prompt with: "top ${Z.VERTICAL_SUBJECT}% only, bottom ${Z.VERTICAL_COPY}% completely clean."`
    : args.templateHint
    ? `keep the text zone completely clean per the TEMPLATE HINT positioning instructions above`
    : `follow the TEMPLATE VISUAL DIRECTION strictly — if it specifies a zone ("RIGHT side", "LEFT 50% clean"), reproduce it exactly in this prompt`}
  Target length: 80–100 words — dense and specific, not verbose. DO NOT truncate or summarize.
  End with exactly: "4K photorealistic. No text, no logos, no products."
  ${!(args.templateHint) ? `SYNTHESIS RULE — when TEMPLATE VISUAL DIRECTION and SCENE EXAMPLES are both present:
  • SCENE EXAMPLE → defines setting/environment/lighting/atmosphere (WHERE and MOOD)
  • Template Visual Direction → defines person positioning and canvas zone constraints (HOW in frame)
  Additional hard constraints:
  - If Visual Direction says "Do NOT show any product" → person's hands must be empty.
  - If it specifies a zone ("RIGHT side", "LEFT 50% clean") → reproduce it as the last positioning constraint.` : ""}
  The scene must directly illustrate the variant's headline copy. Be specific to the product category.
  IMPORTANT: See the SCENE EXAMPLES section below — you MUST synthesize it with the Template Visual Direction.${tpl?.compositionMode === "scene-with-product" ? "\n  SCENE WITH PRODUCT: the person MUST be ACTIVELY HOLDING, APPLYING, or USING the product — describe the exact interaction (height, hand position, label facing camera). Product fully visible." : ""}${filteredSchema.includes("sceneAction") && tpl?.personOnly === true ? "\n  PERSON-ONLY: describe ONLY the person — no environment, no setting, no room, no surfaces. Background is pre-generated separately." : ""}`,
    scenePrompt: `- scenePrompt: A COMPLETE SCENE DESCRIPTION in English combining the background environment, a real person, and the product into one cohesive visual narrative. This is a full creative brief for an AI image generation model that creates the ENTIRE image in one pass.
  Structure: [setting/environment with specific details] + [lighting direction and quality] + [person description: age, clothing, pose, expression] + [natural product interaction] + [mood and color palette] + [camera/framing]
  Max 120 words. Be vivid, cinematic, and specific.
  CRITICAL: Each variant MUST use a COMPLETELY DIFFERENT setting, mood, and person-product interaction.
  ALWAYS end with: "Subject and product on right side only. Left half must remain completely clean for pre-rendered text."
  IMPORTANT: See the SCENE EXAMPLES section provided separately below — you MUST use it as creative inspiration for this field.`,
  };

  const dynamicFieldRules = filteredSchema.some(f => FIELD_RULE[f])
    ? `FIELD RULES:\n${filteredSchema
        .map((f) => FIELD_RULE[f] ?? null)
        .filter(Boolean)
        .join("\n")}`
    : "";

  console.log(JSON.stringify({
    tag: "[COPY_GEN:FIELD_RULE_GATE]",
    timestamp: new Date().toISOString(),
    templateId: tpl?.id,
    hasTemplateHint: !!args.templateHint,
    fieldsInSchema: filteredSchema,
    fieldsWithActiveRule: filteredSchema.filter(f => !!FIELD_RULE[f]),
    fieldsWithoutRule: filteredSchema.filter(f => !FIELD_RULE[f]),
  }, null, 2));

  // personOnlyNote is now inline in FIELD_RULE["sceneAction"] to avoid a separate block.

  const variantInstructions =
    n > 1
      ? `\nGenerate ${n} variants with these different angles:\n${VARIANT_ANGLES.slice(0, n)
          .map((angle, i) => `- Variant ${i + 1}: ${angle}`)
          .join("\n")}\n\nCRITICAL FOR sceneAction: Each variant MUST use a COMPLETELY DIFFERENT scenario/setting/location. If one variant uses a bathroom, NONE of the others can. If one uses a mirror, NONE of the others can. Think of ${n} different ROOMS or LOCATIONS for the person. Variety is mandatory.\n\nReturn a JSON object with a single key "variants" whose value is an array of ${n} objects, each with the same fields as specified. No markdown, no explanation, only the JSON object.`
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
${bp.coloresMarca?.length ? `
IMPORTANT COLOR OVERRIDES (takes priority over generic rules):
- primaryColor field: use exactly "${bp.coloresMarca[0]}" — this is the brand's actual primary color.
- backgroundColorHint field: derive a very light/pale version of these brand colors (${bp.coloresMarca.join(", ")}) that works as a background. Must stay compatible with dark typography. Describe it in words (max 8 words).
` : ""}
Use this brand context to make the copy feel authentic, specific and consistent with the brand voice. Incorporate the brand's unique differentiators naturally.

`
    : "";

  // Shown standalone only when no templateHint is present.
  // When templateHint exists, a compact version is merged as its header (see templateHintBlock below).
  const templateContextBlock = (tpl && !args.templateHint)
    ? `TEMPLATE CONTEXT (the visual layout this copy will be used with):
- Template: ${tpl.name} (${tpl.id})
- Description: ${tpl.description}
- Copy zone: ${tpl.copyZone} (text renders in the ${tpl.copyZone} area of the image)
- Copy fields: ${filteredSchema.join(", ")}
- Scene type: ${tpl.sceneFullBleed ? "full-bleed cinematic scene" : "standard layout"}${tpl.personScene ? ", includes person in scene" : ""}${tpl.personOnly ? ", person-only (no product)" : ""}
- Pipeline: ${tpl.pipelineV2 ? "V2 (creative brief → AI scene)" : "V1 (standard background)"}
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

  // When templateHint is present: compact context header (name, zone, scene flags) + hint.
  // Replaces templateContextBlock (~80t) with a 1-line summary (~15t) to eliminate duplication
  // with the hint's own layout description.
  const templateHintBlock = args.templateHint
    ? `TEMPLATE: ${tpl?.name ?? ""} (${tpl?.id ?? ""})${tpl?.copyZone ? ` · Zone: ${tpl.copyZone}` : ""}${tpl?.sceneFullBleed ? " · full-bleed" : ""}${tpl?.personScene ? " · person in scene" : ""}${tpl?.personOnly ? " · person-only" : ""}
TEMPLATE HINT:
${args.templateHint}

`
    : "";

  // Gate: only inject when a background field is actually in filteredSchema.
  // rawBackgroundPrompt:true removes backgroundPrompt/backgroundColorHint from filteredSchema,
  // so there is no field receiver — injecting the guide would waste tokens with no effect.
  // Note: backgroundStyleGuide may be categoryBackgroundPrompts[cat] (different from
  // defaultBackgroundPrompt shown in templateVisualDirectionBlock), so the blocks are NOT
  // always duplicates — do not remove this block entirely.
  const backgroundStyleGuideBlock =
    args.backgroundStyleGuide &&
    filteredSchema.includes("backgroundPrompt")
      ? `BACKGROUND STYLE GUIDE (mandatory reference for the backgroundPrompt field — keep this visual style, adapt colors/mood to the product):
${args.backgroundStyleGuide}

`
      : "";

  // Sample ONE texture example from texture-library.md (used by backgroundPrompt).
  // Gated on useTextureLibrary: true — only templates that explicitly want macro texture
  // references receive this injection (e.g. producto-hero-top, not persona-producto-top).
  const textureExample =
    tpl?.useTextureLibrary === true &&
    filteredSchema.includes("backgroundPrompt") &&
    args.businessProfile?.category
      ? getTextureLibrarySection(args.businessProfile.category)
      : "";
  const textureExamplesBlock = textureExample
    ? `TEXTURE REFERENCE EXAMPLE (use this as creative reference for the texture, photographic style, and mood of the backgroundPrompt — adapt to the specific product, do NOT copy verbatim):
${textureExample}

`
    : "";

  // Sample ONE scene from the scenes library (used by sceneAction & scenePrompt).
  // Uses filteredSchema — if rawProductPrompt removed sceneAction from the schema,
  // we skip getSceneLibrarySection() entirely to avoid wasting tokens.
  const needsSceneExamples =
    (filteredSchema.includes("sceneAction") || filteredSchema.includes("scenePrompt")) &&
    (args.sceneExample || args.businessProfile?.category);
  const sceneExampleText = needsSceneExamples
    ? (args.sceneExample ?? (args.businessProfile?.category ? getSceneLibrarySection(args.businessProfile.category) : ""))
    : "";
  const sceneExamplesBlock = sceneExampleText
    ? `SCENE EXAMPLES FOR THIS CATEGORY — extract the photographic style, emotional tone, and person-product dynamic. Adapt the setting and mood to the specific product, do NOT copy the example literally. Use this as creative inspiration for sceneAction and/or scenePrompt fields:
${sceneExampleText}

`
    : "";

  console.log(JSON.stringify({
    tag: "[COPY_GEN:SCHEMA_FILTER]",
    timestamp: new Date().toISOString(),
    templateId: tpl?.id,
    rawSchema: args.templateSchema,
    filteredSchema,
    removedFields: args.templateSchema.filter((f) => !filteredSchema.includes(f)),
    rawBackgroundPrompt: tpl?.rawBackgroundPrompt ?? false,
    rawProductPrompt: tpl?.rawProductPrompt ?? false,
    hyperRealisticMode: isHyperRealistic,
  }, null, 2));

  console.log(JSON.stringify({
    tag: "[COPY_GEN:SCENE_LIBRARY]",
    timestamp: new Date().toISOString(),
    category: args.businessProfile?.category ?? "none",
    templateSchema: filteredSchema,
    needsSceneExamples: !!needsSceneExamples,
    hasSceneAction: filteredSchema.includes("sceneAction"),
    hasScenePrompt: filteredSchema.includes("scenePrompt"),
    sceneExampleInjected: sceneExampleText.length > 0,
    sceneExampleChars: sceneExampleText.length,
    sceneExamplePreview: sceneExampleText.slice(0, 300),
    sceneBlockChars: sceneExamplesBlock.length,
  }, null, 2));

  const templateVisualDirectionBlock = (tpl?.defaultBackgroundPrompt || tpl?.defaultProductPrompt) && !args.templateHint
    ? `TEMPLATE VISUAL DIRECTION (use this as the PRIMARY reference when generating scenePrompt, backgroundPrompt, or sceneAction — the scene MUST be coherent with these visual guidelines):
${tpl.defaultBackgroundPrompt ? `- Background direction: ${tpl.defaultBackgroundPrompt}` : ""}
${tpl.defaultProductPrompt ? `- Product/person direction: ${tpl.defaultProductPrompt}` : ""}
Adapt the mood, lighting, and environment of any scene or visual field to match this direction. If the background calls for minimalist/muted/elegant tones, the scenePrompt must reflect that. If the product prompt describes a specific interaction (hand holding, surface placement, etc.), scenePrompt must incorporate it naturally.

`
    : "";

  const prompt = `Generate copy for a visual advertising template. Output a JSON object with EXACTLY these fields: ${filteredSchema.join(", ")}
CRITICAL: Do NOT add any field not listed above. The JSON must contain ONLY those keys.

${dynamicFieldRules}
${templateHintBlock}${templateContextBlock}${templateVisualDirectionBlock}${hyperRealisticBlock}${backgroundStyleGuideBlock}${textureExamplesBlock}${sceneExamplesBlock}${brandContextBlock}${sorteoBlock}${referenceBlock}USER INFO:
- Product: ${args.product}
- Main offer: ${args.offer}
- Target audience: ${args.targetAudience}
- Problem it solves: ${args.problem}
- Tone: ${args.tone}

${variantInstructions}`;

  const fullPrompt = `${EXPERT_COPYWRITER_SYSTEM_PROMPT}\n\n${prompt}`;

  console.log(JSON.stringify({
    tag: "[openai:generateTemplateCopyOpenAI:INPUT]",
    timestamp: new Date().toISOString(),
    model: "gpt-4o-mini",
    numberOfVariants: n,
    schema: filteredSchema,
    input: {
      product: args.product,
      offer: args.offer,
      targetAudience: args.targetAudience,
      problem: args.problem,
      tone: args.tone,
      templateId: tpl?.id,
      templateName: tpl?.name,
      businessName: args.businessProfile?.nombre,
      category: args.businessProfile?.category,
    },
    systemPrompt: EXPERT_COPYWRITER_SYSTEM_PROMPT,
    userPrompt: prompt,
    fullPromptChars: fullPrompt.length,
  }, null, 2));

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXPERT_COPYWRITER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";

  console.log(JSON.stringify({
    tag: "[openai:generateTemplateCopyOpenAI:OUTPUT]",
    timestamp: new Date().toISOString(),
    usage: response.usage,
    finishReason: response.choices[0]?.finish_reason,
    rawResponse: raw,
  }, null, 2));

  try {
    const parsed = JSON.parse(raw);
    console.log(`[openai:generateTemplateCopyOpenAI] response keys=[${Object.keys(n > 1 ? (parsed.variants?.[0] ?? parsed) : parsed).join(", ")}]${parsed.productPrompt ? ` ⚠️ productPrompt="${String(parsed.productPrompt).slice(0, 80)}"` : ""}`);

    // Attach prompt metadata so it can be forwarded to UI logs
    const resultWithPrompt = (obj: any) => {
      Object.defineProperty(obj, '_promptUsed',   { value: fullPrompt,                    enumerable: false });
      Object.defineProperty(obj, '_systemPrompt', { value: EXPERT_COPYWRITER_SYSTEM_PROMPT, enumerable: false });
      Object.defineProperty(obj, '_userPrompt',   { value: prompt,                        enumerable: false });
      return obj;
    };

    if (n > 1) {
      const variants = parsed.variants;
      if (!Array.isArray(variants)) throw new Error("Invalid JSON from OpenAI");
      return resultWithPrompt(variants) as Record<string, unknown>[];
    }
    return resultWithPrompt(parsed) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON from OpenAI");
  }
}

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

export async function generateSequenceCopy(args: {
  product: string;
  offer: string;
  targetAudience: string;
  problem: string;
  tone: string;
  narrative: string;
  slideCount: number;
  sceneWithProduct?: boolean;
  businessProfile?: {
    nombre?: string;
    rubro?: string;
    propuestaValor?: string;
    diferenciacion?: string;
    clienteIdeal?: string;
    dolores?: string;
    motivaciones?: string;
    tono?: string[];
    palabrasSi?: string;
    palabrasNo?: string;
  };
}): Promise<Array<{
  headline: string;
  subheadline: string;
  badge: string;
  backgroundColorHint: string;
  sceneAction: string;
  slideRole: string;
  productPrompt?: string;
}>> {
  const client = getClient();

  const slideRolesByCount: Record<number, string[]> = {
    3: ["HOOK", "PROBLEMA", "CTA"],
    4: ["HOOK", "PROBLEMA", "SOLUCION", "CTA"],
    5: ["HOOK", "PROBLEMA", "AGITACION", "SOLUCION", "CTA"],
    6: ["HOOK", "PROBLEMA", "AGITACION", "SOLUCION", "PRUEBA", "CTA"],
  };
  const slideRoles = slideRolesByCount[args.slideCount] ?? slideRolesByCount[5];

  const bp = args.businessProfile;
  const brandContextBlock = bp
    ? `BRAND CONTEXT:
- Business name: ${bp.nombre || "—"}
- Industry: ${bp.rubro || "—"}
- Value proposition: ${bp.propuestaValor || "—"}
- Differentiation: ${bp.diferenciacion || "—"}
- Ideal client: ${bp.clienteIdeal || "—"}
- Client pain points: ${bp.dolores || "—"}
- Purchase motivations: ${bp.motivaciones || "—"}
- Brand tone: ${bp.tono?.join(", ") || "—"}
- Words to USE: ${bp.palabrasSi || "—"}
- Words to AVOID: ${bp.palabrasNo || "—"}

`
    : "";

  const systemPrompt = `${EXPERT_COPYWRITER_SYSTEM_PROMPT}

## SEQUENCE MODE:
You are creating a NARRATIVE SEQUENCE of ${args.slideCount} slides for a carousel/story format.
Each slide must build on the previous one, creating an emotional journey that leads to action.

Slide structure for ${args.slideCount} slides:
${slideRoles.map((role, i) => `- Slide ${i + 1}: ${role}`).join("\n")}

Role definitions:
- HOOK: Stop the scroll. Bold pain point or provocative statement. Make them think "that's me".
- PROBLEMA: Deepen the pain. Show the consequences of NOT solving this. Empathy + specificity.
- AGITACION: Amplify frustration. Paint the worst-case scenario vividly. Create urgency to change.
- SOLUCION: Present the product as the clear answer. Benefits-first, specific and credible.
- PRUEBA: Social proof, results, credentials, testimonials. Make success feel achievable.
- CTA: Direct call to action. Urgency + offer. Tell them exactly what to do next.

CRITICAL RULES:
- Each slide uses the pain-point-left template: headline LEFT side, person/scene RIGHT side
- Headlines must be SHORT (max 7 words) — they render large on screen
- Write in Argentine Spanish (vos/tenés/podés)
- The narrative arc must feel like a conversation, not a list of ads
- sceneAction must match the emotional state of that slide's role
- sceneAction must be a hyper-specific photography direction: describe the person's age range, expression, body language, clothing style, and the background environment (not white studio — real life context). Max 40 words. Must match the emotional arc of the slideRole.${args.sceneWithProduct ? `
- This sequence uses a PERSONA CON PRODUCTO template: the person ALWAYS holds the product in every slide.
- productPrompt must describe the FULL PERSON + their interaction with the product matching the slide's emotional state. The product is always in their hands but the pose/expression evolves with the narrative arc:
  HOOK: holding product with curious/intrigued expression, examining it or tilting head with interest
  PROBLEMA: holding product close to body, concerned expression, as if wondering if it will help
  AGITACION: holding product with visible tension or worry, frustrated expression
  SOLUCION: holding product at chest height with relief and warmth, beginning to smile
  PRUEBA: confidently presenting product to camera, proud and satisfied expression
  CTA: energetically presenting product with direct gaze and strong posture
- productPrompt must ALWAYS end with: "right side of canvas only, left half completely clean."` : ""}`;

  const prompt = `${brandContextBlock}PRODUCT: ${args.product}
OFFER: ${args.offer}
TARGET AUDIENCE: ${args.targetAudience}
PROBLEM IT SOLVES: ${args.problem}
TONE: ${args.tone}
NARRATIVE DIRECTION: ${args.narrative || "Follow the natural arc for this product"}

Generate exactly ${args.slideCount} slides following the sequence: ${slideRoles.join(" → ")}

For each slide return:
- headline: max 7 words, bold statement matching the slide role
- subheadline: 1 sentence, max 90 chars, expands the headline
- badge: max 30 chars — soft CTA or intriguing phrase for non-CTA slides; direct offer for CTA slide
- backgroundColorHint: very light pale tone, max 8 words, compatible with dark typography
- sceneAction: describe the exact person and body language for the RIGHT side of the image. Person experiencing the emotional state of this slide. Specific and vivid. Person on RIGHT side only, LEFT 50% clean.
- slideRole: the role name (HOOK, PROBLEMA, AGITACION, SOLUCION, PRUEBA, or CTA)${args.sceneWithProduct ? `
- productPrompt: A creative brief in English (max 60 words) describing the FULL PERSON holding the product. Include: person appearance (age, style, clothing), emotional state matching this slide's role, how they hold the product (which hands, at what height, label direction), body language and posture. ALWAYS end with: "right side of canvas only, left half completely clean."` : ""}

Return a JSON object with a single key "slides" containing an array of ${args.slideCount} objects.
No markdown, no explanation, only the JSON object.`;

  console.log(JSON.stringify({
    tag: "[openai:generateSequenceCopy:INPUT]",
    timestamp: new Date().toISOString(),
    model: "gpt-4o-mini",
    slideCount: args.slideCount,
    slideRoles,
    input: {
      product: args.product,
      offer: args.offer,
      targetAudience: args.targetAudience,
      problem: args.problem,
      tone: args.tone,
      narrative: args.narrative,
      sceneWithProduct: args.sceneWithProduct,
      businessName: args.businessProfile?.nombre,
    },
    systemPrompt,
    userPrompt: prompt,
  }, null, 2));

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";

  console.log(JSON.stringify({
    tag: "[openai:generateSequenceCopy:OUTPUT]",
    timestamp: new Date().toISOString(),
    usage: response.usage,
    finishReason: response.choices[0]?.finish_reason,
    rawResponse: raw,
  }, null, 2));

  try {
    const parsed = JSON.parse(raw);
    const slides = parsed.slides;
    if (!Array.isArray(slides)) throw new Error("Invalid response: missing slides array");
    return slides;
  } catch {
    throw new Error("Invalid JSON from OpenAI");
  }
}