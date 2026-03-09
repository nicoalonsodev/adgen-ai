# Pipeline V2 — Documentación Técnica

> **Propósito:** Referencia completa del pipeline de generación creativa V2.
> Incluye el flujo paso a paso, archivos involucrados, y puntos de mejora para prompts y ejemplos.

---

## Índice

1. [Visión General](#1-visión-general)
2. [Flujo Completo (Diagrama)](#2-flujo-completo)
3. [Paso a Paso Detallado](#3-paso-a-paso-detallado)
   - [Step 0: Entrada y Strategic Core](#step-0-entrada-y-strategic-core)
   - [Step 1: Creative Brief (OpenAI)](#step-1-creative-brief-openai)
   - [Step 2: Gemini Prompts (función pura)](#step-2-gemini-prompts-función-pura)
   - [Step 3: Background (Gemini)](#step-3-background-gemini)
   - [Step 4: Scene / Persona (Gemini)](#step-4-scene--persona-gemini)
   - [Step 5: Copy + Renderizado Final](#step-5-copy--renderizado-final)
4. [Archivos del Pipeline](#4-archivos-del-pipeline)
5. [Puntos de Mejora](#5-puntos-de-mejora)
   - [5.1 Ejemplos de nutrición por vertical](#51-ejemplos-de-nutrición-por-vertical)
   - [5.2 Secuencias y patrones de escena](#52-secuencias-y-patrones-de-escena)
   - [5.3 Prompts de Gemini](#53-prompts-de-gemini)
   - [5.4 Category Background Prompts](#54-category-background-prompts)
   - [5.5 Strategic Core](#55-strategic-core)
6. [Debug Logging](#6-debug-logging)

---

## 1. Visión General

Pipeline V2 reemplaza al pipeline legacy (V1) para templates marcados con `pipelineV2: true`.

**Innovación clave:** Un LLM (OpenAI) genera un *Creative Brief* estructurado que actúa como **única fuente de verdad** para toda la generación visual. Esto garantiza coherencia entre background, persona, iluminación y copy.

**Modelo mental:**

```
   ADN de marca + Producto + Template
              ↓
     🧠 Creative Brief (OpenAI)     ← el "director de arte" del pipeline
              ↓
     📝 Prompts para Gemini          ← traducción pura, sin LLM
              ↓
     🖼️ Background (Gemini)         ← escena oscura sin persona
              ↓
     👤 Scene + Persona (Gemini)     ← persona compuesta sobre el background
              ↓
     ✍️ Copy overlay (template)      ← headline + texto sobre la imagen
```

---

## 2. Flujo Completo

```
POST /api/meta/v1/generate
│
├─ deriveStrategicCore (OpenAI gpt-4.1-mini)
│   → { coreBenefit, category, positioning, keyProof }
│
├─ [Si template.pipelineV2 === true]
│   │
│   ├─ composePipelineV2()                       ← ORQUESTADOR
│   │   │
│   │   ├─ Step 1: generateCreativeBrief()       ← OpenAI gpt-4.1-mini
│   │   │   ├─ System prompt: scene-orchestrator-instructions.md
│   │   │   ├─ + Template context (copyZone, hints, categoryBg)
│   │   │   ├─ User prompt: producto + core + ADN + oferta
│   │   │   └─ → CreativeBrief (validado con Zod)
│   │   │
│   │   ├─ Step 2: generateGeminiPrompts()       ← función pura (0ms)
│   │   │   ├─ brief.background_prompt → backgroundPrompt enriquecido
│   │   │   ├─ brief.person_prompt → personPrompt enriquecido
│   │   │   └─ → GeminiPrompts { backgroundPrompt, personPrompt }
│   │   │
│   │   ├─ Step 3: generateBackground()          ← Gemini 2.5 Flash
│   │   │   ├─ Input: backgroundPrompt + aspectRatio
│   │   │   └─ → Buffer PNG (fondo oscuro, sin persona)
│   │   │
│   │   └─ Step 4: generateScene()               ← Gemini 2.5 Flash
│   │       ├─ Input: backgroundBuffer + personPrompt + aspectRatio
│   │       ├─ [Solo si template.personScene === true]
│   │       └─ → Buffer PNG (escena final con persona)
│   │
│   └─ [En paralelo]
│       └─ generateExtendedCopyVariants()        ← OpenAI (copy de texto)
│           → headline, subheadline, sceneAction, etc.
│
└─ Template renderer → overlay copy sobre escena → Response
```

---

## 3. Paso a Paso Detallado

### Step 0: Entrada y Strategic Core

**Archivo:** `src/app/api/meta/v1/generate/route.ts`
**Función:** `deriveStrategicCore()` en `src/lib/ai/copyGenerator.ts`

| Campo | Descripción |
|-------|-------------|
| `coreBenefit` | Beneficio principal en frase corta |
| `category` | Categoría del producto (ej: `belleza-cosmetica`, `fitness-deporte`) |
| `positioning` | Diferenciación vs competencia |
| `keyProof` | Dato duro de respaldo (ej: "12 horas de duración") |

**Decisión V1 vs V2:**
```typescript
const usePipelineV2 = resolvedTemplateMeta?.pipelineV2 === true;
```

---

### Step 1: Creative Brief (OpenAI)

**Archivo:** `src/lib/meta/pipeline/v2/generateCreativeBrief.ts`
**Knowledge base:** `src/lib/meta/pipeline/v2/scene-orchestrator-instructions.md`
**Modelo:** `gpt-4.1-mini` | **Temperatura:** `0.4`

#### System Prompt (construido en `buildSystemPrompt()`)

Se compone de:
1. **`scene-orchestrator-instructions.md`** — el knowledge base completo del "director de arte"
2. **Template Context** — datos del template actual:
   - ID, nombre, descripción
   - `copyZone` (dónde va el texto: top, bottom, left, right, center, full)
   - `sceneFullBleed`, `personOnly`, `personScene`
   - `templateHint` (si existe)

#### User Prompt (construido en `buildUserPrompt()`)

Secciones inyectadas:
1. **PRODUCT:** nombre y descripción
2. **CORE BENEFIT / CATEGORY / POSITIONING / KEY PROOF**
3. **BRAND DNA:** nombre, rubro, propuesta de valor, cliente ideal, dolores, tono, colores
4. **ACTIVE OFFER:** tipo, valor, label
5. **TEMPLATE:** ID + copyZone constraint
6. **CATEGORY BACKGROUND REFERENCE:** prompt específico por categoría (de `categoryBackgroundPrompts`)
7. **VARIANT hint:** si `variantIndex > 0`, pide escena diferente

#### Output: `CreativeBrief` (validado con Zod)

| Campo | Constraints | Descripción |
|-------|-------------|-------------|
| `scene_description` | 30-800 chars | Descripción cinematográfica de la escena |
| `person_description` | 20-500 chars | Apariencia, pose, expresión de la persona |
| `lighting` | 10-250 chars | Dirección, calidad y temperatura de luz |
| `mood` | 2-30 chars | Estado emocional (ej: "quiet frustration") |
| `camera` | 5-200 chars | Lente, ángulo, profundidad de campo |
| `color_palette` | 5-200 chars | Tonos dominantes |
| `safe_zone_note` | 5-200 chars | Nota sobre zona libre para texto |
| `background_prompt` | 15-400 chars | Prompt directo para generar el background |
| `person_prompt` | 20-600 chars | Prompt directo para componer la persona |

---

### Step 2: Gemini Prompts (función pura)

**Archivo:** `src/lib/meta/pipeline/v2/generateBackgroundPrompt.ts`
**Función:** `generateGeminiPrompts(brief, templateId)`

No hace llamadas a API — transforma el brief en prompts listos para Gemini.

#### Background Prompt

Se construye así:
```
brief.background_prompt
+ "Photorealistic, cinematic, no people, no products, no text"
+ brief.color_palette
+ brief.lighting
+ "Dark tonal range: mean luminance 25-40%"
+ brief.safe_zone_note
```

#### Person Prompt

Se construye así:
```
"Edit this image by adding a photorealistic person to the scene"
+ brief.person_prompt
+ brief.lighting
+ brief.mood
+ brief.camera
+ ABSOLUTE_RULES_ANATOMY (dos brazos, dos manos)
+ ABSOLUTE_RULES_BACKGROUND (no modificar fondo existente)
+ "Person fills 60-80% of frame, face visible and expressive"
+ safe zone instructions
```

**Reglas absolutas** importadas de `src/lib/ai/promptRules.ts`:
- `ABSOLUTE_RULES_ANATOMY` — "EXACTLY two arms and two hands"
- `ABSOLUTE_RULES_BACKGROUND` — "Do NOT modify the background"

---

### Step 3: Background (Gemini)

**Archivo:** `src/lib/ai/gemini.ts`
**Función:** `generateBackground()`
**Modelo:** `gemini-2.5-flash-image`

| Parámetro | Valor |
|-----------|-------|
| Timeout | 80s por intento |
| Reintentos | hasta 3 |
| Concurrencia | máx 2 llamadas simultáneas (semáforo global) |
| Output | Buffer PNG |

El prompt se prefija con `"Generate an image:"` para forzar modo de generación de imagen.

---

### Step 4: Scene / Persona (Gemini)

**Archivo:** `src/lib/ai/gemini.ts`
**Función:** `generateScene()`
**Modelo:** `gemini-2.5-flash-image`

| Parámetro | Valor |
|-----------|-------|
| Input imagen | Background PNG comprimido a JPEG (~80-150KB) |
| Input texto | personPrompt |
| imageSize | "1K" |
| Timeout | 80s por intento |
| Reintentos | hasta 3 |

**Se ejecuta solo si** `templateMeta.requiresSceneGeneration && templateMeta.personScene`.
Si no se cumple, el background se usa como escena final.

---

### Step 5: Copy + Renderizado Final

**Archivo:** `src/lib/ai/copyGenerator.ts`
**Función:** `generateExtendedCopyVariants()`

Se ejecuta **en paralelo** con los Steps 1-4. Genera los textos que el template renderer superpone sobre la escena:
- `headline` — frase emocional principal
- `subheadline` — línea de beneficio
- `sceneAction` — descripción de acción (usado como contexto)
- `backgroundColorHint` — sugerencia de paleta de color

---

## 4. Archivos del Pipeline

| Archivo | Rol | Tipo |
|---------|-----|------|
| `v2/composePipelineV2.ts` | Orquestador principal | Función async |
| `v2/generateCreativeBrief.ts` | Genera el brief via OpenAI | LLM call |
| `v2/scene-orchestrator-instructions.md` | Knowledge base del director de arte | System prompt |
| `v2/generateBackgroundPrompt.ts` | Transforma brief → prompts Gemini | Función pura |
| `v2/debugLogger.ts` | Logging estructurado a /tmp | Utilidad |
| `v2/index.ts` | Barrel export | Re-exports |
| `src/lib/ai/gemini.ts` | Llamadas a Gemini API | LLM calls |
| `src/lib/ai/promptRules.ts` | Reglas absolutas compartidas | Constantes |
| `src/lib/ai/copyGenerator.ts` | Strategic core + copy variants | LLM call |
| `src/services/product-composer/templates/meta.ts` | Metadata de templates | Config |
| `src/app/api/meta/v1/generate/route.ts` | Entry point HTTP | API Route |

---

## 5. Puntos de Mejora

### 5.1 Ejemplos de nutrición por vertical

**Archivo a editar:** `scene-orchestrator-instructions.md`
**Sección:** `SCENE PATTERNS BY VERTICAL`

Actualmente hay 5 verticales con ejemplos:
- Belleza/Cosmética
- Fitness/Deporte
- Servicios Profesionales
- Salud/Bienestar
- Alimentación

**Mejoras posibles:**

| Acción | Detalle |
|--------|---------|
| **Agregar verticales faltantes** | `tecnologia`, `educacion`, `hogar`, `mascotas`, `moda` no tienen patrones de escena |
| **Enriquecer ejemplos existentes** | Cada vertical solo tiene 1 ejemplo de setting/persona/pose — agregar 2-3 variantes para mayor diversidad |
| **Agregar few-shot examples** | Incluir 1-2 JSONs completos de ejemplo por vertical para que el LLM entienda el formato esperado |
| **Props y elementos de contexto** | La sección actual dice "no props" globalmente — algunos verticales se beneficiarían de props sutiles (ej: toalla en fitness, laptop en tech) |
| **Expresiones emocionales** | Expandir el vocabulario de `mood` por vertical — actualmente solo 1 mood por vertical |

**Ejemplo de mejora:**
```markdown
### Tecnología
- **Settings:** Dark home office with monitor glow, minimalist desk with single lamp,
  co-working space at night with ambient LED strips
- **Person archetypes:** Professional 28-45, casual-formal attire, focused expression
- **Poses:** Leaning forward engaged, hand on chin thinking, looking up from screen
- **Lighting:** Cool blue-white monitor spill + warm desk lamp, split lighting
- **Moods:** "digital overwhelm", "focused flow", "late-night grind"
```

---

### 5.2 Secuencias y patrones de escena

**Archivo a editar:** `scene-orchestrator-instructions.md`
**Sección:** `COMPOSITION RULES` y nueva sección `SCENE SEQUENCES`

**Mejoras posibles:**

| Acción | Detalle |
|--------|---------|
| **Variant sequences** | Definir secuencias coherentes para múltiples variantes (ej: variant 0 = "el problema", variant 1 = "el momento de cambio", variant 2 = "la transformación") |
| **Escenas por objetivo** | Diferenciar escenas para awareness vs. conversión vs. retargeting |
| **Patrones de cámara** | Agregar combinaciones testadas: close-up + bokeh para urgencia, medium shot + environment para aspiracional |
| **Guía de copyZone** | Ejemplos visuales de cómo la posición de la persona cambia según cada copyZone (top, bottom, left, right) |

**Ejemplo de mejora para variantes:**
```markdown
### VARIANT SEQUENCE PATTERNS

When generating multiple variants for the same product:

- **Variant 0 (default):** "The pain point" — person experiencing the problem,
  frustration or discomfort visible, environment suggests daily life
- **Variant 1:** "The turning point" — same emotional register but different angle,
  person in a moment of decision or realization, slightly different lighting
- **Variant 2:** "The aspiration" — person in a better state, subtle hope,
  warmer color temperature shift, more open body language
```

---

### 5.3 Prompts de Gemini

**Archivo a editar:** `v2/generateBackgroundPrompt.ts`

**Mejoras posibles:**

| Acción | Detalle |
|--------|---------|
| **Negative prompts explícitos** | Agregar lista de exclusiones: "no text overlays, no watermarks, no borders, no split screens, no collages" |
| **Estilo fotográfico** | Especificar referencia de estilo: "editorial photography style, Hasselblad quality" |
| **Resolución y detalle** | Agregar "8K detail, sharp focus on subject, professional color grading" |
| **Persona prompt: anatomía** | Reforzar reglas de anatomía con ejemplos negativos específicos: "no extra fingers, no merged limbs" |
| **Persona prompt: integración lumínica** | Agregar instrucciones explícitas de matching de temperatura de color con el background pre-generado |
| **Persona prompt: escala y posición** | Parametrizar el "60-80% frame" según copyZone — top copyZone podría necesitar persona más abajo |

**Ejemplo de mejora para background prompt:**
```typescript
// Agregar al final del backgroundPrompt:
const negativeConstraints = [
  "Absolutely no text, watermarks, logos, or UI elements.",
  "No split-screen or collage compositions.",
  "Single continuous environment, edge-to-edge.",
  "Editorial photography quality, Hasselblad-like rendering.",
].join(" ");
```

---

### 5.4 Category Background Prompts

**Archivo a editar:** `src/services/product-composer/templates/meta.ts`
**Propiedad:** `categoryBackgroundPrompts` en cada template

**Estado actual (bebas-urgencia-top):**

| Categoría | Tiene prompt | Calidad |
|-----------|:------------:|---------|
| `belleza-cosmetica` | ✅ | Básico — "Minimalist dark studio" |
| `fitness-deporte` | ✅ | Básico — "Dark gym with spotlights" |
| `servicios-profesionales` | ✅ | Básico — "Dark office with desk lamp" |
| `tecnologia` | ✅ | Básico — "Dark studio with blue-tinted light" |
| `salud-bienestar` | ✅ | Básico — "Dark spa with candle light" |
| `alimentacion` | ❌ | Sin prompt |
| `educacion` | ❌ | Sin prompt |
| `hogar` | ❌ | Sin prompt |
| `moda` | ❌ | Sin prompt |
| `mascotas` | ❌ | Sin prompt |

**Mejoras posibles:**

| Acción | Detalle |
|--------|---------|
| **Completar categorías faltantes** | Agregar prompts para alimentación, educación, hogar, moda, mascotas |
| **Enriquecer prompts existentes** | Los actuales son muy genéricos (1 línea). Expandir a 2-3 líneas con detalles de textura, materiales, iluminación específica |
| **Variantes de background por categoría** | Array de prompts en vez de string, para que el pipeline pueda rotar |

**Ejemplo de mejora:**
```typescript
categoryBackgroundPrompts: {
  "belleza-cosmetica":
    "Minimalist dark vanity room with marble countertop, warm amber side light " +
    "casting soft shadows, blurred mirror reflection in background, " +
    "matte black walls with subtle texture, single warm spotlight from upper left",

  "alimentacion":
    "Dark modern kitchen interior, polished dark granite counter, " +
    "warm pendant light casting pool of light, steam wisps visible in air, " +
    "dark wood cabinets blurred in background, moody food-photography atmosphere",
}
```

---

### 5.5 Strategic Core

**Archivo a editar:** `src/lib/ai/copyGenerator.ts`
**Función:** `deriveStrategicCore()`

**Mejoras posibles:**

| Acción | Detalle |
|--------|---------|
| **Inyectar ADN del negocio** | Actualmente solo recibe `productName` y `productDescription` — agregar `businessProfile` para que el core benefit refleje la propuesta de valor de la marca |
| **Categorías estandarizadas** | El LLM puede inventar categorías — agregar enum/lista de categorías válidas para matchear con `categoryBackgroundPrompts` |
| **Few-shot examples** | Agregar ejemplos en el prompt de derivación para mejorar consistencia |
| **Fallback robusto** | El fallback actual es muy genérico — mejorar con heurísticas basadas en keywords del nombre del producto |

---

## 6. Debug Logging

**Archivo:** `v2/debugLogger.ts`
**Activación:** `DEBUG_PIPELINE_V2=true`

Cada ejecución genera un directorio con estos archivos:

```
/tmp/pipeline-v2-debug/
  2026-03-09T14-30-00_crema-hidratante/
    00_pipeline_input.json            ← Input completo del pipeline
    01_brief_input.json               ← Input a OpenAI
    01_brief_system_prompt.txt        ← System prompt completo
    01_brief_user_prompt.txt          ← User prompt completo
    01_brief_raw_response.json        ← Respuesta cruda del LLM
    01_brief_output.json              ← Brief validado
    01_brief_usage.json               ← Tokens, modelo, finish_reason
    01_brief_validation_errors.json   ← (solo si falla validación)
    02_gemini_prompts.json            ← Prompts generados para Gemini
    02_background_prompt.txt          ← Background prompt (texto plano)
    02_person_prompt.txt              ← Person prompt (texto plano)
    03_background_result.json         ← Timing y tamaño del background
    04_scene_result.json              ← Timing y tamaño de la escena
    05_summary.json                   ← Resumen con brief, timing, tamaños
```

### Uso para análisis de prompts

```bash
# Activar debug
DEBUG_PIPELINE_V2=true npm run dev

# Ver el último run
ls -t /tmp/pipeline-v2-debug/ | head -1

# Comparar system prompts entre runs
diff /tmp/pipeline-v2-debug/run1/01_brief_system_prompt.txt \
     /tmp/pipeline-v2-debug/run2/01_brief_system_prompt.txt

# Ver tokens consumidos
cat /tmp/pipeline-v2-debug/*/01_brief_usage.json | jq '.usage'

# Ver todos los moods generados
cat /tmp/pipeline-v2-debug/*/05_summary.json | jq '.brief.mood'
```

---

## Apéndice: Template V2 Actual

Actualmente solo **1 template** usa Pipeline V2:

**`bebas-urgencia-top`**
- Copy zone: `top`
- Escena: full-bleed con persona
- Sin producto visible (vende el dolor, no la solución)
- Categorías soportadas: belleza, fitness, servicios profesionales, tecnología, salud

Para agregar un nuevo template al Pipeline V2, setear `pipelineV2: true` en su metadata en `src/services/product-composer/templates/meta.ts`.
