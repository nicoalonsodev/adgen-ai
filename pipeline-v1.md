# Pipeline V1 — Generación de Creativos (Templates sin `pipelineV2`)

> Documentación completa del flujo de generación de creativos para templates que **NO** tienen `pipelineV2: true`.
> Cubre desde el frontend (Fábrica de Contenido) hasta cada función de backend involucrada.

---

## Índice

1. [Visión General](#1-visión-general)
2. [Archivos Involucrados](#2-archivos-involucrados)
3. [Diagrama de Flujo](#3-diagrama-de-flujo)
4. [FASE 1 — GENERATE_COPY (Generación de Textos)](#4-fase-1--generate_copy)
5. [FASE 2 — GENERATE_BACKGROUND (Fondo Visual)](#5-fase-2--generate_background)
6. [FASE 3 — TEMPLATE_BETA (Renderizado de Texto)](#6-fase-3--template_beta)
7. [FASE 4 — PRODUCT_IA (Composición de Producto/Escena)](#7-fase-4--product_ia)
8. [Flujos del Frontend](#8-flujos-del-frontend)
9. [Metadata de Templates](#9-metadata-de-templates)
10. [Tabla de Funciones](#10-tabla-de-funciones)

---

## 1. Visión General

El Pipeline V1 genera creativos publicitarios en **4 fases secuenciales**, cada una implementada como un `mode` distinto en `/api/compose`:

```
GENERATE_COPY → GENERATE_BACKGROUND → TEMPLATE_BETA → PRODUCT_IA (opcional)
     │                  │                    │                │
   Gemini            Gemini              Sharp/Canvas       Gemini Vision
  (2.5-flash)     (2.5-flash-image)    (text rendering)   (composición)
```

Cada fase produce un artefacto que alimenta a la siguiente:

| Fase | Input | Output | Modelo |
|------|-------|--------|--------|
| **GENERATE_COPY** | Producto, marca, template | JSON con textos + prompts | Gemini 2.5 Flash |
| **GENERATE_BACKGROUND** | Prompt de fondo | PNG 1024×1024 (fondo limpio) | Gemini 2.5 Flash Image |
| **TEMPLATE_BETA** | Fondo + textos + logo | PNG 1080×1080 (fondo con texto) | Sharp + Canvas (local) |
| **PRODUCT_IA** | Imagen con texto + producto/avatar | PNG 1080×1080 (creativo final) | Gemini 2.5 Flash Image (Vision) |

---

## 2. Archivos Involucrados

### Frontend
| Archivo | Rol |
|---------|-----|
| `src/app/dashboard/fabrica-de-contenido/page.tsx` | Orquestador principal. Ejecuta las 4 fases en secuencia, construye prompts de background, decide qué flujo de PRODUCT_IA usar. |
| `src/components/PromptsPanel.tsx` | Panel de debugging. Muestra input/output de cada LLM call. |

### API Route
| Archivo | Rol |
|---------|-----|
| `src/app/api/compose/route.ts` | Router central. Recibe `mode` y despacha a la función correspondiente. Maneja GENERATE_COPY, GENERATE_BACKGROUND, TEMPLATE_BETA, PRODUCT_IA y otros. |

### Generación de Copy (Fase 1)
| Archivo | Rol |
|---------|-----|
| `src/lib/ai/gemini.ts` | `generateTemplateCopyGemini()` — genera copy con Gemini 2.5 Flash. Construye prompt unificado con reglas de campo, inyecta contexto de marca (brandContextBlock), template (templateContextBlock) y dirección visual (templateVisualDirectionBlock). Genera `scenePrompt` y `sceneAction` usando ejemplos filtrados por categoría de `scenesLibrary.md`. |
| `src/lib/ai/promptLibrary.ts` | Carga las prompt libraries (.md). Exporta `getSceneLibrarySection()` para filtrar escenas por categoría y `getLibrarySection()` para person-product. |
| `src/lib/ai/prompt-library/scenesLibrary.md` | Biblioteca de escenas completas (background + persona + producto) organizadas por 13 categorías de negocio y 55+ ángulos publicitarios. Usada como few-shot examples tanto para `scenePrompt` como para `sceneAction`. Incluye guía de adaptación por tono. |

### Generación de Fondo (Fase 2)
| Archivo | Rol |
|---------|-----|
| `src/lib/ai/gemini.ts` | `generateBackground()` — llama a Gemini 2.5 Flash Image para generar fondo. Retry x3 si safety filter bloquea. |

### Renderizado de Texto (Fase 3)
| Archivo | Rol |
|---------|-----|
| `src/services/product-composer/composeWithTemplateBeta.ts` | Orquesta: normaliza fondo → buildLayout → renderText → logo overlay. |
| `src/services/product-composer/templates/index.ts` | `getTemplate(id)` — retorna la definición del template con su función `buildLayout()`. |
| `src/services/product-composer/templates/meta.ts` | `getTemplateMeta(id)` — retorna metadata del template (copySchema, copyZone, flags, prompts). |
| `src/lib/render/textRenderer.ts` | `renderTextOnImage()` — renderiza cada campo de texto sobre la imagen usando Sharp + resvg (SVG → PNG). |

### Composición de Producto/Escena (Fase 4)
| Archivo | Rol |
|---------|-----|
| `src/services/product-composer/composeWithProductIA.ts` | Router interno. Decide qué sub-modo de composición usar según los flags del template y archivos disponibles. |
| `src/lib/ai/gemini.ts` | `nanoBananaInjectProduct()` — inyecta producto sobre imagen. `generateScene()` — genera persona en escena. `generateSceneWithAvatarAndProduct()` — compone avatar + producto + fondo. |

---

## 3. Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    page.tsx (handleGenerate)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ FASE 1: fetch("/api/compose", {mode: "GENERATE_COPY"})      │   │
│  │   → route.ts → generateTemplateCopyGemini() [gemini.ts]     │   │
│  │   → (opcional) generateImageBriefGemini() [promptLibrary.ts]│   │
│  │   ← copy = {headline, subheadline, badge, productPrompt...} │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │ FASE 2: fetch("/api/compose", {mode: "GENERATE_BACKGROUND"})│   │
│  │   → route.ts → generateBackground() [gemini.ts]             │   │
│  │   ← bgDataUrl = "data:image/png;base64,..."                 │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│                    ┌────────┴────────┐                              │
│                    │ ¿sceneWithProduct│                              │
│                    │  + avatarFile?   │                              │
│                    └───┬─────────┬───┘                              │
│                   SÍ   │         │  NO                              │
│                        │         │                                  │
│  ┌─────────────────────▼──┐  ┌───▼──────────────────────────────┐  │
│  │ ORDEN NUEVA:           │  │ ORDEN ORIGINAL:                  │  │
│  │                        │  │                                  │  │
│  │ FASE 3a: PRODUCT_IA    │  │ FASE 3a: TEMPLATE_BETA          │  │
│  │  (fondo limpio + avatar│  │  (fondo limpio + textos → imagen │  │
│  │   + producto → escena) │  │   con texto renderizado)        │  │
│  │                        │  │                                  │  │
│  │ FASE 3b: TEMPLATE_BETA │  │ FASE 3b: PRODUCT_IA (opcional)  │  │
│  │  (escena + textos →    │  │  (imagen con texto + producto   │  │
│  │   creativo final)      │  │   → creativo final)             │  │
│  └────────────────────────┘  └──────────────────────────────────┘  │
│                                                                     │
│  ← resultImage (PNG 1080×1080 final)                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. FASE 1 — GENERATE_COPY

### 4.1 Frontend → API

`page.tsx` envía:

```typescript
fetch("/api/compose", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "GENERATE_COPY",
    templateId: "classic-editorial-right",
    product: "DERMA Lisse Reafirmante",
    offer: "60% OFF en segunda unidad",
    targetAudience: "Mujeres 30-50 años",
    problem: "Pérdida de firmeza y elasticidad",
    tone: "emocional",
    templateSchema: ["title", "headline", "subheadline", "badge", "bullets", "backgroundColorHint"],
    templateHint: "...",                         // De meta.ts
    copyZone: "right",                           // De meta.ts
    rawProductPrompt: true,                      // De meta.ts (si aplica)
    personOnly: false,                           // De meta.ts
    numberOfVariants: 1,                         // 1 para single, N para angles
    businessProfile: {                           // Perfil de marca del usuario
      nombre: "DERMA Lisse",
      rubro: "Cosmética",
      category: "belleza-cosmetica",
      propuestaValor: "Cremas premium sin químicos",
      diferenciacion: "Ingredientes naturales",
      clienteIdeal: "Mujeres conscientes de su piel",
      dolores: ["Envejecimiento prematuro"],
      motivaciones: ["Verse más joven"],
      tono: "emocional",
      coloresMarca: ["#D4A5A5", "#F5B5C4"]
    },
    referenceStyle: "...",                       // Análisis de referencia (si hay)
    backgroundStyleGuide: "...",                 // categoryBackgroundPrompts o default
    sorteoData: null                             // Datos de sorteo (si aplica)
  })
})
```

### 4.2 route.ts → Procesamiento

```typescript
// route.ts — handler GENERATE_COPY

// 1. Separar schema: campos de copy vs campos de imagen
const IMAGE_BRIEF_FIELDS = ["productPrompt"];
const fullSchema = body.templateSchema ?? [];
const skipImageBrief = body.rawProductPrompt === true ||
  (fullSchema.includes("backgroundPrompt") && fullSchema.includes("productPrompt"));

const imageBriefFields = skipImageBrief ? [] : fullSchema.filter(f => IMAGE_BRIEF_FIELDS.includes(f));
const copyOnlySchema = fullSchema.filter(f => !IMAGE_BRIEF_FIELDS.includes(f));

// 2. Resolver metadata del template
const copyTemplateMeta = body.templateId ? getTemplateMeta(body.templateId) : undefined;

// 3. Ejecutar en paralelo: Copy (Gemini) + Image Brief (Gemini, opcional)
const [copyResult, imagePrompt] = await Promise.all([
  generateTemplateCopyGemini({
    product, offer, targetAudience, problem, tone,
    templateSchema: imageBriefFields.length > 0 ? copyOnlySchema : fullSchema,
    numberOfVariants: body.numberOfVariants ?? 1,
    templateHint,
    businessProfile,          // ← contexto de marca
    template: copyTemplateMeta,  // ← metadata del template (incluye defaultBackgroundPrompt y defaultProductPrompt)
    referenceStyle,
    backgroundStyleGuide,
  }),
  imageBriefFields.length > 0
    ? generateImageBriefGemini({ product, tone, copyZone, ... })
    : Promise.resolve(null)
]);

// 4. Merge image brief fields si Gemini generó productPrompt
let result = copyResult;
if (imagePrompt && imageBriefFields.length > 0) {
  const briefPatch = Object.fromEntries(imageBriefFields.map(f => [f, imagePrompt]));
  result = Array.isArray(result)
    ? result.map(v => ({ ...v, ...briefPatch }))
    : { ...result, ...briefPatch };
}

// 5. Expandir sceneAction con Gemini (si aplica)
if (fullSchema.includes("sceneAction") && !Array.isArray(result) && result.sceneAction) {
  result = await expandSceneBrief({ ...result });
}

return { copy: result, promptUsed, imageBriefLog };
```

### 4.3 generateTemplateCopyGemini() — gemini.ts

**Modelo:** `gemini-2.5-flash`

**Prompt construction:**

1. **System prompt** — Copywriter experto con 40+ tipos de hook, fórmula de dolor, interest gaps
2. **Field rules** — Reglas por campo según el `templateSchema`:
   - `title`: 3-5 keywords separadas por " · ", max 50 chars
   - `headline`: max 6 palabras, emocional, termina con punto
   - `subheadline`: 1-2 oraciones, max 120 chars, beneficio
   - `badge`: pill de oferta, max 35 chars
   - `bullets`: array de 3 items con emoji, max 40 chars c/u
   - `productPrompt`: brief creativo para persona + producto
   - `primaryColor`: hex code inferido del rubro
   - `backgroundColorHint`: paleta de color pálido
   - `sceneAction`: descripción cinemática de escena (max 80 palabras, expandida por Gemini 2.0 Flash via `expandSceneBrief()`). Usa ejemplos filtrados por categoría de `scenesLibrary.md` como inspiración. DEBE respetar el TEMPLATE VISUAL DIRECTION como constraint duro (posicionamiento, si mostrar producto o no, tonos). Si `defaultProductPrompt` dice "Do NOT show any product", la persona NO puede interactuar con ningún producto.
   - `scenePrompt`: (**NUEVO**) escena completa en inglés que combina background + persona + producto en una narrativa visual cohesiva. Max 120 palabras. Usa ejemplos filtrados por categoría de `scenesLibrary.md` como inspiración creativa. Siempre termina con instrucción de posicionamiento derecho.
3. **Scenes library block** (condicional) — Si `scenePrompt` O `sceneAction` están en el schema Y existe `businessProfile.category`, inyecta los ejemplos de escena filtrados por categoría vía `getSceneLibrarySection(category)`. La IA los usa como inspiración creativa, adaptando al producto y ángulo específico. La biblioteca cubre 13 categorías (Belleza, Salud, Fitness, Alimentos, Tecnología, Mascotas, Moda, Hogar, Joyería, Educación, Servicios, Bebés & Maternidad, Automotriz) con 55+ ángulos y una guía de adaptación por 10 tonos publicitarios.
4. **Brand context block** — Inyecta negocio: nombre, rubro, propuesta de valor, dolores, tono, etc.
5. **Template context block** — Inyecta template: nombre, copyZone, copySchema, sceneFullBleed, etc.
6. **Template visual direction block** (condicional) — Si el template tiene `defaultBackgroundPrompt` y/o `defaultProductPrompt` en meta.ts, los inyecta como REFERENCIA PRIORITARIA para que `scenePrompt`, `backgroundPrompt` y `sceneAction` sean coherentes con la dirección visual del template (ej: si el fondo es minimalista con tonos apagados, la escena respeta eso).
7. **Background style guide** — Guía visual para `backgroundPrompt`
8. **Reference style** — Estilo de referencia creativa (si existe)

**Output (single variant):**
```json
{
  "title": "Colágeno · Ácido Hialurónico · Vitamina C",
  "headline": "La piel habla cuando la cuidás.",
  "subheadline": "Recupera la firmeza que siempre quisiste.",
  "badge": "60% OFF en segunda",
  "bullets": ["💧 Volumizante en 7 días", "✨ Efecto tensor visible", "🛡️ Protección 24/7"],
  "productPrompt": "Edit the image adding a photorealistic human hand...",
  "primaryColor": "#D4A5A5",
  "backgroundColorHint": "tonos beige rosado muy claro",
  "scenePrompt": "Soft-lit vanity room with warm ambient glow from a ring light. A woman in her mid-30s with dewy skin, wearing a silk robe, gently pressing a cream jar against her cheek with a serene, confident smile. The cream jar sits on a marble countertop surrounded by fresh roses. Warm peach and ivory tones dominate. Medium close-up, slight depth of field. Subject and product on right side only. Left half must remain completely clean for pre-rendered text."
}
```

**Output (múltiples variantes — angles):**
```json
{
  "variants": [
    { "headline": "Ángulo Emocional...", "sceneAction": "Kitchen: person hands...", "scenePrompt": "Warm kitchen with morning light...", ... },
    { "headline": "Ángulo Problema...", "sceneAction": "Bathroom: person mirror...", "scenePrompt": "Harsh fluorescent bathroom...", ... },
    { "headline": "Ángulo Urgencia...", "sceneAction": "Gym: athlete bench...", "scenePrompt": "Industrial gym at dawn...", ... }
  ]
}
```

---

## 5. FASE 2 — GENERATE_BACKGROUND

### 5.1 Resolución del Prompt de Fondo

`page.tsx` resuelve el prompt de fondo con esta prioridad:

```typescript
function resolveBgPrompt(templateMeta, copy, businessProfile, colorMode?) {
  // 1. Dark mode → prompt oscuro dedicado
  if (colorMode === "dark" && templateMeta.darkBackgroundPrompt)
    return templateMeta.darkBackgroundPrompt;

  // 2. Prompt base: category-specific o default del template
  const basePrompt =
    (businessProfile?.category && templateMeta?.categoryBackgroundPrompts?.[businessProfile.category])
    ?? templateMeta?.defaultBackgroundPrompt
    ?? "Fondo minimalista neutro...";

  // 3. rawBackgroundPrompt → usar tal cual, sin modificar
  if (templateMeta?.rawBackgroundPrompt) return basePrompt;

  // 4. Copy generó backgroundPrompt → usarlo
  if (copy?.backgroundPrompt) return copy.backgroundPrompt;

  // 5. Copy generó backgroundColorHint → parchear sobre el base
  if (copy?.backgroundColorHint)
    return `${basePrompt}\n\nCOLOR ADJUSTMENT: "${copy.backgroundColorHint}" as dominant tone...`;

  return basePrompt;
}
```

### 5.2 Frontend → API

```typescript
fetch("/api/compose", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "GENERATE_BACKGROUND",
    prompt: bgPrompt,        // Resuelto arriba
    aspectRatio: "1:1"
  })
})
```

### 5.3 generateBackground() — gemini.ts

**Modelo:** `gemini-2.5-flash-image`

```typescript
async function generateBackground({ prompt, aspectRatio }) {
  const fullPrompt = `Generate an image: ${prompt}`;

  const response = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      imageConfig: {
        aspectRatio: aspectRatio,  // "1:1"
        imageSize: "1K"            // 1024×1024
      },
      responseModalities: ["IMAGE"]
    }
  });

  // Retry x3 si safety filter bloquea (no devuelve imagen)
  // Extraer imagen de response.candidates[0].content.parts[].inlineData.data
  return buffer;  // PNG 1024×1024
}
```

**Output:** `data:image/png;base64,...` — fondo limpio sin texto ni personas.

---

## 6. FASE 3 — TEMPLATE_BETA

### 6.1 Frontend → API

```typescript
const fd = new FormData();
fd.append("background", bgFile);                      // PNG del fondo generado
fd.append("logoBase64", businessLogo.base64);           // Logo principal
fd.append("logoMimeType", businessLogo.mimeType);
fd.append("logoDarkBase64", businessLogoDark.base64);   // Logo para fondo claro
fd.append("logoLightBase64", businessLogoLight.base64); // Logo para fondo oscuro
fd.append("config", JSON.stringify({
  mode: "TEMPLATE_BETA",
  outputFormat: "png",
  quality: 95,
  copy: {
    cta: copy.title,
    headline: copy.headline,
    subheadline: copy.subheadline,
    badge: copy.badge,
    bullets: copy.bullets,
    primaryColor: copy.primaryColor,
    brandColors: businessProfile?.coloresMarca,
    colorMode: "light"  // o "dark"
  },
  templateBetaOptions: {
    templateId: "classic-editorial-right",
    canvas: { width: 1080, height: 1080 },
    includeLayoutSpec: true
  }
}));

fetch("/api/compose", { method: "POST", body: fd });
```

### 6.2 composeWithTemplateBeta() — composeWithTemplateBeta.ts

**Proceso paso a paso:**

```
Background PNG (1024×1024)
    │
    ▼
[1] sharp.resize(1080, 1080, {fit: "cover"})    → Normalizar a 1080×1080
    │
    ▼
[2] getTemplate(templateId).buildLayout(copy)   → Generar layout spec
    │                                              (posiciones x, y, width, height,
    │                                               fontSize, fontWeight, color, etc.
    │                                               para cada campo de texto)
    ▼
[3] renderTextOnImage(bgNormalized, layout)      → Renderizar texto sobre imagen
    │                                              (SVG → PNG via resvg, composited
    │                                               con sharp)
    ▼
[4] Logo overlay (si aplica)                     → Seleccionar variante de logo
    │                                              según colorMode, redimensionar
    │                                              a max 18% width × 8% height,
    │                                              posicionar según meta.logoPosition
    ▼
PNG 1080×1080 con texto + logo renderizado
```

**buildLayout() — templates/index.ts**

Cada template tiene su propia función `buildLayout()` que genera un layout spec:

```typescript
// Ejemplo de layout spec para "classic-editorial-right"
{
  title: {
    text: "Colágeno · Ácido Hialurónico · Vitamina C",
    x: 580, y: 150, width: 440, height: 80,
    fontSize: 28, fontWeight: "bold", color: "#333",
    textAlign: "left", maxLines: 1
  },
  headline: {
    text: "La piel habla cuando la cuidás.",
    x: 580, y: 260, width: 440, height: 200,
    fontSize: 48, fontWeight: "700", color: "#000",
    textAlign: "left", lineHeight: 1.3
  },
  subheadline: {
    text: "Recupera la firmeza...",
    x: 580, y: 480, width: 440, height: 100,
    fontSize: 22, color: "#555", textAlign: "left"
  },
  badge: {
    text: "60% OFF en segunda",
    x: 580, y: 920, width: 200, height: 50,
    fontSize: 18, color: "#fff", backgroundColor: "#D4A5A5",
    borderRadius: 25, textAlign: "center"
  },
  bullets: {
    items: ["💧 Volumizante...", "✨ Efecto...", "🛡️ Protección..."],
    x: 580, y: 620, width: 440, itemHeight: 40,
    fontSize: 18, color: "#444", textAlign: "left"
  }
}
```

**renderTextOnImage() — textRenderer.ts**

- Itera sobre cada campo del layout
- Para cada campo, genera un SVG con el texto estilizado
- Convierte SVG → PNG usando `resvg-js`
- Compone cada capa PNG sobre la imagen base usando `sharp.composite()`

**Logo overlay:**

```typescript
// Selección de variante de logo
const selectedLogo =
  colorMode === "dark"  ? (logoLightBase64 ?? logoBase64) :
  colorMode === "light" ? (logoDarkBase64 ?? logoBase64) :
                          (logoDarkBase64 ?? logoLightBase64 ?? logoBase64);

// Redimensionar: max 18% del ancho, max 8% del alto
const logoMaxW = Math.round(1080 * 0.18);  // ~194px
const logoMaxH = Math.round(1080 * 0.08);  // ~86px
const resizedLogo = await sharp(logoBuffer)
  .resize(logoMaxW, logoMaxH, { fit: "inside", withoutEnlargement: true })
  .png().toBuffer();

// Posicionar: 4% padding desde el borde
const logoPadding = Math.round(1080 * 0.04);  // ~43px
const logoLeft = meta?.logoPosition === "center"
  ? Math.round((1080 - logoW) / 2)
  : logoPadding;

// Composite
finalBuffer = await sharp(finalBuffer)
  .composite([{ input: resizedLogo, left: logoLeft, top: logoPadding }])
  .png().toBuffer();
```

### 6.3 Output

```json
{
  "success": true,
  "data": {
    "image": "data:image/png;base64,...",
    "layoutSpec": { /* posiciones de cada campo */ },
    "templateId": "classic-editorial-right",
    "timings": { "total": 2150, "renderText": 890 }
  }
}
```

---

## 7. FASE 4 — PRODUCT_IA

### 7.1 Decisión de Flujo

`page.tsx` decide qué flujo de PRODUCT_IA usar según los flags del template y archivos disponibles:

```
                        ¿Template necesita escena/producto?
                     (templateNeedsSceneOrProduct(id) === true)
                               │
                         SÍ    │    NO
                               │     └──→ FIN (creativo = resultado de TEMPLATE_BETA)
                               │
                    ┌──────────┴──────────┐
                    │  ¿sceneWithProduct   │
                    │   + avatarFile?      │
                    └────┬───────────┬─────┘
                    SÍ   │           │  NO
                         │           │
                   FLUJO A      ┌────┴────────────┐
               (Avatar+Prod)   │ ¿requiresScene   │
                               │  + avatarFile?    │
                               └──┬──────────┬────┘
                              SÍ  │          │  NO
                                  │          │
                            FLUJO B    ┌─────┴─────────┐
                         (Avatar as    │ ¿requiresScene │
                          Scene)       │  sin avatar?   │
                                       └──┬────────┬───┘
                                      SÍ  │        │  NO
                                          │        │
                                    FLUJO C    FLUJO D
                                  (Scene puro) (Producto puro)
```

### 7.2 Flujo A — `avatarSceneWithProduct`

**Cuándo:** `meta.sceneWithProduct === true` Y el usuario subió un avatar.

**Orden:** PRODUCT_IA (fondo limpio) → TEMPLATE_BETA (escena + textos)

```typescript
// page.tsx — Flujo A
const productRes = await fetch("/api/compose", {
  method: "POST",
  body: formData({
    mode: "PRODUCT_IA",
    background: bgFile,             // Fondo LIMPIO (sin texto)
    product: productFile,           // Foto del producto
    avatarFile: avatarFile,         // Foto de la persona
    config: {
      productIAOptions: {
        prompt: copy.productPrompt,    // Brief creativo de OpenAI
        copyZone: zoneSideScene,       // Zona donde va el texto (para evitar)
        skipTextRender: true,
        avatarSceneWithProduct: true   // ← activa este sub-modo
      }
    }
  })
});
// Resultado: escena con persona sosteniendo producto sobre fondo

// Luego se aplica TEMPLATE_BETA sobre la escena generada
const templateRes = await fetch("/api/compose", {
  method: "POST",
  body: formData({
    mode: "TEMPLATE_BETA",
    background: sceneFile,           // ← escena generada arriba
    config: { copy: {...}, templateBetaOptions: {...} }
  })
});
```

**composeWithProductIA.ts → generateSceneWithAvatarAndProduct() [gemini.ts]**

Envía **3 imágenes** a Gemini Vision:
- Image 1: Fondo (lighting/environment reference)
- Image 2: Producto (debe ser sostenido/usado)
- Image 3: Avatar (rostro/apariencia a replicar)

Reglas del prompt:
- Persona posicionada en zona permitida según `copyZone`
- Persona DEBE sostener/usar el producto exacto de Image 2
- Rostro, pelo, tono de piel IGUALES a Image 3
- Iluminación matching con Image 1
- 100% opaco, sin transparencias ni bordes suaves

### 7.3 Flujo B — `useAvatarAsScene`

**Cuándo:** `meta.requiresSceneGeneration === true` (sin `sceneWithProduct`) Y hay avatar.

**Orden:** TEMPLATE_BETA (fondo + textos) → PRODUCT_IA (imagen con texto + avatar)

```typescript
// page.tsx — prompt construido inline
const scenePrompt = `Show a real person experiencing this situation: ${copy.sceneAction}.
IMPORTANT: No products, no objects, no props.
${zoneInstruction}
CRITICAL: Do NOT erase, modify, blur, move, resize or cover ANY existing text, graphics, logos...`;

// PRODUCT_IA con useAvatarAsScene
const productRes = await fetch("/api/compose", {
  method: "POST",
  body: formData({
    mode: "PRODUCT_IA",
    background: templateResultFile,   // ← ya tiene texto renderizado
    product: avatarFile,              // ← avatar enviado como "product" para referencia
    config: {
      productIAOptions: {
        prompt: scenePrompt,
        copyZone: zoneSide,
        useAvatarAsScene: true,       // ← activa este sub-modo
        sceneFullBleed: meta?.sceneFullBleed
      }
    }
  })
});
```

**composeWithProductIA.ts** construye su propio prompt wrapper completo para este sub-modo, añadiendo reglas de preservación de texto y zone constraints.

Envía **2 imágenes** a Gemini:
- Image 1: Background con texto renderizado
- Image 2: Avatar como referencia de apariencia

### 7.4 Flujo C — `sceneMode` puro

**Cuándo:** `meta.requiresSceneGeneration === true` Y NO hay avatar.

**Orden:** TEMPLATE_BETA → PRODUCT_IA (con sceneMode)

```typescript
// page.tsx — mismo prompt inline que Flujo B
const scenePrompt = `Show a real person experiencing this situation: ${copy.sceneAction}...`;

const productRes = await fetch("/api/compose", {
  method: "POST",
  body: formData({
    mode: "PRODUCT_IA",
    background: templateResultFile,   // ← ya tiene texto renderizado
    product: transparentPng,          // ← placeholder transparente
    config: {
      productIAOptions: {
        prompt: scenePrompt,
        copyZone: zoneSide,
        sceneMode: true,              // ← activa este sub-modo
        hasRealProduct: false,
        sceneFullBleed: meta?.sceneFullBleed
      }
    }
  })
});
```

**composeWithProductIA.ts → generateScene() [gemini.ts]**

Envía **1 imagen** a Gemini:
- Image 1: Background con texto renderizado

Gemini genera persona completa desde cero, respetando las zone constraints y preservando el texto existente.

### 7.5 Flujo D — Producto puro

**Cuándo:** Template de producto sin escena de persona (ej: `producto-hero-top`).

**Orden:** TEMPLATE_BETA → PRODUCT_IA (default)

```typescript
const effectiveProductPrompt = copy.productPrompt || meta.defaultProductPrompt;

const productRes = await fetch("/api/compose", {
  method: "POST",
  body: formData({
    mode: "PRODUCT_IA",
    background: templateResultFile,   // ← ya tiene texto renderizado
    product: productFile,             // ← foto real del producto
    config: {
      productIAOptions: {
        prompt: effectiveProductPrompt,
        copyZone: zoneSide,
        hasRealProduct: true,
        sceneFullBleed: meta?.sceneFullBleed
      }
    }
  })
});
```

**composeWithProductIA.ts → buildProductIAPrompt() → nanoBananaInjectProduct() [gemini.ts]**

`buildProductIAPrompt()` tiene 4 sub-modos:

| Sub-modo | Condición | Comportamiento |
|----------|-----------|----------------|
| **RAW** | `rawProductPrompt: true` | Prompt verbatim + ABSOLUTE RULES |
| **FULL** | `copyZone === "full"` | Prompt verbatim + ABSOLUTE RULES |
| **TEMPLATE-DIRECTED** | prompt > 20 chars | Wrapper profesional + brief + ZONE CONSTRAINT + ABSOLUTE RULES |
| **GENERIC FALLBACK** | prompt corto/vacío | Wrapper genérico + ZONE CONSTRAINT + ABSOLUTE RULES |

Envía **2 imágenes** a Gemini:
- Image 1: Background con texto renderizado
- Image 2: Producto (foto real)

---

## 8. Flujos del Frontend

### 8.1 Single Creative (`handleGenerate`)

Genera **1 creativo** con el template seleccionado. Ejecuta las 4 fases en secuencia.

### 8.2 Angles (`handleGenerateAngles`)

Genera **N creativos** por template × M templates.

```
PASO 1: GENERATE_COPY × M templates (paralelo)
  Cada call con numberOfVariants = N (ej: 3, 5, 8)
  → M arrays de N copy objects

PASO 2: Construir task list
  Para cada template × cada variante → 1 task
  Excepción: "classic-editorial-right" genera 2 tasks por variante (light + dark)

PASO 3: Ejecutar con concurrencia = 5
  Cada task ejecuta el pipeline V1 completo:
  GENERATE_BACKGROUND → TEMPLATE_BETA → (PRODUCT_IA opcional)
```

### 8.3 Sequence/Carousel (`handleGenerateSequence`)

Genera un **carrusel** de N diapositivas con narrativa.

```
PASO 1: GENERATE_SEQUENCE_COPY (mode especial)
  → route.ts → generateSequenceCopy() [openai.ts]
  ← Array de N slides con copy + roles (HOOK, PROBLEMA, SOLUCIÓN, CTA...)

PASO 2: Por cada slide, ejecutar V1 completo:
  GENERATE_BACKGROUND → TEMPLATE_BETA → (PRODUCT_IA opcional)
  Con concurrencia = 5
```

---

## 9. Metadata de Templates

**Archivo:** `src/services/product-composer/templates/meta.ts`

Cada template se define con `TemplateMetadata`:

```typescript
interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  active?: boolean;
  supportedRatios: string[];

  // Zonas
  copyZone: "right" | "left" | "top" | "bottom" | "center" | "none" | "full";
  productIAZone?: string;          // Override de zona para PRODUCT_IA

  // Schema de copy
  copySchema: string[];             // Campos que OpenAI debe generar

  // Flags de layout
  requiresSceneGeneration: boolean; // ¿Necesita PRODUCT_IA para escena?
  sceneWithProduct?: boolean;       // Persona + producto (Flujo A)
  sceneFullBleed?: boolean;         // Escena full-bleed cinemática
  personOnly?: boolean;             // Solo persona, sin producto
  personScene?: boolean;            // Escena incluye persona
  noProductLayer?: boolean;         // Sin producto (ej: sorteo)
  noLogo?: boolean;                 // Sin logo
  logoPosition?: "left" | "center";
  splitComparison?: boolean;        // Layout split sin Gemini

  // Prompts predefinidos
  defaultBackgroundPrompt: string;
  darkBackgroundPrompt?: string;
  categoryBackgroundPrompts?: Record<string, string>;
  rawBackgroundPrompt?: boolean;    // Usar prompt tal cual
  defaultProductPrompt?: string;
  rawProductPrompt?: boolean;       // Usar prompt tal cual
  templateHint?: string;            // Hint para copy generation

  // Pipeline
  pipelineV2?: boolean;             // true = usa V2, false/undefined = V1

  // Recomendaciones
  recommendedFor: string[];         // Categorías recomendadas
}
```

**Flags clave que determinan el flujo:**

| Flag | Efecto en V1 |
|------|-------------|
| `pipelineV2: true` | **Salta V1 completamente** → usa Pipeline V2 |
| `requiresSceneGeneration: true` | Siempre ejecuta PRODUCT_IA (Flujo B, C, o A) |
| `sceneWithProduct: true` | Persona sostiene producto (Flujo A) |
| `noProductLayer: true` | NO ejecuta PRODUCT_IA (ej: sorteo) |
| `rawProductPrompt: true` | Prompt de producto se usa verbatim |
| `rawBackgroundPrompt: true` | Prompt de fondo se usa tal cual |
| `sceneFullBleed: true` | La escena cubre todo el canvas |
| `personOnly: true` | Solo persona, sin interacción con producto |

---

## 10. Tabla de Funciones

| Función | Archivo | Fase | Modelo | Descripción |
|---------|---------|------|--------|-------------|
| `generateTemplateCopyGemini()` | `src/lib/ai/gemini.ts` | 1 | Gemini 2.5 Flash | Genera copy con contexto de marca y template |
| `generateImageBriefGemini()` | `src/lib/ai/promptLibrary.ts` | 1 | Gemini 2.5 Flash | Genera `productPrompt` visual (opcional) |
| `expandSceneBrief()` | `src/lib/ai/gemini.ts` | 1 | Gemini 2.0 Flash | Expande `sceneAction` seed (~80 palabras de OpenAI) a brief fotográfico expandido (~80 palabras con detalles cinéticos, iluminación, composición) |
| `generateSequenceCopy()` | `src/lib/ai/openai.ts` | 1 | GPT-4o-mini | Genera slides de carrusel con narrativa |
| `generateBackground()` | `src/lib/ai/gemini.ts` | 2 | Gemini 2.5 Flash Image | Genera fondo visual limpio |
| `composeWithTemplateBeta()` | `src/services/product-composer/composeWithTemplateBeta.ts` | 3 | Local (Sharp) | Renderiza texto + logo sobre imagen |
| `getTemplate().buildLayout()` | `src/services/product-composer/templates/index.ts` | 3 | — | Genera layout spec del template |
| `renderTextOnImage()` | `src/lib/render/textRenderer.ts` | 3 | Local (resvg) | SVG → PNG text rendering |
| `composeWithProductIA()` | `src/services/product-composer/composeWithProductIA.ts` | 4 | — | Router interno de composición |
| `generateSceneWithAvatarAndProduct()` | `src/lib/ai/gemini.ts` | 4 | Gemini 2.5 Flash Image | 3 imágenes → persona + producto + fondo |
| `nanoBananaInjectProduct()` | `src/lib/ai/gemini.ts` | 4 | Gemini 2.5 Flash Image | 2 imágenes → producto sobre fondo |
| `generateScene()` | `src/lib/ai/gemini.ts` | 4 | Gemini 2.5 Flash Image | 1 imagen → persona generada en escena |
| `buildProductIAPrompt()` | `src/services/product-composer/composeWithProductIA.ts` | 4 | — | Construye prompt para Gemini según sub-modo |
| `getTemplateMeta()` | `src/services/product-composer/templates/meta.ts` | Todas | — | Resuelve metadata del template |
