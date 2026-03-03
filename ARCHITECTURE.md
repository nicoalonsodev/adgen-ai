# Arquitectura: Sistema de Generación de Creativos

Documento técnico del flujo completo de generación de contenido publicitario en AdGen AI.

---

## Visión General

El sistema genera creativos publicitarios (imágenes 1080×1080) combinando tres capas:

1. **Copy** — texto publicitario generado por OpenAI (GPT-4o)
2. **Fondo** — imagen generada por Gemini (modelo de imagen)
3. **Producto / Escena** — integración del producto o persona via Gemini (edición de imagen)

Estas tres capas se componen sobre un **template determinístico** (canvas SVG → PNG via Sharp/librsvg).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 App Router, React |
| API | Next.js Route Handlers (`/api/compose`) |
| Copy AI | OpenAI GPT-4o (`generateTemplateCopyOpenAI`) |
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
Paso 1: Negocio   → producto, oferta, audiencia, problema, tono
Paso 2: Plantilla → qué template(s) usar, modo (independiente / secuencia), cuántos ángulos
Paso 3: Producto  → imagen del producto, avatar (opcional), referencia visual (opcional)
Paso 4: Generar   → ejecuta el pipeline
```

Hay tres modos de generación según lo que el usuario selecciona:

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
mode: GENERATE_COPY       → OpenAI: genera el copy del template
mode: GENERATE_BACKGROUND → Gemini: genera la imagen de fondo
mode: TEMPLATE_BETA       → Sharp: renderiza texto sobre el fondo (determinístico)
mode: PRODUCT_IA          → Gemini: integra producto/escena en el fondo compuesto
mode: ANALYZE_REFERENCE   → OpenAI: analiza una imagen de referencia creativa
mode: GENERATE_SEQUENCE_COPY → OpenAI: genera copy para carrusel narrativo
```

Acepta tanto `multipart/form-data` (con archivos) como `application/json` (con URLs/base64).

**Límites:**
- `maxDuration = 180s` (Vercel)
- Timeout interno de Gemini: `150_000 ms`

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

Cada llamada va a `generateTemplateCopyOpenAI` en `src/lib/ai/openai.ts`.
GPT-4o recibe el system prompt de copywriter + el `templateHint` específico del template + el perfil del negocio + datos del producto.
Devuelve un array de M objetos JSON con todos los campos del template (headline, subheadline, badge, bullets, productPrompt, backgroundPrompt, etc.).

### Fase 2 — Fondos (paralela por template × ángulo)

```
Promise.all([
  Promise.all([ bg(A,1), bg(A,2), ..., bg(A,M) ])
  Promise.all([ bg(B,1), bg(B,2), ..., bg(B,M) ])
])
```

Cada llamada: `fetch /api/compose { mode: GENERATE_BACKGROUND, prompt: bgPrompt }`.
→ `generateBackground` en `src/lib/ai/gemini.ts`
→ Gemini recibe el prompt de fondo generado por el copy y devuelve una imagen PNG.
El cliente descarga la imagen como blob y la guarda como `File` para el siguiente paso.

### Fase 3 — Composición (concurrencia controlada = 5)

Se construye una lista plana de tareas: `[{templateId, angleIndex, copy, bgFile}]`
Se ejecutan con `runWithConcurrency(tasks, 5, onProgress)`.

**Por cada tarea:**

#### Sub-paso 3a — TEMPLATE_BETA (determinístico, ~1s)

```
fetch /api/compose { mode: TEMPLATE_BETA, background: bgFile, config: { copy, templateId } }
```

→ `composeWithTemplateBeta` en `src/services/product-composer/composeWithTemplateBeta.ts`
1. Normaliza el fondo al canvas (1080×1080) con Sharp
2. Llama a `getTemplate(templateId).buildLayout(copy, canvas)` → genera un `LayoutSpec` (JSON con posiciones y estilos de cada bloque de texto)
3. `renderTextOnImage` convierte el LayoutSpec a SVG y lo renderiza sobre la imagen con librsvg
4. Devuelve PNG con fondo + tipografía

#### Sub-paso 3b — PRODUCT_IA (Gemini, ~15-25s) — solo si hay producto o escena

```
fetch /api/compose { mode: PRODUCT_IA, background: composedBg, product: productFile, config: { productIAOptions } }
```

→ `composeWithProductIA` en `src/services/product-composer/composeWithProductIA.ts`

El comportamiento varía según el tipo de template:

| Caso | Qué hace |
|---|---|
| `splitComparison: true` | Sharp puro: pega el producto en lado izquierdo, genera versión genérica con Gemini para el derecho |
| `sceneMode: true` | Gemini `generateScene`: genera una persona en escena sin producto |
| `useAvatarAsScene: true` | Gemini `nanoBananaInjectProduct`: compuesta el avatar del usuario en la escena |
| Default (producto) | Gemini `nanoBananaInjectProduct`: inyecta el producto en el fondo con iluminación natural |

En todos los casos con Gemini:
- El fondo se comprime a JPEG 80% / 1024px antes de enviarse (reduce upload de ~2MB → ~100KB)
- El producto se comprime a PNG 768px
- Gemini devuelve la imagen editada
- **Post-process con Sharp**: se aplica un "feathered blend" (máscara con gradiente) para restaurar el fondo original en la zona de texto y evitar que el producto/persona invada el área del copy

### Fase 4 — Guardado (fire and forget)

```
saveCreativo(finalImage, templateId, angleName, copy)
  → localStorage (backup inmediato)
  → POST /api/user/creatives (Supabase: storage + DB, no bloquea UI)
```

---

## Sistema de Templates

`src/services/product-composer/templates/`

### Estructura de archivos

```
templates/
  meta.ts                          ← fuente única de verdad: metadatos de todos los templates
  index.ts                         ← registry: mapea IDs → buildLayout functions
  classic-editorial.ts             ← layout builder
  promo-urgencia-bottom.ts
  hero-center-bottom.ts
  headline-top-left.ts
  pain-point-left.ts
  comparacion-split.ts             ← exporta dos variantes: Standard + IA
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
```

### Cómo agregar un template nuevo

1. Agregar sus metadatos en `meta.ts` (dentro de `TEMPLATE_META_LIST`)
2. Crear el archivo de layout `mi-template.ts` con `buildMiTemplateLayout`
3. Registrar el builder en `index.ts` dentro del objeto `LAYOUT_BUILDERS`

### `meta.ts` — Metadatos (`TemplateMetadata`)

Es importado tanto por el backend (`composeWithTemplateBeta`) como por el frontend (`fabrica-de-contenido/page.tsx`). **No contiene lógica de layout**, solo datos de configuración.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificador único del template |
| `name` | `string` | Nombre visible en la UI |
| `icon` | `string` | Emoji para la UI |
| `tag` | `string \| null` | Badge en la UI (ej: "Premium", "Giveaway") |
| `active` | `boolean` | Si aparece en la UI (default: true) |
| `description` | `string` | Descripción visible en el selector |
| `supportedRatios` | `string[]` | Aspect ratios soportados (`"1:1"`, `"4:5"`, `"9:16"`) |
| `copyZone` | `enum` | Zona del canvas donde va el texto (`left/right/top/bottom/center/none/full`) |
| `productIAZone` | `enum?` | Zona para PRODUCT_IA si difiere de `copyZone` |
| `requiresSceneGeneration` | `boolean` | Si debe correr PRODUCT_IA aunque no haya foto de producto |
| `noProductLayer` | `boolean?` | No hay capa de producto ni escena (ej: giveaway) |
| `sceneWithProduct` | `boolean?` | La escena muestra a alguien sosteniendo el producto |
| `supportsSequence` | `boolean?` | Compatible con el modo carrusel narrativo |
| `recommendedFor` | `string[]` | IDs de categorías de negocio recomendadas |
| `defaultBackgroundPrompt` | `string` | Prompt de fondo enviado a Gemini por defecto |
| `rawBackgroundPrompt` | `boolean?` | Enviar el prompt de fondo a Gemini tal cual, sin wrapper |
| `defaultProductPrompt` | `string?` | Prompt de producto/escena enviado a Gemini por defecto |
| `rawProductPrompt` | `boolean?` | Enviar el prompt de producto a Gemini tal cual, sin wrapper |

### `index.ts` — Registry

```typescript
// Para obtener un template:
const template = getTemplate("classic-editorial-right");
// template.buildLayout(copy, canvas) → LayoutSpec
// template.id, template.copyZone, template.requiresSceneGeneration, etc.
```

`TEMPLATE_REGISTRY` combina los metadatos de `meta.ts` con las funciones `buildLayout` de cada archivo. Si se intenta obtener un template que no existe, lanza un error con la lista de IDs disponibles.

Existe también `comparacion-split-ia` en `LAYOUT_BUILDERS` (variante inactiva en UI) que usa un prompt de producto con levitación.

### `LayoutSpec` — Estructura de un layout

El objeto que retorna cada `buildLayout()`:

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
      background?: {        // pill / rect detrás del texto
        type: "pill" | "rect",
        color: string,
        radius: number,
        padding: number,
        opacity: number,
      }
    }
  ],
  confidence: number,
  rationale: string,
  warnings: string[],
}
```

Los tamaños de fuente y posiciones siempre se calculan en **proporciones del canvas** (`Math.round(CW * 0.073)`) para que el layout funcione tanto en 1080×1080 como en 1080×1350.

---

### Catálogo completo de templates

#### 🖼️ `classic-editorial-right` — Classic Editorial
**Layout:** Fondo full-bleed · copy en columna derecha (46–100%) · badge pill al pie
**Producto:** mano emergiendo desde la izquierda/abajo-izquierda
**Ratios:** 1:1, 4:5 · **copyZone:** right
**Campos:** `title` (ingredientes separados por ·), `headline`, `subheadline`, `badge`, `bullets`, `productPrompt`, `backgroundColorHint`
**Recomendado para:** belleza, moda, joyería, hogar, salud

---

#### ⚡ `promo-urgencia-bottom` — Promo Urgencia
**Layout:** Producto en zona superior · franja inferior con oferta centrada
**Producto:** mano desde abajo-centro, dentro del 58% superior
**Ratios:** 1:1, 4:5 · **copyZone:** bottom
**Campos:** `badge` (oferta destacada), `headline`, `cta`, `productPrompt`, `backgroundColorHint`
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
**Layout:** Headline enorme arriba-centro · producto abajo-centro
**Producto:** mano elegante desde abajo O producto sobre superficie (Gemini elige la variante más premium)
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
**Producto:** Sharp puro — tu producto izquierda + Gemini genera versión genérica sin marca para la derecha
**Ratios:** 1:1 · **copyZone:** full
**Campos:** `headline` (ej: "NOSOTROS VS ELLOS"), `badge`, `columnTitle`, `competitionTitle`, `bullets` (4 beneficios tuyos), `competitionBullets` (4 debilidades de la competencia)
**Tag:** Vs Competencia · **Recomendado para:** belleza, tecnología, salud, fitness, servicios

> También existe `comparacion-split-ia` (inactivo en UI): variante donde Gemini genera dos productos levitando — el tuyo en grande a la derecha, una versión degradada/desaturada a la izquierda.

---

#### 🎁 `sorteo-giveaway-center` — Sorteo / Giveaway
**Layout:** foto full-bleed de personas generada como fondo · copy centrado en capas encima · headline ENORME uppercase · línea script italic · badge de premios · colaboración al pie
**Sin producto** (`noProductLayer: true`) — el fondo ES la escena
**Ratios:** 1:1, 4:5 · **copyZone:** center · **noProductLayer:** true
**Campos:** `title` (marca, max 20 chars), `headline` (1 palabra: "SORTEO"), `subheadline` (max 4 palabras, poético), `badge` (premios), `bullets` (1 item: colaboración), `backgroundPrompt` (prompt en inglés para la escena de fondo)
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
**Layout:** Producto héroe GRANDE izquierda (48% del canvas) · 4 bullets con pills a la derecha · headline enorme (73px) uppercase · fondo gris medio con arco decorativo
**Producto:** levitando izquierda, 48% ancho, 70% alto, sin manos
**Ratios:** 1:1 · **copyZone:** right
**Campos:** `headline` (12–25 chars, renderiza enorme), `subheadline`, `bullets` (4 beneficios, max 20 chars cada uno, sin emojis), `badge` (CTA con acento lime), `backgroundColorHint`, `productPrompt`
**Tag:** Beneficios · **Recomendado para:** belleza, salud, alimentos, fitness, tecnología, hogar

---

#### 🎯 `razones-producto` — Razones Producto
**Layout:** Producto CENTRADO · 4 beneficios distribuidos en esquinas · líneas conectoras SVG automáticas · estilo BODY TALES "Reasons to use"
**Producto:** centrado, 40% ancho, 50% alto, sin manos, fondo cálido durazno/crema
**Ratios:** 1:1 · **copyZone:** center
**Campos:** `title` (marca top-left), `headline` (intro italic), `subheadline` (nombre del producto, bold con underline automático), `bullets` (4 beneficios, max 22 chars), `badge` (URL o CTA bottom-left), `backgroundColorHint`, `productPrompt`
**Tag:** Razones · **Recomendado para:** belleza, salud, alimentos, fitness, tecnología, hogar

---

#### 📸 `editorial-lifestyle-left` — Editorial Izquierda
**Layout:** Headline enorme izquierda (0–48%) · persona/escena lifestyle derecha (48–100%)
**Escena:** persona beauty/lifestyle generada por Gemini, sin producto
**Ratios:** 1:1 · **copyZone:** left · **requiresSceneGeneration:** true
**Campos:** `headline` (poético, max 50 chars), `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`, `textSide` (override opcional: "left"/"right")
**Tag:** Editorial · **Secuencia:** sí · **Recomendado para:** belleza, salud, moda, clínicas, fitness, servicios

---

#### 📸 `editorial-lifestyle-right` — Editorial Derecha
**Layout:** Persona/escena lifestyle izquierda (0–48%) · headline enorme derecha (52–100%)
**Escena:** persona beauty/lifestyle generada por Gemini, sin producto
**Ratios:** 1:1 · **copyZone:** right · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`
**Tag:** Editorial · **Secuencia:** sí · **Recomendado para:** igual que editorial-lifestyle-left

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
**Escena:** retrato beauty en la parte inferior generado por Gemini
**Ratios:** 1:1, 4:5 · **copyZone:** center · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `badge`, `backgroundColorHint`, `sceneAction`
**Tag:** Editorial · **Secuencia:** sí

---

#### ⚡ `producto-beneficios-vertical` — Beneficios Vertical
**Layout:** BODY TALES — dos columnas 50/50 · izquierda lavanda pastel con 4 beneficios y círculos-icono SVG · derecha azul-gris oscuro con producto grande y nombre de marca
**Producto:** derecha, 75–78% horizontal, muy grande, dentro del 44% derecho estrictamente
**Ratios:** 1:1, 4:5 · **copyZone:** left
**Campos:** `title` (marca), `headline` (intro italic), `subheadline` (nombre producto, bold con underline), `bullets` (4, max 22 chars), `badge` (URL o CTA), `backgroundColorHint`, `productPrompt`
**Tag:** Vertical · **Recomendado para:** belleza, salud, alimentos, fitness, tecnología, hogar, clínicas

---

#### ⭐ `testimonio-review` — Testimonio Review
**Layout:** fondo sólido de color · 5 estrellas rating arriba · cita grande centrada · nombre del testimonial · persona en mitad inferior (0–55% vacío, persona en 55–100%)
**Escena:** persona de pecho para arriba, centrada, fondo sólido del mismo color, generada por Gemini
**Ratios:** 9:16, 4:5, 1:1 · **copyZone:** top · **requiresSceneGeneration:** true
**Campos:** `headline` (cita), `badge` (nombre), `backgroundColorHint`, `sceneAction`
**Tag:** Social Proof · **Recomendado para:** belleza, salud, alimentos, fitness, clínicas, hogar

---

#### 🌊 `producto-hero-top` — Hero Editorial
**Layout:** Minimalista tipo Blume · nombre de marca grande arriba · producto centrado (22–78%) levitando con inclinación 15–20° · disclaimer al pie
**Fondo fijo:** macro fotografía de texturas de crema/gel en azul pastel (rawBackgroundPrompt: true)
**Producto:** `rawProductPrompt: true` — prompt muy específico con tilt, escala compacta (22–28% ancho) y zona estricta
**Ratios:** 1:1, 4:5 · **copyZone:** bottom · **productIAZone:** center
**Campos:** `headline` (marca/producto), `subheadline` (tagline thin espaciado), `disclaimer`
**Tag:** Hero · **Recomendado para:** belleza, moda, salud, hogar, alimentos

---

#### 🧍 `persona-producto-left` — Persona con Producto
**Layout:** Lifestyle brand ad estilo Huel/Nike · gradiente oscuro de izquierda → transparente · claim grande + CTA izquierda · persona sosteniendo producto en la derecha
**Escena:** `sceneWithProduct: true` — Gemini genera persona con el producto en la derecha (52%), izquierda 48% limpia
**Ratios:** 1:1, 4:5 · **copyZone:** left · **requiresSceneGeneration:** true · **sceneWithProduct:** true
**Campos:** `badge` (marca top-left), `headline` (claim grande), `subheadline`, `title` (texto del botón CTA), `productPrompt` (descripción de la persona con el producto para Gemini), `backgroundColorHint`
**Tag:** Lifestyle Ad · **Recomendado para:** belleza, alimentos, fitness, salud, moda, tecnología

---

#### 👥 `persona-hero-bottom` — Lifestyle Hero
**Layout:** Estilo Huel/Nike · panel blanco superior (42%) con logo + headline + subheadline centrados · escena lifestyle full-bleed inferior (58%) con personas usando el producto · botón CTA al pie de la escena
**Escena:** `sceneWithProduct: true` + `rawProductPrompt: true` — Gemini genera 2–3 personas usando el producto, solo en el 58% inferior, el 42% superior debe quedar vacío
**Ratios:** 1:1, 4:5 · **copyZone:** top · **productIAZone:** full · **requiresSceneGeneration:** true
**Campos:** `headline`, `subheadline`, `title` (CTA), `productPrompt` (escena detallada para Gemini)
**Tag:** Lifestyle Group · **Recomendado para:** alimentos, fitness, salud, belleza, moda, tecnología

---

## Flujo: Modo Secuencia (Carrusel Narrativo)

`handleGenerateSequence`

Genera N slides con estructura de storytelling para carruseles de Instagram/Facebook:

```
HOOK → PROBLEMA → AGITACIÓN → SOLUCIÓN → PRUEBA → CTA
```

1. **GENERATE_SEQUENCE_COPY**: OpenAI genera todos los slides de una sola vez, cada uno con su `slideRole` y copy adaptado al rol narrativo
2. **Fondo compartido**: se genera UN SOLO fondo para toda la secuencia (coherencia visual)
3. **Composición paralela**: cada slide corre TEMPLATE_BETA + PRODUCT_IA como en el modo multi-ángulo
4. Cada slide guarda su `slideRole` y `slideNumber` en Supabase

---

## Renderizado de Texto: `textRenderer.ts`

`src/services/product-composer/textRenderer.ts`

El motor de renderizado es **SVG → PNG via librsvg** (sin canvas de browser, 100% server-side).

Proceso:
1. Recibe un `LayoutSpec` con bloques de texto
2. Genera un string SVG con `<text>`, `<tspan>`, `<rect>` (pills), `<linearGradient>` (overlays)
3. Sharp convierte el SVG a PNG y lo composita sobre la imagen base
4. Word-wrap manual usando tablas de ancho de caracteres (para evitar dependencias de layout de browser)

Fuentes disponibles (embebidas en `/public/fonts/`):
- **Lora** (Regular, Medium, SemiBold, Bold + Italic variants) — serif editorial
- **Montserrat** (toda la familia, Thin a Black) — sans-serif display

---

## Gemini: Funciones de Imagen

`src/lib/ai/gemini.ts` — modelo: `gemini-3.1-flash-image-preview`

| Función | Uso |
|---|---|
| `generateBackground` | Genera imagen de fondo desde un prompt de texto |
| `nanoBananaInjectProduct` | Edita una imagen para inyectar el producto (recibe bg + producto) |
| `generateScene` | Edita una imagen para agregar una persona/escena |
| `generateGenericProduct` | Genera versión genérica/sin marca del producto (para comparacion-split) |

Todas las funciones tienen:
- **Retry automático** con backoff exponencial (3 intentos) para errores transitorios de Gemini (429, 500, 503, timeouts)
- **Timeout de 150s** por llamada
- **Compresión** de imágenes antes de enviar (bg → JPEG 80%, producto → PNG 768px)

---

## OpenAI: Generación de Copy

`src/lib/ai/openai.ts` — modelo: GPT-4o

| Función | Descripción |
|---|---|
| `generateTemplateCopyOpenAI` | Copy de uno o múltiples ángulos para un template |
| `generateSequenceCopy` | Copy completo de un carrusel narrativo |
| `analyzeCreativeReference` | Análisis de una imagen de referencia para extraer estilo |

El system prompt del copywriter incluye:
- Filosofía de copywriting directo para LATAM (tono "vos", "tenés")
- 15 tipos de hooks documentados
- Fórmulas de headline probadas
- Estructura HOOK → PROBLEMA → INTERÉS → CTA

---

## Storage y Persistencia

### Guardado de creativos

`POST /api/user/creatives` → `src/app/api/user/`

Pipeline:
1. Recibe `imageBase64` + metadatos
2. Llama a `uploadCreativeImages` en `src/services/images/imageStorageService.ts`
3. **Sharp**: genera thumbnail 600×600 WebP en memoria
4. **Supabase Storage**: sube original PNG + thumbnail WebP en paralelo (`Promise.all`)
5. **Supabase DB**: inserta registro con URLs, metadatos de copy, template, ángulo, etc.

Estructura en Storage:
```
creatives/
  {userId}/
    {creativeId}/
      original.png     ← descarga
      thumbnail.webp   ← mostrar en web (600×600)
```

### Sistema de Tokens

`src/lib/tokens/tokenCalculator.ts`

Cada operación tiene un costo en tokens que se descuenta de la cuenta del usuario antes de ejecutar:
- `consumeTokens` verifica saldo y descuenta atómicamente en Supabase
- Si no hay tokens suficientes, el request falla antes de llamar a cualquier IA

---

## Paralelismo y Concurrencia

| Operación | Estrategia |
|---|---|
| Copy por template | `Promise.all` — ilimitado |
| Fondos por template×ángulo | `Promise.all` — ilimitado |
| TEMPLATE_BETA + PRODUCT_IA | `runWithConcurrency(tasks, 5)` |
| Upload original + thumbnail | `Promise.all` |

`runWithConcurrency` es una implementación propia de pool de workers:
- Mantiene exactamente N tareas corriendo en paralelo
- Cuando una termina, toma la siguiente de la cola
- Reporta progreso incremental (`onProgress(completed, total)`)
- Los resultados aparecen en la UI en tiempo real a medida que se completan

---

## Diagrama de Flujo (modo multi-ángulo)

```
Usuario
  │
  ▼
handleGenerateAngles()
  │
  ├─ [Phase 1: Copy — parallel per template]
  │   └─ POST /api/compose { mode: GENERATE_COPY }
  │       └─ OpenAI GPT-4o → returns M copy variants per template
  │
  ├─ [Phase 2: Backgrounds — parallel per template × angle]
  │   └─ POST /api/compose { mode: GENERATE_BACKGROUND }
  │       └─ Gemini flash → returns background image
  │
  └─ [Phase 3: Composition — pool of 5 workers]
      └─ For each (template, angle) pair:
          │
          ├─ POST /api/compose { mode: TEMPLATE_BETA }
          │   └─ Sharp + librsvg → renders text on background (~1s)
          │
          └─ POST /api/compose { mode: PRODUCT_IA }  [if product/scene needed]
              └─ Gemini flash (edit) → injects product/scene (~20s)
                  └─ Sharp feathered blend → protects text zone
                      └─ saveCreativo() → localStorage + Supabase
```

---

## Variables de Entorno Requeridas

```env
GEMINI_API_KEY=          # Google AI Studio
OPENAI_API_KEY=          # OpenAI
SUPABASE_URL=            # Supabase project URL
SUPABASE_ANON_KEY=       # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role (para storage admin)
NEXTAUTH_SECRET=         # NextAuth
```
