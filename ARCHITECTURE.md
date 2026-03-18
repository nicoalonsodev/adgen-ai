# Arquitectura: Sistema de Generación de Creativos

Documento técnico del flujo completo de generación de contenido publicitario en AdGen AI.

---

## Visión General

El sistema genera creativos publicitarios (imágenes 1080×1080) combinando tres capas:

1. **Copy** — texto publicitario generado por OpenAI (GPT-4o-mini)
2. **Fondo** — imagen generada por Gemini (modelo de imagen)
3. **Producto / Escena** — integración del producto o persona vía Gemini (edición de imagen)

Estas tres capas se componen sobre un **template determinístico** (canvas SVG → PNG vía Sharp/librsvg).

No hay una sola llamada a IA que haga todo — hay una **orquestación secuencial de servicios especializados**. La salida de cada etapa se convierte en la entrada de la siguiente.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js App Router, React |
| API | Next.js Route Handlers (`/api/compose`) |
| Copy AI | OpenAI GPT-4o-mini (`generateTemplateCopyOpenAI`) |
| Imagen AI | Google Gemini `gemini-3.1-flash-image-preview` |
| Composición | Sharp + librsvg (SVG → PNG) |
| Storage | Supabase Storage (bucket `creatives`) |
| Auth | NextAuth (`/api/auth`) |
| Tokens | Sistema propio en Supabase (`consumeTokens`) |

---

## Punto de Entrada: Fábrica de Contenido

`src/app/dashboard/fabrica-de-contenido/page.tsx`

El usuario configura la generación en 4 pasos:

```
Paso 1: Negocio   → producto, oferta, audiencia, problema, tono, modo de creación
Paso 2: Plantilla → qué template(s) usar, cuántos ángulos
Paso 3: Producto  → imagen del producto, avatar (opcional), referencia visual (opcional)
Paso 4: Generar   → ejecuta el pipeline
```

### Perfil de Negocio (desde Mi Negocio)

En `useEffect`, el frontend carga automáticamente el **Perfil de Negocio** desde `localStorage`. Este perfil incluye: nombre del negocio, rubro, propuesta de valor, diferenciación, cliente ideal, dolores, motivaciones, tono de voz, palabras a usar/evitar, colores de marca, y logo. Este contexto se inyecta en cada llamada a la IA para personalizar el copy y los fondos.

### Modos de generación

| Función | Modo | Cuándo |
|---|---|---|
| `handleGenerate` | Single | 1 template, 1 ángulo rápido |
| `handleGenerateAngles` | Multi-ángulo | N templates × M ángulos en paralelo |
| `handleGenerateSequence` | Secuencia narrativa | Carrusel con estructura HOOK → PROBLEMA → SOLUCIÓN → CTA |

---

## Endpoint Unificado: `/api/compose`

`src/app/api/compose/route.ts`

Un único endpoint `POST` que actúa como **dispatcher** según el campo `mode`:

```
mode: GENERATE_COPY          → OpenAI: genera el copy del template
mode: GENERATE_BACKGROUND    → Gemini: genera la imagen de fondo
mode: TEMPLATE_BETA          → Sharp: renderiza texto sobre el fondo (determinístico)
mode: PRODUCT_IA             → Gemini: integra producto/escena en el fondo compuesto
mode: GENERATE_SEQUENCE_COPY → OpenAI: genera copy para carrusel narrativo
mode: ANALYZE_REFERENCE      → OpenAI GPT-4o: analiza imagen de referencia para extraer estilo
mode: ANALYZE_CREATIVE       → Gemini: evalúa calidad de un creativo terminado (score 1–10)
```

Acepta tanto `multipart/form-data` (con archivos) como `application/json` (con URLs/base64).

**Límites:**
- `maxDuration = 180s` (Vercel)
- Timeout interno de Gemini: `150_000 ms`

---

## Etapa 1 — Generación de Copy (OpenAI GPT-4o-mini)

`src/lib/ai/openai.ts` → `generateTemplateCopyOpenAI()`

Trigger: `POST /api/compose { mode: "GENERATE_COPY" }` — retorna inmediatamente, no necesita imágenes.

### Cómo funciona

Llama a GPT-4o-mini con dos capas de contexto:

1. **System prompt** (`EXPERT_COPYWRITER_SYSTEM_PROMPT`): define la filosofía de copywriting (beneficios sobre características, tono argentino con "vos/tenés/podés", 15 tipos de hooks de scroll-stopping, estructura AIDA, fórmulas de headline probadas).

2. **User prompt** que combina:
   - Schema de campos que necesita la plantilla elegida (`templateSchema`)
   - Reglas de cada campo (`FIELD RULES`)
   - Hint específico del template (`templateHint`)
   - Perfil de marca (`BRAND CONTEXT`)
   - Guía de estilo del fondo (`backgroundStyleGuide`) — le muestra a OpenAI el prompt del fondo para que el copy sea coherente con el ambiente
   - Datos del sorteo si el modo es "sorteo" (`sorteoData`)
   - Análisis del creativo de referencia si fue subido (`referenceStyle`)
   - Datos del negocio (producto, oferta, audiencia, problema, tono)

### Schema de campos por plantilla

Cada plantilla tiene un schema diferente definido en `getTemplateSchema()`. Ejemplos:

| Template | Campos |
|---|---|
| `classic-editorial-right` | `title, headline, subheadline, badge, bullets, productPrompt, backgroundColorHint` |
| `pain-point-left` | `headline, subheadline, badge, backgroundColorHint, sceneAction` |
| `persona-producto-left` | `badge, headline, subheadline, title, backgroundPrompt, productPrompt` |
| `comparacion-split` | `headline, badge, columnTitle, competitionTitle, bullets, competitionBullets, backgroundColorHint, primaryColor` |

### Campos especiales que genera el copy

| Campo | Descripción |
|---|---|
| `backgroundColorHint` | Pista de paleta de color en palabras (ej: "beige rosado cálido muy claro") |
| `backgroundPrompt` | Prompt completo de fondo para templates con fondo libre (ej: `persona-producto-left`) |
| `productPrompt` | Brief creativo que describe CÓMO la persona usa el producto — va después a Gemini |
| `sceneAction` | Dirección fotográfica de la escena para templates editoriales sin producto |
| `primaryColor` | Color HEX inferido de la industria — va al fondo de Gemini como tinte de paleta |
| `bullets` / `competitionBullets` | Arrays de beneficios/debilidades para templates de comparación |

### Variantes (ángulos)

Si `numberOfVariants > 1`, GPT genera N variantes usando ángulos predefinidos:
1. Emocional
2. Problema/Solución
3. Urgencia
4. Beneficio Técnico
5. Aspiracional

Cada variante tiene el schema completo con textos distintos para el mismo producto.

---

## Etapa 2 — Generación de Fondo (Gemini)

`src/lib/ai/gemini.ts` → `generateBackground()`

Trigger: `POST /api/compose { mode: "GENERATE_BACKGROUND" }` — retorna solo la imagen de fondo.

### Lógica de cascada del prompt

El frontend tiene una jerarquía para decidir qué prompt enviar:

1. Si la plantilla tiene `rawBackgroundPrompt: true` → usa `defaultBackgroundPrompt` tal cual, sin modificar
2. Si la plantilla es `noProductLayer` → combina el prompt base con el `backgroundPrompt` generado por OpenAI
3. Si el copy tiene `backgroundPrompt` explícito (lo generó OpenAI) → lo usa directamente
4. Si hay `backgroundColorHint` → toma el prompt base y reemplaza el fragmento de tonos por el hint
5. Si hay `categoryBackgroundPrompts[categoríaDelNegocio]` → usa ese prompt específico de categoría

### Qué hace `generateBackground()`

Construye un prompt profesional envolviendo el brief:
```
"You are a senior advertising art director..."
CREATIVE BRIEF: [prompt de la plantilla o del copy]
COLOR ADJUSTMENT: [pista de color si la hay]
ABSOLUTE RULES: No text, no people, no products
```

Si `rawMode: true` (la plantilla lo pidió), envía el prompt a Gemini exactamente como está, sin wrapper.

Tiene un **fallback automático**: si Gemini falla o filtra el prompt, reintenta con un prompt genérico de fondo minimalista.

**Retorno:** Buffer PNG de la imagen de fondo generada (~1024x1024).

---

## Etapa 3 — Composición del Template (TEMPLATE_BETA)

`src/services/product-composer/composeWithTemplateBeta.ts`

Trigger: `POST /api/compose { mode: "TEMPLATE_BETA" }` vía `multipart/form-data`.

### Qué hace

Toma el fondo generado en la Etapa 2 y aplica la estructura visual del template. Cada template tiene un `buildLayout()` que define con precisión:

- Posiciones y tamaños de cada bloque de texto (en píxeles absolutos sobre el canvas)
- Overlays (gradientes, capas sólidas, blurs)
- Decoraciones SVG (estrellas para testimoniales, líneas conectoras para razones-producto, columnas para comparación-split, etc.)
- El logo del negocio si fue subido

El layout es un `LayoutSpec` con `textBlocks[]` y `overlays[]`, que pasa al renderizador de texto.

---

## El Motor de Texto: `textRenderer.ts`

`src/services/product-composer/textRenderer.ts`

Renderiza texto de forma **100% determinística** usando SVG + Sharp (sin browser, sin canvas).

### Proceso

1. Lee fuentes embebidas como base64 desde `public/fonts/` (Lora, Montserrat, Inter)
2. Para cada `TextBlock`, calcula cuántas palabras caben usando una tabla manual de anchos de caracteres (`CHAR_WIDTHS`) y factores de corrección por familia tipográfica
3. Hace **word-wrap preciso**: respeta saltos de línea explícitos `\n` primero, luego ajusta por palabras
4. Tiene modo **textBalance**: usa búsqueda binaria (20 iteraciones) para encontrar el ancho mínimo que distribuye el texto en líneas de igual longitud (análogo a CSS `text-wrap: balance`)
5. Parsea marcadores `**negrita**` en el texto para renderizar `<tspan font-weight="700">` con mayor peso tipográfico. Los marcadores mal-pareados (cuando el word-wrap corta un span bold) se auto-corrigen.
6. Genera un string SVG completo con `@font-face`, gradientes, rectángulos de fondo para badges (con `border-radius` pill), y elementos `<text>`
7. Hace `sharp(backgroundBuffer).composite([{ input: svgBuffer }])` para fusionar SVG sobre la imagen

### Normalización de fuentes

Sharp usa librsvg + Pango. Pango resuelve fuentes vía fontconfig (no vía `@font-face` data URIs). Por eso, `normalizeFontFamily()` traduce los nombres del LayoutSpec a los nombres reales disponibles en el servidor:

| LayoutSpec | Fontconfig real |
|---|---|
| `Playfair Display` | `Lora` |
| `Inter` / `Arial` / `Helvetica` | `Montserrat` |

**Retorno:** PNG de 1080x1080 con fondo + tipografía + overlays + decoraciones. Sin producto todavía.

---

## Etapa 4 — Integración de Producto o Escena (PRODUCT_IA)

`src/services/product-composer/composeWithProductIA.ts`

Trigger: `POST /api/compose { mode: "PRODUCT_IA" }` vía `multipart/form-data`.

Este es el paso más complejo. Tiene **6 ramas de ejecución** según los flags recibidos:

---

### Rama A — `avatarSceneWithProduct: true`

Para templates `persona-producto-left` y `editorial-center-top`. En este flujo el orden está **invertido** en el frontend: PRODUCT_IA corre sobre el **fondo limpio** (sin texto), y TEMPLATE_BETA se ejecuta después encima del resultado. Esto garantiza que el texto quede intacto.

**Sub-paso 1 — Clone genérico del producto (si `useGenericProductClone: true`):**
Llama a `generateGenericProduct()`. Gemini analiza el producto, entiende su forma/material/proporciones, y genera una versión idéntica en 3D pero **sin texto, logos ni colores de marca** — todo en gris neutro sobre fondo blanco. Esto hace que cuando la persona lo sostenga, el objeto se vea más fotorrealístico.

**Sub-paso 2 — Escena con avatar y producto:**
Llama a `generateSceneWithAvatarAndProduct()` enviando **3 imágenes a Gemini**:
- Imagen 1: el fondo (escena/ambiente)
- Imagen 2: el producto (o el clone genérico)
- Imagen 3: el avatar (foto de referencia de la persona)

El prompt que recibe Gemini está muy estructurado:
1. Regla de zona (ej: "la persona debe estar en el 42% derecho, el 58% izquierdo COMPLETAMENTE LIMPIO")
2. La persona DEBE usar/sostener el producto de la Imagen 2
3. Instrucciones para matchear la apariencia de la persona con el avatar de la Imagen 3
4. El brief creativo de OpenAI (`productPrompt`)
5. Reglas absolutas (sin texto, sin logos, no alterar el fondo, opacidad 100%)

Tiene reintentos automáticos (3 intentos) si Gemini no devuelve imagen.

**Sub-paso 3 — Re-overlay del producto original:**
Llama a `detectProductBoundingBox()` que envía la escena + el producto original a Gemini y pide JSON con las coordenadas `{x, y, width, height}` normalizadas (0–1). Si la detección tiene éxito, Sharp hace un `composite` del PNG original del producto en exactamente esa posición, reemplazando la versión aproximada de Gemini con la imagen real y nítida.

---

### Rama B — `useAvatarAsScene: true`

Para templates editoriales con persona, sin producto (`pain-point-left`, `editorial-lifestyle-*`, `testimonio-review`). El avatar subido por el usuario se integra en la escena.

Llama a `nanoBananaInjectProduct()` (mismo mecanismo de inyección, aquí inyecta la persona) con un prompt detallado: zona de placement, reglas de iluminación, que la persona sea OPACA y SÓLIDA, que NO agregue objetos, y las instrucciones de `sceneAction` generadas por OpenAI.

---

### Rama C — `splitComparison: true`

Para el template `comparacion-split`. **No usa Gemini para la composición — es Sharp puro:**

1. Coloca el producto original en el lado izquierdo (mayor tamaño)
2. Llama a `generateGenericProduct()` para la versión sin marca del lado derecho (75% del tamaño del original)
3. **Background removal inteligente**: muestrea los píxeles de los bordes de la imagen para detectar el color de fondo, luego elimina todos los píxeles dentro de un umbral de distancia de color (threshold 42 = transparente total, 78 = fade de anti-aliasing)
4. Pega ambas versiones sobre el fondo con Sharp `composite`

---

### Rama D — `sceneMode: true`

Para templates editoriales donde solo se quiere agregar una persona/ambiente a un fondo (ej: `editorial-lifestyle-bottom` sin avatar subido).

Llama a `generateScene()` que envía **solo el fondo** a Gemini con un prompt que define la zona de placement y reglas de no modificar elementos existentes. Gemini "pinta" la persona encima del fondo.

---

### Rama E — Inyección estándar de producto (camino principal)

Para la mayoría de los templates con producto.

1. **Construcción del prompt** (`buildProductIAPrompt()`):
   - Si hay `productPrompt` de OpenAI (>20 chars) → lo usa como brief creativo, envuelto en el contexto profesional de Gemini
   - Si `rawProductPrompt: true` → envía el prompt exactamente como está, sin wrapper
   - Si no hay prompt → usa reglas genéricas de zona (ej: "producto dentro del 38% izquierdo")

2. **Compresión antes de enviar a Gemini:**
   - Fondo → JPEG 80% / max 1024px (~2MB PNG → ~100KB)
   - Producto → PNG / max 768px (mantiene transparencia)

3. **Gemini** (`nanoBananaInjectProduct`) integra el producto en el fondo respetando la zona.

4. **Si `sharpProductOverlay` está configurado** en el metadata del template: re-overlay del producto original en la posición exacta definida, para restaurar nitidez que Gemini tiende a suavizar en fondos de textura macro.

---

### Rama F — `splitComparison: false` + `skipTextRender: false`

Si ningún flag especial aplica y se pide renderizado de texto (ruta antigua, ya no es el camino principal en el flujo batch): ejecuta la Rama E y luego renderiza texto encima con `renderTextOnImage()`.

---

## Flujo: sceneWithProduct (orden invertido)

Para templates `persona-producto-left` y `editorial-center-top`:

```
[Gemini] GENERATE_BACKGROUND → fondo limpio
    ↓
[Gemini] PRODUCT_IA (avatarSceneWithProduct) → escena con persona+producto sobre fondo limpio
    ↓
[Sharp+SVG] TEMPLATE_BETA → texto + overlays + gradiente encima de la escena
```

Este orden garantiza que el texto quede por encima de la escena generada por Gemini y no pueda ser alterado.

Para todos los demás templates:

```
[Gemini] GENERATE_BACKGROUND → fondo limpio
    ↓
[Sharp+SVG] TEMPLATE_BETA → texto + overlays sobre el fondo
    ↓
[Gemini] PRODUCT_IA → producto/escena integrado en la composición
```

---

## Flujo Detallado: `handleGenerateAngles`

Este es el modo principal. Para N templates × M ángulos:

### Fase 1 — Copy (paralela por template)

```
Promise.all([
  fetch /api/compose { mode: GENERATE_COPY, templateId: A, numberOfVariants: M }
  fetch /api/compose { mode: GENERATE_COPY, templateId: B, numberOfVariants: M }
  ...
])
```

Cada llamada va a `generateTemplateCopyOpenAI`. Devuelve un array de M objetos JSON con todos los campos del template.

### Fase 2 — Fondos (paralela por template × ángulo)

```
Promise.all([
  Promise.all([ bg(A,1), bg(A,2), ..., bg(A,M) ])
  Promise.all([ bg(B,1), bg(B,2), ..., bg(B,M) ])
])
```

Cada ángulo puede tener su propio `backgroundColorHint` o `backgroundPrompt`, generando fondos visualmente distintos.

### Fase 3 — Lista plana de tareas

Se construye un array `taskList` con cada combinación `{templateId, angleIndex, copy, bgFile, bgPrompt}`.

### Fase 4 — Composición (concurrencia controlada = 5)

`runWithConcurrency(tasks, 5, onProgress)` — pool de 5 workers simultáneos.

**Por cada tarea (flujo estándar):**

```
TEMPLATE_BETA (Sharp+SVG, ~1s)
    ↓
PRODUCT_IA (Gemini, ~15-25s) — si hay producto o escena
    ↓
saveCreativo() → localStorage + Supabase
```

**Por cada tarea (flujo sceneWithProduct):**

```
PRODUCT_IA sobre fondo limpio (Gemini, ~20-30s)
    ↓
TEMPLATE_BETA sobre la escena (Sharp+SVG, ~1s)
    ↓
saveCreativo() → localStorage + Supabase
```

Los resultados se muestran en la UI en tiempo real a medida que se completan.

---

## Flujo: Modo Secuencia (Carrusel Narrativo)

`handleGenerateSequence`

Genera N slides con estructura de storytelling para carruseles de Instagram/Facebook:

```
HOOK → PROBLEMA → AGITACIÓN → SOLUCIÓN → PRUEBA → CTA
```

1. **GENERATE_SEQUENCE_COPY**: OpenAI genera todos los slides de una sola vez, cada uno con su `slideRole`, copy adaptado al rol narrativo, y `sceneAction` que evoluciona emocionalmente con el arco
2. **Fondo compartido**: se genera UN SOLO fondo para toda la secuencia (coherencia visual)
3. **Composición paralela**: cada slide corre TEMPLATE_BETA + PRODUCT_IA como en el modo multi-ángulo
4. Cada slide guarda su `slideRole` y `slideNumber` en Supabase

---

## Sistema de Templates

`src/services/product-composer/templates/`

### Estructura de archivos

```
templates/
  meta.ts                          ← fuente única de verdad: metadatos de todos los templates
  index.ts                         ← registry: mapea IDs → buildLayout functions
  classic-editorial.ts
  promo-urgencia-bottom.ts
  hero-center-bottom.ts
  headline-top-left.ts
  pain-point-left.ts
  comparacion-split.ts
  sorteo-giveaway-center.ts
  antes-despues.ts
  beneficios-producto.ts
  razones-producto.ts
  editorial-lifestyle-left.ts
  editorial-lifestyle-right.ts
  editorial-lifestyle-bottom.ts
  editorial-lifestyle-top.ts
  producto-beneficios-vertical.ts
  testimonio-review.ts
  producto-hero-top.ts
  persona-producto-left.ts
  persona-hero-bottom.ts
  editorial-center-top.ts
```

### Cómo agregar un template nuevo

1. Agregar sus metadatos en `meta.ts` (dentro de `TEMPLATE_META_LIST`)
2. Crear el archivo de layout `mi-template.ts` con `buildMiTemplateLayout`
3. Registrar el builder en `index.ts` dentro del objeto `LAYOUT_BUILDERS`

### `meta.ts` — Metadatos (`TemplateMetadata`)

Es importado tanto por el backend como por el frontend. **No contiene lógica de layout**, solo datos de configuración.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificador único del template |
| `name` | `string` | Nombre visible en la UI |
| `icon` | `string` | Emoji para la UI |
| `tag` | `string \| null` | Badge en la UI (ej: "Premium", "Giveaway") |
| `active` | `boolean` | Si aparece en la UI (default: true) |
| `copyZone` | `enum` | Zona del canvas donde va el texto (`left/right/top/bottom/center/none/full`) |
| `productIAZone` | `enum?` | Zona para PRODUCT_IA si difiere de `copyZone` |
| `requiresSceneGeneration` | `boolean` | Si debe correr PRODUCT_IA aunque no haya foto de producto |
| `noProductLayer` | `boolean?` | No hay capa de producto ni escena (ej: giveaway) |
| `sceneWithProduct` | `boolean?` | La escena muestra a alguien sosteniendo el producto |
| `useGenericProductClone` | `boolean?` | Genera clone sin marca del producto antes de pasárselo a Gemini |
| `rawBackgroundPrompt` | `boolean?` | Enviar el prompt de fondo a Gemini tal cual, sin wrapper |
| `rawProductPrompt` | `boolean?` | Enviar el prompt de producto a Gemini tal cual, sin wrapper |
| `defaultBackgroundPrompt` | `string` | Prompt de fondo por defecto |
| `categoryBackgroundPrompts` | `Record<string, string>?` | Prompts de fondo específicos por categoría de negocio |
| `defaultProductPrompt` | `string?` | Prompt de producto/escena por defecto |
| `sharpProductOverlay` | `{ sizePct, centerX, centerY, rotation }?` | Re-overlay del producto original post-Gemini para restaurar nitidez |
| `supportsSequence` | `boolean?` | Compatible con el modo carrusel narrativo |
| `recommendedFor` | `string[]` | IDs de categorías de negocio recomendadas |

### `LayoutSpec` — Estructura de un layout

```typescript
{
  version: "1",
  canvas: { width: number, height: number },
  safeArea: { margin: number },
  product: { anchor, x, y, width, height, scale, rotation },
  overlays: [
    { type: "linearGradient", x, y, w, h, opacity, color, direction }
    // direction: "left" | "right" | "top" | "bottom"
  ],
  textBlocks: [
    {
      id: string,           // "headline" | "subheadline" | "badge" | "cta" | "bullets" | ...
      content: string,
      x, y, w, h,           // posición absoluta en píxeles
      align: "left" | "center" | "right",
      fontFamily: string,   // "Inter" | "Montserrat" | "Lora" | "Playfair Display"
      fontWeight: string,   // "400" | "700" | "900" | etc.
      fontSize: number,     // px
      color: string,        // hex
      maxLines: number,
      lineHeight: number,
      letterSpacing: number,
      textTransform?: "uppercase" | "none",
      textBalance?: boolean, // activa el algoritmo de word-balance
      boldWeight?: string,   // peso para segmentos **bold** en el texto
      background?: {
        type: "pill" | "rect",
        color: string,
        radius: number,
        padding: number,
        opacity: number,
      }
    }
  ],
  svgDecorations?: string,  // SVG raw para iconos, líneas, etc.
  confidence: number,
  rationale: string,
  warnings: string[],
}
```

Los tamaños de fuente y posiciones siempre se calculan en **proporciones del canvas** para que el layout funcione tanto en 1080×1080 como en 1080×1350.

---

### Catálogo completo de templates

#### 🖼️ `classic-editorial-right` — Classic Editorial
**Layout:** Fondo full-bleed · copy en columna derecha (46–100%) · badge pill al pie
**Producto:** mano emergiendo desde la izquierda/abajo-izquierda
**Ratios:** 1:1, 4:5 · **copyZone:** right
**Campos:** `title`, `headline`, `subheadline`, `badge`, `bullets`, `productPrompt`, `backgroundColorHint`
**Recomendado para:** belleza, moda, joyería, hogar, salud

---

#### ⚡ `promo-urgencia-bottom` — Promo Urgencia
**Layout:** Producto en zona superior · franja inferior con oferta centrada
**Producto:** mano desde abajo-centro, dentro del 58% superior
**Ratios:** 1:1, 4:5 · **copyZone:** bottom
**Campos:** `badge` (oferta), `headline`, `cta`, `productPrompt`, `backgroundColorHint`
**Recomendado para:** belleza, alimentos, moda, fitness, tecnología

---

#### 🎯 `hero-center-bottom` — Hero Center
**Layout:** Título arriba · producto grande centrado · oferta abajo
**Producto:** mano desde abajo-centro, zona 22–68% del canvas
**Ratios:** 1:1, 4:5 · **copyZone:** center
**Campos:** `title`, `headline` (oferta grande), `subheadline`, `badge`, `productPrompt`, `backgroundColorHint`
**Tag:** Combo / Lanzamiento · **Recomendado para:** belleza, moda, turismo, gastronomía, mascotas

---

#### 📰 `headline-top-left` — Headline Top
**Layout:** Headline enorme arriba-centro · producto abajo-centro con mano elegante
**Ratios:** 1:1, 4:5 · **copyZone:** bottom
**Campos:** `headline`, `subheadline`, `disclaimer` (social proof con ✓ o ★), `productPrompt`, `backgroundColorHint`
**Tag:** Premium · **Recomendado para:** belleza, servicios, educación, clínicas, inmobiliarias

---

#### 😟 `pain-point-left` — Punto de Dolor
**Layout:** Copy de dolor izquierda (0–50%) · escena de persona derecha (50–100%)
**Escena:** persona real en momento de dolor/problema generada por Gemini (sin producto)
**Ratios:** 1:1 · **copyZone:** left · **requiresSceneGeneration:** true
**Campos:** `headline` (problema), `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`
**Tag:** Awareness · **Secuencia:** sí · **Recomendado para:** belleza, salud, fitness, servicios, educación

---

#### ⚖️ `comparacion-split` — Comparación (Nosotros vs Ellos)
**Layout:** dos columnas · izquierda = tu producto (fondo cálido marrón) · derecha = competencia (beige claro) · divisor "VS" central · 4 filas numeradas comparativas
**Producto:** Sharp puro — tu producto izquierda + Gemini genera versión genérica sin marca para la derecha (con background removal por distancia de color)
**Ratios:** 1:1 · **copyZone:** full
**Campos:** `headline` (ej: "NOSOTROS VS ELLOS"), `badge`, `columnTitle`, `competitionTitle`, `bullets` (4 beneficios tuyos), `competitionBullets` (4 debilidades de la competencia)
**Tag:** Vs Competencia · **Recomendado para:** belleza, tecnología, salud, fitness, servicios

---

#### 🎁 `sorteo-giveaway-center` — Sorteo / Giveaway
**Layout:** foto full-bleed de personas generada como fondo · copy centrado en capas encima · headline ENORME uppercase · línea script italic · badge de premios · colaboración al pie
**Sin producto** (`noProductLayer: true`) — el fondo ES la escena con personas
**Ratios:** 1:1, 4:5 · **copyZone:** center
**Campos:** `title` (marca), `headline` (1 palabra: "SORTEO"), `subheadline` (poético), `badge` (premios), `bullets` (1 item: colaboración), `backgroundPrompt`
**Tag:** Giveaway · **Recomendado para:** belleza, salud, moda, clínicas, gastronomía, mascotas

---

#### 📅 `antes-despues` — Antes vs Después
**Layout:** split horizontal · izquierda = DÍA 1 / ANTES (fondo blanco) · derecha = DÍA 90 / DESPUÉS (fondo amarillo) · producto grande centrado abajo cruzando ambas columnas
**Producto:** centrado al pie, zona 60–100%, sin manos
**Ratios:** 1:1 · **copyZone:** full
**Campos:** `competitionTitle` (label ANTES), `columnTitle` (label DESPUÉS), `competitionBullets` (3–4 problemas), `bullets` (3–4 resultados), `badge`, `backgroundColorHint`, `productPrompt`
**Tag:** Transformación · **Recomendado para:** belleza, salud, fitness, clínicas, alimentos

---

#### ✨ `beneficios-producto` — Beneficios Producto
**Layout:** Producto héroe GRANDE izquierda (48% del canvas) · 4 bullets con pills a la derecha · headline enorme (73px) uppercase
**Producto:** levitando izquierda, 48% ancho, 70% alto, sin manos
**Ratios:** 1:1 · **copyZone:** right
**Campos:** `headline` (12–25 chars, renderiza enorme), `subheadline`, `bullets` (4, max 20 chars, sin emojis), `badge` (CTA con acento lime), `backgroundColorHint`, `productPrompt`
**Tag:** Beneficios · **Recomendado para:** belleza, salud, alimentos, fitness, tecnología, hogar

---

#### 🎯 `razones-producto` — Razones Producto
**Layout:** Producto CENTRADO · 4 beneficios en esquinas · líneas conectoras SVG automáticas · estilo BODY TALES "Reasons to use"
**Producto:** centrado, 40% ancho, 50% alto, sin manos
**Ratios:** 1:1 · **copyZone:** center
**Campos:** `title`, `headline` (intro italic), `subheadline` (nombre del producto, bold con underline automático), `bullets` (4, max 22 chars), `badge`, `backgroundColorHint`, `productPrompt`
**Tag:** Razones · **Recomendado para:** belleza, salud, alimentos, fitness, tecnología, hogar

---

#### 📸 `editorial-lifestyle-left` — Editorial Izquierda
**Layout:** Headline enorme izquierda (0–48%) · persona/escena lifestyle derecha (48–100%)
**Escena:** persona generada por Gemini, sin producto. Tiene campo `textSide` para override izq/der.
**Ratios:** 1:1 · **copyZone:** left · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`, `textSide`
**Tag:** Editorial · **Secuencia:** sí

---

#### 📸 `editorial-lifestyle-right` — Editorial Derecha
**Layout:** Persona/escena izquierda (0–48%) · headline enorme derecha (52–100%)
**Escena:** persona beauty/lifestyle generada por Gemini, sin producto
**Ratios:** 1:1 · **copyZone:** right · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`
**Tag:** Editorial · **Secuencia:** sí

---

#### 📸 `editorial-lifestyle-bottom` — Editorial Abajo
**Layout:** Escena lifestyle full-bleed · headline blanco en mitad inferior con gradiente oscuro
**Escena:** retrato beauty full-bleed generado por Gemini
**Ratios:** 1:1, 4:5 · **copyZone:** bottom · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`
**Tag:** Editorial · **Secuencia:** sí

---

#### 📸 `editorial-lifestyle-top` — Editorial Arriba
**Layout:** Headline blanco arriba con gradiente oscuro · escena lifestyle full-bleed abajo
**Ratios:** 1:1, 4:5 · **copyZone:** center · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`
**Tag:** Editorial · **Secuencia:** sí

---

#### ⚡ `producto-beneficios-vertical` — Beneficios Vertical
**Layout:** BODY TALES — dos columnas 50/50 · izquierda lavanda pastel con 4 beneficios y círculos-icono SVG · derecha azul-gris oscuro con producto grande
**Producto:** derecha, 75–78% horizontal, muy grande, dentro del 44% derecho estrictamente
**Ratios:** 1:1, 4:5 · **copyZone:** left
**Campos:** `title`, `headline` (intro italic), `subheadline` (nombre producto, bold), `bullets` (4), `badge`, `backgroundColorHint`, `productPrompt`
**Tag:** Vertical · **Recomendado para:** belleza, salud, alimentos, fitness, tecnología, hogar, clínicas

---

#### ⭐ `testimonio-review` — Testimonio Review
**Layout:** fondo sólido de color · 5 estrellas rating arriba · cita grande centrada · nombre del testimonial · persona en mitad inferior (55–100%)
**Escena:** persona de pecho para arriba, centrada, generada por Gemini. La persona CAN sostener un producto pequeño (único template con esta excepción en `generateScene`).
**Ratios:** 9:16, 4:5, 1:1 · **copyZone:** top · **requiresSceneGeneration:** true
**Campos:** `headline` (cita, sin comillas — se agregan solas), `badge` (nombre), `backgroundColorHint`, `sceneAction`
**Tag:** Social Proof · **Recomendado para:** belleza, salud, alimentos, fitness, clínicas, hogar

---

#### 🌊 `producto-hero-top` — Hero Editorial
**Layout:** Minimalista tipo Blume · nombre de marca grande arriba · producto centrado (22–78%) levitando con inclinación 15–20° · disclaimer al pie
**Fondo:** macro fotografía de texturas de crema/gel en azul pastel (`rawBackgroundPrompt: true`)
**Producto:** `rawProductPrompt: true` — prompt muy específico con tilt, escala compacta (22–28% ancho) y zona estricta. Tiene `sharpProductOverlay` para restaurar nitidez post-Gemini.
**Ratios:** 1:1, 4:5 · **copyZone:** bottom · **productIAZone:** center
**Campos:** `headline` (marca/producto), `subheadline` (tagline thin espaciado), `disclaimer`, `productPrompt`, `backgroundPrompt`
**Tag:** Hero · **Recomendado para:** belleza, moda, salud, hogar, alimentos

---

#### 🧍 `persona-producto-left` — Persona con Producto
**Layout:** Lifestyle brand ad estilo Huel/Nike · gradiente oscuro de izquierda → transparente · claim grande + CTA izquierda · persona sosteniendo producto en la derecha
**Escena:** `sceneWithProduct: true` + `useGenericProductClone: true` — PRODUCT_IA corre primero sobre fondo limpio, luego TEMPLATE_BETA pone el texto encima
**Ratios:** 1:1, 4:5 · **copyZone:** left · **requiresSceneGeneration:** true · **sceneWithProduct:** true
**Campos:** `badge` (marca top-left), `headline` (claim grande), `subheadline`, `title` (texto del botón CTA), `productPrompt`, `backgroundPrompt`
**Tag:** Lifestyle Ad · **Recomendado para:** belleza, alimentos, fitness, salud, moda, tecnología

---

#### 👥 `persona-hero-bottom` — Lifestyle Hero
**Layout:** Panel blanco superior (42%) con logo + headline + subheadline centrados · escena lifestyle full-bleed inferior (58%) con personas usando el producto · botón CTA al pie
**Escena:** `sceneWithProduct: true` + `rawProductPrompt: true` — Gemini genera 2–3 personas usando el producto, SOLO en el 58% inferior
**Ratios:** 1:1, 4:5 · **copyZone:** top · **productIAZone:** full · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `title` (CTA), `productPrompt`
**Tag:** Lifestyle Group · **Recomendado para:** alimentos, fitness, salud, belleza, moda, tecnología

---

#### 🖼️ `editorial-center-top` — Editorial Center
**Layout:** Panel claro superior (40%) con headline + subheadline centrados · persona con producto full-width abajo (60%)
**Escena:** `sceneWithProduct: true` + `useGenericProductClone: true` — PRODUCT_IA primero sobre fondo limpio, TEMPLATE_BETA después con el texto encima
**Ratios:** 1:1, 4:5 · **copyZone:** top · **requiresSceneGeneration:** true · **sceneWithProduct:** true
**Campos:** `title`, `headline`, `subheadline`, `badge`, `bullets`, `productPrompt`, `backgroundColorHint`
**Tag:** Editorial · **Recomendado para:** belleza, alimentos, fitness, salud, moda

---

## Gemini: Funciones de Imagen

`src/lib/ai/gemini.ts` — modelo: `gemini-3.1-flash-image-preview`

| Función | Imágenes de entrada | Uso |
|---|---|---|
| `generateBackground` | 0 (solo texto) | Genera imagen de fondo desde un prompt |
| `nanoBananaInjectProduct` | 2 (bg + producto/avatar) | Inyecta producto o persona en el fondo |
| `generateScene` | 1 (bg) | Agrega persona/escena al fondo sin producto |
| `generateSceneWithAvatarAndProduct` | 3 (bg + producto + avatar) | Persona del avatar sosteniendo el producto |
| `generateGenericProduct` | 1 (producto) | Genera versión genérica/sin marca del producto |
| `detectProductBoundingBox` | 2 (escena + producto) | Devuelve JSON con coordenadas del producto en la escena |
| `analyzeCreativeQuality` | 1–2 (creativo + producto opcional) | Score de calidad 1–10 en 5 dimensiones |

### Infraestructura de robustez

Todas las llamadas pasan por `generateContentWithRetry()`:

- **Timeout individual** de 150s por intento
- **Reintentos con backoff exponencial** para errores transitorios (500, 503, 429, timeouts de red, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED)
- **3 intentos máximos** con delay de `450ms × intento + jitter aleatorio`
- **Loop adicional** para "no imagen devuelta" (safety filter, refusal): hasta 3 reintentos con sleep de `600ms × intento`

---

## OpenAI: Generación de Copy

`src/lib/ai/openai.ts`

| Función | Modelo | Descripción |
|---|---|---|
| `generateTemplateCopyOpenAI` | GPT-4o-mini | Copy de uno o múltiples ángulos para un template |
| `generateSequenceCopy` | GPT-4o-mini | Copy completo de un carrusel narrativo |
| `analyzeCreativeReference` | GPT-4o (vision) | Análisis de imagen de referencia para extraer estilo replicable |

---

## Storage y Persistencia

### Guardado de creativos

`saveCreativo()` → `POST /api/user/creatives`

1. **localStorage** como backup rápido: guarda los últimos 50 creativos
2. **Supabase** (fire-and-forget — no bloquea la UI):
   - Sharp genera thumbnail 600×600 WebP en memoria
   - Supabase Storage sube original PNG + thumbnail WebP en paralelo
   - Supabase DB inserta registro con URLs, metadatos de copy, template, ángulo, slideRole, slideNumber, y el objeto `promptsUsed` (todos los prompts usados en cada capa para debugging)

```
creatives/
  {userId}/
    {creativeId}/
      original.png
      thumbnail.webp
```

### Sistema de Tokens

`src/lib/tokens/tokenCalculator.ts`

- Se verifica el saldo **antes** de cualquier llamada a IA (`checkTokenBalance`)
- Si no hay tokens suficientes → HTTP 402 inmediato
- Se descuenta **después** de éxito (`consumeTokens` + `logTokenConsumption`)

---

## Paralelismo y Concurrencia

| Operación | Estrategia |
|---|---|
| Copy por template | `Promise.all` — ilimitado |
| Fondos por template×ángulo | `Promise.all` — ilimitado |
| TEMPLATE_BETA + PRODUCT_IA | `runWithConcurrency(tasks, 5)` |
| Upload original + thumbnail | `Promise.all` |

`runWithConcurrency` es una implementación propia de pool de workers:
- Mantiene exactamente 5 tareas corriendo en paralelo
- Cuando una termina, toma la siguiente de la cola
- Reporta progreso incremental (`onProgress(completed, total)`)
- Los resultados aparecen en la UI en tiempo real

---

## Diagrama de Flujo (modo multi-ángulo, template estándar)

```
Usuario
  │
  ▼
handleGenerateAngles()
  │
  ├─ [Phase 1: Copy — parallel per template]
  │   └─ POST /api/compose { mode: GENERATE_COPY }
  │       └─ OpenAI GPT-4o-mini → M copy variants per template
  │
  ├─ [Phase 2: Backgrounds — parallel per template × angle]
  │   └─ POST /api/compose { mode: GENERATE_BACKGROUND }
  │       └─ Gemini → background image
  │
  └─ [Phase 3: Composition — pool of 5 workers]
      └─ For each (template, angle):
          │
          ├─ [Standard flow]
          │   ├─ POST /api/compose { mode: TEMPLATE_BETA }
          │   │   └─ Sharp + librsvg → text + overlays on background (~1s)
          │   │
          │   └─ POST /api/compose { mode: PRODUCT_IA } [if product/scene needed]
          │       └─ Gemini → injects product/scene (~20s)
          │           └─ saveCreativo() → localStorage + Supabase
          │
          └─ [sceneWithProduct flow]
              ├─ POST /api/compose { mode: PRODUCT_IA } on clean background
              │   └─ Gemini: person+product scene (~25s)
              │       ↓ detectProductBoundingBox → Sharp re-overlay product
              │
              └─ POST /api/compose { mode: TEMPLATE_BETA } on scene
                  └─ Sharp + librsvg → text + gradient on top (~1s)
                      └─ saveCreativo() → localStorage + Supabase
```

---

## Variables de Entorno Requeridas

```env
GEMINI_API_KEY=              # Google AI Studio
OPENAI_API_KEY=              # OpenAI
SUPABASE_URL=                # Supabase project URL
SUPABASE_ANON_KEY=           # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=   # Supabase service role (para storage admin)
NEXTAUTH_SECRET=             # NextAuth
ENCRYPTION_KEY=              # 64 hex chars — AES-256-GCM master key para keys de Gemini de usuarios
                             # Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## API Keys de Gemini por Usuario

Los usuarios configuran sus propias Gemini API keys en **Mi ADN** (`/dashboard/mi-negocio`). Estas keys reemplazan al pool de keys del sistema y se usan en todas las llamadas a Gemini de ese usuario.

### Overview

- Las keys se configuran en la sección **API Keys de Gemini** de la página Mi ADN
- Son **obligatorias** para generar creativos — sin keys configuradas, `/api/compose` devuelve HTTP 402 con `error: "GEMINI_KEY_NOT_CONFIGURED"`
- Se soportan **dos keys** para rotación automática y evitar rate limits de Gemini
- El 402 se emite **antes del chequeo de tokens**, por lo que no se consumen tokens si no hay keys

### Modelo de seguridad

| Aspecto | Detalle |
|---|---|
| Algoritmo | AES-256-GCM (autenticado) — `src/lib/crypto.ts` |
| Master key | `ENCRYPTION_KEY` env var — 64 hex chars (32 bytes) — nunca se guarda en DB |
| Almacenamiento | Columna `gemini_keys_encrypted TEXT` en `user_business_profiles` (ambas keys en un JSON encriptado) |
| GET response | `gemini_keys_encrypted` se extrae del row y nunca se envía al cliente |
| Valores visibles | Solo los últimos 8 caracteres de cada key (`...XXXXXXXX`) vía `maskKey()` |
| Tamper detection | GCM auth tag — si el valor en DB fue alterado, `decryptValue()` lanza error y la operación falla |

### Flujo de datos

```
# Guardar keys (Mi ADN)
Usuario ingresa key en UI
  → POST /api/user/business-profile { geminiKey1, geminiKey2 }
    → isRealKey(): rechaza valores vacíos o maskeados (startsWith '...')
    → fetch existing keys → decrypt → merge → re-encrypt
      → encryptValue(JSON.stringify({ key1, key2 }))
        → gemini_keys_encrypted column en user_business_profiles

# Usar keys (generación de creativos)
POST /api/compose (cualquier modo de generación)
  → auth() → userId
    → fetch gemini_keys_encrypted WHERE user_id = userId
      → decryptValue() → JSON.parse() → [key1, key2]
        → si vacío → HTTP 402 GEMINI_KEY_NOT_CONFIGURED
        → si hay keys → userGeminiKeys[]
          → validated.apiKeys = userGeminiKeys
            → composeWithProductIA → 8 call sites de Gemini (req.apiKeys)
            → generateBackground (llamadas directas en compose/route.ts)
            → analyzeCreativeQuality (llamada directa en compose/route.ts)
```

### Rotación de keys

- `gemini.ts` expone `selectUserKey(keys: string[])` que selecciona la key con el cooldown más antiguo (least-recently-used)
- Los cooldowns por key de usuario se trackean en `_userKeyCooldowns: Map<string, number>` — efímero, en memoria, aislado del pool del sistema
- Si una key recibe HTTP 429, se registra su cooldown en el Map y en el próximo intento se usa la otra key
- Este sistema es **completamente independiente** del pool del sistema (`_apiKeys[]` / `_keyIndex`)

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/crypto.ts` | **Nuevo** — `encryptValue`, `decryptValue`, `maskKey` con AES-256-GCM |
| `src/app/api/user/business-profile/route.ts` | GET: retorna solo valores maskeados · POST: valida, merge, encripta y guarda |
| `src/app/api/compose/route.ts` | Fetch + decrypt de keys del usuario, 402 guard, inyección en `validated.apiKeys` y en llamadas directas |
| `src/services/product-composer/types.ts` | `apiKeys?: string[]` agregado a `ComposeRequestSchema` |
| `src/services/product-composer/composeWithProductIA.ts` | `req.apiKeys` propagado a los 8 call sites de Gemini |
| `src/lib/ai/gemini.ts` | `_userKeyCooldowns` Map, `selectUserKey()`, parámetro `apiKeys?` en todas las funciones exportadas |
| `src/app/dashboard/mi-negocio/page.tsx` | Sección de UI con inputs de key, masked display, badges de estado, toggle de visibilidad |

### Schema de DB

```sql
-- Columnas agregadas a user_business_profiles
gemini_keys_encrypted  TEXT     -- JSON { key1, key2 } encriptado con AES-256-GCM
gemini_key_index       INTEGER  -- reservado para rotación futura (actualmente siempre 0)
```
