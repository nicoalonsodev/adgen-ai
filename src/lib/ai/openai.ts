 import OpenAI from "openai";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

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
    dolores?: string;
    motivaciones?: string;
    tono?: string[];
    palabrasSi?: string;
    palabrasNo?: string;
    coloresMarca?: string[];
  };
}): Promise<Record<string, unknown> | Record<string, unknown>[]> {
  const client = getClient();
  const n = args.numberOfVariants ?? 1;

  const fieldRules = `FIELD RULES:
- title: 3-5 keywords separated by ' · ' max 50 chars
- headline: max 6 words, emotional, ends with period. You may wrap 1-2 key words in **word** to mark them for stronger typographic emphasis (they will render bolder). CRITICAL: always surround **word** with spaces — write "la **firmeza** y" NOT "la**firmeza**y". Only mark the most emotionally impactful word(s). For comparacion-split templates: the main comparison title, bold, max 30 chars, uppercase, must contain "VS", NO **bold** markers. Examples: "NOSOTROS VS ELLOS", "LO REAL VS LO BARATO".
- subheadline: 1-2 sentences, max 120 chars, benefit-focused. You may wrap 1-2 key words in **word** for stronger emphasis. CRITICAL: always surround **word** with spaces — write "la **palabra** siguiente" NOT "la**palabra**siguiente". Only mark the most important words.
- badge: short offer pill format, max 35 chars
- bullets: array of 3 items, max 40 chars each, start with relevant emoji. For comparacion-split: array of exactly 4 YOUR PRODUCT benefits, NO emojis, NO ✓ symbols. For antes-despues: array of 3-4 AFTER results/benefits, NO emojis, NO bullet points — they are added automatically. Specific measurable results.
- columnTitle: (comparacion-split only) YOUR product/brand name, short, max 20 chars, uppercase. This is the LEFT column label. Example: "MEENO", "DERMALISSE", "NOSOTROS". (antes-despues) the AFTER label, short, uppercase, max 15 chars. Example: "DÍA 90", "DESPUÉS", "CON TRATAMIENTO".
- competitionTitle: (comparacion-split only) generic competition label, max 20 chars, uppercase. This is the RIGHT column label. Example: "ELLOS", "CREMA COMÚN", "OTRAS MARCAS". (antes-despues) the BEFORE label, short, uppercase, max 15 chars. Example: "DÍA 1", "ANTES", "SIN TRATAMIENTO".
- competitionBullets: (comparacion-split only) array of exactly 4 COMPETITION weaknesses, NO emojis, NO ✗ symbols. Realistic and recognizable. Max 40 chars each. (antes-despues) array of 3-4 BEFORE problems/symptoms, NO emojis, NO bullet points. Realistic pain points the audience recognizes. Max 45 chars each.
- backgroundPrompt: A detailed prompt in Spanish to generate a background image. It must follow this exact style:
  "Fondo [tipo de ambiente y superficie], [descripción de textura]. Iluminación [tipo de luz y dirección], generando [descripción de sombras]. Ambiente [adjetivos de atmósfera], tonos [paleta de colores], estética [estilo visual]. Luz [calidad de luz], sombras [descripción]. Superficie uniforme sin objetos, sin texto, sin personas, sin productos. Estilo fotografía publicitaria de [categoría del producto], fondo limpio con profundidad sutil y sensación de [emoción relacionada al producto]."
  The prompt must be in Spanish, detailed, evocative, and adapted to the product category and tone provided by the user.
  Example for skincare: "Fondo minimalista cálido con pared beige suave y textura lisa tipo estudio fotográfico. Iluminación natural lateral entrando desde una ventana fuera de cuadro, generando sombras difusas y orgánicas con líneas diagonales suaves sobre la pared. Ambiente cálido, tonos arena y crema, estética clean y elegante tipo skincare premium. Luz de tarde ligeramente dorada, sombras suaves y desenfocadas. Superficie uniforme sin objetos, sin texto, sin personas, sin productos. Estilo fotografía publicitaria de cosmética, fondo limpio con profundidad sutil y sensación de calma y cuidado personal."
  IMPORTANT: If a BACKGROUND STYLE GUIDE is provided below, you MUST base this field on it. Keep the same visual composition, textures, and mood from the style guide, but adapt the color palette and atmosphere to the product category and tone. Do not copy it verbatim — personalize it. The style guide is a creative constraint, not a template to copy literally.
- productPrompt: A creative brief in English that tells Gemini what kind of PERSON to generate and how they NATURALLY USE or interact with the product. This is NOT a hand-only prompt — describe a FULL PERSON actively using the product.
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
  Adapt the description to match the angle's emotional direction and the product category. Make each angle feel distinct in energy and body language.
  Always include this field in the returned JSON regardless of the template.
- primaryColor: Brand color inferred from the industry, product name, and tone. Return as a single hex code (e.g. "#D4A5A5"). Choose a color that matches the brand identity:
  skincare/beauty → warm rose or dusty mauve (#D4A5A5, #C4889F)
  wellness/natural → sage green or earthy olive (#7BAE8A, #A8B87A)
  fitness/sport → bold blue or energetic orange (#1A3C8F, #E8722A)
  food/beverage → warm amber or terracotta (#E8722A, #C0612B)
  tech/innovation → teal or electric blue (#00B5AD, #2C7BE5)
  fashion/luxury → deep burgundy or warm gold (#8B2252, #C9A84C)
  professional services → navy or charcoal (#1A3C8F, #4A4A4A)
  home/decor → warm terracotta or sage (#C0612B, #7BAE8A)
  When in doubt, match the dominant product color.
  Always include this field in the returned JSON regardless of the template.
- backgroundColorHint: (optional) ONLY the color palette modifier for the background. Must be a very light, pale tone compatible with dark typography. Choose based on the emotional angle:
  - Emotional/aspirational: warm tones (beige rosado, crema, melocotón muy pálido)
  - Problem/solution: neutral cool (blanco roto, gris muy claro, celeste pálido)
  - Urgency: slightly warmer neutral (beige claro, crema tostada)
  - Technical benefit: clean cool (blanco puro, gris perla, celeste muy claro)
  Return ONLY the color description, max 8 words.
  Example: 'tonos celeste muy pálido y blanco suave'
  Example: 'beige rosado cálido muy claro'
  Example: 'blanco puro con toque crema'
- sceneAction: (optional — only generate if this field is explicitly listed in the template schema) A hyper-specific photography direction describing the FULL SCENE with a person illustrating the pain point or emotional state from the headline. This is a creative brief for an image generation model — be vivid, cinematic, and UNIQUE.
  CRITICAL: Each variant MUST use a COMPLETELY DIFFERENT scenario, setting, body language, and visual concept. NEVER repeat the same setup (e.g. "woman at mirror" twice). Think like a creative director building a diverse campaign.
  Structure: [person age/gender/appearance] + [specific setting/environment] + [exact body language and expression] + [lighting mood] + [1-2 contextual props that tell the story]
  Max 50 words. The person fills the full canvas (full-bleed cinematic portrait).

  SCENARIO BANK — use these as DIVERSE inspiration, NEVER repeat the same type across variants:
  - Kitchen: person leaning against counter, head in hands, surrounded by supplements they don't trust
  - Gym: athlete sitting on bench post-workout, staring at the floor in defeat, towel over shoulders
  - Bathroom: person examining skin under harsh light, magnifying mirror, shocked expression
  - Bedroom: person sitting on bed edge at 3am, phone glow on face, sleepless and anxious
  - Office: professional rubbing temples at desk, laptop open, overwhelmed by stress
  - Street/urban: person walking alone in rain, hunched shoulders, avoiding reflections in shop windows
  - Living room: person on couch holding ice pack on knee/back, TV on in background, isolated
  - Outdoor: runner stopped mid-jog holding their side, grimacing, early morning light
  - Closet/dressing: person staring at clothes that don't fit, hand on waist, frustrated
  - Car: person gripping steering wheel, head down, moment of private frustration in parking lot
  - Pharmacy/store: person reading product labels with confused overwhelmed expression, aisle of options
  - Park bench: person sitting alone, distant gaze, one hand on neck showing tension
  - Waiting room: person in medical waiting area, nervous fidgeting, harsh fluorescent light
  - Mirror (full body): person turned sideways examining their body with dissatisfaction
  - Dining table: person pushing food away, hand on stomach, uncomfortable expression
  The action must directly illustrate the headline copy. Be specific to the product category.`;

  const variantInstructions =
    n > 1
      ? `\nGenerate ${n} variants with these different angles:\n${VARIANT_ANGLES.slice(0, n)
          .map((angle, i) => `- Variant ${i + 1}: ${angle}`)
          .join("\n")}\n\nCRITICAL FOR sceneAction: Each variant MUST use a COMPLETELY DIFFERENT scenario/setting/location. If one variant uses a bathroom, NONE of the others can. If one uses a mirror, NONE of the others can. Think of ${n} different ROOMS or LOCATIONS for the person. Variety is mandatory.\n\nReturn a JSON object with a single key "variants" whose value is an array of ${n} objects, each with the same fields as specified. No markdown, no explanation, only the JSON object.`
      : `\nReturn ONLY a valid JSON object with exactly the fields requested. No markdown, no explanation, no extra text.`;

  const bp = args.businessProfile;
  const brandContextBlock = bp
    ? `BRAND CONTEXT (use this to make copy more specific and on-brand):
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
- Brand colors: ${bp.coloresMarca?.length ? bp.coloresMarca.join(", ") : "—"}
${bp.coloresMarca?.length ? `
IMPORTANT COLOR OVERRIDES (takes priority over generic rules):
- primaryColor field: use exactly "${bp.coloresMarca[0]}" — this is the brand's actual primary color.
- backgroundColorHint field: derive a very light/pale version of these brand colors (${bp.coloresMarca.join(", ")}) that works as a background. Must stay compatible with dark typography. Describe it in words (max 8 words).
` : ""}
Use this brand context to make the copy feel authentic, specific and consistent with the brand voice. Incorporate the brand's unique differentiators naturally.

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

  const templateHintBlock = args.templateHint
    ? `TEMPLATE HINT:\n${args.templateHint}\n\n`
    : "";

  const backgroundStyleGuideBlock = args.backgroundStyleGuide
    ? `BACKGROUND STYLE GUIDE (mandatory reference for the backgroundPrompt field — keep this visual style, adapt colors/mood to the product):
${args.backgroundStyleGuide}

`
    : "";

  const prompt = `You are an expert advertising copywriter specialized in direct response marketing in Spanish.

Generate copy for a visual advertising template. Output a JSON object with EXACTLY these fields: ${args.templateSchema.join(", ")}
CRITICAL: Do NOT add any field not listed above. The JSON must contain ONLY those keys.

${fieldRules}
${templateHintBlock}${backgroundStyleGuideBlock}${brandContextBlock}${sorteoBlock}${referenceBlock}USER INFO:
- Product: ${args.product}
- Main offer: ${args.offer}
- Target audience: ${args.targetAudience}
- Problem it solves: ${args.problem}
- Tone: ${args.tone}

${variantInstructions}`;

  console.log(`[openai:generateTemplateCopyOpenAI] schema=[${args.templateSchema.join(", ")}] prompt_chars=${prompt.length}`);
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXPERT_COPYWRITER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(raw);
    console.log(`[openai:generateTemplateCopyOpenAI] response keys=[${Object.keys(n > 1 ? (parsed.variants?.[0] ?? parsed) : parsed).join(", ")}]${parsed.productPrompt ? ` ⚠️ productPrompt="${String(parsed.productPrompt).slice(0, 80)}"` : ""}`);
    if (n > 1) {
      const variants = parsed.variants;
      if (!Array.isArray(variants)) throw new Error("Invalid JSON from OpenAI");
      return variants as Record<string, unknown>[];
    }
    return parsed as Record<string, unknown>;
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

  console.log(`[openai:generateSequenceCopy] model=gpt-4o-mini prompt_chars=${prompt.length}\n${prompt.slice(0, 300)}`);
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw);
    const slides = parsed.slides;
    if (!Array.isArray(slides)) throw new Error("Invalid response: missing slides array");
    return slides;
  } catch {
    throw new Error("Invalid JSON from OpenAI");
  }
}
