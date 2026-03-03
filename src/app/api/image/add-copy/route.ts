import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { MetaAngle, META_ANGLES } from "@/lib/angles/metaAngles";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const IMAGE_MODEL = "gpt-5.2";

// ============================================================================
// CONFIGURACIÓN DE ÁNGULOS: hooks + si usa neón o no
// Los ángulos con useNeon: true tienen palabra marcada con ** ** que brilla
// Los ángulos con useNeon: false tienen texto sólido blanco sin efectos
// ============================================================================

interface AngleConfig {
  hooks: string[];
  useNeon: boolean;
}

const ANGLE_CONFIGS: Record<string, AngleConfig> = {
  // ===== ÁNGULOS CON NEÓN (más agresivos/llamativos) =====
  pain: {
    useNeon: true,
    hooks: [
      "BASTA DE **PROBLEMAS**",
      "EL FIN DEL **DOLOR**",
      "NUNCA MÁS **FRUSTRACIÓN**",
      "TERMINÁ CON LA **MOLESTIA**",
      "ADIÓS A LOS **OBSTÁCULOS**",
    ],
  },
  urgency: {
    useNeon: true,
    hooks: [
      "SOLO POR **HOY**",
      "ÚLTIMA **OPORTUNIDAD**",
      "**AHORA** O NUNCA",
      "EL TIEMPO SE **ACABA**",
      "OFERTA **FLASH**",
    ],
  },
  scarcity: {
    useNeon: true,
    hooks: [
      "ÚLTIMAS **UNIDADES**",
      "STOCK **LIMITADO**",
      "EDICIÓN **EXCLUSIVA**",
      "QUEDAN **POCOS**",
      "NO TE QUEDES **SIN** EL TUYO",
    ],
  },
  deal_savings: {
    useNeon: true,
    hooks: [
      "**AHORRÁ** EN GRANDE",
      "PRECIO **IRRESISTIBLE**",
      "DESCUENTO **EXCLUSIVO**",
      "**SÚPER** PROMO",
      "MEJOR **PRECIO** GARANTIZADO",
    ],
  },
  speed: {
    useNeon: true,
    hooks: [
      "RESULTADOS **INMEDIATOS**",
      "**VELOCIDAD** MÁXIMA",
      "LISTO AL **INSTANTE**",
      "ULTRA **RÁPIDO**",
      "SIN **ESPERAR**",
    ],
  },
  fear_of_missing_out: {
    useNeon: true,
    hooks: [
      "TODOS YA LO **TIENEN**",
      "NO TE QUEDES **AFUERA**",
      "SUMATE A LA **TENDENCIA**",
      "LO QUE TE ESTÁS **PERDIENDO**",
      "YA ES **VIRAL**",
    ],
  },
  performance: {
    useNeon: true,
    hooks: [
      "MÁXIMO **RENDIMIENTO**",
      "PERFORMANCE **EXTREMA**",
      "SUPERA **LÍMITES**",
      "POTENCIA **TOTAL**",
      "**PODER** SIN LÍMITES",
    ],
  },
  before_after: {
    useNeon: true,
    hooks: [
      "DE ESTO A **ESTO**",
      "TU **TRANSFORMACIÓN** EMPIEZA",
      "EL **CAMBIO** ES REAL",
      "MIRÁ LA **DIFERENCIA**",
      "**EVOLUCIÓN** GARANTIZADA",
    ],
  },
  results: {
    useNeon: true,
    hooks: [
      "**RESULTADOS** COMPROBADOS",
      "NÚMEROS QUE **HABLAN**",
      "PROBADO Y **MEDIDO**",
      "LA **PRUEBA** ESTÁ",
      "**ÉXITO** GARANTIZADO",
    ],
  },
  problem_solution: {
    useNeon: true,
    hooks: [
      "**PROBLEMA** SOLUCIONADO",
      "LA **SOLUCIÓN** EXISTE",
      "ASÍ SE **RESUELVE**",
      "ENCONTRAMOS LA **FORMA**",
      "**RESUELTO** PARA SIEMPRE",
    ],
  },
  bundle: {
    useNeon: true,
    hooks: [
      "**PACK** COMPLETO",
      "TODO **INCLUIDO**",
      "COMBO **ESPECIAL**",
      "KIT **COMPLETO**",
      "LLEVATE **TODO**",
    ],
  },

  // ===== ÁNGULOS SIN NEÓN (más elegantes/sutiles) =====
  premium: {
    useNeon: false,
    hooks: [
      "CALIDAD PREMIUM",
      "EXPERIENCIA DE LUJO",
      "LO MEJOR EN SU CLASE",
      "DISEÑO SUPERIOR",
      "EXCELENCIA TOTAL",
    ],
  },
  minimal: {
    useNeon: false,
    hooks: [
      "SIMPLE Y PERFECTO",
      "MENOS ES MÁS",
      "ESENCIA PURA",
      "SIN EXCESOS",
      "SOLO LO ESENCIAL",
    ],
  },
  lifestyle: {
    useNeon: false,
    hooks: [
      "PARA TU ESTILO DE VIDA",
      "VIVILO A TU MANERA",
      "TU COMPAÑERO IDEAL",
      "ACOMPAÑÁNDOTE SIEMPRE",
      "DISEÑADO PARA VOS",
    ],
  },
  authority: {
    useNeon: false,
    hooks: [
      "RESPALDADO POR EXPERTOS",
      "LÍDER EN SU CATEGORÍA",
      "ESTÁNDAR DE EXCELENCIA",
      "CALIDAD CERTIFICADA",
      "LA ELECCIÓN PROFESIONAL",
    ],
  },
  comfort: {
    useNeon: false,
    hooks: [
      "CONFORT ABSOLUTO",
      "COMODIDAD EXTREMA",
      "BIENESTAR TOTAL",
      "RELAX GARANTIZADO",
      "COMO UNA NUBE",
    ],
  },
  eco: {
    useNeon: false,
    hooks: [
      "100% SUSTENTABLE",
      "CUIDAMOS EL PLANETA",
      "ECO FRIENDLY",
      "NATURALEZA PURA",
      "VERDE POR ELECCIÓN",
    ],
  },
  guarantee: {
    useNeon: false,
    hooks: [
      "100% GARANTIZADO",
      "SATISFACCIÓN O DEVOLUCIÓN",
      "COMPRA SEGURA",
      "CONFIANZA TOTAL",
      "SIN RIESGO",
    ],
  },
  status_identity: {
    useNeon: false,
    hooks: [
      "PARA QUIENES EXIGEN MÁS",
      "ELEVÁ TU NIVEL",
      "DISTINCIÓN ABSOLUTA",
      "CLASE APARTE",
      "EXCLUSIVO PARA VOS",
    ],
  },
  gift: {
    useNeon: false,
    hooks: [
      "EL REGALO PERFECTO",
      "SORPRENDÉ A ALGUIEN",
      "REGALÁ FELICIDAD",
      "DETALLE INOLVIDABLE",
      "PARA ESA PERSONA ESPECIAL",
    ],
  },

  // ===== ÁNGULOS MIXTOS (pueden tener o no neón según el hook) =====
  desire: {
    useNeon: true,
    hooks: [
      "ALCANZÁ TU **SUEÑO**",
      "HACELO **REALIDAD**",
      "LLEGÓ TU **MOMENTO**",
      "CUMPLÍ TU **META**",
      "VIVÍ TU MEJOR VERSIÓN",
    ],
  },
  social_proof: {
    useNeon: false,
    hooks: [
      "MILES YA LO ELIGIERON",
      "EL FAVORITO DE TODOS",
      "LA COMUNIDAD HABLA",
      "ELEGIDO POR EXPERTOS",
      "TENDENCIA CONFIRMADA",
    ],
  },
  simplicity: {
    useNeon: false,
    hooks: [
      "ASÍ DE FÁCIL",
      "SIN COMPLICACIONES",
      "SIMPLE Y EFECTIVO",
      "CERO ESFUERZO",
      "LISTO EN MINUTOS",
    ],
  },
  objection: {
    useNeon: false,
    hooks: [
      "LA VERDAD DETRÁS",
      "SIN LETRA CHICA",
      "TRANSPARENCIA TOTAL",
      "LO QUE NADIE TE CUENTA",
      "RESPUESTAS CLARAS",
    ],
  },
  ugc: {
    useNeon: false,
    hooks: [
      "USUARIOS REALES",
      "EXPERIENCIAS GENUINAS",
      "SIN FILTROS",
      "TESTIMONIOS REALES",
      "LA GENTE HABLA",
    ],
  },
  comparison: {
    useNeon: true,
    hooks: [
      "**SUPERIOR** EN TODO",
      "LA **DIFERENCIA** ES CLARA",
      "SIN **COMPETENCIA**",
      "EL **MEJOR** EN SU CLASE",
      "COMPARALO VOS MISMO",
    ],
  },
  feature_focus: {
    useNeon: false,
    hooks: [
      "TECNOLOGÍA AVANZADA",
      "FUNCIONES PREMIUM",
      "EQUIPADO CON LO MEJOR",
      "CARACTERÍSTICAS TOP",
      "TODO LO QUE NECESITÁS",
    ],
  },
  benefit_focus: {
    useNeon: true,
    hooks: [
      "**BENEFICIO** GARANTIZADO",
      "RESULTADOS QUE SE **VEN**",
      "TU **GANANCIA** REAL",
      "LO QUE VAS A **OBTENER**",
      "MÁS PARA VOS",
    ],
  },
  seasonal: {
    useNeon: true,
    hooks: [
      "ESPECIAL DE **TEMPORADA**",
      "LLEGÓ LA **ÉPOCA**",
      "CELEBRÁ CON NOSOTROS",
      "EL MOMENTO PERFECTO",
      "FESTEJÁ EN **GRANDE**",
    ],
  },
  myth_busting: {
    useNeon: true,
    hooks: [
      "LA **VERDAD** REVELADA",
      "DESTRUYENDO **MITOS**",
      "DATO REAL",
      "NO ES LO QUE PENSÁS",
      "CREÍAS MAL",
    ],
  },
};

// Fallback hooks genéricos (sin neón)
const FALLBACK_HOOKS = [
  "DESCUBRÍ LO NUEVO",
  "TU MOMENTO ES AHORA",
  "HACÉ LA DIFERENCIA",
  "EL CAMBIO EMPIEZA HOY",
  "LO MEJOR PARA VOS",
];

const HOOKS_BY_ANGLE: Record<string, string[]> = {
  simplicity: [
    "ASÍ DE FÁCIL",
    "SIN COMPLICACIONES",
    "SIMPLE Y EFECTIVO",
    "CERO ESFUERZO",
    "LISTO EN MINUTOS",
  ],
  speed: [
    "RESULTADOS **INMEDIATOS**",
    "**VELOCIDAD** MÁXIMA",
    "LISTO AL **INSTANTE**",
    "ULTRA **RÁPIDO**",
    "SIN **ESPERAR**",
  ],
  guarantee: [
    "**100%** GARANTIZADO",
    "SATISFACCIÓN O **DEVOLUCIÓN**",
    "COMPRA **SEGURA**",
    "**CONFIANZA** TOTAL",
    "SIN **RIESGO**",
  ],
  objection: [
    "LA **VERDAD** DETRÁS",
    "SIN **LETRA** CHICA",
    "**TRANSPARENCIA** TOTAL",
    "LO QUE NADIE TE **CUENTA**",
    "RESPUESTAS **CLARAS**",
  ],
  lifestyle: [
    "PARA TU **ESTILO** DE VIDA",
    "VIVILO A TU **MANERA**",
    "TU **COMPAÑERO** IDEAL",
    "ACOMPAÑÁNDOTE **SIEMPRE**",
    "DISEÑADO PARA **VOS**",
  ],
  ugc: [
    "USUARIOS **REALES**",
    "EXPERIENCIAS **GENUINAS**",
    "SIN **FILTROS**",
    "TESTIMONIOS **REALES**",
    "LA GENTE **HABLA**",
  ],
  comparison: [
    "**SUPERIOR** EN TODO",
    "LA **DIFERENCIA** ES CLARA",
    "SIN **COMPETENCIA**",
    "EL **MEJOR** EN SU CLASE",
    "COMPARALO VOS **MISMO**",
  ],
  feature_focus: [
    "TECNOLOGÍA **AVANZADA**",
    "FUNCIONES **PREMIUM**",
    "EQUIPADO CON LO **MEJOR**",
    "CARACTERÍSTICAS **TOP**",
    "**TODO** LO QUE NECESITÁS",
  ],
  benefit_focus: [
    "**BENEFICIO** GARANTIZADO",
    "RESULTADOS QUE SE **VEN**",
    "TU **GANANCIA** REAL",
    "LO QUE VAS A **OBTENER**",
    "**MÁS** PARA VOS",
  ],
  fear_of_missing_out: [
    "TODOS YA LO **TIENEN**",
    "NO TE QUEDES **AFUERA**",
    "SUMATE A LA **TENDENCIA**",
    "LO QUE TE ESTÁS **PERDIENDO**",
    "YA ES **VIRAL**",
  ],
  status_identity: [
    "PARA QUIENES **EXIGEN** MÁS",
    "ELEVÁ TU **NIVEL**",
    "DISTINCIÓN **ABSOLUTA**",
    "CLASE **APARTE**",
    "EXCLUSIVO PARA **VOS**",
  ],
  seasonal: [
    "ESPECIAL DE **TEMPORADA**",
    "LLEGÓ LA **ÉPOCA**",
    "CELEBRÁ CON **NOSOTROS**",
    "EL **MOMENTO** PERFECTO",
    "FESTEJÁ EN **GRANDE**",
  ],
  gift: [
    "EL **REGALO** PERFECTO",
    "SORPRENDÉ A **ALGUIEN**",
    "REGALÁ **FELICIDAD**",
    "DETALLE **INOLVIDABLE**",
    "PARA ESA PERSONA **ESPECIAL**",
  ],
  problem_solution: [
    "**PROBLEMA** SOLUCIONADO",
    "LA **SOLUCIÓN** EXISTE",
    "ASÍ SE **RESUELVE**",
    "ENCONTRAMOS LA **FORMA**",
    "**RESUELTO** PARA SIEMPRE",
  ],
  myth_busting: [
    "LA **VERDAD** REVELADA",
    "DESTRUYENDO **MITOS**",
    "DATO **REAL**",
    "NO ES LO QUE **PENSÁS**",
    "**CREÍAS** MAL",
  ],
  results: [
    "**RESULTADOS** COMPROBADOS",
    "NÚMEROS QUE **HABLAN**",
    "PROBADO Y **MEDIDO**",
    "LA **PRUEBA** ESTÁ",
    "**ÉXITO** GARANTIZADO",
  ],
  bundle: [
    "**PACK** COMPLETO",
    "TODO **INCLUIDO**",
    "COMBO **ESPECIAL**",
    "KIT **COMPLETO**",
    "LLEVATE **TODO**",
  ],
  premium: [
    "CALIDAD **PREMIUM**",
    "EXPERIENCIA DE **LUJO**",
    "LO **MEJOR** EN SU CLASE",
    "DISEÑO **SUPERIOR**",
    "EXCELENCIA **TOTAL**",
  ],
  eco: [
    "**100%** SUSTENTABLE",
    "CUIDAMOS EL **PLANETA**",
    "ECO **FRIENDLY**",
    "NATURALEZA **PURA**",
    "VERDE POR **ELECCIÓN**",
  ],
  comfort: [
    "CONFORT **ABSOLUTO**",
    "COMODIDAD **EXTREMA**",
    "**BIENESTAR** TOTAL",
    "RELAX **GARANTIZADO**",
    "COMO UNA **NUBE**",
  ],
  performance: [
    "MÁXIMO **RENDIMIENTO**",
    "PERFORMANCE **EXTREMA**",
    "SUPERA **LÍMITES**",
    "POTENCIA **TOTAL**",
    "**PODER** SIN LÍMITES",
  ],
  minimal: [
    "**SIMPLE** Y PERFECTO",
    "MENOS ES **MÁS**",
    "ESENCIA **PURA**",
    "SIN **EXCESOS**",
    "SOLO LO **ESENCIAL**",
  ],
};

// ============================================================================
// POSICIONES DE TEXTO (variación de layout)
// ============================================================================

const TEXT_POSITIONS = [
  {
    id: "top-left",
    description: "Texto en esquina superior izquierda, alineado a la izquierda",
    instructions: "Place the hook text in the TOP LEFT corner of the image. Left-aligned text. Leave 7% margin from edges.",
  },
  {
    id: "top-center",
    description: "Texto centrado arriba",
    instructions: "Place the hook text at the TOP CENTER of the image. Center-aligned text. Leave 7% margin from top edge.",
  },
  {
    id: "center",
    description: "Texto centrado en el medio",
    instructions: "Place the hook text in the CENTER of the image. Center-aligned, vertically and horizontally centered.",
  },
  {
    id: "bottom-left",
    description: "Texto en esquina inferior izquierda",
    instructions: "Place the hook text in the BOTTOM LEFT corner. Left-aligned. Leave 7% margin from edges.",
  },
  {
    id: "diagonal",
    description: "Texto en diagonal desde esquina",
    instructions: "Place the hook text at a slight diagonal angle (10-15 degrees). Dynamic and bold positioning. Can be top-left to center or center to bottom-right.",
  },
] as const;

// ============================================================================
// ESTILOS DE ILUMINACIÓN NEÓN
// ============================================================================

const NEON_STYLES = [
  { id: "cyan", color: "bright cyan/turquoise neon glow", description: "Cyan neón brillante con halo azulado" },
  { id: "blue", color: "electric blue neon glow", description: "Azul eléctrico intenso" },
  { id: "magenta", color: "magenta/pink neon glow", description: "Magenta neón vibrante" },
  { id: "orange", color: "warm orange neon glow", description: "Naranja cálido con glow" },
  { id: "green", color: "neon green glow", description: "Verde neón brillante" },
] as const;

// ============================================================================
// CARGA DE REFERENCIAS DE ESTILO
// ============================================================================

const STYLE_REFERENCE_FILES = [
  "refIA1.webp",
  "refIA2.webp",
  "refIA4.webp",
  "refIA6.webp",
  "refIA3.webp",
];

function loadAllStyleReferences(): string[] {
  try {
    const publicDir = path.join(process.cwd(), "public", "style");
    const refs: string[] = [];
    
    for (const filename of STYLE_REFERENCE_FILES) {
      const filePath = path.join(publicDir, filename);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        refs.push(`data:image/webp;base64,${buffer.toString("base64")}`);
      }
    }
    
    if (refs.length === 0) {
      console.warn("No style reference images found in /public/style/");
    }
    
    return refs;
  } catch (err) {
    console.error("Error loading style references:", err);
    return [];
  }
}

let cachedStyleRefs: string[] | null = null;

function getStyleReferences(): string[] {
  if (!cachedStyleRefs) {
    cachedStyleRefs = loadAllStyleReferences();
  }
  return cachedStyleRefs;
}

function selectRandomReferences(count: number = 3): string[] {
  const all = getStyleReferences();
  if (all.length <= count) return all;
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================================
// UTILIDADES
// ============================================================================

function seededRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function selectFromArray<T>(array: T[], random: () => number): T {
  const index = Math.floor(random() * array.length);
  return array[index];
}

function findImageInResponse(obj: any): { kind: "data" | "url"; value: string } | null {
  if (!obj) return null;

  const isDataUrl = (s: string) => typeof s === "string" && /^data:image\/.+;base64,/.test(s);
  const isImageUrl = (s: string) => typeof s === "string" && /^https?:\/\/.+\.(png|jpg|jpeg)$/i.test(s);

  const recurse = (x: any): any => {
    if (!x) return null;
    if (typeof x === "string") {
      if (isDataUrl(x)) return { kind: "data", value: x };
      if (/^[A-Za-z0-9+/=\n\r]+$/.test(x) && x.length > 1000) return { kind: "data", value: `data:image/png;base64,${x}` };
      if (isImageUrl(x)) return { kind: "url", value: x };
      return null;
    }
    if (Array.isArray(x)) {
      for (const it of x) {
        const r = recurse(it);
        if (r) return r;
      }
      return null;
    }
    if (typeof x === "object") {
      const keys = ["image_url", "imageUrl", "image_base64", "b64", "base64", "result"];
      for (const k of keys) {
        if (x[k]) {
          const v = x[k];
          if (typeof v === "string") {
            if (isDataUrl(v)) return { kind: "data", value: v };
            if (/^[A-Za-z0-9+/=\n\r]+$/.test(v) && v.length > 1000) return { kind: "data", value: `data:image/png;base64,${v}` };
            if (isImageUrl(v)) return { kind: "url", value: v };
          }
          if (typeof v === "object" && (v.b64 || v.base64)) {
            const vb = v.b64 ?? v.base64;
            if (typeof vb === "string") return { kind: "data", value: `data:image/png;base64,${vb}` };
          }
        }
      }
      for (const val of Object.values(x)) {
        const r = recurse(val as any);
        if (r) return r;
      }
    }
    return null;
  };

  return recurse(obj);
}

// ============================================================================
// GENERACIÓN DE VARIANTE
// ============================================================================

interface HookVariant {
  hook: string;           // Hook completo (sin marcadores)
  glowWord: string;       // Palabra que debe brillar
  position: typeof TEXT_POSITIONS[number];
  neonStyle: typeof NEON_STYLES[number];
  angleId: string;
}

function generateHookVariant(angleId: string | undefined, seed: number): HookVariant {
  const random = seededRandom(seed * 54321 + 12345);
  
  // Validar y seleccionar ángulo
  const validAngleId = angleId && HOOKS_BY_ANGLE[angleId] ? angleId : META_ANGLES[seed % META_ANGLES.length];
  const hooks = HOOKS_BY_ANGLE[validAngleId] || FALLBACK_HOOKS;
  
  // Seleccionar hook con palabra marcada
  const rawHook = selectFromArray(hooks, random);
  
  // Extraer palabra iluminada (entre **)
  const glowMatch = rawHook.match(/\*\*([^*]+)\*\*/);
  const glowWord = glowMatch ? glowMatch[1] : "";
  const hook = rawHook.replace(/\*\*/g, ""); // Remover marcadores
  
  // Seleccionar posición y estilo neón
  const position = selectFromArray([...TEXT_POSITIONS], random);
  const neonStyle = selectFromArray([...NEON_STYLES], random);
  
  return {
    hook,
    glowWord,
    position,
    neonStyle,
    angleId: validAngleId,
  };
}

// ============================================================================
// CONSTRUCCIÓN DEL PROMPT
// ============================================================================

function buildPrompt(variant: HookVariant, aspectRatio: string, refCount: number): string {
  return `
You are editing a base image to create a HIGH-IMPACT THUMBNAIL for YouTube/Instagram ads.

## STYLE REFERENCES
You have ${refCount} reference images showing the EXACT visual style you must follow:
- Bold condensed sans-serif typography (like Bebas Neue, Anton, or Impact)
- Thick black outlines on white text for readability
- ONE word has a NEON GLOW effect
- Cinematic, dramatic look
- High contrast and extreme legibility
- Text naturally integrated with the scene

⚠️ DO NOT copy the text content from references - only the VISUAL STYLE.
⚠️ The ONLY text you must add is specified below.

## THE HOOK TO ADD (MANDATORY)

"${variant.hook}"

## NEON WORD (CRITICAL)

The word "${variant.glowWord}" MUST have:
- ${variant.neonStyle.color}
- Bright glow/halo effect around it
- This is the FOCAL POINT of the creative
- All other words remain WHITE with BLACK outline

## TEXT POSITION

${variant.position.instructions}

## TYPOGRAPHY RULES

- Font: Bold condensed sans-serif (Bebas Neue / Anton style)
- Main text: SOLID WHITE with THICK BLACK OUTLINE
- Glow word: ${variant.neonStyle.color} with bright halo
- Size: LARGE and IMPACTFUL (fills significant portion of safe area)
- Maximum 2 lines if needed
- Always UPPERCASE

## CRITICAL RULES

1. NEVER cover the face (especially eyes and mouth)
2. NEVER cover the main product
3. Respect 5-7% margin from all edges
4. If background is complex, add subtle dark vignette or plate for legibility
5. Text must INTEGRATE naturally with the scene lighting
6. NO subtitles, NO CTAs, NO additional text
7. ONLY the hook specified above

## OUTPUT

Return the edited image with the hook text added following all style guidelines.

Aspect ratio: ${aspectRatio}
`.trim();
}

// ============================================================================
// ENDPOINT
// ============================================================================

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const baseImageDataUrl = String(body?.baseImageDataUrl ?? "");
    const aspectRatio = String(body?.aspectRatio ?? "4:5");
    const variantIndex = Number(body?.variantIndex ?? Math.floor(Math.random() * 1000));
    const angleId = body?.angleId as string | undefined;
    const seed = body?.seed !== undefined ? Number(body.seed) : variantIndex;

    if (!baseImageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { ok: false, error: "baseImageDataUrl must be a valid data:image/* base64 URL" },
        { status: 400 }
      );
    }

    // Generar variante de hook
    const variant = generateHookVariant(angleId, seed);
    
    console.log(`[add-copy] Generating:`, {
      hook: variant.hook,
      glowWord: variant.glowWord,
      position: variant.position.id,
      neonStyle: variant.neonStyle.id,
      angleId: variant.angleId,
    });

    // Cargar referencias de estilo
    const selectedRefs = selectRandomReferences(4);
    const prompt = buildPrompt(variant, aspectRatio, selectedRefs.length);

    // Construir contenido multimodal
    const contentParts: any[] = [
      { type: "input_image", image_url: baseImageDataUrl, detail: "high" },
    ];

    for (const ref of selectedRefs) {
      contentParts.push({ type: "input_image", image_url: ref, detail: "high" });
    }

    contentParts.push({ type: "input_text", text: prompt });

    // Llamada al modelo
    const resp = await client.responses.create({
      model: IMAGE_MODEL,
      tools: [{ type: "image_generation" }],
      input: [{ role: "user", content: contentParts }],
    });

    // Extraer imagen resultante
    const found = findImageInResponse(resp);
    
    if (found) {
      let dataUrl = found.value;
      
      if (found.kind === "url") {
        const imgRes = await fetch(found.value);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const mime = imgRes.headers.get("content-type") ?? "image/png";
        dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
      }

      return NextResponse.json({
        ok: true,
        dataUrl,
        model: IMAGE_MODEL,
        variant: {
          hook: variant.hook,
          glowWord: variant.glowWord,
          position: variant.position.id,
          neonStyle: variant.neonStyle.id,
          angleId: variant.angleId,
        },
      });
    }

    console.error("add-copy: no image returned", JSON.stringify(resp, null, 2));
    return NextResponse.json({ ok: false, error: "No edited image returned by model" }, { status: 500 });
  } catch (err: any) {
    console.error("add-copy error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
