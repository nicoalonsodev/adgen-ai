# ANALISIS-PIPELINE.md
> Generado el 2026-03-14 · Análisis del pipeline de generación de creativos adgen-ai

---

## 1. MAPA ASCII DEL FLUJO COMPLETO

```
USUARIO (fabrica-de-contenido/page.tsx)
│
│  1. Selecciona template → lee copySchema / compositionMode / flags de meta.ts
│  2. Rellena producto, oferta, audiencia, problema, tono
│
│  ┌─────────────────────────────────────────────────────────────────────────────┐
│  │                           PIPELINE V1 (default)                             │
│  └─────────────────────────────────────────────────────────────────────────────┘
│
├─► POST /api/compose  { mode: "GENERATE_COPY" }
│       │  Payload: product, offer, tone, templateSchema, templateHint, businessProfile
│       │
│       ├─► generateTemplateCopyOpenAI()  [openai.ts]
│       │       → gpt-4o-mini genera los campos del copySchema
│       │       → Returns: copy + _promptUsed, _systemPrompt, _userPrompt (non-enumerable)
│       │
│       ├─► [Si "productPrompt" está en schema] generateImageBriefGemini()  [gemini.ts]
│       │       → Gemini Flash genera productPrompt especializado
│       │
│       └─► [Si "sceneAction" está en schema] expandSceneBrief()  [gemini.ts]
│               → Gemini Flash expande la sceneAction corta → prompt cinematográfico
│
│  Resultado: copy = { headline, subheadline, badge, sceneAction, ... }
│
├─► POST /api/compose  { mode: "GENERATE_BACKGROUND" }
│       │  Prompt resuelto por resolveBgPrompt():
│       │    1. darkBackgroundPrompt (si colorMode=dark)
│       │    2. categoryBackgroundPrompts[category] o defaultBackgroundPrompt  [meta.ts]
│       │    3. rawBackgroundPrompt: true → EARLY RETURN (ignora copy.backgroundColorHint)
│       │    4. copy.backgroundPrompt (si en schema)
│       │    5. colorHint: `${basePrompt}\n\nCOLOR ADJUSTMENT: ${copy.backgroundColorHint}`
│       │
│       └─► generateBackground()  [gemini.ts]
│               → gemini-3.1-flash-image-preview genera PNG 1080x1080
│
│  Resultado: bgDataUrl (imagen de fondo)
│
├─► buildProductIAOptions(meta, { copy, hasProductFile, hasAvatarFile })  [meta.ts]
│       │  Lee meta.compositionMode y determina qué flags enviar al endpoint
│       │
│       │  "product-inject"    → { rawProductPrompt, personScene, sharpProductOverlay }
│       │  "scene-only"        → { sceneMode/useAvatarAsScene, personScene, sceneFullBleed }
│       │  "scene-with-product"→ (avatar) → { avatarSceneWithProduct, useGenericProductClone }
│       │                        (sin avatar) → fallback scene-only
│       │  "split-comparison"  → { splitComparison: true }
│       │  "none"              → needsProductIA: false (salta PRODUCT_IA)
│       │
│       │  effectivePrompt = copy.productPrompt || copy.sceneAction || defaultProductPrompt
│
│  compositionOrder determina el orden de los pasos siguientes:
│  "template-first" → TEMPLATE_BETA primero → PRODUCT_IA encima del resultado
│  "scene-first"    → PRODUCT_IA en bg limpio → TEMPLATE_BETA encima (scene-with-product)
│
├─► POST /api/compose  { mode: "TEMPLATE_BETA" }  (multipart/form-data)
│       │  Input: background PNG + copy fields + logo base64
│       │
│       ├─► getTemplate(templateId)  [index.ts]
│       │       → LAYOUT_BUILDERS[id] → buildLayout(copy, canvas)  [templates/*.ts]
│       │         Returns LayoutSpec: { textBlocks[], overlays[], safeArea }
│       │
│       ├─► renderTextOnImage(background, layoutSpec)  [textRenderer.ts]
│       │       → SVG con textBlocks posicionados
│       │       → @resvg/resvg-js rasteriza SVG → PNG
│       │       → Sharp compuesta overlays (gradientes, sombras)
│       │
│       └─► Logo overlay (dark/light variant según colorMode)
│
│  Resultado: PNG con texto y diseño aplicado
│
└─► POST /api/compose  { mode: "PRODUCT_IA" }  (multipart/form-data)
        │  Input: background/scene PNG + product PNG + avatar PNG (opcional)
        │
        └─► composeWithProductIA()  [composeWithProductIA.ts]
                │
                ├─ avatarSceneWithProduct → generateSceneWithAvatarAndProduct()  3 imágenes
                │       [bg + product + avatar] → Gemini renderiza persona sosteniendo producto
                │       + detectProductBoundingBox() → re-overlay del producto real si useGenericProductClone
                │
                ├─ useAvatarAsScene → nanoBananaInjectProduct()  [bg + avatar]
                │
                ├─ splitComparison → composeSplitComparison()  [Sharp puro, sin Gemini]
                │
                ├─ sceneMode → generateScene() o nanoBananaInjectProduct()
                │       → buildScenePrompt(sceneAction, copyZone, hasRealProduct, fullBleed)
                │         Aplica ABSOLUTE_RULES_SCENE + buildZonePlacement()
                │
                └─ Flujo D (product-inject) → nanoBananaInjectProduct()
                        → buildProductIAPrompt(userPrompt, copyZone, rawMode, personScene)
                          Aplica ABSOLUTE_RULES_PRODUCT_INJECT + zone constraints
                        + sharpProductOverlay (si configurado): re-overlay Sharp con producto nítido

```

---

## 2. ROL DE CADA ARCHIVO EN EL PIPELINE

| Archivo | Rol |
|---------|-----|
| `src/app/dashboard/fabrica-de-contenido/page.tsx` | UI principal. Orquesta los 3-4 API calls, construye FormData, muestra resultados |
| `src/app/api/compose/route.ts` | Único endpoint POST. Enruta por `mode`, parsea multipart/JSON, maneja auth/tokens |
| `src/services/product-composer/templates/meta.ts` | **Fuente única de verdad** para templates. Define `TEMPLATE_META_LIST` + `buildProductIAOptions()` |
| `src/services/product-composer/templates/index.ts` | Registra `LAYOUT_BUILDERS`. `getTemplate(id)` une meta + buildLayout |
| `src/services/product-composer/templates/*.ts` | Una función `buildLayout()` por template → devuelve `LayoutSpec` |
| `src/services/product-composer/composeWithProductIA.ts` | Motor de composición IA. 5 flujos según flags. Construye prompts, llama Gemini |
| `src/services/product-composer/composeWithTemplateBeta.ts` | Aplica texto determinístico sobre el fondo. Llama `renderTextOnImage()` |
| `src/services/product-composer/textRenderer.ts` | SVG → resvg → PNG. Mapeo de fuentes. Composita overlays con Sharp |
| `src/lib/ai/gemini.ts` | Cliente Gemini: `generateBackground`, `generateScene`, `nanoBananaInjectProduct`, etc. |
| `src/lib/ai/openai.ts` | Cliente OpenAI: `generateTemplateCopyOpenAI()` con gpt-4o-mini |
| `src/lib/ai/promptLibrary.ts` | Carga librerías de prompts desde `.md`. `getSceneLibrarySection()` para contexto por categoría |
| `src/lib/ai/copyGenerator.ts` | `deriveStrategicCore()` — solo usado en PIPELINE_V2 |

---

## 3. ANÁLISIS DE LOS 6 TEMPLATES

### 3.1 `classic-editorial-right`
- **compositionMode**: `product-inject`
- **copyZone**: `right` (texto a la derecha, producto a la izquierda)
- **active**: true
- **Flags clave**: `rawProductPrompt: true`, `rawBackgroundPrompt: true`

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| title | ✅ OpenAI | ✅ TEMPLATE_BETA | Pills separadores "·" |
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Frase emocional max 6 palabras |
| subheadline | ✅ OpenAI | ✅ TEMPLATE_BETA | 1-2 oraciones beneficio |
| badge | ✅ OpenAI | ✅ TEMPLATE_BETA | Oferta en pill |
| bullets | ✅ OpenAI | ✅ TEMPLATE_BETA | Array 3 beneficios |
| backgroundColorHint | ✅ OpenAI | ❌ IGNORADO | `rawBackgroundPrompt: true` causa early return |

**Prompt de producto**: `rawProductPrompt: true` → `defaultProductPrompt` (mano emergiendo de la izquierda) se envía **tal cual** a Gemini sin wrappers de zona.

**⚠️ Problema #1**: `templateHint` (línea 195-207 de meta.ts) describe reglas para un campo `productPrompt` que **no está en copySchema**. OpenAI no lo genera. Las instrucciones son letra muerta.

**⚠️ Problema #2**: `backgroundColorHint` está en copySchema y OpenAI lo genera, pero `rawBackgroundPrompt: true` hace que `resolveBgPrompt()` retorne en el branch 1 sin llegar al branch 3 (colorHint). El campo se genera gastando tokens pero nunca se aplica.

---

### 3.2 `editorial-lifestyle-left`
- **compositionMode**: `scene-only`
- **copyZone**: `left` (texto izquierda, persona derecha)
- **active**: true
- **Flags clave**: `rawBackgroundPrompt: true`, `requiresSceneGeneration: true`

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Claim editorial max 50 chars |
| subheadline | ✅ OpenAI | ✅ TEMPLATE_BETA | Frase complementaria |
| badge | ✅ OpenAI | ✅ TEMPLATE_BETA | URL o tagline |
| backgroundColorHint | ✅ OpenAI | ❌ IGNORADO | `rawBackgroundPrompt: true` causa early return |
| sceneAction | ✅ OpenAI + Gemini expand | ✅ PRODUCT_IA | Expansión via expandSceneBrief() |
| textSide | ✅ OpenAI | ✅ PRODUCT_IA zone flip | buildProductIAOptions lee este campo |

**Prompt de escena**: `effectivePrompt = copy.sceneAction` (expandido por Gemini Flash). Se envuelve en `buildScenePrompt()` con `ABSOLUTE_RULES_SCENE` + `buildZonePlacement()`.

**Zone flip especial**: `buildProductIAOptions()` (meta.ts:1746-1752) lee `copy.textSide` para editorial-lifestyle-left y cambia el `copyZone` según el lado que eligió OpenAI. Esto funciona correctamente.

**⚠️ Problema #3**: `backgroundColorHint` está en copySchema (meta.ts línea 787) y se genera, pero `rawBackgroundPrompt: true` (línea 800) impide que se aplique en `resolveBgPrompt()`. El campo es completamente inútil.

---

### 3.3 `editorial-center-top`
- **compositionMode**: `scene-with-product`
- **copyZone**: `top` (texto arriba, persona+producto abajo)
- **active**: true
- **Flags clave**: `useGenericProductClone: true`, `sceneWithProduct: true`, `personScene: true`

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| title | ✅ OpenAI | ✅ TEMPLATE_BETA | Keywords "·" separados |
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Claim centrado max 7 palabras |
| subheadline | ✅ OpenAI | ✅ TEMPLATE_BETA | Beneficio específico |
| badge | ✅ OpenAI | ✅ TEMPLATE_BETA | Tagline corto |
| bullets | ✅ OpenAI | ✅ TEMPLATE_BETA | 3 beneficios con emoji |
| sceneAction | ✅ OpenAI + Gemini expand | ✅ PRODUCT_IA | Descripción de persona/escena |
| textSide | ✅ OpenAI | ❌ IGNORADO | Valores "top"/"bottom" — nunca se lee |
| backgroundColorHint | ✅ OpenAI | ✅ Aplicado | resolveBgPrompt() branch 3 |

**Flujo**: `compositionOrder: "scene-first"` → PRODUCT_IA en bg limpio → TEMPLATE_BETA encima.

**`useGenericProductClone: true`**: Genera producto sin etiqueta via `generateGenericProduct()` antes de pasarlo a `generateSceneWithAvatarAndProduct()`. Luego `detectProductBoundingBox()` re-overlayea el producto real.

**⚠️ Problema #4 (CRÍTICO)**: `textSide` está en copySchema (meta.ts:1034) con templateHint que dice "top" o "bottom" según el contenido. OpenAI lo genera. Pero `buildProductIAOptions()` (meta.ts:1746-1752) solo maneja textSide para `editorial-lifestyle-left`. Para `editorial-center-top`, `textSide` se genera, gasta tokens, y **nunca se usa para nada**. El `copyZone` siempre es "top" independientemente de lo que OpenAI decida.

---

### 3.4 `pain-point-left`
- **compositionMode**: `scene-only`
- **copyZone**: `left` (texto izquierda, persona derecha)
- **active**: true
- **Flags clave**: `requiresSceneGeneration: true`, `supportsSequence: true`

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Pain point directo max 8 palabras |
| subheadline | ✅ OpenAI | ✅ TEMPLATE_BETA | Expande el problema |
| badge | ✅ OpenAI | ✅ TEMPLATE_BETA | CTA suave o pregunta |
| backgroundColorHint | ✅ OpenAI | ✅ Aplicado | resolveBgPrompt() branch 3 ✓ |

**sceneAction**: NO está en copySchema pero route.ts (líneas 451-456) **siempre** agrega sceneAction al schema enviado a OpenAI. Resultado: OpenAI genera sceneAction y Gemini Flash lo expande porque `hasSceneAction = fullSchema.includes("sceneAction")` → false (no está en el schema original). **Sin expansión Gemini**.

**⚠️ Problema #5**: Para `pain-point-left`, `sceneAction` se genera por OpenAI (versión corta) pero no se expande via Gemini Flash (porque no está en el copySchema original). El `effectivePrompt` en buildProductIAOptions es `copy.sceneAction` (aunque no esté en meta.copySchema, el campo llega en `copy`). Sin embargo, buildProductIAOptions solo lo usa si `meta.copySchema.includes("sceneAction")` → ¡FALSE! Entonces `effectivePrompt = meta.defaultProductPrompt`.

**Diagnóstico completo**: Para pain-point-left, el sceneAction generado por OpenAI **no llega como prompt a Gemini**. Se usa el `defaultProductPrompt` del template (meta.ts línea 361: "Do NOT show any product..."). Esto funciona como fallback pero ignora el sceneAction personalizado por ángulo/tono.

**Solución**: Agregar `"sceneAction"` al copySchema de pain-point-left para que buildProductIAOptions lo use y Gemini Flash lo expanda.

---

### 3.5 `producto-hero-top`
- **compositionMode**: `product-inject`
- **copyZone**: `top` (texto arriba), **`productIAZone: "center"`** (producto al centro)
- **active**: true
- **Flags clave**: `rawBackgroundPrompt: true`, `rawProductPrompt: true`

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Nombre marca max 10 chars |
| subheadline | ✅ OpenAI | ✅ TEMPLATE_BETA | Tagline thin max 30 chars |
| disclaimer | ✅ OpenAI | ✅ TEMPLATE_BETA | Línea pequeña al pie |
| backgroundPrompt | ✅ OpenAI | ❌ IGNORADO | `rawBackgroundPrompt: true` impide su uso |

**`productIAZone: "center"`**: Overrride inteligente — el texto está en `top` pero el producto debe ir en el centro. `buildProductIAOptions()` lee `meta.productIAZone ?? meta.copyZone` → `"center"`. Esto funciona correctamente.

**⚠️ Problema #6 (CRÍTICO, tokens perdidos)**: `backgroundPrompt` está en copySchema y el templateHint da instrucciones detalladas para generar una macro photography específica del producto. OpenAI genera este prompt (tokens pagados). Pero `rawBackgroundPrompt: true` (meta.ts:1199-1200) hace que `resolveBgPrompt()` en page.tsx (líneas 60-63) retorne `basePrompt` (el `categoryBackgroundPrompts[category]` o `defaultBackgroundPrompt`) **sin leer `copy.backgroundPrompt`**.

El campo correcto a usar sería `copy.backgroundPrompt` del branch 2 de `resolveBgPrompt()`, pero ese branch solo se alcanza si `rawBackgroundPrompt` es `false` o `undefined`.

**Conflict**: `rawBackgroundPrompt: true` evita que el prompt del template sea modificado, pero también bloquea el prompt generado por OpenAI. La intención del `rawBackgroundPrompt` era proteger prompts de template cuidadosamente crafteados (como `belleza-cosmetica`) de ser sobreescritos por colorHint. Pero colateralmente, también bloquea el backgroundPrompt customizado de OpenAI.

---

### 3.6 `persona-producto-left`
- **compositionMode**: `scene-with-product`
- **copyZone**: `left` (texto izquierda, persona derecha)
- **active**: true
- **Flags clave**: `sceneWithProduct: true`, `personScene: true`, `supportsSequence: true`
- **`useGenericProductClone`**: **NO configurado** (a diferencia de `editorial-center-top`)

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| badge | ✅ OpenAI | ✅ TEMPLATE_BETA | Nombre marca top-left |
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Claim grande max 8 palabras |
| subheadline | ✅ OpenAI | ✅ TEMPLATE_BETA | 1-2 oraciones max 47 chars |
| title | ✅ OpenAI | ✅ TEMPLATE_BETA | CTA button (pill) |
| sceneAction | ✅ OpenAI + Gemini expand | ✅ PRODUCT_IA | effectivePrompt — varía por ángulo |

**effectivePrompt**: `copy.sceneAction` expandido por Gemini Flash vía `expandSceneBrief()`. `defaultProductPrompt` actúa como fallback si `sceneAction` llega vacío.

**backgroundPrompt**: No en copySchema. Se usa `defaultBackgroundPrompt` vía `resolveBgPrompt()`.

**Flujo sin avatar**: Cae al fallback scene-only: `sceneMode: true`. El prompt es el `effectivePrompt` (sceneAction expandido) envuelto en `buildScenePrompt()`.

---

### 3.7 `bebas-urgencia-top` _(auditado y corregido — 2026-03-17)_
- **compositionMode**: `scene-only`
- **copyZone**: `top` (headline en el tercio superior, persona full-bleed)
- **active**: true
- **Flags clave**: `sceneFullBleed: true`, `personOnly: true`, `personScene: true`, `skipExpandSceneBrief: true`

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Pain-point único, max 8 palabras, Bebas Neue |
| backgroundColorHint | ✅ OpenAI | ❌ IGNORADO | `rawBackgroundPrompt: true` causa early return en `resolveBgPrompt()` |
| sceneAction | ✅ OpenAI | ✅ PRODUCT_IA | `skipExpandSceneBrief: true` → va directamente sin expansión Gemini Flash |

**Flujo** (después del fix de `compositionOrder`):
- `compositionOrder: "scene-first"` ← condicionado por `meta.sceneFullBleed === true`
- Step 1 — PRODUCT_IA (sceneMode, sceneFullBleed, copyZone="top") → Gemini genera escena full-bleed con persona centrada, cara debajo del 30% vertical
- Step 2 — TEMPLATE_BETA → aplica overlay (si está configurado) + Bebas Neue headline encima de la escena
- Logo auto-rendered top-left

**Prompt de escena**: `effectivePrompt = copy.sceneAction` (sin expansión Gemini). Envuelto en `buildScenePrompt()` con `{ fullBleed: true }` → `buildZonePlacement("top", "scene", { fullBleed: true })` aplica absolute rule de posición: cara obligatoriamente por debajo del 30% vertical.

**`backgroundColorHint`**: está en copySchema, OpenAI lo genera, pero `rawBackgroundPrompt: true` lo ignora en `resolveBgPrompt()`. Tokens desperdiciados (mismo patrón que problemas #4 y #5).

**Bugs corregidos en esta sesión** (ver sección 10.3):
- `fontFamily: "Recoleta"` → `"Bebas Neue"` (renderizaba DM Serif Display por error de mapeo)
- `BebasNeue-Regular.ttf` reemplazado por TTF real (el archivo era HTML de GitHub)
- `fontWeight: "700"` → `"400"` (solo existe Regular, Bold causaba fallback silencioso)
- `compositionOrder` hardcodeado a `"template-first"` → ahora `"scene-first"` para `sceneFullBleed: true`
- Overlay oscuro (`opacity: 0.52`) removido (fondos ya son oscuros por `defaultBackgroundPrompt`)
- `buildZonePlacement` fullBleed+top: soft guidance "TOP 25%" → absolute rule dura "TOP 30%"

---

### 3.8 `persona-producto-top` _(nuevo — 2026-03-17, fixes aplicados mismo día)_
- **compositionMode**: `scene-with-product`
- **copyZone**: `top` (panel limpio superior, persona full-width inferior)
- **active**: true
- **Flags clave**: `sceneWithProduct: true`, `personScene: true`, `supportsSequence: true`
- **`useGenericProductClone`**: **NO configurado** (igual que `persona-producto-left`)
- **Diferencia clave respecto a `editorial-center-top`**: sin `textSide` fijo, sin `useGenericProductClone`, tipografía Montserrat Bold (no Lora), CTA pill en el panel de texto (no overlaid sobre la persona)

| Campo copySchema | Se genera | Llega al prompt | Notas |
|-----------------|-----------|-----------------|-------|
| badge | ✅ OpenAI | ✅ TEMPLATE_BETA | Overline centrado, uppercase |
| headline | ✅ OpenAI | ✅ TEMPLATE_BETA | Claim grande centrado max 8 palabras, Montserrat Bold |
| subheadline | ✅ OpenAI | ✅ TEMPLATE_BETA | Beneficio centrado max 90 chars |
| title | ✅ OpenAI | ✅ TEMPLATE_BETA | CTA pill centrado en panel superior |
| sceneAction | ✅ OpenAI + Gemini expand | ✅ PRODUCT_IA | effectivePrompt — varía por ángulo |
| backgroundPrompt | ✅ OpenAI | ✅ `resolveBgPrompt()` branch 2 | GPT guiado por `backgroundStyleGuide` (= `defaultBackgroundPrompt` con restricción LIGHT-TONED) |

**effectivePrompt**: `copy.sceneAction` expandido por Gemini Flash. El `templateHint` para `sceneAction` instruye explícitamente a OpenAI a terminar cada descripción con "The TOP 40% of the canvas must remain completely clear". `defaultProductPrompt` como fallback. OpenAI escribe `sceneAction` en inglés (FIELD_RULE lo fuerza explícitamente).

**backgroundPrompt**: Está en copySchema. GPT lo genera guiado por `backgroundStyleGuide` (= `defaultBackgroundPrompt` que ahora comienza con restricción CRITICAL LIGHT-TONED). `resolveBgPrompt()` usa `copy.backgroundPrompt` (branch 2). El FIELD_RULE de `backgroundPrompt` también lleva restricción de fondo claro para texto oscuro.

**Coherencia background ↔ sceneAction**: `expandSceneBrief()` recibe `backgroundPrompt` = `copy.backgroundPrompt ?? backgroundStyleGuide` (via `copyTemplateMeta?.sceneWithProduct === true` en route.ts). Inyecta `backgroundCoherenceBlock` en el prompt de expansión para que la persona expandida sea visualmente coherente con el fondo ya definido.

**Layout**: Panel superior limpio (top 40%) con badge → headline (balanceado en 2 líneas) → subheadline → CTA pill. No hay gradiente oscuro — el texto es oscuro sobre fondo claro generado por Gemini. Persona ocupa el bottom 60% a ancho completo.

**Flujo sin avatar**: Fallback `sceneMode: true`. El `effectivePrompt` (sceneAction expandido) pasa a `buildScenePrompt()` con `copyZone="top"` — las zone constraints garantizan que la persona quede en el bottom.

---

## 4. PROBLEMAS ENCONTRADOS (NUMERADOS Y PRIORIZADOS)

### 🔴 CRÍTICO

**#1 — `producto-hero-top`: `backgroundPrompt` se genera pero se ignora**
- Archivo: `src/services/product-composer/templates/meta.ts:1188` (copySchema) y `:1199-1200` (rawBackgroundPrompt)
- Archivo: `src/app/dashboard/fabrica-de-contenido/page.tsx:60-63` (resolveBgPrompt branch 1)
- OpenAI genera un `backgroundPrompt` específico al producto (gasta tokens), pero `rawBackgroundPrompt: true` hace que `resolveBgPrompt()` retorne el `categoryBackgroundPrompts` ignorando `copy.backgroundPrompt`.
- **Impacto**: Tokens desperdiciados. El background generado es siempre el de la categoría, no el customizado por producto.

**#2 — `pain-point-left`: `sceneAction` generado pero no usado en PRODUCT_IA**
- Archivo: `src/app/api/compose/route.ts:451-456` (añade sceneAction al schema)
- Archivo: `src/services/product-composer/templates/meta.ts:1756-1760` (buildProductIAOptions efectivePrompt)
- sceneAction se genera por OpenAI pero `buildProductIAOptions` lo ignora porque `meta.copySchema.includes("sceneAction")` → false para pain-point-left. Se usa `defaultProductPrompt` siempre.
- **Impacto**: Cada ángulo/tono debería tener una escena de persona diferente, pero siempre recibe el mismo prompt genérico.

### 🟡 MEDIO

**#3 — `editorial-center-top`: `textSide` generado pero nunca aplicado**
- Archivo: `src/services/product-composer/templates/meta.ts:1034` (textSide en copySchema)
- Archivo: `src/services/product-composer/templates/meta.ts:1746-1752` (buildProductIAOptions, solo maneja editorial-lifestyle-left)
- OpenAI genera `textSide` = "top" o "bottom". buildProductIAOptions no tiene manejo para este template. El `copyZone` es siempre "top".
- **Impacto**: Creativos sin variación de layout. El campo se genera pagando tokens sin efecto.

**#4 — `editorial-lifestyle-left`: `backgroundColorHint` generado pero ignorado**
- Archivo: `src/services/product-composer/templates/meta.ts:787` (copySchema) y `:800` (rawBackgroundPrompt: true)
- Archivo: `src/app/dashboard/fabrica-de-contenido/page.tsx:60-63`
- Similar al problema #1 pero para un campo de menor impacto.
- **Impacto**: Tokens menores desperdiciados. El fondo no varía por colorHint.

**#5 — `classic-editorial-right`: `backgroundColorHint` generado pero ignorado**
- Mismo root cause que #4 pero para este template.
- Archivo: `src/services/product-composer/templates/meta.ts:176` (copySchema) y `:193-194` (rawBackgroundPrompt: true)

### 🟢 MENOR / COSMÉTICO

**#6 — `classic-editorial-right` templateHint describe `productPrompt` inexistente en copySchema**
- Archivo: `src/services/product-composer/templates/meta.ts:195-207`
- templateHint describe reglas para `productPrompt` que OpenAI nunca generará. No rompe nada pero es confuso y puede afectar la interpretación del sistema prompt por parte del modelo.

**#7 — `persona-producto-left` templateHint describe `backgroundPrompt` y `productPrompt` inexistentes en copySchema**
- Archivo: `src/services/product-composer/templates/meta.ts:1507-1525`
- Mismo patrón que #6. Instrucciones muertas que nunca llegan a OpenAI como campos a generar.

**#8 — Comentarios residuales de desarrollo en route.ts**
- Archivo: `src/app/api/compose/route.ts:815` (`// ← AGREGAR`)
- Archivo: `src/app/api/compose/route.ts:824-829` (múltiples `// ← AGREGAR`)
- Código de producción con comentarios de TODO de desarrollo.

**#9 — Comentario incorrecto en composeWithProductIA.ts**
- Archivo: `src/services/product-composer/composeWithProductIA.ts:306`
- `let bg = req.backgroundBuffer;  // ← esta línea falta` — la línea NO falta, está ahí. El comentario es incorrecto y confuso.

**#10 — `sceneAction` generado silenciosamente para todos los templates pero solo algunos se benefician de la expansión Gemini Flash**
- Archivo: `src/app/api/compose/route.ts:451-456` (añade sceneAction al fullSchemaWithScene)
- Archivo: `src/app/api/compose/route.ts:543` (hasSceneAction solo true si está en schema original)
- Para templates sin "sceneAction" en copySchema: OpenAI genera un sceneAction corto que no se expande. buildProductIAOptions tampoco lo usa (porque meta.copySchema no lo incluye). Resultado: gasto de tokens sin beneficio.

---

## 5. TABLA RESUMEN: TEMPLATES

| Template | compositionMode | compositionOrder | Prompt IA efectivo | backgroundPrompt | Problemas |
|----------|----------------|-----------------|-------------------|-----------------|-----------|
| `classic-editorial-right` | product-inject | template-first | `defaultProductPrompt` (raw) | `defaultBackgroundPrompt` (raw) | #2, #5, #6 |
| `editorial-lifestyle-left` | scene-only | template-first | `copy.sceneAction` (expandido) | `defaultBackgroundPrompt` (raw, ignora colorHint) | #4 |
| `editorial-center-top` | scene-with-product | scene-first | `copy.sceneAction` (expandido) | `defaultBackgroundPrompt` + colorHint | #3 |
| `pain-point-left` | scene-only | template-first | `copy.sceneAction` (expandido) | `defaultBackgroundPrompt` + colorHint | — |
| `producto-hero-top` | product-inject | template-first | `defaultProductPrompt` (raw) | `copy.backgroundPrompt` de OpenAI | — |
| `persona-producto-left` | scene-with-product | scene-first | `copy.sceneAction` (expandido) | `defaultBackgroundPrompt` | — |
| `bebas-urgencia-top` | scene-only | **scene-first** ← sceneFullBleed | `copy.sceneAction` (sin expansión) | `defaultBackgroundPrompt` (raw) | colorHint ignorado |
| `persona-producto-top` _(nuevo)_ | scene-with-product | scene-first | `copy.sceneAction` (expandido) | `copy.backgroundPrompt` GPT | — |

---

## 6. CÓMO SE CONSTRUYE EL PROMPT FINAL POR TEMPLATE

### `classic-editorial-right`
```
Prompt a Gemini (PRODUCT_IA):
  buildProductIAPrompt(
    userPrompt = meta.defaultProductPrompt,  // mano emergiendo de la izquierda
    copyZone = "right",
    rawMode = true,   // sin wrapper de zona, sin ABSOLUTE_RULES — prompt tal cual
    personScene = false
  )

Prompt background (GENERATE_BACKGROUND):
  meta.defaultBackgroundPrompt  // pared lisa tipo estudio fotográfico
  -- backgroundColorHint ignorado por rawBackgroundPrompt: true --
```

### `editorial-lifestyle-left`
```
Prompt a Gemini (PRODUCT_IA — sceneMode):
  buildScenePrompt(
    sceneAction = copy.sceneAction,  // generado OpenAI + expandido Gemini Flash
    copyZone = copy.textSide,        // "left" o "right" según OpenAI
    hasRealProduct = !!productFile,
    fullBleed = false
  )
  Agrega: ABSOLUTE_RULES_SCENE + buildZonePlacement(zone, "scene")

Prompt background:
  meta.defaultBackgroundPrompt  // fondo editorial claro
  -- backgroundColorHint ignorado por rawBackgroundPrompt: true --
```

### `editorial-center-top`
```
Prompt a Gemini (PRODUCT_IA — avatarSceneWithProduct si hay avatar):
  buildAvatarWithProductPrompt(
    productPrompt = copy.sceneAction,  // expandido Gemini Flash
    copyZone = "top",                  // siempre "top" — textSide IGNORADO
    rawMode = false
  )
  Agrega: zone constraints + ABSOLUTE_RULES_SCENE

Si no hay avatar → fallback:
  buildScenePrompt(copy.sceneAction, copyZone="top", hasRealProduct, fullBleed=false)

Prompt background:
  defaultBackgroundPrompt + backgroundColorHint (branch 3, funciona correctamente)
```

### `pain-point-left`
```
Prompt a Gemini (PRODUCT_IA — sceneMode):
  buildScenePrompt(
    sceneAction = meta.defaultProductPrompt,  // ⚠️ siempre el mismo, ignora copy.sceneAction
    copyZone = "left",
    hasRealProduct = !!productFile,
    fullBleed = false
  )

Prompt background:
  defaultBackgroundPrompt + backgroundColorHint (funciona)
```

### `producto-hero-top`
```
Prompt a Gemini (PRODUCT_IA — product-inject):
  buildProductIAPrompt(
    userPrompt = meta.defaultProductPrompt,  // descripción detallada de posición/sombra/luz
    copyZone = "center",  // via productIAZone override
    rawMode = true,
    personScene = false
  )

Prompt background:
  categoryBackgroundPrompts["belleza-cosmetica"] o defaultBackgroundPrompt
  -- copy.backgroundPrompt de OpenAI IGNORADO --
```

### `persona-producto-left`
```
Con avatar:
  buildAvatarWithProductPrompt(
    productPrompt = copy.sceneAction,  // expandido por Gemini Flash, varía por ángulo
    copyZone = "left",
    rawMode = false
  )

Sin avatar → fallback sceneMode:
  buildScenePrompt(
    sceneAction = copy.sceneAction,  // expandido, o defaultProductPrompt como fallback
    copyZone = "left",
    ...
  )

Prompt background:
  meta.defaultBackgroundPrompt  // interior borroso moderno
```

### `persona-producto-top`
```
Con avatar:
  buildAvatarWithProductPrompt(
    productPrompt = copy.sceneAction,  // expandido por Gemini Flash (con backgroundCoherenceBlock)
    copyZone = "top",
    rawMode = false
  )
  // sceneAction instruye a Gemini a mantener el TOP 40% libre

Sin avatar → fallback sceneMode:
  buildScenePrompt(
    sceneAction = copy.sceneAction,  // expandido con coherencia de fondo, o defaultProductPrompt
    copyZone = "top",
    ...
  )
  // buildZonePlacement("top") aplica constraints de zona automáticamente

expandSceneBrief recibe:
  backgroundPrompt = copy.backgroundPrompt ?? backgroundStyleGuide
  → inyecta BACKGROUND ALREADY DEFINED block (coherencia luz/color/atmósfera)
  → sceneAction expandida se alinea visualmente al fondo

Prompt background:
  copy.backgroundPrompt  // generado por GPT (branch 2 de resolveBgPrompt)
  Guiado por backgroundStyleGuide = defaultBackgroundPrompt (con CRITICAL LIGHT-TONED al inicio)
  Fallback: meta.defaultBackgroundPrompt (si copy.backgroundPrompt vacío)
  // FIELD_RULE["backgroundPrompt"] también refuerza fondo claro para tipografía oscura
```

---

## 7. PROPUESTA DE SIMPLIFICACIÓN

### Fix #1 (CRÍTICO): `producto-hero-top` — hacer que `copy.backgroundPrompt` realmente se use

**Opción A** (recomendada): Eliminar `rawBackgroundPrompt: true` y en su lugar añadir la lógica a `resolveBgPrompt()` para que `copy.backgroundPrompt` siempre tenga prioridad sobre todo lo demás cuando está en el schema:

```typescript
// En resolveBgPrompt (page.tsx), ANTES del check rawBackgroundPrompt:
if (copy?.backgroundPrompt) {
  return copy.backgroundPrompt as string;
}
```

**Opción B** (más quirúrgica): Cambiar `rawBackgroundPrompt: false` solo para `producto-hero-top` y usar el mecanismo de branch 2 que ya existe.

### Fix #2 (CRÍTICO): `pain-point-left` — agregar `sceneAction` al copySchema

```typescript
// meta.ts, pain-point-left
copySchema: ["headline", "subheadline", "badge", "backgroundColorHint", "sceneAction"],
```

Esto activa la expansión Gemini Flash y hace que buildProductIAOptions use `copy.sceneAction` como effectivePrompt.

### Fix #3 (MEDIO): `editorial-center-top` — manejar `textSide` en buildProductIAOptions

```typescript
// meta.ts, buildProductIAOptions
if (
  (meta.id === "editorial-lifestyle-left" || meta.id === "editorial-center-top") &&
  typeof copy.textSide === "string"
) {
  const validZones = meta.id === "editorial-center-top"
    ? ["top", "bottom"]
    : ["left", "right"];
  if (validZones.includes(copy.textSide as string)) {
    copyZone = copy.textSide as typeof copyZone;
  }
}
```

También hay que asegurar que el `buildLayout` de `editorial-center-top` lea y respete `textSide` de la copy.

### Fix #4 (MEDIO): `editorial-lifestyle-left` y `classic-editorial-right` — eliminar `backgroundColorHint` del copySchema

Si el campo nunca llega al prompt por `rawBackgroundPrompt: true`, no tiene sentido generarlo:

```typescript
// meta.ts, editorial-lifestyle-left
copySchema: ["headline", "subheadline", "badge", "sceneAction", "textSide"],  // sin backgroundColorHint

// meta.ts, classic-editorial-right
copySchema: ["title", "headline", "subheadline", "badge", "bullets"],  // sin backgroundColorHint
```

### Fix #5 (COSMÉTICO): Limpiar templateHints con campos inexistentes

- `classic-editorial-right`: eliminar sección "productPrompt" del templateHint (meta.ts:205-207)
- `persona-producto-left`: eliminar secciones "backgroundPrompt" y "productPrompt" del templateHint (meta.ts:1507-1525), o agregarlos al copySchema

### Fix #6 (LIMPIEZA): Eliminar comentarios residuales

- `route.ts:815-829`: eliminar los `// ← AGREGAR`
- `composeWithProductIA.ts:306`: cambiar `// ← esta línea falta` por un comentario real o eliminarlo

---

## 8. ORDEN RECOMENDADO PARA HACER LOS CAMBIOS SIN ROMPER NADA

```
Paso 1 (bajo riesgo, no cambia comportamiento visual):
  → Fix #6: Limpiar comentarios en route.ts y composeWithProductIA.ts
  → Fix #5: Limpiar templateHints (solo afecta instrucciones a OpenAI, no código)

Paso 2 (riesgo bajo, elimina tokens desperdiciados):
  → Fix #4: Eliminar backgroundColorHint del copySchema de editorial-lifestyle-left
             y classic-editorial-right
  → Testear que el fondo sigue generándose correctamente

Paso 3 (riesgo medio, cambia sceneAction de pain-point-left):
  → Fix #2: Agregar "sceneAction" al copySchema de pain-point-left
  → Testear que la expansión Gemini Flash funciona y el prompt llega a PRODUCT_IA
  → Verificar que el sceneAction contextualiza correctamente el producto

Paso 4 (riesgo medio, cambia background de producto-hero-top):
  → Fix #1: Resolver conflicto rawBackgroundPrompt vs copy.backgroundPrompt
  → Opción A: mover el check de copy.backgroundPrompt antes de rawBackgroundPrompt en resolveBgPrompt()
  → Testear que el background es específico del producto (no el genérico de categoría)

Paso 5 (riesgo medio, afecta layout de editorial-center-top):
  → Fix #3: Agregar manejo de textSide para editorial-center-top en buildProductIAOptions
  → Verificar que el buildLayout del template también respeta textSide
  → Testear con valores "top" y "bottom" generados por OpenAI
```

---

## 9. PATRÓN CINEMATOGRÁFICO — Cómo `bebas-urgencia-top` logra calidad editorial

Este template produce creativos visualmente superiores a la media. No es por el pipeline —
el código es el mismo para todos los templates. La diferencia está en cómo se codifican
las decisiones de dirección de arte directamente en los prompts.

### 9.1 El principio: Art Direction como código

En la mayoría de los templates el pipeline le pide a la IA que invente la escena.
En `bebas-urgencia-top`, un humano codificó la visión cinematográfica en los prompts y
la IA solo personaliza dentro de esa visión.

```
Templates normales:    IA decide qué poner en escena → resultado variable
Templates cinemáticos: Humano define la visión → IA personaliza → resultado consistente
```

### 9.2 Los cinco componentes del patrón

#### Componente 1: `categoryBackgroundPrompts` (fondos de dirección de arte)

Diez variantes de fondo, uno por categoría, escritos como notas de dirección fotográfica.
Cada uno especifica: **espacio + fuente de luz + atmósfera + negativos**.

```typescript
"belleza-cosmetica":
  "Minimalist dark vanity room, polished marble countertop,
   warm amber side light casting soft shadows,
   blurred mirror reflection deep in background,
   matte charcoal walls with subtle texture,
   single warm tungsten spotlight from upper left.
   No people, no products, no text. Cinematic editorial beauty."
```

**Estructura consistente en todos:**
1. Espacio concreto (no genérico)
2. Material de superficie (mármore, goma, concreto, madera)
3. Fuente de luz única nombrada explícitamente (overhead spotlight, desk lamp, pendant light)
4. Atmósfera emocional (sophisticated, athletic, serene, intimate)
5. Lista de negativos (No people, no products, no text)

`rawBackgroundPrompt: true` protege estos prompts: Gemini los recibe exactamente como
están escritos, sin modificación por parte de ninguna IA.

#### Componente 2: `defaultProductPrompt` (dirección de persona)

No es un prompt de "insertar producto" — es un documento de dirección de casting y fotografía.

```typescript
"Do NOT show any product. Generate a REAL PERSON in a quiet, elegant PAIN-POINT moment —
 editorial, cinematic, sophisticated.
 A professional person, late 20s to early 40s,
 experiencing a moment of genuine frustration or exhaustion:
   eyes closed with one hand resting gently on their forehead, OR
   chin resting on clasped hands with a distant troubled gaze, OR
   sitting upright with arms loosely crossed and eyes looking downward.
 The expression conveys quiet overwhelm — composed but emotionally honest, not theatrical."
```

**Elementos cinematográficos codificados:**
- Rango etario específico (late 20s to early 40s)
- Tres opciones de pose con descripción de detalle físico
- Descripción de estado emocional en términos de actuación ("not theatrical")
- Especificación de vestuario ("smart-casual, fitted clothing, subtle fabric texture")
- Iluminación: "single soft key light from above-left or side window, sculpted shadows"
- Profundidad de campo: "shallow depth of field, cinematic film quality"
- Cuadre: "fills most of the frame from upper chest to just above the head. Centered horizontally"

#### Componente 3: `templateHint` con ejemplos de sceneAction

El templateHint no solo describe el template — le enseña a OpenAI a escribir
en lenguaje cinematográfico. Los ejemplos por categoría son la clave:

```
Example (belleza): "Woman in her late 20s seated at a dark vanity,
  chin resting on clasped hands, troubled gaze, warm soft side light, editorial beauty"

Example (fitness): "Athletic man in his 30s, seated on a dark gym bench,
  elbows on knees, head bowed, single overhead spotlight, cinematic"

Example (servicios): "Professional woman in her 30s,
  eyes closed with hand on forehead, dark minimal office background,
  single side light, cinematic"
```

**Patrón de los ejemplos:**
`[género] [en sus N años] [pose específica], [setting específico], [fuente de luz], [estilo]`

OpenAI imita este patrón y aprende que sceneAction = brief de dirección de fotografía.

#### Componente 4: `skipExpandSceneBrief: true`

Los otros templates usan `expandSceneBrief()` (Gemini Flash) para expandir el sceneAction
corto de OpenAI a un prompt largo detallado.

`bebas-urgencia-top` lo omite. ¿Por qué?

Porque los ejemplos del templateHint ya enseñan a OpenAI a escribir en el lenguaje
correcto para Gemini. La expansión agregaría ruido. El prompt llega a Gemini directamente.

```
Otros templates:  OpenAI (brief corto) → Gemini Flash (expansión) → Gemini Image
bebas-urgencia:   OpenAI (brief cinematográfico) ─────────────────→ Gemini Image
```

#### Componente 5: `personOnly: true` + `sceneFullBleed: true`

Sin producto, sin split de zonas — Gemini tiene todo el canvas para la persona.
El copyZone="top" solo afecta la absolute rule de posición: la cara debe estar
por debajo del 30% vertical, dejando espacio para el headline Bebas Neue.

### 9.3 Por qué el sistema produce calidad editorial consistente

| Decisión | Sin el patrón | Con el patrón |
|----------|--------------|---------------|
| Fondo | IA inventa un fondo genérico | Humano define atmósfera oscura + luz específica |
| Persona | IA elige pose y expresión | Humano define tres opciones de pose con detalle físico |
| Iluminación | IA decide qué luz poner | "single soft key light from above-left or side window" |
| sceneAction | OpenAI escribe lo que quiera | OpenAI imita los ejemplos del templateHint |
| Expansión | Gemini Flash puede agregar ruido | Se omite — el brief ya está en formato correcto |
| Distracción | Producto puede competir con persona | personOnly: true, todo el canvas para la emoción |

### 9.4 Cómo replicar este patrón en nuevos templates

Para crear un nuevo template con calidad cinematográfica:

**1. Definir la emoción central del template**
No "persona usando el producto" sino "qué momento emocional específico captura este template".
bebas-urgencia-top: "quiet overwhelm, composed but emotionally honest, not theatrical".

**2. Escribir `defaultProductPrompt` como brief de casting + fotografía**
- Rango etario
- Tres opciones de pose (dan variedad sin perder el concepto)
- Estado emocional en términos de actuación
- Iluminación: una sola fuente, posición nombrada
- Cuadre: qué parte del cuerpo entra en frame
- Palabras de estilo: "cinematic", "editorial", "photorealistic", "film photography"

**3. Escribir `categoryBackgroundPrompts` por nicho**
- Espacio concreto del nicho (no "interior oscuro" sino "dark premium gym interior")
- Un material de superficie mencionado (caucho, mármol, madera, stone)
- Una fuente de luz única nombrada (overhead spotlights, pendant light, tungsten spotlight)
- Terminar SIEMPRE con: "No people, no products, no text. Cinematic [adjetivo del nicho]."

**4. Escribir ejemplos de sceneAction en el templateHint**
Usar el patrón: `[persona] [pose], [setting], [luz], [estilo]`
Un ejemplo por categoría principal del template.

**5. Activar `skipExpandSceneBrief: true` cuando los ejemplos son buenos**
Si los ejemplos de sceneAction en el templateHint son suficientemente detallados, omitir
la expansión de Gemini Flash. Menos llamadas IA, menos ruido.

**6. Usar `rawBackgroundPrompt: true`**
Los fondos cinematográficos artesanales no deben ser modificados por ninguna IA.

### 9.5 Límites del patrón

- **No sirve para templates con producto visible**: la calidad cinematográfica viene de
  "pureza" escénica (personOnly). En cuanto hay producto, la composición se complica.
- **No es adaptable por ángulo**: el defaultProductPrompt define una emoción fija.
  Si el ángulo es "transformación positiva", la persona en pain-point se contradice.
  Solución: múltiples defaultProductPrompt según ángulo (no implementado aún).
- **Los fondos oscuros limitan la paleta**: este patrón solo funciona con fondo oscuro
  + texto blanco. Para fondos claros se necesita otro enfoque (ver `persona-producto-top`).

---

## 10. INCONSISTENCIAS ESTRUCTURALES MENORES

1. **`editorial-lifestyle-left`** y **`editorial-lifestyle-right`** son casi idénticos pero `editorial-lifestyle-right` tiene `active: false`. El `textSide` de `editorial-lifestyle-left` ya permite generar ambas variantes — `editorial-lifestyle-right` es redundante.

2. **`compositionMode: "scene-with-product"`** cubre dos patrones diferentes:
   - `persona-producto-left`: persona real sostiene producto (foco en estilo lifestyle)
   - `editorial-center-top`: persona usando producto + texto encima (foco editorial)
   Ambos usan el mismo código path pero el prompt y el layout son radicalmente distintos. No es un bug pero complica la comprensión del modo.

3. **`PIPELINE_V2`** fue migrado: `bebas-urgencia-top` ya no usa `pipelineV2: true` (hay un `// TODO: ELIMINAR` en route.ts línea 676 que lo confirma). Todos los templates usan V1. El flag puede eliminarse.

4. **`sceneAction` implícito** (route.ts:451-456): Se agrega silenciosamente al schema pero solo algunos templates lo usan. La intención es buena (siempre tener un sceneAction disponible como fallback) pero genera confusión y tokens extra. Sería más explícito si meta.ts declarara un flag `alwaysGenerateSceneAction?: boolean` o si siempre estuviera en el copySchema de los templates que lo necesitan.
```

---

## 10. CAMBIOS APLICADOS (2026-03-17)

Auditoría del flujo completo para `persona-producto-top` y aplicación de 4 fixes de coherencia visual.

### 10.1 GAPs identificados en la auditoría

| # | GAP | Descripción |
|---|-----|-------------|
| G1 | `expandSceneBrief` ciego al background | `backgroundPrompt` solo se pasaba cuando `personOnly === true`. Para `scene-with-product`, la persona expandida se generaba sin saber nada del fondo → posible incoherencia de ambiente y luz |
| G2 | `defaultProductPrompt` no llega a GPT | `templateVisualDirectionBlock` gateado por `!args.templateHint`. Para `persona-producto-top` (tiene templateHint), la descripción detallada de `defaultProductPrompt` nunca la ve GPT al generar `sceneAction` |
| G3 | `backgroundPrompt` en copySchema no documentado | El análisis inicial marcaba `backgroundPrompt` como "no en copySchema", pero sí está. GPT lo generaba, pero sin restricción de tono claro |
| G4 | `sceneAction` generado en español | Sin instrucción explícita, GPT generaba `sceneAction` en español cuando el contexto de marca era en español. Gemini Image rinde mejor con inglés |

### 10.2 Cambios aplicados

**[1] `src/app/api/compose/route.ts` — expandContext `backgroundPrompt`**

```diff
- backgroundPrompt: body.personOnly === true
-   ? (body.backgroundStyleGuide as string | undefined)
-   : undefined,
+ backgroundPrompt: (body.personOnly === true || copyTemplateMeta?.sceneWithProduct === true)
+   ? ((result as any)?.backgroundPrompt as string | undefined) ?? (body.backgroundStyleGuide as string | undefined)
+   : undefined,
```

- Para `scene-with-product`: pasa primero `copy.backgroundPrompt` (GPT-generado), fallback a `backgroundStyleGuide`
- Para arrays de variantes: `result?.backgroundPrompt` es `undefined` → cae al `backgroundStyleGuide` (aceptable)
- Resuelve **G1**

**[2] `src/lib/ai/gemini.ts` — `expandSceneBrief()` nuevo bloque de coherencia**

Agrega `backgroundCoherenceBlock` antes de `SHORT SCENE DESCRIPTION`:

```typescript
const backgroundCoherenceBlock = args.backgroundPrompt && !args.personOnly
  ? `\nBACKGROUND ALREADY DEFINED — the background image has been generated separately with this description:
"${args.backgroundPrompt}"

Your expanded sceneAction MUST be visually coherent with that background:
- Match the same light temperature and direction (warm/cool/neutral)
- Match the same color palette and atmospheric mood
- The person will be COMPOSITED onto this background — they must feel like they belong
- Do NOT describe a different room or setting that contradicts the background
- You CAN add person-specific details but the environmental feel must align\n`
  : "";
```

- Solo activa para `scene-with-product` (no `personOnly`)
- `personOnly` ya tenía su propio bloque; se mantiene sin cambios
- Resuelve **G1**

**[3] `src/services/product-composer/templates/meta.ts` — `defaultBackgroundPrompt` de `persona-producto-top`**

Agrega restricción LIGHT-TONED al inicio del string:

```
"CRITICAL: This background must be LIGHT-TONED — very pale, soft, and bright.
No dark surfaces, no strong saturated colors, no dramatic shadows.
Dark typography renders on top of this background and requires maximum contrast
with a light base. Even if the scene describes a warm or moody environment,
the background must stay light and airy.

Soft blurred modern studio or home interior..."
```

- Fluye como `backgroundStyleGuide` → GPT → `copy.backgroundPrompt` → `resolveBgPrompt()`
- También actúa como fallback directo en `resolveBgPrompt()` si `copy.backgroundPrompt` llega vacío
- Resuelve **G3** parcialmente

**[4] `src/lib/ai/openai.ts` — FIELD_RULE `backgroundPrompt` y `sceneAction`**

`backgroundPrompt`: agrega bloque antes del style guide instruction:
```
CRITICAL FOR LIGHT-TEXT TEMPLATES: The backgroundPrompt MUST generate a light-toned,
pale, bright background. Dark typography renders on top — any medium or dark surface
will make text unreadable. This constraint overrides creative adaptation: even if
sceneAction describes a bathroom with white tiles, a dark room, or a moody environment,
the backgroundPrompt MUST remain light, airy and soft. No tile grids, no strong patterns,
no dark walls, no saturated surfaces. If the scene is a bathroom → generate a soft blurred
white studio, not literal bathroom tiles. Abstract the environment, don't reproduce it literally.
```

`sceneAction`: agrega al inicio del string:
```
CRITICAL: Write this entire field in ENGLISH only. Gemini image generation performs
significantly better with English prompts. Never write sceneAction in Spanish,
regardless of the brand language.
```

- El FIELD_RULE de `backgroundPrompt` se activa siempre que el campo esté en `filteredSchema`
- La restricción de inglés aplica a todos los templates con `sceneAction` en schema
- Resuelve **G3** (refuerzo) y **G4**

### 10.3 Flujo completo post-fixes para `persona-producto-top`

```
1. Frontend (page.tsx)
   backgroundStyleGuide = defaultBackgroundPrompt (con CRITICAL LIGHT-TONED)
   → POST /api/compose { mode: "GENERATE_COPY", backgroundStyleGuide, templateId }

2. route.ts → generateTemplateCopyOpenAI()
   - filteredSchema incluye "backgroundPrompt" (rawBackgroundPrompt no definido)
   - FIELD_RULE["backgroundPrompt"]: CRITICAL LIGHT-TONED + style guide constraint
   - backgroundStyleGuideBlock inyectado (backgroundStyleGuide presente + backgroundPrompt en schema)
   - templateVisualDirectionBlock: NO (hay templateHint) — defaultProductPrompt no llega a GPT
   - templateHintBlock: SÍ — cubre reglas de sceneAction con TOP 40% constraint
   - FIELD_RULE["sceneAction"]: fuerza inglés explícitamente
   → GPT genera: badge, headline, subheadline, title, sceneAction (inglés), backgroundPrompt (claro)

3. route.ts → expandSceneBrief()
   - hasSceneAction: true (backgroundPrompt en copySchema original)
   - expandContext.backgroundPrompt = copy.backgroundPrompt ?? backgroundStyleGuide
   - gemini.ts: backgroundCoherenceBlock inyectado (backgroundPrompt presente, no personOnly)
   → sceneAction expandida coherente con el fondo claro

4. Frontend → resolveBgPrompt(meta, copy, businessProfile)
   - Branch 1 (dark mode): NO
   - Branch 2 (rawBackgroundPrompt): NO (undefined)
   - Branch 3 (copy.backgroundPrompt): SÍ → usa el backgroundPrompt generado por GPT
   → bgPrompt = copy.backgroundPrompt (claro, coherente con estilo de marca)

5. POST /api/compose { mode: "GENERATE_BACKGROUND", prompt: bgPrompt }
   → Gemini genera fondo claro apto para tipografía oscura

6. POST /api/compose { mode: "PRODUCT_IA" }
   → expandSceneBrief output → buildAvatarWithProductPrompt / buildScenePrompt
   → persona coherente con fondo, TOP 40% libre
```

### 10.4 GAP residual no resuelto

**G2** (`defaultProductPrompt` no llega a GPT): la descripción de nivel Gemini (85mm f/1.8, flyaways, skin texture...) sigue sin inyectarse al prompt de GPT porque `templateVisualDirectionBlock` está gateado por `!args.templateHint`. El `templateHint` cubre los constraints de posicionamiento (TOP 40%, full width) pero no el nivel fotográfico de `defaultProductPrompt`. El `sceneAction` que GPT genera es suficientemente bueno para guiar a Gemini, pero hay margen de mejora si se inyecta `defaultProductPrompt` como referencia adicional cuando existe `personScene: true`.

---

## CAMBIOS APLICADOS — 2026-03-17 (sesión bebas-urgencia-top)

### Auditoría tipográfica y correcciones del pipeline

**Contexto**: `bebas-urgencia-top` renderizaba con fuente incorrecta, sin texto visible y con composición de capas invertida.

#### Fix 1 — `BebasNeue-Regular.ttf` era un archivo HTML de GitHub

El archivo en `public/fonts/BebasNeue-Regular.ttf` tenía magic bytes `0a0a0a0a` (HTML) en lugar de `00010000` (TTF válido). Se había descargado desde la página web de GitHub en lugar del raw binary. resvg lo rechazaba silenciosamente y hacía fallback a otra fuente disponible.

**Solución**: Reemplazado con el TTF real descargado desde Google Fonts CDN (`fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXooxW4.ttf`, 56KB).

#### Fix 2 — `fontFamily: "Recoleta"` → `"Bebas Neue"`

**Archivo**: `src/services/product-composer/templates/bebas-urgencia-top.ts`

El textBlock declaraba `fontFamily: "Recoleta"`. En `normalizeFontFamily()` (textRenderer.ts), la rama `key.includes("recoleta")` → `"DM Serif Display"` matchea antes que `key.includes("bebas")`. Resultado: resvg cargaba DM Serif Display (serif con gracia), no Bebas Neue.

**Impacto secundario resuelto**: El factor de medición de wrapping también estaba desalineado — el template usaba `BEBAS_FACTOR = 0.80` internamente pero `getFontFamilyFactor("Recoleta") = 1.08` en textRenderer. Diferencia del ~35% que causaba truncado prematuro con `...`.

#### Fix 3 — `fontWeight: "700"` → `"400"`

**Archivo**: `src/services/product-composer/templates/bebas-urgencia-top.ts`

Solo existe `BebasNeue-Regular.ttf` (weight 400). Con `loadSystemFonts: false`, resvg no puede sintetizar bold. Cuando no encuentra weight 700, hace fallback silencioso. Bebas Neue Regular es visualmente pesada por diseño — no requiere bold.

#### Fix 4 — `compositionOrder` incorrecto para `sceneFullBleed`

**Archivo**: `src/services/product-composer/templates/meta.ts` → `buildProductIAOptions()`

```diff
- compositionOrder: "template-first",
+ compositionOrder: meta.sceneFullBleed === true ? "scene-first" : "template-first",
```

**Problema**: Para todos los templates `scene-only`, el order era `"template-first"` hardcodeado. Para `bebas-urgencia-top` (`sceneFullBleed: true`), esto significaba:
1. TEMPLATE_BETA: renderiza overlay + headline sobre el fondo limpio ✓
2. PRODUCT_IA (sceneMode + sceneFullBleed): Gemini genera escena que cubre **todo el canvas** → texto tapado ✗

**Solución**: `sceneFullBleed: true` → `"scene-first"`: Gemini genera escena primero sobre fondo limpio, luego TEMPLATE_BETA aplica overlay + texto encima. Los demás `scene-only` (zona izquierda/derecha) siguen en `"template-first"` — Gemini recibe el texto como contexto y evita la zona.

#### Fix 5 — Overlay oscuro removido

**Archivo**: `src/services/product-composer/templates/bebas-urgencia-top.ts`

```diff
- overlays: [{ type: "solid", x: 0, y: 0, w: CW, h: CH, color: "#000000", opacity: 0.52 }],
+ overlays: [],
```

Los `categoryBackgroundPrompts` y `defaultBackgroundPrompt` de este template son explícitamente oscuros ("dark studio interior", "charcoal walls", etc.), por lo que el overlay del 52% era redundante y aplanaba visualmente la imagen.

#### Fix 6 — Absolute rule de posición en `buildZonePlacement` (fullBleed + top)

**Archivo**: `src/lib/ai/promptRules.ts`

```diff
- - The person FILLS THE ENTIRE CANVAS — full-bleed, edge-to-edge, cinematic framing.
- - IMPORTANT: the TOP 25% of the image will have a text headline overlay. The person's FACE and upper chest should NOT be centered in that top 25% — position the face in the center or lower-center of the canvas so the headline reads clearly over the person's shoulders, hair, or negative space.
- - The person's body, arms, and silhouette MAY extend into the top area — only the FACE should avoid being directly behind the headline text.
- - Logo will be rendered at the top-left corner — avoid placing the person's face directly behind that small area.
+ ================================================================================
+ ABSOLUTE POSITION RULE — NON-NEGOTIABLE
+ ================================================================================
+ - The person FILLS THE ENTIRE CANVAS — full-bleed, edge-to-edge, cinematic framing.
+ - The TOP 30% of the canvas is reserved for a text headline and logo. This zone MUST remain visually clear.
+ - The person's FACE must be positioned ENTIRELY BELOW the 30% vertical line — face center must be at or below 40% from the top.
+ - The person's body, arms, hair, and silhouette MAY extend into the top 30% — ONLY the FACE must stay below.
+ - The TOP-LEFT corner (first 15% width × 12% height) is reserved for the logo — do NOT place the face or any focal element there.
+ - A composition where the face appears in the top 30% is INVALID and will be rejected.
+ ================================================================================
```

**Justificación del 30% vs 25%**: el headline de bebas-urgencia-top ocupa `HL_Y = CH * 0.10` (10%) hasta ~27% más la caja del logo (top-left, ~12% altura). 30% cubre el rango real con margen de seguridad.

---

## CAMBIOS APLICADOS — 2026-03-14

### TAREA 2 — Refactor `generateTemplateCopyOpenAI()` (openai.ts)

**Problema:** OpenAI generaba campos que el pipeline luego ignoraba en silencio según flags de template (`rawBackgroundPrompt`, `rawProductPrompt`), desperdiciando tokens.

**Cambios en `src/lib/ai/openai.ts`:**

1. **Extensión del tipo `template?`** — 3 campos nuevos:
   ```typescript
   compositionMode?: string;
   rawBackgroundPrompt?: boolean;
   rawProductPrompt?: boolean;
   ```

2. **`filteredSchema`** — computado dinámicamente antes de construir el prompt:
   ```typescript
   const filteredSchema = args.templateSchema.filter((field) => {
     if (tpl?.rawBackgroundPrompt === true &&
         (field === "backgroundColorHint" || field === "backgroundPrompt")) return false;
     if (tpl?.rawProductPrompt === true &&
         (field === "sceneAction" || field === "productPrompt")) return false;
     return true;
   });
   ```

3. **`FIELD_RULE` map** — reemplaza el bloque estático `fieldRules` (70 líneas) por un `Record<string, string>` + `dynamicFieldRules` que itera `filteredSchema`. Solo se incluyen reglas de los campos que sobreviven el filtro.

4. **`textSideBlock`** — condicional en `filteredSchema` + `template.id`:
   - `editorial-lifestyle-left` → instrucciones `"left"/"right"`
   - `editorial-center-top` → instrucciones `"top"/"bottom"`
   - Si `textSide` no está en filteredSchema → string vacío

5. **`sceneWithProductNote`** — activo cuando `sceneAction` en filteredSchema **y** `compositionMode === "scene-with-product"`. Instruye a GPT a describir la interacción persona+producto.

6. **`needsSceneExamples`** — ahora usa `filteredSchema` en lugar de `args.templateSchema`. Cuando `rawProductPrompt: true` elimina `sceneAction`, `getSceneLibrarySection()` se omite completamente.

7. **Log añadido:** `[COPY_GEN:SCHEMA_FILTER]` muestra campos eliminados y flags activos.

**Cambios en `src/app/api/compose/route.ts`:**
- El objeto `template` pasado a `generateTemplateCopyOpenAI()` ahora incluye `compositionMode`, `rawBackgroundPrompt`, `rawProductPrompt` leídos de `copyTemplateMeta`.

**Tokens ahorrados por template (estimado):**

| Template | Campos eliminados | Motivo |
|---|---|---|
| `bebas-urgencia-top` | `backgroundColorHint`, `backgroundPrompt`, `sceneAction`, `productPrompt` | `rawBackgroundPrompt: true` + `rawProductPrompt: true` |
| `classic-editorial-right` | `backgroundColorHint`, `backgroundPrompt` | `rawBackgroundPrompt: true` |
| `editorial-lifestyle-left` | `backgroundColorHint`, `backgroundPrompt` | `rawBackgroundPrompt: true` |
| `persona-producto-left` | `backgroundColorHint`, `backgroundPrompt` | `rawBackgroundPrompt: true` |
| `producto-hero-top` | `backgroundColorHint`, `backgroundPrompt` | `rawBackgroundPrompt: true` |

---

### TAREA 3 — Migración `bebas-urgencia-top` de Pipeline V2 a V1

**Problema:** `bebas-urgencia-top` era el único template con `pipelineV2: true`, activando un pipeline alternativo de 4 pasos (2 llamadas OpenAI extra) que generaba su propia escena independiente del copy generado en GENERATE_COPY. El `sceneAction` de V1 nunca llegaba a Gemini en V2.

**Comparativa V2 vs V1:**

| Aspecto | Pipeline V2 (eliminado) | Pipeline V1 (actual) |
|---|---|---|
| Llamadas OpenAI | 2 (`deriveStrategicCore` + `generateCreativeBrief`) | 1 (`generateTemplateCopyOpenAI`) |
| Llamadas Gemini | 2 (background + scene) | 1 (scene con sceneAction) |
| `sceneAction` llega a Gemini | No — V2 genera su propia descripción | Sí — como `effectivePrompt` en `buildProductIAOptions` |
| Personalización por ángulo | No (brief genérico) | Sí (cada ángulo tiene su `sceneAction`) |
| Complejidad de código | Alta (4 módulos dedicados) | Estándar (misma ruta que todos) |

**Cambio aplicado en `src/services/product-composer/templates/meta.ts`:**
```diff
- pipelineV2: true,
  description: "Escena de urgencia full-bleed..."
```

**Riesgo:** Bajo. El buildLayout de `bebas-urgencia-top` solo usa `copy.headline` — completamente independiente del pipeline. La calidad visual depende ahora de la `sceneAction` generada por OpenAI en GENERATE_COPY, que V1 pasa a Gemini como prompt de escena.

**Pendiente:** El bloque PIPELINE_V2 en route.ts (líneas ~636-727) permanece en el código con `// TODO: ELIMINAR PIPELINE_V2`. Eliminarlo una vez confirmado que bebas-urgencia-top funciona correctamente en V1.

---

### TAREA 4 — Fixes seguros

#### Fix #4 — Eliminar `backgroundColorHint` de copySchemas

Campos que OpenAI generaba pero el pipeline ignoraba completamente (flag `rawBackgroundPrompt: true` descarta `backgroundColorHint` en `resolveBgPrompt()`):

- **`classic-editorial-right`** — eliminado de `copySchema`:
  ```diff
  - copySchema: ["title", "headline", "subheadline", "badge", "bullets", "backgroundColorHint"]
  + copySchema: ["title", "headline", "subheadline", "badge", "bullets"]
  ```
- **`editorial-lifestyle-left`** — eliminado de `copySchema`:
  ```diff
  - copySchema: ["headline", "subheadline", "badge", "backgroundColorHint", "sceneAction", "textSide"]
  + copySchema: ["headline", "subheadline", "badge", "sceneAction", "textSide"]
  ```

#### Fix #5 — Eliminar secciones muertas de `templateHint`

Campos documentados en templateHint que nunca estaban en copySchema → OpenAI nunca los generaba pero el sistema prompt describía reglas para ellos (dead documentation):

- **`classic-editorial-right`** — eliminada sección `productPrompt` del templateHint.
- **`persona-producto-left`** — eliminadas secciones `backgroundPrompt` y `productPrompt` del templateHint.

#### Fix #6 — Limpiar comentarios residuales de desarrollo

- **`route.ts`** — Eliminados:
  - `// Líneas 312-322 — agregar el else if de TEMPLATE_BETA` (comentario de TO-DO histórico ya ejecutado)
  - Todas las anotaciones `// ← AGREGAR` en el bloque TEMPLATE_BETA (código ya estaba en producción)
- **`composeWithProductIA.ts`** — Eliminado: `// ← esta línea falta` en línea 306.
- **`route.ts`** — Añadido: `// TODO: ELIMINAR PIPELINE_V2` para marcar el bloque PIPELINE_V2 como candidato a eliminar.

---

### Fix #2 — `pain-point-left`: `sceneAction` activado en la cadena completa

**Problema:** `sceneAction` estaba descripto en el `templateHint` (con instrucciones correctas) pero ausente del `copySchema`. Esto causaba:
- `hasSceneAction = fullSchema.includes("sceneAction")` → `false` → sin expansión Gemini Flash
- `meta.copySchema.includes("sceneAction")` → `false` → `effectivePrompt = defaultProductPrompt` (siempre el mismo genérico)
- Cada ángulo/tono recibía idéntica escena de persona, perdiendo la variación contextual del pain point.

**Cambio en `src/services/product-composer/templates/meta.ts` — línea 344:**
```diff
  copySchema: [
    "headline",
    "subheadline",
    "badge",
    "backgroundColorHint",
+   "sceneAction",
  ],
```

**Impacto por paso del pipeline:**

| Paso | Antes | Después |
|------|-------|---------|
| `hasSceneAction` (route.ts:546) | `false` | `true` → Gemini Flash expande el brief |
| `filteredSchema` (openai.ts) | sceneAction implícito vía `fullSchemaWithScene`, sin regla formal | sceneAction en schema oficial → `FIELD_RULE["sceneAction"]` activo |
| `needsSceneExamples` (openai.ts:375) | `false` | `true` → scene library inyectada |
| `effectivePrompt` (meta.ts:1732) | `meta.defaultProductPrompt` (genérico fijo) | `copy.sceneAction` expandido por Gemini Flash |
| `sceneWithProductNote` | vacío (`compositionMode = "scene-only"`) | vacío ✓ sin efecto colateral |
| `templateVisualDirectionBlock` | incluye `defaultProductPrompt` como referencia visual | igual ✓ refuerza constraint "person right, left clean" |

**Notas:**
- `rawProductPrompt` no está seteado en pain-point-left → el filtro de TAREA 2 no elimina `sceneAction`.
- `defaultProductPrompt` permanece como fallback en `buildProductIAOptions` si `copy.sceneAction` llega vacío.
- El `templateHint` ya tenía instrucciones correctas para `sceneAction` (líneas 382-389 de meta.ts) — el fix solo alinea el copySchema con lo que el hint ya describía.

---

### Fix #1 — `producto-hero-top`: `rawBackgroundPrompt` eliminado, `backgroundPrompt` activado

**Problema (bug en cadena):** `rawBackgroundPrompt: true` causaba dos bloqueos simultáneos:
1. `openai.ts` filteredSchema (TAREA 2): filtraba `backgroundPrompt` del schema → OpenAI **nunca generaba** el campo aunque estuviera en copySchema.
2. `resolveBgPrompt()` en page.tsx: Branch 1 (`rawBackgroundPrompt`) retornaba `categoryBackgroundPrompts[category]` antes de alcanzar Branch 2 (`copy.backgroundPrompt`). El campo generado se habría ignorado de todas formas.

Resultado: tokens pagados a OpenAI por un `backgroundPrompt` específico al producto que nunca se usaba. El background era siempre el `categoryBackgroundPrompts["belleza-cosmetica"]` genérico.

**Cambio en `src/services/product-composer/templates/meta.ts` — línea 1196:**
```diff
    ],
- rawBackgroundPrompt: true,
  rawProductPrompt: true,
  defaultBackgroundPrompt:
    "Minimalist premium studio background...
```

**Cadena activada:**
| Paso | Antes | Después |
|------|-------|---------|
| openai.ts filteredSchema | `backgroundPrompt` filtrado (rawBackgroundPrompt=true) | `backgroundPrompt` generado por OpenAI ✓ |
| resolveBgPrompt Branch 1 | `rawBackgroundPrompt` → early return con `categoryBackgroundPrompts` | Branch 1 no activa → cae a Branch 2 ✓ |
| resolveBgPrompt Branch 2 | nunca alcanzado | `copy.backgroundPrompt` devuelto como prompt final ✓ |
| Background de Gemini | siempre el genérico de categoría | específico al producto generado por OpenAI ✓ |

**Templates con `rawBackgroundPrompt: true` no afectados** (`classic-editorial-right`, `editorial-lifestyle-left`, `persona-hero-bottom`, `bebas-urgencia-top`): ninguno tiene `backgroundPrompt` en su copySchema → openai.ts ya no lo genera para ellos → `copy.backgroundPrompt = undefined` → Branch 2 no aplica → Branch 1 maneja igual que antes. ✓

`rawProductPrompt: true` se mantiene — solo afecta el flujo PRODUCT_IA, no el background.

---

### Fix #3 — `editorial-center-top`: `textSide` ahora flipa `copyZone` en PRODUCT_IA y en el layout

**Problema:** OpenAI generaba `textSide: "top" | "bottom"` (según templateHint, línea 1068-1072) pero:
1. `buildProductIAOptions()` solo manejaba `textSide` para `editorial-lifestyle-left` → `copyZone` siempre quedaba `"top"` independientemente de lo que OpenAI decidiera.
2. `buildEditorialCenterTopLayout()` tenía todas las posiciones hardcodeadas → nunca leía `copy.textSide`.

**Cambio 1 — `src/services/product-composer/templates/meta.ts` — buildProductIAOptions (~línea 1728):**
```diff
  if (
    meta.id === "editorial-lifestyle-left" &&
    typeof copy.textSide === "string" &&
    ["left", "right"].includes(copy.textSide as string)
  ) {
    copyZone = copy.textSide as "left" | "right";
- }
+ } else if (
+   meta.id === "editorial-center-top" &&
+   typeof copy.textSide === "string" &&
+   ["top", "bottom"].includes(copy.textSide as string)
+ ) {
+   copyZone = copy.textSide as "top" | "bottom";
+ }
```

**Cambio 2 — `src/services/product-composer/templates/editorial-center-top.ts` — buildLayout:**

Agregado `BOTTOM_MODE` al inicio del buildLayout. Posiciones según modo:

| Elemento | TOP mode (default) | BOTTOM mode |
|---|---|---|
| `BADGE_Y` | `CH * 0.035` | `CH * 0.52` |
| `HEADLINE_Y` | `CH * 0.14` | `CH * 0.585` |
| `SUB_Y` cap | `CH * 0.40` | `CH * 0.88` |
| `CTA_Y` (sobre persona) | `CH * 0.875` | `CH * 0.125` |

```diff
+ const BOTTOM_MODE = (copy as Record<string, unknown>).textSide === "bottom";
  ...
- const HEADLINE_Y = Math.round(CH * 0.14);
+ const HEADLINE_Y = Math.round(CH * (BOTTOM_MODE ? 0.585 : 0.14));
  ...
-   Math.round(CH * 0.40),
+   Math.round(CH * (BOTTOM_MODE ? 0.88 : 0.40)),
  ...
- const BADGE_Y = Math.round(CH * 0.035);
+ const BADGE_Y = Math.round(CH * (BOTTOM_MODE ? 0.52 : 0.035));
  ...
- const CTA_Y = Math.round(CH * 0.875);
+ const CTA_Y = Math.round(CH * (BOTTOM_MODE ? 0.125 : 0.875));
```

CTA siempre queda en la zona de la persona (bottom mode: persona en top 50% → CTA en 12.5%; top mode: persona en bottom 50% → CTA en 87.5%).

---

### Fix: conflicto Visual Direction vs textSide — 2026-03-16

**Bug:** `FIELD_RULE["sceneAction"]` item [6] le decía a OpenAI "seguí la Visual Direction strictamente" pero `templateVisualDirectionBlock` inyectaba `defaultProductPrompt` con zona hardcodeada ("RIGHT side", "BOTTOM 40%") que contradecía la elección dinámica de `textSide`. El `templateHint` tenía la instrucción correcta ("persona en el lado OPUESTO a textSide") pero item [6] la pisaba por ser más explícito y marcar Visual Direction como `PRIMARY reference`.

**Causa raíz:** dos fuentes de verdad para la zona del `sceneAction`. `textSide` es un OUTPUT de OpenAI — no existe en el momento en que se construye el prompt. Imposible hacer `templateVisualDirectionBlock` dinámico sin pre-seleccionar `textSide` (lo que eliminaría la variación).

**Fix aplicado:**
- `src/services/product-composer/templates/meta.ts`: zona eliminada de `defaultProductPrompt` en `editorial-lifestyle-left` y `editorial-center-top`. Ambos conservan descripción de estilo/calidad visual sin instrucciones de posición.
- `src/lib/ai/openai.ts`: item [6] de `FIELD_RULE["sceneAction"]` ahora es dinámico — si `textSide` está en `filteredSchema`, usa las 4 combinaciones explícitas (left/right/top/bottom → zona inversa); si no, usa Visual Direction como antes.

**Resultado:** `textSide` es la única fuente de verdad para zona en toda la cadena: item [6] OpenAI → `buildProductIAOptions()` → `buildZonePlacement()` Gemini.

**Templates afectados:** `editorial-lifestyle-left`, `editorial-center-top`

**Riesgo:** bajo — `defaultProductPrompt` sin zona sigue válido como fallback en `buildScenePrompt()` / `buildAvatarWithProductPrompt()`, donde la zona la aporta el wrapper via `buildZonePlacement()`. ✓

---

### textSide como propiedad fija de diseño — 2026-03-16

**Bug descubierto:** Fix #3 (2026-03-14) implementó `BOTTOM_MODE` en `buildEditorialCenterTopLayout()` y el flip de `copyZone` en `buildProductIAOptions()` — pero ambos leían `copy.textSide` generado por OpenAI. El `textSide` **nunca llegaba al buildLayout** porque `composeWithTemplateBeta.ts` construía el objeto copy sin ese campo (page.tsx tampoco lo incluía en el FormData de TEMPLATE_BETA). Resultado: `BOTTOM_MODE` era siempre `false` en producción. Fix #3 del layout nunca se activó.

**Causa raíz adicional:** `textSide` no debía ser un campo generado por OpenAI — es una propiedad fija de diseño del template. OpenAI no debería decidir el layout side; el designer lo define en meta.ts.

**Fix aplicado — 2026-03-16:**

| Archivo | Cambio |
|---------|--------|
| `meta.ts` — `TemplateMetadata` | Agregado `textSide?: "left" \| "right" \| "top" \| "bottom"` como propiedad fija |
| `meta.ts` — `editorial-lifestyle-left` | `textSide: "left"` + eliminado `"textSide"` de copySchema |
| `meta.ts` — `editorial-center-top` | `textSide: "top"` + eliminado `"textSide"` de copySchema |
| `meta.ts` — `buildProductIAOptions()` | Reemplazado `copy.textSide` por `meta.textSide` — lógica simplificada a `if (meta.textSide) copyZone = meta.textSide` |
| `composeWithTemplateBeta.ts` | Movido `getTemplateMeta()` antes del buildLayout + agregado `textSide: meta?.textSide` en el objeto copy → `BOTTOM_MODE` ahora puede activarse |
| `route.ts` — `generateTemplateCopyOpenAI` call | Agregado `textSide: copyTemplateMeta.textSide` en el objeto `template` pasado a OpenAI |
| `openai.ts` — `template?` type | Agregado `textSide?: "left" \| "right" \| "top" \| "bottom"` |
| `openai.ts` — `FIELD_RULE["sceneAction"]` item [6] | Reemplazado `filteredSchema.includes("textSide")` por `tpl?.textSide`. Cuando definido: instrucción directa con valor fijo (no las 4 combinaciones dinámicas). Cuando no definido: Visual Direction como antes |
| `openai.ts` — `textSideBlock` | Eliminado completamente (textSide ya no es un campo a generar) |
| `openai.ts` — `FIELD_RULE["textSide"]` | Eliminado (código muerto — textSide no está en ningún copySchema) |

**Tokens ahorrados:**

| Template | Campos eliminados del copySchema | Reducción en prompt |
|---|---|---|
| `editorial-lifestyle-left` | `textSide` | ~15 tokens (FIELD_RULE + LAYOUT SIDE SELECTION block) |
| `editorial-center-top` | `textSide` | ~15 tokens (FIELD_RULE + LAYOUT SIDE SELECTION block) |

**item [6] de `FIELD_RULE["sceneAction"]` — antes vs después:**

| Caso | Antes | Después |
|---|---|---|
| `textSide` en filteredSchema | 4 combinaciones dinámicas (~50 tokens) | N/A — nunca ocurre |
| `tpl?.textSide` definido | N/A | Instrucción directa con valor fijo (~25 tokens) |
| Sin textSide | Visual Direction | Visual Direction (sin cambio) |

**Verificación de BOTTOM_MODE:**
- Antes: `composeWithTemplateBeta` no pasaba `textSide` → `BOTTOM_MODE` siempre `false`
- Después: `meta?.textSide` llega en el copy del buildLayout → `BOTTOM_MODE = copy.textSide === "bottom"` funciona correctamente cuando se agregue un template con `textSide: "bottom"`
- Para los templates actuales (`editorial-lifestyle-left: "left"`, `editorial-center-top: "top"`), `BOTTOM_MODE` sigue siendo `false` — comportamiento visual sin cambio. La infraestructura queda correcta para futuros templates.

---

### PENDIENTE (identificado pero no ejecutado)

| # | Descripción | Archivo | Prioridad |
|---|---|---|---|
| Fix TS | Normalizar `compositionMode` como discriminated union estricto en TypeScript | `meta.ts`, `types.ts` | Baja |
| PIPELINE_V2 cleanup | Eliminar bloque PIPELINE_V2 completo de route.ts (~90 líneas) y archivos asociados en `src/lib/meta/pipeline/v2/` una vez confirmado bebas-urgencia-top en V1 | `route.ts`, `src/lib/meta/pipeline/v2/` | Alta (post-validación) |

---

### Nuevo template `persona-producto-top` — 2026-03-17

**Motivación:** Híbrido entre `persona-producto-left` (composición y estética Huel/Nike con persona real sosteniendo el producto) y `editorial-center-top` (disposición de layout: panel superior limpio, texto centrado, zona de persona en la mitad inferior).

**Archivos creados/modificados:**

| Archivo | Cambio |
|---------|--------|
| `src/services/product-composer/templates/persona-producto-top.ts` | **Creado** — layout builder: badge overline centrado + headline Montserrat Bold balanceado en 2 líneas + subheadline + CTA pill centrado en panel superior (top 40%). Sin gradiente oscuro. Texto oscuro sobre fondo claro. |
| `src/services/product-composer/templates/meta.ts` | **Insertado** después de `persona-producto-left` — metadata completa del template |
| `src/services/product-composer/templates/index.ts` | **Import** + registro en `LAYOUT_BUILDERS` |

**Decisiones de diseño:**

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| `copyZone: "top"` | De `editorial-center-top` | Layout con panel superior limpio |
| `compositionMode: "scene-with-product"` | De `persona-producto-left` | Persona real sosteniendo el producto |
| `useGenericProductClone`: NO | De `persona-producto-left` | Sin clone genérico — producto real desde el inicio |
| `sceneAction` en copySchema | De `persona-producto-left` | OpenAI genera brief de escena → Gemini Flash expande → cada ángulo tiene escena distinta |
| `skipExpandSceneBrief`: NO configurado | Por defecto | Se usa `expandSceneBrief()` para enriquecer el brief de la persona |
| Tipografía: Montserrat Bold | De `persona-producto-left` | Estética Huel/Nike, no editorial serif |
| CTA en panel superior (~35-37%) | Original | A diferencia de `editorial-center-top` donde el CTA va overlaid sobre la persona |
| Sin gradiente oscuro | Original | El texto está sobre el panel superior (no sobre la persona) → fondo generado claro es suficiente |
| `defaultProductPrompt` con "TOP 40% MUST remain clear" | Original | Instrucción explícita de zona para el fallback cuando no hay sceneAction |
| `templateHint` de `sceneAction` con instrucción de zona | Original | Cada brief de OpenAI ya lleva la constraint de zona para que Gemini la reciba |

**Flujo de pipeline resultante:**
```
GENERATE_COPY  → OpenAI genera: badge, headline, subheadline, title, sceneAction (corto)
expandSceneBrief → Gemini Flash expande sceneAction → brief cinematográfico completo
GENERATE_BACKGROUND → defaultBackgroundPrompt (interior borroso cálido)
PRODUCT_IA (scene-first) → generateSceneWithAvatarAndProduct(sceneAction expandido, copyZone="top")
                            persona full-width en bottom 60%, top 40% limpio
TEMPLATE_BETA → badge + headline + subheadline + CTA pill renderizados sobre el panel superior
```

---

### Centralización promptRules.ts — 2026-03-14

#### Qué se agregó a `promptRules.ts`

```typescript
// 1. Porcentajes de zona — fuente única de verdad
export const ZONE_PERCENTAGES = {
  HORIZONTAL_SUBJECT: 42,  // width % de la zona del sujeto (splits horizontales)
  HORIZONTAL_COPY:    58,  // width % de la zona de copy (splits horizontales)
  VERTICAL_SUBJECT:   45,  // height % de la zona del sujeto (scene/product modes)
  VERTICAL_COPY:      55,  // height % de la zona de copy (scene/product modes)
  AVATAR_SUBJECT:     42,  // height % de la zona del avatar (avatar mode)
  AVATAR_COPY:        58,  // height % de la zona de copy (avatar mode)
} as const;

// 2. Inversión copyZone → productZone — única implementación
export function resolvePlacementZone(
  copyZone: string,
): "left" | "right" | "top" | "bottom" | "center"

// 3. Constructor de constraints de zona — migrado desde composeWithProductIA.ts
export function buildZonePlacement(
  copyZone: "left" | "right" | "top" | "bottom" | "center",
  mode: "scene" | "product" | "avatar",
  opts?: { fullBleed?: boolean },
): string
```

#### Tabla antes vs después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Inversión `copyZone → productZone` | 5 implementaciones paralelas en 2 archivos | 1 función `resolvePlacementZone()` en `promptRules.ts` |
| Bug `"top"` → default `"center"` | Presente en `buildProductIAPrompt` fallback | Corregido: `buildZonePlacement(copyZone, "product")` cubre los 5 valores |
| Porcentajes de zona (42%, 58%, etc.) | ~12 strings hardcodeados en `composeWithProductIA.ts` | `ZONE_PERCENTAGES` en `promptRules.ts` — 1 lugar |
| `buildZonePlacement()` | Solo en `composeWithProductIA.ts` | Exportada desde `promptRules.ts` — importable desde cualquier archivo |
| `gemini.ts` inversión inline | Ternary de 5 líneas en `generateImageBriefGemini()` | `resolvePlacementZone(args.copyZone ?? "left")` — 1 línea |
| Output de los prompts | Strings X | Strings idénticos — mismo comportamiento en producción |

#### Bug corregido: `copyZone "top"` en `buildProductIAPrompt` fallback

**Antes** — el fallback genérico de `buildProductIAPrompt()` (`composeWithProductIA.ts`) tenía un ternary incompleto:
```typescript
// copyZone "top" no tenía case propio → caía al default "center" incorrectamente
const zoneRules =
  args.copyZone === "right"  ? "LEFT 42%..." :
  args.copyZone === "left"   ? "RIGHT 42%..." :
  args.copyZone === "bottom" ? "TOP 42%..."  :
  "center zone 22%-68%...";  // ← "top" llegaba aquí: INCORRECTO
```

**Después** — reemplazado por `buildZonePlacement()` que cubre los 5 valores:
```typescript
const zoneConstraint = buildZonePlacement(
  args.copyZone as "left" | "right" | "top" | "bottom" | "center",
  "product",
);
// "top" → "BOTTOM 45% of the canvas" — CORRECTO
```

El bug era latente (ningún template activo usaba `copyZone="top"` en product-inject sin `userPrompt`), pero quedaba como trampa para templates futuros.

#### Impacto en los 5 flujos de `composeWithProductIA`

| Flujo | Cambio en runtime | Comportamiento |
|-------|-------------------|----------------|
| `avatarSceneWithProduct` | Ninguno — `buildAvatarWithProductPrompt` ya llamaba a `buildZonePlacement` | Idéntico ✅ |
| `useAvatarAsScene` | Ninguno — `buildAvatarScenePrompt` ya llamaba a `buildZonePlacement` | Idéntico ✅ |
| `splitComparison` | Ninguno — pure Sharp, sin prompts | Idéntico ✅ |
| `sceneMode` | Ninguno — `buildScenePrompt` ya llamaba a `buildZonePlacement` | Idéntico ✅ |
| `product-inject` fallback | Bug corregido: `"top"` ahora genera `"BOTTOM 45%"` en lugar de `"center zone"` | Corregido ✅ |

#### Pendiente

- El `zoneBodyPosition` en `buildAvatarWithProductPrompt()` (línea ~229) aún tiene strings de posición corporal hardcodeados que podrían referenciar `ZONE_PERCENTAGES` en el futuro — no afecta comportamiento actual.

---

### Bug #1 en producción — `buildZonePlacement("bottom","scene")` usaba constante incorrecta — 2026-03-15

**Contexto:** Fix #3 (2026-03-14) habilitó que `editorial-center-top` flipeara `copyZone` a `"bottom"` cuando OpenAI genera `textSide = "bottom"`. Esto activó por primera vez el path `buildZonePlacement("bottom", "scene")` para este template.

**Síntoma:** Ángulos con `textSide = "bottom"` recibían constraint `"ENTIRELY within the TOP 42% of the image"` en lugar de `"TOP 45%"`. En el mismo batch, ángulos con `textSide = "top"` recibían el correcto `"BOTTOM 45%"`. La diferencia en el holding rule (`"CAN hold"` vs `"If the scene implies"`) causaba comportamiento de Gemini divergente entre ángulos del mismo template.

**Causa raíz:** `buildZonePlacement(mode="scene", copyZone="bottom")` usaba `Z.HORIZONTAL_SUBJECT` (42%, diseñado para splits laterales) en lugar de `Z.VERTICAL_SUBJECT` (45%, diseñado para splits verticales). El case `"top"` era correcto; el case `"bottom"` nunca había sido validado porque ningún template activo generaba `copyZone="bottom"` en sceneMode antes de Fix #3.

**Fix aplicado — `src/lib/ai/promptRules.ts`:**
```typescript
// ANTES:
case "bottom":
  return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the TOP ${Z.HORIZONTAL_SUBJECT}% of the image.
- The BOTTOM ${Z.HORIZONTAL_COPY}% must remain exactly as the background — no person, no shadow extending there.`;

// DESPUÉS (simétrico con case "top"):
case "bottom":
  return `PLACEMENT ZONE — hard constraint:
- The person must be positioned ENTIRELY within the TOP ${Z.VERTICAL_SUBJECT}% of the image (above ${Z.VERTICAL_SUBJECT}% vertical).
- The person's feet must NOT go below the ${Z.VERTICAL_SUBJECT}% vertical line of the image.
- The person MUST be CENTERED HORIZONTALLY.
- The BOTTOM ${Z.VERTICAL_COPY}% of the image MUST remain COMPLETELY UNTOUCHED — all existing text and decorations preserved pixel-perfect.`;
```

**Fix aplicado — `src/services/product-composer/composeWithProductIA.ts`:**
```typescript
// ANTES (asimétrico: zone="top" tratado diferente a zone="bottom"):
const holdingRule = zone === "top"
  ? `- The person CAN hold a small beauty/wellness product naturally...`
  : hasRealProduct
    ? `- If the scene implies a product in use... ONLY the product from Image 2.`
    : `- DO NOT show anything being held...`;

// DESPUÉS (hasRealProduct tiene prioridad; ambas zonas verticales son simétricas):
const holdingRule = hasRealProduct
  ? `- If the scene implies a product in use... ONLY the product from Image 2.`
  : zone === "top" || zone === "bottom"
    ? `- The person CAN hold a small beauty/wellness product naturally...`
    : `- DO NOT show anything being held...`;
```

**Lección:** Cuando un fix habilita un nuevo valor de `copyZone` para un template existente, validar en producción TODOS los paths de `buildZonePlacement` que ese nuevo valor activa. Un `copyZone` que nunca se usó antes puede activar código que existía pero nunca fue probado.

---

### Bug #2 en producción — conflicto Visual Direction vs textSide dinámico — 2026-03-16

**Templates afectados:** `editorial-lifestyle-left`, `editorial-center-top`

**Síntoma:** Cuando OpenAI elegía el lado opuesto al hardcodeado en `defaultProductPrompt` (ej. `textSide="right"` en editorial-lifestyle-left), persona y texto colisionaban en el mismo lado del canvas. El `sceneAction` generado colocaba a la persona en la zona incorrecta porque seguía la Visual Direction hardcodeada en lugar del `textSide` elegido.

**Causa raíz — tres fuentes en conflicto para la zona del sceneAction:**

| Fuente | Instrucción | ¿Dinámica? |
|--------|------------|-----------|
| `defaultProductPrompt` (`meta.ts`) | "RIGHT side" / "BOTTOM 40% ONLY" | ✗ Hardcodeada |
| `templateVisualDirectionBlock` (`openai.ts:432`) | Inyecta `defaultProductPrompt` verbatim como `PRIMARY reference` | ✗ Hardcodeada |
| `FIELD_RULE["sceneAction"]` item [6] (`openai.ts:242`) | "follow the TEMPLATE VISUAL DIRECTION strictly — reproduce it exactly" | ✗ Apunta a la hardcodeada |
| `templateHint` (`meta.ts:843`, `:1081`) | "The person fills the side OPPOSITE to textSide" | ✓ Correcta pero débil |
| `textSideBlock` (`openai.ts:265`) | "elegí left/right" o "elegí top/bottom" | ✓ Correcta |

Item [6] pisaba la instrucción correcta del `templateHint` al apuntar explícitamente a `TEMPLATE VISUAL DIRECTION` (marcada como `PRIMARY`), que contenía la zona hardcodeada.

**Fix aplicado — `src/services/product-composer/templates/meta.ts`:**

`editorial-lifestyle-left`:
```diff
- "Do NOT show any product. Generate a real person — close-up or medium shot — in a beauty/lifestyle moment on the RIGHT side of the image. Editorial beauty photography: glowing skin, natural makeup, confident expression. The LEFT 48% must remain completely clean for text. Soft natural lighting, cinematic quality. No logos, no text."
+ "Do NOT show any product. Generate a real person — close-up or medium shot — in a beauty/lifestyle editorial moment. Glowing skin, natural makeup, confident expression. Soft natural lighting, cinematic quality. No logos, no text."
```

`editorial-center-top`:
```diff
- "BOTTOM 40% OF CANVAS ONLY — no person or object may appear in the top 60%. Generate a real person in a warm lifestyle setting naturally holding or using this product. The person must span the FULL WIDTH of the canvas from the left edge to the right edge. Head at approximately 55–65% from the top of the canvas. Warm natural lighting, editorial quality, candid and genuine feel. Do not erase or modify any existing text or graphic elements already present in the image."
+ "Generate a real person in a warm lifestyle setting naturally holding or using this product. The person must span the FULL WIDTH of the canvas. Warm natural lighting, editorial quality, candid and genuine feel. Do not erase or modify any existing text or graphic elements."
```

**Fix aplicado — `src/lib/ai/openai.ts` — `FIELD_RULE["sceneAction"]` item [6]:**

```diff
- [6] Positioning: follow the TEMPLATE VISUAL DIRECTION strictly — if it specifies a zone ("RIGHT side", "LEFT 50% clean"), reproduce it exactly in this prompt
+ [6] Positioning: ${filteredSchema.includes("textSide")
+   ? `derive the person's zone from your textSide choice — the person MUST occupy the side OPPOSITE to text:
+   textSide="left" → person on RIGHT half, LEFT 48% stays completely empty
+   textSide="right" → person on LEFT half, RIGHT 48% stays completely empty
+   textSide="top" → person in BOTTOM 55–60% of canvas, top area stays clean
+   textSide="bottom" → person in TOP 55–60% of canvas, bottom area stays clean
+   Reproduce this as the last positioning sentence of the sceneAction.`
+   : `follow the TEMPLATE VISUAL DIRECTION strictly — if it specifies a zone ("RIGHT side", "LEFT 50% clean"), reproduce it exactly in this prompt`}
```

**Una sola fuente de verdad — `textSide` como eje de toda la cadena:**

| Paso | Dónde vive la zona | Antes | Después |
|------|-------------------|-------|---------|
| OpenAI genera `sceneAction` | `FIELD_RULE[sceneAction]` item [6] | Visual Direction hardcodeada | `textSide` elegido por OpenAI ✓ |
| `buildProductIAOptions()` | `meta.ts:1715–1727` | flip correcto (ya funcionaba) | flip correcto ✓ |
| Gemini recibe constraint | `buildZonePlacement()` | zona correcta (ya funcionaba) | zona correcta ✓ |

**`defaultProductPrompt` como fallback en Gemini:** sigue siendo válido. Cuando no hay `sceneAction` en copySchema, `effectivePrompt = defaultProductPrompt` → llega a `buildScenePrompt()` / `buildAvatarWithProductPrompt()` que envuelve con `buildZonePlacement()` — la zona la maneja el wrapper, no el string. ✓

**Templates sin textSide no afectados:** el ternario en item [6] deja comportamiento actual cuando `textSide` no está en `filteredSchema`. ✓

---

## ANÁLISIS DE TOKENS — composeWithProductIA + gemini.ts — 2026-03-15

> Metodología: tamaños reales medidos con `wc -c`. Estimación de tokens: **4 chars ≈ 1 token** (orden de magnitud válido para Gemini y Kimi). Los números son aproximaciones relativas para identificar cuellos de botella, no auditoría de facturación.

---

### 1. MAPA DE promptLibrary.ts

#### Archivos de librería — tamaños reales

| Archivo | Bytes reales | Tokens (full) | Quién lo consume |
|---------|-------------|---------------|-----------------|
| `product-only.md` | 7,221 | ~1,805 | `generateImageBriefGemini` (briefType="product-only") |
| `person-product.md` | 13,721 | ~3,430 | `generateImageBriefGemini` (briefType="person-product") |
| `scene-only.md` | 54,956 | ~13,739 | `expandSceneBrief` + `generateImageBriefGemini` (briefType="scene-only") |
| `scenesLibrary.md` | 69,411 | ~17,353 | `getSceneLibrarySection()` — solo llamada desde `openai.ts` |
| **TOTAL en RAM** | **145,309** | **~36,327** | Cargado al inicio del proceso Node, siempre en memoria |

#### Funciones exportadas y su comportamiento

| Función | Qué devuelve | Muestreo |
|---------|-------------|----------|
| `getLibrary(type)` | Archivo .md completo | Sin muestreo — todo el archivo |
| `getLibrarySection(type, category)` | intro + header de sección + `EXAMPLES_PER_CALL=2` bloques `**` al azar | Fisher-Yates |
| `getSceneLibrarySection(category)` | intro + header de categoría + `ANGLES_PER_CALL=1` ángulo `###` al azar | Fisher-Yates |

#### ¿Cuánto devuelve realmente `getLibrarySection("scene-only", category)`?

Clave para entender el peso: cada "ejemplo" en `scene-only.md` es un bloque `**` (split en `(?=^\*\*)`) que contiene **múltiples ESCENAs numeradas**. No es un ejemplo corto — es un bloque de 3,000–5,000 chars con descripción completa de situación, iluminación y PROMPT BASE en inglés.

| Componente | Chars | Tokens |
|-----------|-------|--------|
| intro del archivo (antes del primer `##`) | ~450 | ~112 |
| header de sección (ej. `## Pain Point / Problema` + descripción) | ~800 | ~200 |
| bloque `**` ejemplo #1 (contiene 3–5 ESCENAs, con PROMPT BASE largo) | ~3,500 | ~875 |
| bloque `**` ejemplo #2 | ~3,500 | ~875 |
| **TOTAL por llamada** | **~8,250** | **~2,062** |

Rango real según categoría: **1,800–2,800 tokens**. La categoría `belleza-cosmetica` tiene los bloques más detallados.

#### ¿Cuánto devuelve `getSceneLibrarySection(category)`?

Distinto — el intro de `scenesLibrary.md` es pesado (tabla de ángulos + instrucciones para la IA):

| Componente | Chars | Tokens |
|-----------|-------|--------|
| intro (instrucciones + tabla de ángulos disponibles) | ~2,800 | ~700 |
| header de categoría | ~300 | ~75 |
| 1 ángulo `###` seleccionado | ~500 | ~125 |
| **TOTAL por llamada** | **~3,600** | **~900** |

> **Hallazgo clave:** `expandSceneBrief` usa `getLibrarySection("scene-only")` (bloques de ESCENAs completas, ~2,062 tokens), NO `getSceneLibrarySection` (ángulos compactos, ~125 tokens de contenido útil). El intro de `scenesLibrary.md` (~700 tokens) es overhead puro para el caso de uso de expansión de briefs.

---

### 2. TOKENS POR LLAMADA — FUNCIONES DE TEXTO (OpenRouter/Kimi)

#### `expandSceneBrief()` — la llamada más cara del pipeline

Propósito: expande sceneAction corto (~35 tokens) → brief cinematográfico (~80 palabras, ~110 tokens).

| Bloque enviado a OpenRouter | Chars | Tokens |
|----------------------------|-------|--------|
| Role + task description | ~500 | ~125 |
| CRITICAL — PERSON-ONLY (si `personOnly=true`) | ~400 | 0–100 |
| SHORT SCENE DESCRIPTION (sceneAction inline) | ~200 | ~50 |
| CONTEXT (product/category/tone/brand) | ~250 | ~62 |
| **REFERENCE EXAMPLES** (`getLibrarySection("scene-only", cat)`) | **~8,250** | **~2,062** |
| environmentInstruction + Instructions 1–9 | ~700 | ~175 |
| **TOTAL a OpenRouter** | **~10,300** | **~2,574** |

`maxTokens=300`. Output: ~110 tokens. **Ratio de compresión: 23× overhead de prompt para generar el brief.**

Los ejemplos de librería representan **80% del prompt total** de `expandSceneBrief`.

#### `generateImageBriefGemini()` — para `productPrompt`

| Bloque | Tokens |
|--------|--------|
| Role + task + CRITICAL CONTEXT | ~242 |
| Product/category/tone/brand context | ~62 |
| **REFERENCE EXAMPLES** (`getLibrarySection(briefType, cat)`) | ~500–2,062 |
| Instructions 1–5 | ~150 |
| **TOTAL** | **~954–2,516** |

Varía por `briefType`: `product-only.md` (7 KB, bloques pequeños) produce ~500 tokens de librería; `scene-only.md` produce ~2,062.

---

### 3. TOKENS POR LLAMADA — FUNCIONES DE IMAGEN (Gemini)

| Función | Imgs input | Tokens de prompt | Librería usada |
|---------|-----------|-----------------|----------------|
| `generateBackground` | 0 | 110–260 | No |
| `generateScene` | 1 (bg) | ~690 | No directa (usa sceneAction ya expandido) |
| `nanoBananaInjectProduct` | 2 (bg+prod) | 112–650 | No |
| `generateSceneWithAvatarAndProduct` | 3 (bg+prod+avatar) | ~870–970 | No |
| `generateGenericProduct` | 1 (prod) | ~505 | No |
| `detectProductBoundingBox` | 2 (scene+prod) | ~120 | No |

#### Detalle: `buildScenePrompt` → `generateScene`

| Bloque | Tokens |
|--------|--------|
| Role + STEP 1 ANALYZE | ~130 |
| fullBleedContext (si activo) | 0–100 |
| STEP 2 header | ~30 |
| **sceneAction expandido** (de `expandSceneBrief`) | ~110 |
| `buildZonePlacement(copyZone, "scene")` | ~112–130 |
| `ABSOLUTE_RULES_SCENE` | ~85 |
| productRule + holdingRule | ~90 |
| Closing rules | ~100 |
| **TOTAL a Gemini** | **~657–715** |

#### Detalle: `buildAvatarWithProductPrompt` → `generateSceneWithAvatarAndProduct` (non-rawMode)

| Bloque | Tokens | Observación |
|--------|--------|-------------|
| Role + 3 images context | ~57 | |
| `buildZonePlacement(zone, "product")` | ~100–150 | Constraint de zona |
| **SECONDARY RULE — PERSON USES THE PRODUCT** | **~175** | Modos de uso + énfasis producto Image 2 |
| STEP 1 ANALYZE IMAGE 1 (repetición) | ~70 | Parcialmente redundante con buildZonePlacement |
| STEP 2 + productPrompt inline | ~155 | |
| PERSON — TECHNICAL REQUIREMENTS | ~125 | Framing, postura, matching avatar |
| PRODUCT — TECHNICAL REQUIREMENTS | ~125 | Colors, labels, fully in frame |
| ABSOLUTE RULES + `ABSOLUTE_RULES_SCENE` | ~185 | |
| **TOTAL** | **~867–967** | |

rawMode: prompt reducido a ~350 tokens (solo productPrompt + ABSOLUTE_RULES_SCENE).

---

### 4. FLUJO COMPLETO: expandSceneBrief → buildScenePrompt → generateScene

```
OpenAI genera sceneAction (~35 tokens)
          │
          ▼
  expandSceneBrief() — OpenRouter/Kimi
  ┌──────────────────────────────────────┐
  │ Instrucciones fijas:    ~512 tokens  │
  │ getLibrarySection:    ~2,062 tokens  │  ← 80% del prompt
  │ TOTAL INPUT:          ~2,574 tokens  │
  │ OUTPUT (maxTokens=300): ~110 tokens  │
  └──────────────────────────────────────┘
          │
          ▼
  buildScenePrompt(expandedBrief, copyZone)
  ┌──────────────────────────────────────┐
  │ Estructura fija:        ~580 tokens  │
  │ expandedBrief inline:   ~110 tokens  │
  │ TOTAL A GEMINI:         ~690 tokens  │
  └──────────────────────────────────────┘
          │  + 1 imagen (background)
          ▼
  generateScene() → PNG
```

**Costo texto por ángulo:** ~2,574 (OpenRouter in) + ~110 (out→buildScene) + ~690 (Gemini in) = **~3,374 tokens**

**Tanda de 5 ángulos (CONCURRENCY=5):**

| Llamada | Tokens/ángulo | × 5 | % del total |
|---------|--------------|-----|-------------|
| `expandSceneBrief` (entrada) | ~2,574 | **~12,870** | 76% |
| `expandSceneBrief` (salida) | ~110 | ~550 | 3% |
| `generateScene` (prompt a Gemini) | ~690 | ~3,450 | 20% |
| **TOTAL texto** | ~3,374 | **~16,870** | 100% |

La librería de ejemplos (~2,062 por llamada) representa **~61% de todos los tokens de texto de la tanda**.

---

### 5. TOP 3 OPORTUNIDADES DE OPTIMIZACIÓN

#### #1 — `expandSceneBrief` usa la librería equivocada (mayor ahorro potencial)

**Estado actual:** `expandSceneBrief` llama `getLibrarySection("scene-only")` → envía 2 bloques de ESCENAs completas con PROMPT BASE fotográfico completo (~2,062 tokens de librería).

**Observación:** `scenesLibrary.md` tiene ángulos compactos diseñados específicamente para inspiración de escena (~125 tokens de contenido útil por ángulo vs ~1,750 de los bloques `**`). `expandSceneBrief` es conceptualmente más cercano a "dado este ángulo de escena, expandí el brief" — para lo cual `getSceneLibrarySection` es más apropiada.

| Métrica | Actual | Con fix | Δ |
|---------|--------|---------|---|
| Tokens librería por llamada | ~2,062 | ~125 (+700 intro) = ~825 | **−1,237** |
| Tokens totales `expandSceneBrief` | ~2,574 | ~1,337 | **−1,237 (−48%)** |
| Tanda de 5 ángulos | ~12,870 | ~6,685 | **−6,185 (−48%)** |

**Riesgo medio:** `scene-only.md` tiene PROMPT BASE fotográficos completos (inglés, muy detallados) que sirven como ejemplos de estilo. `scenesLibrary.md` tiene ángulos conceptuales. La calidad del brief expandido puede variar. Requiere test A/B.

**Alternativa menos riesgosa:** reducir `EXAMPLES_PER_CALL` de 2 → 1. Ahorro: ~875 tokens por llamada (−34%).

#### #2 — La librería se re-envía N veces en la misma tanda sin beneficio acumulativo

En una tanda de 5 ángulos del mismo template y categoría:
- `getLibrarySection` devuelve intro + section header **idénticos** las 5 veces (~312 tokens)
- Solo los 2 ejemplos muestreados varían (Fisher-Yates diferente por llamada)

**Tokens intro+header duplicados:** ~312 × 5 = 1,560 tokens extra.

**Fix simple:** pre-calcular `getLibrarySection` una vez por tanda y pasarlo como parámetro a `expandSceneBrief` en lugar de calcularlo internamente. Eliminaría la re-carga del intro fijo y permitiría que el muestreo de ejemplos siga variando entre ángulos.

**Ahorro sin cambiar la calidad:** **~1,248 tokens por tanda** (4 llamadas × 312 tokens de intro duplicado).

#### #3 — SECONDARY RULE en `buildAvatarWithProductPrompt` es redundante

El bloque "SECONDARY RULE — PERSON USES THE PRODUCT" (~175 tokens) + "STEP 1 ANALYZE IMAGE 1 CAREFULLY" repetido (~70 tokens) suman **~245 tokens** con información redundante al `buildZonePlacement` que ya establece la zona y la relación persona-producto.

El objetivo semántico cabe en ~60 tokens: "The person MUST be actively using or interacting with Image 2. The product must be clearly visible, fully in frame, label facing camera."

**Ahorro estimado:** ~185 tokens por llamada a `generateSceneWithAvatarAndProduct`. Para tanda de 5 ángulos con avatar: −925 tokens.

---

### 6. ESTIMADO DE AHORRO POR TANDA (5 ángulos, sceneMode sin avatar)

| Escenario | Tokens texto | vs. baseline |
|-----------|-------------|--------------|
| **Baseline actual** | ~16,870 | — |
| EXAMPLES_PER_CALL: 2 → 1 | ~12,495 | **−4,375 (−26%)** |
| Migrar a `getSceneLibrarySection` | ~9,860 | **−7,010 (−42%)** |
| Migrar librería + pre-calcular una vez por tanda | **~8,548** | **−8,322 (−49%)** |

> Tokens de imágenes no contabilizados (Gemini los cobra por resolución, separado de los tokens de texto). El análisis cubre solo tokens de texto — la variable controlable desde código sin tocar la lógica de composición visual.

---

## AUDITORÍA FLUJO DE ESCENAS — 2026-03-15

> Pregunta central: ¿cómo funciona hoy el flujo de selección de escena desde promptLibrary.ts hasta el prompt final de Gemini? ¿Coincide con la visión esperada (1 librería → OpenAI → sceneAction → Gemini)?

---

### 1. ¿Existe hoy una función que tome una escena aleatoria por categoría?

**Sí — `getSceneLibrarySection(category)`** en `promptLibrary.ts`.

- Fuente: `scenesLibrary.md` (69,411 bytes, ~17,353 tokens full file)
- Filtra secciones `##` que matchean la categoría via `CATEGORY_KEYWORDS`
- Muestrea **`ANGLES_PER_CALL = 1`** ángulo `###` al azar (Fisher-Yates)
- Devuelve: intro completo del archivo (~700 tokens) + header de categoría (~75 tokens) + 1 ángulo `###` (~125 tokens) = **~900 tokens**
- Verdaderamente aleatoria por llamada: cada ejecución puede devolver un ángulo diferente

**Pero también existe `getLibrarySection(type, category)`** — función distinta, fuente distinta:
- Fuente: `scene-only.md` (54,956 bytes, ~13,739 tokens full file)
- Muestrea `EXAMPLES_PER_CALL = 2` bloques `**` con ESCENAs fotográficas completas
- Devuelve: ~2,062 tokens
- Esta función alimenta `expandSceneBrief` — NO la que alimenta `openai.ts`

Son **dos librerías distintas** con **contenido distinto** para **propósitos distintos**.

---

### 2. Call sites exactos — dónde y cuándo se llama cada función

#### `getSceneLibrarySection` — `route.ts:481`

```typescript
// route.ts línea 481 — GENERATE_COPY handler
const productCategory = (body.businessProfile as any)?.category ?? "";
const sceneExample = productCategory ? getSceneLibrarySection(productCategory) : "";
```

- Se ejecuta **una sola vez** por request GENERATE_COPY
- **Antes** de llamar a `generateTemplateCopyOpenAI`
- El resultado `sceneExample` se pasa como parámetro a `generateTemplateCopyOpenAI` (línea 497)
- También se devuelve en la respuesta JSON como `sceneExample: sceneExample || null` (línea 602)

#### `getSceneLibrarySection` — `openai.ts:378` (fallback)

```typescript
// openai.ts líneas 374-379 — dentro de generateTemplateCopyOpenAI
const needsSceneExamples =
  (filteredSchema.includes("sceneAction") || filteredSchema.includes("scenePrompt")) &&
  (args.sceneExample || args.businessProfile?.category);
const sceneExampleText = needsSceneExamples
  ? (args.sceneExample ?? (args.businessProfile?.category ? getSceneLibrarySection(args.businessProfile.category) : ""))
  : "";
```

Si `args.sceneExample` es truthy (siempre lo es cuando viene de route.ts), la llamada interna a `getSceneLibrarySection` **se omite**. Es un fallback que hoy nunca se ejecuta en producción.

#### `getLibrarySection("scene-only")` — `gemini.ts:1744` dentro de `expandSceneBrief`

```typescript
// gemini.ts línea 1744 — dentro de expandSceneBrief()
const library = getLibrarySection("scene-only", args.productCategory);
```

- Se ejecuta **una vez por ángulo/variante** en el paso de expansión
- Cada llamada a `expandSceneBrief` recalcula esta librería independientemente
- En una tanda de 5 ángulos: 5 llamadas a `getLibrarySection("scene-only")` → 5 × 2,062 tokens

#### `expandSceneBrief` — `route.ts:562-582`

```typescript
// route.ts línea 546-571 — solo si fullSchema.includes("sceneAction")
const hasSceneAction = fullSchema.includes("sceneAction");
if (hasSceneAction) {
  if (Array.isArray(result)) {
    const expanded = await Promise.all(
      result.map((v) =>
        v.sceneAction
          ? expandSceneBrief({ ...expandContext, sceneAction: v.sceneAction as string })
              .then(exp => ({ ...v, sceneAction: exp }))
              .catch(() => v)
          : Promise.resolve(v)
      )
    );
  }
}
```

Se llama **solo si** el `fullSchema` original (no el `fullSchemaWithScene` expandido) incluye `"sceneAction"`. Para templates sin `"sceneAction"` en su `copySchema`, `expandSceneBrief` no se ejecuta aunque OpenAI haya generado un `sceneAction`.

---

### 3. ¿Cómo llega la escena a openai.ts?

Como parámetro `sceneExample` (string), inyectado en el **user prompt** via `sceneExamplesBlock`:

```typescript
// openai.ts líneas 380-385
const sceneExamplesBlock = sceneExampleText
  ? `SCENE EXAMPLES FOR THIS CATEGORY — extract the photographic style, emotional tone, and person-product dynamic. Adapt the setting and mood to the specific product, do NOT copy the example literally. Use this as creative inspiration for sceneAction and/or scenePrompt fields:\n${sceneExampleText}\n\n`
  : "";
```

Posición en el prompt (línea 427):
```
${dynamicFieldRules}
${textSideBlock}${sceneWithProductNote}${templateHintBlock}${templateContextBlock}
${templateVisualDirectionBlock}${backgroundStyleGuideBlock}
${sceneExamplesBlock}   ← aquí, antes del brandContext
${brandContextBlock}${sorteoBlock}...
USER INFO: product, offer, audience...
```

**No es un system prompt** — entra en el user turn. OpenAI lo usa como inspiración para el `sceneAction` field, sintetizándolo con `TEMPLATE VISUAL DIRECTION` (línea 238 del FIELD_RULE para `sceneAction`):

> "SYNTHESIS RULE — when both TEMPLATE VISUAL DIRECTION and SCENE EXAMPLES are present, merge them into ONE"

---

### 4. ¿La sceneAction llega intacta a Gemini o pasa por expandSceneBrief?

**Depende de si `"sceneAction"` está en el `copySchema` del template.**

**Caso A — template CON `"sceneAction"` en schema** (ej. `editorial-center-top`, `pain-point-left`):
1. OpenAI genera `sceneAction` corta (~35 tokens) per variant
2. route.ts detecta `hasSceneAction = true` (línea 546)
3. `expandSceneBrief` es llamado por cada variant en paralelo
4. El `sceneAction` corto es **reemplazado** por el brief expandido (~110 tokens)
5. El brief expandido entra a `buildScenePrompt` → Gemini

**Caso B — template SIN `"sceneAction"` en schema** (ej. `producto-hero-top`, product-inject puro):
1. OpenAI genera `sceneAction` igualmente (via `fullSchemaWithScene`, línea 451-453)
2. route.ts detecta `hasSceneAction = false`
3. `expandSceneBrief` **NO se llama**
4. `sceneAction` generado por OpenAI queda en la respuesta pero no llega a Gemini
5. `composeWithProductIA` usa `effectivePrompt = meta.defaultProductPrompt`

**¿expandSceneBrief reutiliza la escena de openai.ts?** No — usa una librería completamente distinta:
- openai.ts recibe: `getSceneLibrarySection` de `scenesLibrary.md` — ángulos conceptuales compactos
- expandSceneBrief usa: `getLibrarySection("scene-only")` de `scene-only.md` — PROMPT BASE fotográficos completos en inglés

**¿Hay duplicación de contexto?** Parcial y por diseño:
- Ambas son "scene examples for advertising" de la misma categoría
- Pero el contenido es diferente: una es inspiración conceptual (corta), la otra son ejemplos fotográficos detallados (larga)
- OpenAI ve los ángulos compactos para generar un brief corto y creativo
- Kimi ve los PROMPT BASE completos para expandir ese brief en un prompt fotográfico detallado

---

### 5. Token count total del flujo por ángulo — desglose

Para un template CON `"sceneAction"` (ej. `editorial-center-top`, 5 ángulos):

#### Paso 0 — Pre-fetch en route.ts (1 vez por request)
```
getSceneLibrarySection(category) → ~900 tokens
Llamadas: 1
```

#### Paso 1 — generateTemplateCopyOpenAI (1 llamada, genera N variants de golpe)
```
Sistema (EXPERT_COPYWRITER_SYSTEM_PROMPT):   ~600 tokens
FIELD_RULE sceneAction (largo):              ~350 tokens
textSideBlock (si aplica):                   ~100 tokens
sceneWithProductNote (si aplica):            ~70 tokens
templateHintBlock:                           ~300 tokens
templateContextBlock:                        ~100 tokens
templateVisualDirectionBlock:                ~150 tokens
sceneExamplesBlock (getSceneLibrarySection): ~900 tokens ← de Paso 0
brandContextBlock:                           ~300 tokens
USER INFO + variantInstructions:             ~250 tokens
──────────────────────────────────────────────────────
TOTAL a OpenAI:                          ~3,120 tokens
Output: N variants × ~35 tokens sceneAction
Llamadas: 1 (N variants en un solo request)
```

#### Paso 2 — expandSceneBrief (1 llamada POR VARIANT/ÁNGULO, en paralelo)
```
Instrucciones fijas:                         ~512 tokens
getLibrarySection("scene-only"):           ~2,062 tokens ← librería DISTINTA
sceneAction input:                            ~35 tokens
──────────────────────────────────────────────────────
TOTAL a OpenRouter por ángulo:           ~2,609 tokens
Output: ~110 tokens (brief expandido)
Llamadas: 1 por ángulo (paralelas con Promise.all)
```

#### Paso 3 — Gemini (1 llamada POR ÁNGULO)
```
buildScenePrompt(expandedBrief):
  Estructura fija:                           ~580 tokens
  expandedBrief:                             ~110 tokens
  ──────────────────────────────────────────────
  TOTAL a Gemini:                            ~690 tokens
+ 1 imagen (background)
Llamadas: 1 por ángulo
```

#### Resumen para tanda de 5 ángulos

| Paso | Llamadas | Tokens | Compartido entre ángulos |
|------|---------|--------|--------------------------|
| Pre-fetch sceneLibrary | 1 | ~900 | Sí — todos los ángulos usan la misma escena |
| OpenAI copy gen | 1 | ~3,120 | Sí — 1 sola llamada genera los 5 |
| expandSceneBrief × 5 | 5 | ~13,045 | No — cada ángulo llama independientemente con librería diferente |
| buildScenePrompt → Gemini × 5 | 5 | ~3,450 | No |
| **TOTAL texto** | **12** | **~20,515** | |

**La librería `scene-only.md` se carga 5 veces** (~2,062 × 5 = 10,310 tokens) — una por ángulo en `expandSceneBrief`. Es el componente más caro y repetitivo del flujo.

---

### 6. ¿Qué tan "aleatorio" es el proceso?

| Componente | Qué varía | Qué es fijo por tanda |
|-----------|----------|----------------------|
| `getSceneLibrarySection` (route.ts:481) | 1 ángulo al azar por request | MISMO ángulo para todos los ángulos de esa tanda |
| `generateTemplateCopyOpenAI` | Los 5 `sceneAction` difieren porque OpenAI usa ángulos creativos (Emocional, Problema, etc.) + el mismo `sceneExample` | El `sceneExample` base es igual para todos |
| `expandSceneBrief × 5` | 2 ejemplos `scene-only.md` muestreados al azar por cada llamada | Cada ángulo puede recibir ejemplos distintos |
| `buildScenePrompt → Gemini` | El brief expandido varía por ángulo | La estructura del wrapper es fija |

**Resultado:** La diversidad real entre ángulos viene principalmente de:
1. Los `VARIANT_ANGLES` definidos en openai.ts (Emocional, Problema, Urgencia, Técnico, Aspiracional)
2. El muestreo aleatorio de ejemplos en `expandSceneBrief`

El `sceneExample` de `scenesLibrary.md` es el MISMO para todos los ángulos de la tanda — actúa como "tono de referencia compartido" más que como fuente de diversidad.

---

### 7. ¿La visión esperada coincide con lo implementado?

**Visión esperada:**
```
promptLibrary.ts → 1 escena aleatoria por categoría
        ↓
openai.ts procesa: escena + info negocio + oferta + ángulo → sceneAction
        ↓
composeWithProductIA → Gemini imagen
```

**Implementación real:**
```
promptLibrary.ts (getSceneLibrarySection → scenesLibrary.md)
  → 1 ángulo compacto por request [~900 tok]
        ↓ [sceneExample — compartido para todos los ángulos]
openai.ts → 5 sceneActions cortas (~35 tok c/u)
        ↓ [solo si template tiene "sceneAction" en schema]
expandSceneBrief × 5 [usa getLibrarySection("scene-only") → DIFERENTE librería]
  → 5 briefs expandidos (~110 tok c/u)
        ↓
buildScenePrompt → Gemini × 5
```

**Gaps identificados:**

| Gap | Descripción | Impacto |
|-----|-------------|---------|
| **2 librerías distintas** | `scenesLibrary.md` para openai.ts, `scene-only.md` para expandSceneBrief. Contenidos diferentes, propósitos diferentes. No documentado como arquitectura intencional. | Conceptual — puede generar confusión |
| **sceneExample compartido** | Todos los ángulos de una tanda reciben el MISMO ángulo de referencia de `scenesLibrary.md`. La diversidad viene de los `VARIANT_ANGLES` de OpenAI, no de la librería. | Aceptable — la variedad la da OpenAI |
| **sceneAction de OpenAI es intermedia** | OpenAI genera un sceneAction "corto" que nunca llega a Gemini directamente — es solo input para expandSceneBrief. El proceso tiene 2 pasos de generación de texto antes de llegar a imagen. | Costo: ~2,609 tokens/ángulo extra |
| **expandSceneBrief recarga librería N veces** | Para 5 ángulos: 5 llamadas a `getLibrarySection` = 5 × 2,062 = 10,310 tokens de librería. El intro del archivo (~700 tokens) es idéntico en las 5 llamadas. | Costo: ~2,800 tokens redundantes por tanda |
| **Templates sin sceneAction en schema** | `expandSceneBrief` no se llama. OpenAI genera un sceneAction pero queda "perdido" — no llega a Gemini, que usa `defaultProductPrompt`. Los tokens gastados en generarlo son desperdicio. | Costo: ~35 tokens × N variants desperdiciados |

**Veredicto:** La visión esperada existe pero está comprimida en el paso de openai.ts. El paso adicional de `expandSceneBrief` (con su propia librería) no estaba en la visión simplificada. Es un pipeline de **3 pasos de generación de texto** (OpenAI → Kimi → Gemini) donde la visión asumía 1 paso (OpenAI → Gemini).

---

## MIGRACIÓN EN PROGRESO: ELIMINACIÓN DE expandSceneBrief — 2026-03-15

### Decisión
El pipeline OpenAI → Kimi (expandSceneBrief) → Gemini se elimina gradualmente.
OpenAI genera directamente el brief cinematográfico final (80–100 words) listo para Gemini.
expandSceneBrief() permanece en el codebase hasta que todos los templates estén validados.

### Análisis que llevó a la decisión
- expandSceneBrief cuesta ~13,045 tokens + 5 llamadas a OpenRouter por tanda de 5 ángulos
- Kimi reescribe sin contexto del negocio, del ángulo creativo, ni del copyZone real
- OpenAI ya tiene todo ese contexto disponible en el mismo request
- El FIELD_RULE de sceneAction ya pedía la misma estructura que expandSceneBrief agrega —
  el gap era de longitud (OpenAI generaba ~25-35 palabras en lugar de 80-100) y de
  la regla final ("4K photorealistic. No text, no logos, no products.")
- buildScenePrompt() inserta sceneAction literalmente → no necesita ningún cambio

### Cambios aplicados

#### `src/lib/ai/openai.ts`

**1 — FIELD_RULE de sceneAction** (línea ~234):
```diff
- sceneAction: `- sceneAction: A hyper-specific photography direction describing a COMPLETE SCENE...
-   Max 80 words. By default, the person fills the full canvas...
-   SYNTHESIS RULE — when both TEMPLATE VISUAL DIRECTION and SCENE EXAMPLES are present...`
+ sceneAction: `- sceneAction: A COMPLETE, ready-to-use cinematic photography brief for an AI image
+   generation model. DO NOT write a short description — write the FULL, detailed prompt.
+   Required structure — include ALL six elements:
+   [1] Setting/environment: specific location, surfaces, props, textures, depth of field, atmosphere
+   [2] Person: exact age range, gender, clothing style and color, hair, skin tone
+   [3] Body language: precise pose, weight distribution, arm position, micro-expression
+   [4] Lighting: key light source and direction, color temperature (warm/cool/neutral), shadow quality
+   [5] Camera feel: lens compression, framing (tight portrait vs. environmental), depth
+   [6] Positioning: follow the TEMPLATE VISUAL DIRECTION strictly...
+   Target length: 80–100 words — dense and specific, not verbose. DO NOT truncate or summarize.
+   End with exactly: "4K photorealistic. No text, no logos, no products."
+   SYNTHESIS RULE — when TEMPLATE VISUAL DIRECTION and SCENE EXAMPLES are both present: ...`
```

**2 — Nuevo bloque `personOnlyNote`** (después de `sceneWithProductNote`):
```diff
+ const personOnlyNote =
+   filteredSchema.includes("sceneAction") && tpl?.personOnly === true
+     ? `PERSON-ONLY COMPOSITE MODE — CRITICAL:
+ The background for this template is pre-generated separately. Gemini will receive it as an image
+ and must ADD the person to it — it does NOT generate any environment.
+ Therefore, sceneAction must describe ONLY THE PERSON...`
+     : "";
```

**3 — Inyección de `personOnlyNote` en el prompt**:
```diff
- ${textSideBlock}${sceneWithProductNote}${templateHintBlock}...
+ ${textSideBlock}${sceneWithProductNote}${personOnlyNote}${templateHintBlock}...
```

#### `src/services/product-composer/templates/meta.ts`

**4 — Campo `skipExpandSceneBrief` en TemplateMetadata** (~línea 150):
```diff
+ /**
+  * true = OpenAI generates sceneAction as a full cinematic brief (80–100 words),
+  * ready to send directly to Gemini. expandSceneBrief() is skipped for this template.
+  */
+ skipExpandSceneBrief?: boolean;
```

**5 — Activado en `pain-point-left`**:
```diff
  copySchema: ["headline", "subheadline", "badge", "backgroundColorHint", "sceneAction"],
+ skipExpandSceneBrief: true,
  requiresSceneGeneration: true,
```

#### `src/app/api/compose/route.ts`

**6 — Condicional `skipExpand`** (~línea 546):
```diff
  const hasSceneAction = fullSchema.includes("sceneAction");
+ const skipExpand = copyTemplateMeta?.skipExpandSceneBrief === true;
- if (hasSceneAction) {
+ if (hasSceneAction && !skipExpand) {
    // expandSceneBrief como antes — solo corre para templates sin skipExpandSceneBrief
  }
```

### Estado por template

| Template | `sceneAction` en schema | `skipExpandSceneBrief` | Estado |
|---|---|---|---|
| `pain-point-left` | ✅ | ✅ `true` | ✅ **Validado** (2026-03-15) |
| `editorial-lifestyle-left` | ✅ | ✅ `true` | ✅ **Validado** (2026-03-15) |
| `editorial-center-top` | ✅ | ✅ `true` | ✅ **Validado** (2026-03-15) |
| `bebas-urgencia-top` | ✅ | ✅ `true` | ✅ **Validado** (2026-03-15) |
| Resto de templates | ❌ (no en schema) | N/A | No aplica |

### Ahorro estimado por tanda (5 ángulos, tras migración completa)

| Métrica | Baseline actual | Con `skipExpandSceneBrief: true` | Δ |
|---|---|---|---|
| Llamadas a OpenRouter/Kimi | 5 | 0 | **−5 por tanda** |
| Tokens OpenRouter (entrada) | ~12,870 | 0 | **−12,870** |
| Tokens OpenRouter (salida) | ~550 | 0 | **−550** |
| Tokens totales texto/tanda | ~16,870 | ~3,470 | **−13,400 (−79%)** |
| OpenAI tokens extra (sceneAction más largo) | 0 | ~+200 (brief denso) | +200 |
| **Ahorro neto** | — | — | **~13,200 tokens/tanda** |

### Pendiente final — todos los templates validados, listo para eliminar

Los 4 templates con `sceneAction` en schema tienen `skipExpandSceneBrief: true` y están validados en producción. `expandSceneBrief` ya no se ejecuta en ningún request del pipeline activo.

| # | Acción | Archivos |
|---|---|---|
| A | Eliminar función `expandSceneBrief()` | `src/lib/ai/gemini.ts` (~85 líneas, ~línea 1731) |
| B | Eliminar import `expandSceneBrief` | `src/app/api/compose/route.ts` línea 19 |
| C | Eliminar bloque condicional `skipExpand` + cuerpo de expansión | `src/app/api/compose/route.ts` líneas ~546-584 |
| D | Verificar si `getLibrarySection("scene-only")` tiene otros call sites | `src/lib/ai/gemini.ts` — si solo era `expandSceneBrief`, también se puede limpiar |
| E | Si `scene-only.md` queda sin consumidores: evaluar deprecar | `src/lib/ai/promptLibrary.ts` |

---

## OPTIMIZACIÓN PROMPT OPENAI — 2026-03-16

### Contexto

Auditoría del prompt completo de `generateTemplateCopyOpenAI()` para identificar duplicación de contexto y dead code en templateHints. El prompt se ensambla de ~16 bloques; se identificaron 3 bloques de dead code en `meta.ts` que consumían tokens sin efecto.

---

### Bloques del prompt auditados (Tarea 1)

| # | Bloque | Tokens est. | Superpone con | Estado |
|---|--------|-------------|---------------|--------|
| S | `EXPERT_COPYWRITER_SYSTEM_PROMPT` | ~700 | Header user prompt repite "expert advertising copywriter" | Pendiente (Paso 2) |
| 1 | Header hardcoded + schema | ~30 | Sistema (#S) | Pendiente |
| 2 | `dynamicFieldRules` (FIELD RULES) | 50–800 | templateHint por campo, Visual Direction | Correcto — ya filtrado por schema |
| 3 | `textSideBlock` | ~60 | templateHint de editorial-* también explica textSide | Pendiente (Paso 2) |
| 4 | `sceneWithProductNote` | ~50 | FIELD_RULE[sceneAction] (~200t) ya lo cubre | Pendiente |
| 5 | `personOnlyNote` | ~70 | defaultProductPrompt en Visual Direction ya lo dice | Pendiente |
| 6 | `templateHintBlock` | 100–400 | templateContextBlock (layout); FIELD_RULES (campos) | **PASO 1 aplicado** |
| 7 | `templateContextBlock` | ~80 | templateHint intro | Pendiente |
| 8 | `templateVisualDirectionBlock` | 100–600 | FIELD_RULE[backgroundPrompt/sceneAction] | Correcto |
| 9 | `backgroundStyleGuideBlock` | ~100 | FIELD_RULE[backgroundPrompt] ya la referencia | Correcto |
| 10 | `sceneExamplesBlock` | 200–500 | FIELD_RULE[sceneAction] referencia explícita | Correcto |
| 11 | `brandContextBlock` | ~150–200 | Nada | Correcto |
| 12–15 | sorteo/reference/USER INFO/variants | 20–150 | Nada | Correcto |

---

### Dead code en templateHints — Tarea 2 (estado por template)

| Template | copySchema | Campos dead en templateHint | Tokens muertos | Eliminado |
|----------|-----------|----------------------------|----------------|-----------|
| `classic-editorial-right` | title, headline, subheadline, badge, bullets | — | 0 | N/A |
| `pain-point-left` | headline, subheadline, badge, backgroundColorHint, sceneAction | — | 0 | N/A |
| `editorial-lifestyle-left` | headline, subheadline, badge, sceneAction, textSide | `backgroundColorHint` (2 líneas) | ~40 | ✅ **PASO 1** |
| `editorial-center-top` | title, headline, subheadline, badge, bullets, sceneAction, textSide, backgroundColorHint | `productPrompt` (9 líneas + ejemplo) | ~150 | ✅ **PASO 1** |
| `producto-hero-top` | headline, subheadline, disclaimer, backgroundPrompt | — (pero backgroundPrompt se ignora en pipeline — bug separado) | 0 en hint | N/A |
| `persona-producto-left` | badge, headline, subheadline, title | intro `backgroundPrompt`+`productPrompt` (5 líneas) | ~80 | ✅ **PASO 1** |
| `bebas-urgencia-top` | headline, backgroundColorHint, sceneAction | backgroundColorHint "ignored" (nota honesta, no dead code) | 0 en hint | N/A |

---

### PASO 1 — Limpieza aplicada (2026-03-16)

**Archivo:** `src/services/product-composer/templates/meta.ts`

#### Diff 1 — `editorial-lifestyle-left` templateHint
```diff
  - badge: optional URL or brand tagline. Max 30 chars.
    Example: "www.mybrand.com"

- - backgroundColorHint: light cream, white, soft neutral. Max 5 words.
-   Example: "crema claro casi blanco"
-
  - sceneAction: describe the person/scene. Be specific about pose, expression, lighting.
```
**Motivo:** `backgroundColorHint` fue eliminado del `copySchema` en un fix anterior. OpenAI no genera el campo, pero el modelo leía instrucciones para él igualmente.

#### Diff 2 — `editorial-center-top` templateHint
```diff
  - sceneAction: describe the person/scene...
    Example: "Close-up of woman's face in profile..."

- - productPrompt: REQUIRED. English. Self-contained image generation prompt.
-   MANDATORY STRUCTURE:
-   1. "BOTTOM 40% OF CANVAS ONLY..."
-   2. 1-2 real people naturally using or holding this product...
-   3. "Person spans the FULL WIDTH..."
-   4. Environment matching the product category...
-   5. "Warm natural lighting, editorial quality, candid feel."
-   6. "Do not erase or modify any existing text..."
-   Example (skincare): "BOTTOM 40% OF CANVAS ONLY..."
```
**Motivo:** `productPrompt` nunca estuvo en el `copySchema` de `editorial-center-top`. Las instrucciones eran letra muerta — 9 líneas y un ejemplo completo que el modelo leía pero nunca producía como campo del JSON.

#### Diff 3 — `persona-producto-left` templateHint
```diff
  This is a Huel/Nike-style lifestyle brand ad. Person with product on the RIGHT, large claim + CTA on the LEFT.
  Dark gradient covers the left half for white text readability.

- ⚡ COHERENCE IS MANDATORY: backgroundPrompt and productPrompt MUST describe the SAME location,
- lighting, and atmosphere. First decide the scene setting based on the product and angle (outdoor trail,
- gym, bathroom, kitchen, etc.), then write backgroundPrompt as the empty environment and productPrompt
- as the person+product IN THAT EXACT SAME environment. They must feel like the same photo shoot.
-
  - badge: brand name or short tagline at TOP-LEFT. Max 30 chars.
```
**Motivo:** `backgroundPrompt` y `productPrompt` no están en el `copySchema` de `persona-producto-left`. El pipeline usa `defaultBackgroundPrompt` y `defaultProductPrompt` de meta.ts directamente, ignorando cualquier campo generado por OpenAI para ellos. La instrucción de coherencia entre campos que el modelo no genera era confusa y consumía tokens.

---

### Ahorro total — PASO 1

| Template | Tokens eliminados del templateHint | Tokens ahorrados por llamada (el modelo ya no los procesa) |
|----------|-----------------------------------|-------------------------------------------------------------|
| `editorial-lifestyle-left` | ~40 | ~40 |
| `editorial-center-top` | ~150 | ~150 |
| `persona-producto-left` | ~80 | ~80 |
| **Total** | **~270 tokens** | **~270 tokens/llamada** |

> Para una tanda de 5 ángulos: **~1,350 tokens ahorrados** solo en dead code de templateHints.

---

### PASO 2 — Fusiones en openai.ts (2026-03-16)

#### FUSIÓN 1 — Eliminar persona del header del user prompt (~25t)

**Archivo:** `src/lib/ai/openai.ts` — construcción del `prompt` (user message)

```diff
- const prompt = `You are an expert advertising copywriter specialized in direct response marketing in Spanish.
-
- Generate copy for a visual advertising template. Output a JSON object with EXACTLY these fields: ...
+ const prompt = `Generate copy for a visual advertising template. Output a JSON object with EXACTLY these fields: ...
```

**Motivo:** `EXPERT_COPYWRITER_SYSTEM_PROMPT` (system message) ya declara la persona de forma más completa. La línea del user prompt era una paráfrasis más débil — información duplicada entre system y user message. La instrucción `"Generate copy..."` + el schema constraint se conservan íntegros.

**Tokens eliminados:** ~25t (frase + línea en blanco).

---

#### FUSIÓN 2 — sceneWithProductNote eliminado como bloque; instrucción inline en FIELD_RULE (−35t neto)

**Archivo:** `src/lib/ai/openai.ts`

**Parte A — bloque separado eliminado:**
```diff
- const sceneWithProductNote =
-   filteredSchema.includes("sceneAction") && tpl?.compositionMode === "scene-with-product"
-     ? `SCENE WITH PRODUCT — IMPORTANT:
- This template composites a real person physically holding or using the actual product.
- When writing sceneAction, you MUST describe the person-product interaction explicitly:
- - The person must be ACTIVELY HOLDING, APPLYING, or USING the product (not just near it)
- - Describe the exact interaction: product held at chest height, applying to skin, presenting to camera, etc.
- - The product must be clearly visible and recognizable in the scene description
- - Match the interaction style and energy to the emotional angle of this variant
- `
-     : "";
```

**Parte B — instrucción comprimida inyectada en FIELD_RULE[sceneAction]:**
```diff
  The scene must directly illustrate the variant's headline copy. Be specific to the product category.
  IMPORTANT: See the SCENE EXAMPLES section below — you MUST synthesize it with the Template Visual Direction.
+ ${tpl?.compositionMode === "scene-with-product" ? "\n  SCENE WITH PRODUCT: the person MUST be ACTIVELY HOLDING, APPLYING, or USING the product — describe the exact interaction (height, hand position, label facing camera). Product fully visible." : ""}
```

**Parte C — referencia en el ensamblado del prompt:**
```diff
- ${textSideBlock}${sceneWithProductNote}${personOnlyNote}${templateHintBlock}
+ ${textSideBlock}${personOnlyNote}${templateHintBlock}
```

**Análisis de cobertura:** Los 4 bullets originales tenían 3 instrucciones únicas (ACTIVELY HOLDING, exact interaction, product visible) y 1 cubierta por FIELD_RULE ("match angle"). Las 3 únicas se comprimen en 1 frase inline de ~30t. El contexto/título del bloque ("SCENE WITH PRODUCT — IMPORTANT: This template composites a real person...") no aportaba instrucción accionable — eliminado.

**Tokens:** −50t (bloque) +15t (línea inline) = **−35t neto**.

---

#### FUSIÓN 3 — templateContextBlock fusionado como header compact en templateHintBlock (~65t)

**Archivo:** `src/lib/ai/openai.ts`

**templateContextBlock:** ahora se muestra completo solo cuando NO hay templateHint:
```diff
- const templateContextBlock = tpl
+ const templateContextBlock = (tpl && !args.templateHint)
    ? `TEMPLATE CONTEXT...`
    : "";
```

**templateHintBlock:** cuando hay hint, incluye 1 línea de contexto compacto como header:
```diff
- const templateHintBlock = args.templateHint
-   ? `TEMPLATE HINT:\n${args.templateHint}\n\n`
-   : "";
+ const templateHintBlock = args.templateHint
+   ? `TEMPLATE: ${tpl?.name ?? ""} (${tpl?.id ?? ""})${tpl?.copyZone ? ` · Zone: ${tpl.copyZone}` : ""}${tpl?.sceneFullBleed ? " · full-bleed" : ""}${tpl?.personScene ? " · person in scene" : ""}${tpl?.personOnly ? " · person-only" : ""}
+ TEMPLATE HINT:
+ ${args.templateHint}
+
+ `
+   : "";
```

**Análisis línea por línea de lo eliminado del templateContextBlock cuando hay hint:**

| Línea eliminada | Por qué es seguro eliminarla |
|---|---|
| `Description: ...` | Primera línea del templateHint describe el mismo layout en prosa |
| `Copy zone: ...` | Templatehint lo describe explícitamente ("text on LEFT", "TOP 40%", etc.) |
| `Copy fields: ...` | Ya está en el header del prompt: "Output a JSON object with EXACTLY these fields: ..." |
| `Pipeline: V1/V2` | No relevante para decisiones de copy |
| `Recommended for categories: ...` | No relevante para decisiones de copy |
| `Adapt the copy tone...` | Genérico, baja instrucción sin contenido específico |

**Lo que se conserva en el compact header:**
- Nombre + ID del template → referencia directa para el modelo
- `Zone: [copyZone]` → dato estructural concreto
- Flags de escena (`full-bleed`, `person in scene`, `person-only`) → afectan directamente cómo se describe la escena

**Verificación de cobertura para los 7 templates activos:**

| Template | templateHint definido | Resultado |
|---|---|---|
| `classic-editorial-right` | ✅ | Compact header + hint. Standalone context block: `""` |
| `pain-point-left` | ✅ | Compact header + hint. Standalone context block: `""` |
| `editorial-lifestyle-left` | ✅ | Compact header + hint. Standalone context block: `""` |
| `editorial-center-top` | ✅ | Compact header + hint. Standalone context block: `""` |
| `producto-hero-top` | ✅ | Compact header + hint. Standalone context block: `""` |
| `persona-producto-left` | ✅ | Compact header + hint. Standalone context block: `""` |
| `bebas-urgencia-top` | ✅ | Compact header + hint. Standalone context block: `""` |
| Template futuro sin hint | ❌ | Full templateContextBlock aparece solo — sin regresión |

**Tokens:** −80t (full block suprimido) +15t (compact header) = **−65t neto**.

---

### Tabla acumulada PASO 1 + PASO 2

| Cambio | Archivo | Tokens ahorrados/llamada |
|---|---|---|
| **PASO 1** — dead code `backgroundColorHint` en hint `editorial-lifestyle-left` | `meta.ts` | ~40t |
| **PASO 1** — dead code `productPrompt` (9 líneas) en hint `editorial-center-top` | `meta.ts` | ~150t |
| **PASO 1** — dead code intro `backgroundPrompt+productPrompt` en hint `persona-producto-left` | `meta.ts` | ~80t |
| **PASO 2 · F1** — eliminar persona duplicada del header user prompt | `openai.ts` | ~25t |
| **PASO 2 · F2** — eliminar `sceneWithProductNote` como bloque separado (+inline) | `openai.ts` | ~35t |
| **PASO 2 · F3** — fusionar `templateContextBlock` en `templateHintBlock` | `openai.ts` | ~65t |
| **TOTAL por llamada única** | | **~395t** |
| **TOTAL por tanda de 5 ángulos** | | **~1,975t** |

> Para templates con `scene-with-product` (editorial-center-top, persona-producto-left): el ahorro real es ~395t por variante (PASO 1 aplica a todos; PASO 2·F2 solo activo cuando sceneAction en schema + compositionMode="scene-with-product").

---

### PASO 3 — Bloques residuales — 2026-03-16

#### Corrección de análisis previo: `backgroundStyleGuideBlock` vs `templateVisualDirectionBlock`

El análisis inicial concluyó erróneamente que ambos bloques eran siempre el mismo valor. La corrección:

- `templateVisualDirectionBlock` usa `tpl?.defaultBackgroundPrompt` — siempre el fallback fijo.
- `backgroundStyleGuide` (page.tsx) usa `categoryBackgroundPrompts[cat] ?? defaultBackgroundPrompt` — cuando la categoría tiene un prompt específico, el valor es **diferente** a `defaultBackgroundPrompt`.

Ejemplo concreto: `producto-hero-top` con categoría `belleza-cosmetica`:
- `templateVisualDirectionBlock` → `"Minimalist premium studio background..."` (~20t)
- `backgroundStyleGuideBlock` → el prompt de macro photography con SELECTION SYSTEM por tipo de producto (~400t)

Son strings distintos. **`backgroundStyleGuideBlock` no puede eliminarse**, solo gatearse.

---

#### CAMBIO 1 — Gate `backgroundStyleGuideBlock` en filteredSchema

**Archivo:** `src/lib/ai/openai.ts`

**Problema:** el bloque se inyectaba incluso cuando `backgroundPrompt`/`backgroundColorHint` estaban fuera de `filteredSchema` por `rawBackgroundPrompt: true`. No había campo receptor — tokens inyectados sin efecto.

```diff
- const backgroundStyleGuideBlock = args.backgroundStyleGuide
-   ? `BACKGROUND STYLE GUIDE (mandatory reference for the backgroundPrompt field...):
- ${args.backgroundStyleGuide}
- `
-   : "";
+ // Gate: solo inyectar cuando backgroundPrompt tiene campo receptor en filteredSchema.
+ // FIELD_RULE["backgroundColorHint"] no referencia el style guide — genera paleta
+ // únicamente desde el ángulo emocional del creativo, es auto-contenido.
+ // Solo FIELD_RULE["backgroundPrompt"] tiene "IMPORTANT: If a BACKGROUND STYLE GUIDE
+ // is provided below, you MUST base this field on it." → único receptor legítimo.
+ // Resultado: el bloque aparece ÚNICAMENTE para producto-hero-top.
+ const backgroundStyleGuideBlock =
+   args.backgroundStyleGuide &&
+   filteredSchema.includes("backgroundPrompt")
+     ? `BACKGROUND STYLE GUIDE (mandatory reference for the backgroundPrompt field...):
+ ${args.backgroundStyleGuide}
+ `
+     : "";
```

**Corrección al gate inicial:** la versión original del gate incluía `|| filteredSchema.includes("backgroundColorHint")`. Esto era incorrecto: `FIELD_RULE["backgroundColorHint"]` no referencia el style guide en ningún momento — genera solo un string de 8 palabras de paleta basado en el ángulo emocional (Emotional → warm, Problem → neutral cool, etc.). El receptor explícito del style guide es únicamente `FIELD_RULE["backgroundPrompt"]` que termina con `"IMPORTANT: If a BACKGROUND STYLE GUIDE is provided below, you MUST base this field on it."` Gate corregido a solo `filteredSchema.includes("backgroundPrompt")`.

**Templates afectados — tabla final:**

| Template | `backgroundPrompt` en schema | Bloque inyectado | Tokens |
|---|---|---|---|
| `producto-hero-top` | ✅ sí | ✅ sí — `categoryBackgroundPrompts["belleza-cosmetica"]` o `defaultBackgroundPrompt` | se conserva ✓ |
| `editorial-center-top` | ❌ no (`backgroundColorHint` sí, pero no `backgroundPrompt`) | ❌ no — gate correcto | ~100–400t ahorrados (cat-specific) |
| `pain-point-left` | ❌ no (`backgroundColorHint` sí) | ❌ no | ~20t ahorrados (`defaultBackgroundPrompt`) |
| `bebas-urgencia-top` | ❌ no (filtrado por `rawBackgroundPrompt: true`) | ❌ no | ~100–400t ahorrados (cat-specific) |
| `classic-editorial-right` | ❌ no (filtrado por `rawBackgroundPrompt: true`) | ❌ no | ~20t ahorrados |
| `editorial-lifestyle-left` | ❌ no (filtrado por `rawBackgroundPrompt: true`) | ❌ no | ~20t ahorrados |
| `persona-producto-left` | ❌ no (filtrado por `rawBackgroundPrompt: true`) | ❌ no | ~20t ahorrados |

Ahorro total del gate corregido vs. sin gate: **~180–1,400t** por tanda de 5 ángulos según categoría y templates activos en el batch.

---

#### CAMBIO 2 — Comprimir `textSideBlock` (~40t neto)

**Archivo:** `src/lib/ai/openai.ts`

**Justificación:** `templateHint` de `editorial-lifestyle-left` y `editorial-center-top` ya cubre completamente la semántica (valores válidos, significado de cada opción, ejemplo). El bloque separado solo necesita conservar: (a) título como ancla de sección y (b) constraint de variación entre variantes del batch — el único elemento que el hint no vincula explícitamente al batch.

```diff
- const textSideBlock = filteredSchema.includes("textSide")
-   ? tpl?.id === "editorial-center-top"
-     ? `LAYOUT SIDE SELECTION — textSide:
- Choose "top" or "bottom" based on what creates the best visual balance for this creative:
- - "top" → text panel at TOP of canvas, person/scene fills the BOTTOM portion.
- - "bottom" → text panel at BOTTOM of canvas, person/scene fills the TOP portion.
- Vary between variants — do not always pick the same option.
- Return exactly: "top" or "bottom" (no other values).
-
- `
-     : `LAYOUT SIDE SELECTION — textSide:
- Choose "left" or "right" based on what creates the best visual balance for this creative:
- - "left" → text on the LEFT half of the canvas, person/scene on the RIGHT half.
- - "right" → text on the RIGHT half of the canvas, person/scene on the LEFT half.
- Vary between variants — do not always pick the same option.
- Return exactly: "left" or "right" (no other values).
-
- `
-   : "";
+ // Anchor + batch-variation constraint. Semantics are fully covered by templateHint.
+ const textSideBlock = filteredSchema.includes("textSide")
+   ? tpl?.id === "editorial-center-top"
+     ? `LAYOUT SIDE SELECTION — textSide: "top" or "bottom". Vary across variants. Exact values only.\n\n`
+     : `LAYOUT SIDE SELECTION — textSide: "left" or "right". Vary across variants. Exact values only.\n\n`
+   : "";
```

**Tokens:** ~60t (bloque original) → ~10t (1 línea) = **−~50t neto** cuando `textSide` está en schema.

---

#### CAMBIO 3 — `personOnlyNote` inline en FIELD_RULE[sceneAction] (~55t neto)

**Archivo:** `src/lib/ai/openai.ts`

**Patrón:** mismo que FUSIÓN 2 (sceneWithProductNote). El bloque separado de ~70t se reemplaza por una frase inline de ~15t al final de `FIELD_RULE["sceneAction"]`.

**Inline añadida al final de FIELD_RULE["sceneAction"]:**
```diff
  ...${tpl?.compositionMode === "scene-with-product" ? "\n  SCENE WITH PRODUCT: ..." : ""}
+ ${filteredSchema.includes("sceneAction") && tpl?.personOnly === true
+   ? "\n  PERSON-ONLY: describe ONLY the person — no environment, no setting, no room, no surfaces. Background is pre-generated separately."
+   : ""}
```

**Bloque separado eliminado:**
```diff
- const personOnlyNote =
-   filteredSchema.includes("sceneAction") && tpl?.personOnly === true
-     ? `PERSON-ONLY COMPOSITE MODE — CRITICAL:
- The background for this template is pre-generated separately...
- Describe exclusively:
- - The person's appearance (age, clothing, hair, skin tone)
- - Their pose, body language, and micro-expression
- - How lighting falls ON THEM (matching a dark cinematic mood)
- - Their exact positioning within the canvas (follow TEMPLATE VISUAL DIRECTION)
- DO NOT mention kitchens, bathrooms, gyms, counters, mirrors, or any physical setting.
- `
-     : "";
+ // personOnlyNote is now inline in FIELD_RULE["sceneAction"].
```

**Ensamblado del prompt:**
```diff
- ${textSideBlock}${personOnlyNote}${templateHintBlock}
+ ${textSideBlock}${templateHintBlock}
```

**Tokens:** ~70t (bloque) → ~15t (inline) = **−~55t neto** para `bebas-urgencia-top` (único template con `personOnly: true`).

**Cobertura conservada:** la inline preserva la instrucción esencial ("describe ONLY the person — no environment"). Los bullets detallados del bloque original (pelo, skin tone, lighting ON THEM, etc.) estaban cubiertos por `FIELD_RULE["sceneAction"]` items [2]–[4] que ya piden exactamente esos elementos — la instrucción inline solo agrega el constraint de exclusión de entorno.

---

### Tabla acumulada PASO 1 + PASO 2 + PASO 3 (ver PASO 4 para tabla actualizada)

| Cambio | Archivo | Tokens ahorrados/llamada |
|---|---|---|
| **PASO 1** — dead code `backgroundColorHint` en hint `editorial-lifestyle-left` | `meta.ts` | ~40t |
| **PASO 1** — dead code `productPrompt` (9 líneas) en hint `editorial-center-top` | `meta.ts` | ~150t |
| **PASO 1** — dead code intro `backgroundPrompt+productPrompt` en hint `persona-producto-left` | `meta.ts` | ~80t |
| **PASO 2 · F1** — eliminar persona duplicada del header user prompt | `openai.ts` | ~25t |
| **PASO 2 · F2** — eliminar `sceneWithProductNote` como bloque separado (+inline) | `openai.ts` | ~35t |
| **PASO 2 · F3** — fusionar `templateContextBlock` en `templateHintBlock` | `openai.ts` | ~65t |
| **PASO 3 · C1** — gate `backgroundStyleGuideBlock` en filteredSchema | `openai.ts` | ~100–400t (solo `bebas-urgencia-top` con cat específica) |
| **PASO 3 · C2** — comprimir `textSideBlock` a 1 línea | `openai.ts` | ~50t (cuando `textSide` en schema) |
| **PASO 3 · C3** — `personOnlyNote` inline en FIELD_RULE[sceneAction] | `openai.ts` | ~55t (solo `bebas-urgencia-top`) |
| **TOTAL base por llamada única** | | **~500t** |
| **TOTAL con bebas-urgencia-top + belleza-cosmetica** | | **~650–950t** |
| **TOTAL por tanda de 5 ángulos (base)** | | **~2,500t** |

> "Base": ahorro garantizado para cualquier template activo. El rango alto incluye el gate de `backgroundStyleGuideBlock` para `bebas-urgencia-top` con `categoryBackgroundPrompts` definidos.

---

### Estado final de bloques post PASO 3 (ver PASO 4 para estado actualizado)

| Bloque | Estado | Justificación |
|---|---|---|
| `EXPERT_COPYWRITER_SYSTEM_PROMPT` | ✅ conservado | System message — define persona del modelo, contexto global |
| `dynamicFieldRules` | ✅ conservado, filtrado por `ALWAYS_USE_FIELD_RULE` | Instrucciones por campo, gateado en runtime |
| `textSideBlock` | ✅ comprimido (PASO 3·C2) | Ancla de sección + constraint de variación de batch |
| `personOnlyNote` | ✅ eliminado → inline (PASO 3·C3) | Inline en FIELD_RULE[sceneAction] |
| `templateHintBlock` | ✅ conservado con compact header (PASO 2·F3) | Instrucciones específicas del template — no redundante |
| `templateContextBlock` | ✅ conservado (solo sin hint) | Fallback para templates sin templateHint |
| `templateVisualDirectionBlock` | ✅ conservado | defaultBackgroundPrompt + defaultProductPrompt del template — fuente primaria para sceneAction/backgroundPrompt |
| `backgroundStyleGuideBlock` | ✅ gateado (PASO 3·C1) | categoryBackgroundPrompts puede ser distinto a defaultBackgroundPrompt — NO siempre duplicado |
| `sceneExamplesBlock` | ✅ conservado | getSceneLibrarySection — ejemplos de escena por categoría, fuente distinta a templateVisualDirectionBlock |
| `brandContextBlock` | ✅ conservado | Datos del negocio — única fuente |
| `sorteoBlock` / `referenceBlock` | ✅ conservado | Datos de sorteo / estilo de referencia — únicos |

---

### PASO 4 — Eliminar `FIELD_RULE` para campos simples (ejecutado)

**Archivo:** `src/lib/ai/openai.ts`

**Problema:** `FIELD_RULE` contenía entradas para 10 campos simples (`title`, `headline`, `subheadline`, `badge`, `bullets`, `columnTitle`, `competitionTitle`, `competitionBullets`, `disclaimer`, `cta`) que ya están completamente descritos en `templateHint` con restricciones específicas por template. El paso anterior (PASO 3) les aplicaba un gate en runtime (`ALWAYS_USE_FIELD_RULE`), pero las entradas muerta seguían existiendo en el Record.

**Cambio 1 — Strip de campos simples de `FIELD_RULE`:**

Los 10 campos eliminados del Record:
```diff
  const FIELD_RULE: Record<string, string> = {
-   title: `- title: 3-5 keywords separated by ' · ' max 50 chars`,
-   headline: `- headline: max 6 words, emotional, ends with period...`,
-   subheadline: `- subheadline: 1-2 sentences, max 120 chars...`,
-   badge: `- badge: short offer pill format, max 35 chars`,
-   bullets: `- bullets: array of 3 items, max 40 chars each...`,
-   columnTitle: `- columnTitle: (comparacion-split only)...`,
-   competitionTitle: `- competitionTitle: (comparacion-split only)...`,
-   competitionBullets: `- competitionBullets: (comparacion-split only)...`,
-   disclaimer: `- disclaimer: short social-proof or legal line...`,
-   cta: `- cta: direct call to action, max 20 chars...`,
    backgroundPrompt: `...`,
    productPrompt: `...`,
    primaryColor: `...`,
    backgroundColorHint: `...`,
    sceneAction: `...`,
    scenePrompt: `...`,
  };
```

`FIELD_RULE` queda con exactamente los 6 campos que tienen lógica dinámica de runtime que ningún `templateHint` replica:

| Campo | Razón para conservar |
|---|---|
| `sceneAction` | `tpl?.textSide`, `ZONE_PERCENTAGES`, inline `scene-with-product`, inline `personOnly`, SYNTHESIS RULE |
| `backgroundPrompt` | estructura compleja + SELECTION SYSTEM |
| `scenePrompt` | estructura compleja |
| `primaryColor` | tabla color-por-industria |
| `backgroundColorHint` | lógica ángulo emocional → paleta |
| `productPrompt` | brief persona+producto complejo |

**Cambio 2 — Simplificar `dynamicFieldRules`:**

Eliminado el `ALWAYS_USE_FIELD_RULE` Set (ya no necesario) y simplificado el cómputo:

```diff
- const ALWAYS_USE_FIELD_RULE = new Set([
-   "sceneAction", "backgroundPrompt", "scenePrompt",
-   "primaryColor", "backgroundColorHint", "productPrompt",
- ]);
-
- const dynamicFieldRules = `FIELD RULES:\n${filteredSchema
-   .map((f) => {
-     if (args.templateHint && !ALWAYS_USE_FIELD_RULE.has(f)) return null;
-     return FIELD_RULE[f] ?? `- ${f}: fill this field appropriately for the template context`;
-   })
-   .filter(Boolean)
-   .join("\n")}`;
+ const dynamicFieldRules = filteredSchema.some(f => FIELD_RULE[f])
+   ? `FIELD RULES:\n${filteredSchema
+       .map((f) => FIELD_RULE[f] ?? null)
+       .filter(Boolean)
+       .join("\n")}`
+   : "";
```

Comportamiento resultante:
- Templates con solo campos simples (ej. `persona-producto-left`: `badge`, `headline`, `subheadline`, `title`) → `dynamicFieldRules = ""` — **el bloque `FIELD RULES:` desaparece por completo** del prompt, incluyendo el header.
- Templates con `sceneAction`, `backgroundColorHint`, etc. → solo esas reglas se inyectan.

**Cambio 3 — Log actualizado:**

```diff
  console.log(JSON.stringify({
    tag: "[COPY_GEN:FIELD_RULE_GATE]",
    templateId: tpl?.id,
    hasTemplateHint: !!args.templateHint,
    fieldsInSchema: filteredSchema,
-   fieldsKeptInFieldRule: filteredSchema.filter(f => !args.templateHint || ALWAYS_USE_FIELD_RULE.has(f)),
-   fieldsSkippedFromFieldRule: filteredSchema.filter(f => args.templateHint && !ALWAYS_USE_FIELD_RULE.has(f)),
+   fieldsWithActiveRule: filteredSchema.filter(f => !!FIELD_RULE[f]),
+   fieldsWithoutRule: filteredSchema.filter(f => !FIELD_RULE[f]),
  }, null, 2));
```

**Tokens ahorrados:**

| Template (activo) | Campos simples en schema | Tokens ahorrados |
|---|---|---|
| `persona-producto-left` | `badge`, `headline`, `subheadline`, `title` | ~110t (4 reglas + header) |
| `classic-editorial-right` | `title`, `headline`, `subheadline`, `badge`, `bullets` | ~220t |
| `hero-center-bottom` | `title`, `headline`, `subheadline`, `badge` | ~160t |
| `pain-point-left` | `headline`, `subheadline`, `badge` | ~90t (más `backgroundColorHint`+`sceneAction` que se conservan) |
| `comparacion-split` | `headline`, `badge`, `columnTitle`, `competitionTitle`, `bullets`, `competitionBullets` | ~330t |
| `antes-despues` | `badge`, `columnTitle`, `competitionTitle`, `bullets`, `competitionBullets` | ~280t |
| `bebas-urgencia-top` | `headline` | ~40t |
| `editorial-center-top` | `title`, `headline`, `subheadline`, `badge`, `bullets` | ~220t |
| `persona-hero-bottom` | `headline`, `subheadline`, `title` | ~90t |

> **Ahorro base por llamada: ~100–330t** según template. Suma con ahorros de PASOS 1–3.

---

### Tabla acumulada PASO 1 + PASO 2 + PASO 3 + PASO 4

| Cambio | Archivo | Tokens ahorrados/llamada |
|---|---|---|
| **PASO 1** — dead code en hints (`editorial-lifestyle-left`, `editorial-center-top`, `persona-producto-left`) | `meta.ts` | ~270t |
| **PASO 2 · F1** — eliminar persona duplicada del header user prompt | `openai.ts` | ~25t |
| **PASO 2 · F2** — eliminar `sceneWithProductNote` como bloque separado (+inline) | `openai.ts` | ~35t |
| **PASO 2 · F3** — fusionar `templateContextBlock` en `templateHintBlock` | `openai.ts` | ~65t |
| **PASO 3 · C1** — gate `backgroundStyleGuideBlock` en filteredSchema | `openai.ts` | ~100–400t |
| **PASO 3 · C2** — comprimir `textSideBlock` a 1 línea | `openai.ts` | ~50t |
| **PASO 3 · C3** — `personOnlyNote` inline en FIELD_RULE[sceneAction] | `openai.ts` | ~55t |
| **PASO 4** — strip campos simples de `FIELD_RULE` + simplificar `dynamicFieldRules` | `openai.ts` | ~100–330t |
| **TOTAL base por llamada única** | | **~700t** |
| **TOTAL por tanda de 5 ángulos** | | **~3,500t** |

---

### Estado final de bloques — actualizado post PASO 4

| Bloque | Estado | Justificación |
|---|---|---|
| `EXPERT_COPYWRITER_SYSTEM_PROMPT` | ✅ conservado | System message — define persona del modelo, contexto global |
| `dynamicFieldRules` | ✅ simplificado (PASO 4) | Solo 6 campos con lógica runtime. String vacío cuando no aplica |
| `FIELD_RULE` | ✅ reducido a 6 campos (PASO 4) | Solo entradas con lógica dinámica que ningún hint replica |
| `textSideBlock` | ✅ comprimido (PASO 3·C2) | Ancla de sección + constraint de variación de batch |
| `personOnlyNote` | ✅ eliminado → inline (PASO 3·C3) | Inline en FIELD_RULE[sceneAction] |
| `templateHintBlock` | ✅ conservado con compact header (PASO 2·F3) | Instrucciones específicas del template — fuente de verdad para campos simples |
| `templateContextBlock` | ✅ conservado (solo sin hint) | Fallback para templates sin templateHint |
| `templateVisualDirectionBlock` | ✅ conservado | defaultBackgroundPrompt + defaultProductPrompt del template |
| `backgroundStyleGuideBlock` | ✅ gateado (PASO 3·C1) | categoryBackgroundPrompts puede ser distinto a defaultBackgroundPrompt |
| `sceneExamplesBlock` | ✅ conservado | getSceneLibrarySection — ejemplos de escena por categoría |
| `brandContextBlock` | ✅ conservado | Datos del negocio — única fuente |
| `sorteoBlock` / `referenceBlock` | ✅ conservado | Datos de sorteo / estilo de referencia — únicos |

---

### Pendiente — PASO 5 (identificado, no ejecutado)

| # | Bloque | Acción | Ahorro est. | Riesgo |
|---|---|---|---|---|
| 1 | `FIELD_RULE["backgroundPrompt"]` (~250t) | Para `producto-hero-top` que sí lo genera, la instrucción (ejemplo completo en español, guía de estilo) es larga pero necesaria para calidad. Evaluar compresión del ejemplo a ~3 líneas | ~80t | Alto — directamente afecta calidad del backgroundPrompt generado |
| 2 | `templateVisualDirectionBlock` para templates que lo tienen en hint | `defaultProductPrompt` ya aparece en templateHint de algunos templates (ej. `persona-producto-left`). Verificar si se puede gate en `!args.templateHint` similar a templateContextBlock | ~50t | Medio |

---

## CAMBIOS APLICADOS — 2026-03-18

### Texture Library — backgroundPrompt dinámico por nicho

**Motivación:** `producto-hero-top` (tras Fix #1 del 2026-03-14) genera `backgroundPrompt` via OpenAI usando solo `FIELD_RULE["backgroundPrompt"]` + `backgroundStyleGuideBlock` como referencias. El resultado es correcto pero repetitivo — misma estructura macro photography cada vez para el mismo nicho. Se agrega un sistema de ejemplos por categoría para dar variedad y especificidad sin necesidad de agregar más texto estático al `templateHint`.

**Archivos creados/modificados:**

| Archivo | Cambio |
|---------|--------|
| `src/lib/ai/prompt-library/texture-library.md` | **Creado** — librería de ejemplos de `backgroundPrompt` por categoría de nicho. Un ejemplo real para `## Belleza & Cosmética`, stubs para las 9 categorías restantes |
| `src/lib/ai/promptLibrary.ts` | **Agregado** `TEXTURE_LIBRARY` (fs.readFileSync) + `getTextureLibrarySection(category)` |
| `src/lib/ai/openai.ts` | **Agregado** import `getTextureLibrarySection` + compute `textureExample` + `textureExamplesBlock` + inyección en prompt entre `backgroundStyleGuideBlock` y `sceneExamplesBlock` |
| `src/services/product-composer/templates/meta.ts` | **Agregado** `useTextureLibrary?: boolean` a `TemplateMeta` + `useTextureLibrary: true` en `producto-hero-top` |
| `src/app/api/compose/route.ts` | **Agregado** `useTextureLibrary: copyTemplateMeta.useTextureLibrary` al objeto `template` pasado a `generateTemplateCopyOpenAI` |

**Flujo activado:**

```
openai.ts — generateTemplateCopyOpenAI()
  ├── gate: tpl?.useTextureLibrary === true
  │         && filteredSchema.includes("backgroundPrompt")
  │         && args.businessProfile?.category
  │
  ├── getTextureLibrarySection(category)
  │     → split texture-library.md por ## secciones
  │     → match por CATEGORY_KEYWORDS
  │     → filtra stubs (líneas que empiezan con "*(")
  │     → pick 1 ejemplo random
  │
  └── textureExamplesBlock inyectado en prompt:
        "TEXTURE REFERENCE EXAMPLE (use this as creative reference...)"
        [ejemplo del nicho]

      ↓ OpenAI genera backgroundPrompt inspirado en el ejemplo
      ↓ resolveBgPrompt() branch 4 → copy.backgroundPrompt → Gemini
```

**Gate triple en openai.ts:**

```typescript
tpl?.useTextureLibrary === true           // template opt-in explícito
  && filteredSchema.includes("backgroundPrompt")  // campo en schema (no filtrado)
  && args.businessProfile?.category              // categoría disponible
```

**Por qué el gate es necesario:**
- `persona-producto-top` también tiene `backgroundPrompt` en schema pero quiere fondos de interior borroso — no texturas macro de skincare
- Sin el flag, el bloque se inyectaría en todos los templates con `backgroundPrompt`, creando inconsistencias
- `useTextureLibrary: true` = opt-in explícito por template

**Función `getTextureLibrarySection()` en promptLibrary.ts:**
- Reutiliza `CATEGORY_KEYWORDS` existente (mismo mapa que `getSceneLibrarySection`)
- Filtra stubs detectando líneas `*(próximamente)*` → devuelve `""` para categorías sin ejemplos reales
- Devuelve `""` en lugar de fallback a toda la librería (a diferencia de `getSceneLibrarySection`) — evitar inyectar ejemplo de nicho incorrecto

**Cómo extender:**

Para agregar texturas a un nuevo template:
1. `meta.ts`: agregar `useTextureLibrary: true` al template
2. `texture-library.md`: agregar `**example-N**` bajo la sección `## Categoría` correspondiente
3. No hay cambios de código — la función ya filtra por categoría y samplea random

Para agregar ejemplos a una categoría existente:
1. Solo editar `texture-library.md` — agregar `**texture-02**`, `**texture-03**`, etc.
2. El shuffle random garantiza variedad automáticamente

**Estado actual de texture-library.md:**

| Sección | Estado |
|---------|--------|
| `## Belleza & Cosmética` | ✅ 1 ejemplo real (`texture-01` — sérum gel azul hielo) |
| `## Salud & Bienestar` | 🔲 stub |
| `## Fitness & Deporte` | 🔲 stub |
| `## Alimentos & Bebidas` | 🔲 stub |
| `## Moda & Estilo` | 🔲 stub |
| `## Hogar & Decoración` | 🔲 stub |
| `## Tecnología` | 🔲 stub |
| `## Joyería & Accesorios` | 🔲 stub |
| `## Mascotas` | 🔲 stub |
| `## Turismo & Viajes` | 🔲 stub |

**Templates con `useTextureLibrary: true`:** solo `producto-hero-top` (2026-03-18).

**Estado del bloque en `openai.ts` — tabla actualizada:**

| Bloque | Estado |
|---|---|
| `backgroundStyleGuideBlock` | ✅ gateado — categoryBackgroundPrompts o defaultBackgroundPrompt del template |
| `textureExamplesBlock` | ✅ gateado — `useTextureLibrary: true` + `backgroundPrompt` en schema + categoría |
| `sceneExamplesBlock` | ✅ conservado — getSceneLibrarySection por categoría |
