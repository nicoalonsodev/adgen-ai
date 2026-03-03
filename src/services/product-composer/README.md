# Product Composer & Text Renderer Services

Enterprise-grade image composition and text rendering services for AdGen AI.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ POST /api/compose  (mode: STANDARD | AUTO_LAYOUT)       │    │
│  └────────────────────────────┬────────────────────────────┘    │
└───────────────────────────────┼─────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────┐
│                      Service Layer                               │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │  Product Composer   │  │       AUTO_LAYOUT Pipeline      │   │
│  │  (STANDARD mode)    │  │                                 │   │
│  │  - Shadow gen       │  │  1. analyzeLayoutWithAI()       │   │
│  │  - Color matching   │  │     (Gemini Vision → LayoutSpec)│   │
│  │  - Placement calc   │  │  2. validateAndNormalizeLayout()│   │
│  │  - Gemini enhance   │  │  3. Composite product + shadow  │   │
│  └─────────────────────┘  │  4. renderTextOnImage()         │   │
│                           │     (SVG deterministic text)    │   │
│                           └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
              │                              │
┌─────────────┴──────────────────────────────┴────────────────────┐
│                      Library Layer                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │   Logger   │  │  Metrics   │  │  Storage   │  │   Sharp   │  │
│  │            │  │            │  │            │  │           │  │
│  │ Structured │  │ Timing &   │  │ Local/S3   │  │ Image     │   │
│  │ logging    │  │ histograms │  │ abstraction│  │ processing│  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Compose Modes

### STANDARD Mode
Manual placement control - you specify anchor, scale, x, y.
Best for predictable, repeatable compositions.

### AUTO_LAYOUT Mode (New!)
AI-powered intelligent layout:
1. **Gemini Vision analyzes** the background image
2. Returns a **LayoutSpec** JSON with:
   - Optimal product placement
   - Text block positions (headline, subheadline, CTA)
   - Overlay recommendations for text legibility
3. **Deterministic text rendering** via SVG
4. **Fallback presets** if confidence < 0.55

```typescript
// AUTO_LAYOUT request example
const result = await fetch('/api/compose', {
  method: 'POST',
  body: JSON.stringify({
    mode: "AUTO_LAYOUT",
    backgroundUrl: "data:image/png;base64,...",
    productPngUrl: "data:image/png;base64,...",
    copy: {
      headline: "Tu título aquí",
      subheadline: "Subtítulo descriptivo",
      cta: "Comprar ahora"
    },
    autoLayoutOptions: {
      skipAI: false,        // Use AI analysis (or set to true + presetName)
      renderText: true,      // Render text on final image
      includeLayoutSpec: true // Return LayoutSpec in response
    }
  })
});

// Response includes layoutSpec
const { data } = await result.json();
console.log(data.layoutSpec); // Full LayoutSpec JSON
```

## Services

### Product Composer (`/src/services/product-composer`)

Composites product images onto AI-generated backgrounds with:
- **Shadow Generation**: Drop shadows and contact shadows
- **Color Matching**: Luminance adjustment to match background
- **Smart Placement**: Anchor-based positioning with offsets
- **Optional Gemini Enhancement**: AI relighting in advanced mode

### Auto Layout (`/src/services/product-composer/autoLayout.ts`)

AI-powered layout analysis:
- Uses Gemini Vision (`gemini-2.0-flash`)
- Outputs structured `LayoutSpec` JSON
- Includes confidence scoring and warnings
- Falls back to presets if confidence < 0.55

### Layout Validation (`/src/services/product-composer/layoutValidation.ts`)

Normalizes and validates AI-generated layouts:
- Clamps values to safe bounds
- Resolves text/product overlaps
- Adds contrast overlays when needed
- Applies copy content to text blocks

### Text Renderer (`/src/services/product-composer/textRenderer.ts`)

Deterministic text rendering using SVG + Sharp:
- **No AI** - exact same output every time
- Word wrapping with max lines
- Text backgrounds (pill, box)
- Overlay gradients for legibility

## LayoutSpec Schema

The LayoutSpec is the JSON contract returned by AI analysis:

```typescript
interface LayoutSpec {
  version: "1.0";
  canvas: {
    width: number;    // Default: 1080
    height: number;   // Default: 1350
    safeMargin: number; // Default: 64
  };
  product: {
    x: number;        // Normalized 0-1
    y: number;        
    width: number;    // Normalized 0-1
    height: number;   
    anchor: "top-left" | "top-center" | ...;
    zIndex: number;
  };
  textBlocks: Array<{
    id: string;       // "headline" | "subheadline" | "cta" | "badge"
    content: string;
    x: number;
    y: number;
    maxWidth: number;
    fontSize: number;
    fontWeight: "normal" | "bold";
    color: string;    // Hex color
    textAlign: "left" | "center" | "right";
    textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
    background?: {
      type: "none" | "pill" | "box";
      color: string;
      opacity: number;
      padding: number;
    };
  }>;
  overlays?: Array<{
    type: "gradient" | "solid";
    position: "top" | "bottom" | "left" | "right" | "full";
    color: string;
    opacity: number;
    height?: number;
  }>;
  confidence: number; // 0-1, fallback if < 0.55
}
```

## Preset Layouts

Three built-in presets for consistent results:

| Preset | Product | Headline | CTA |
|--------|---------|----------|-----|
| `SPLIT_LEFT` | Left 40% | Top right | Bottom right |
| `SPLIT_RIGHT` | Right 40% | Top left | Bottom left |
| `HERO_CENTER` | Center bottom | Top center | Below product |

Use presets with `skipAI: true`:

```typescript
{
  mode: "AUTO_LAYOUT",
  autoLayoutOptions: {
    skipAI: true,
    presetName: "SPLIT_LEFT"
  }
}
```

## Environment Variables

```bash
# Composer Mode
COMPOSER_MODE=mvp              # 'mvp' (Sharp only) or 'advanced' (with Gemini)
COMPOSER_ENABLE_GEMINI=false   # Enable Gemini enhancement in advanced mode
GOOGLE_AI_API_KEY=xxx          # Required for Gemini features

# Text Renderer
TEXT_RENDER_ENGINE=svg         # 'svg' (default) or 'canvas'
TEXT_FONTS_DIR=/path/to/fonts  # Custom fonts directory
TEXT_DEFAULT_FONT=Inter        # Default font family

# Storage
STORAGE_PROVIDER=local         # 'local', 's3', or 'gcs'
STORAGE_BASE_PATH=/tmp/adgen   # For local storage
# For S3: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION

# Logging
LOG_LEVEL=info                 # 'debug', 'info', 'warn', 'error'
LOG_FORMAT=text                # 'text' or 'json'
```

## API Reference

### POST /api/compose

Composite a product onto a background image.

#### JSON Body

```json
{
  "background": "https://example.com/bg.jpg",
  "product": "data:image/png;base64,iVBOR...",
  "placement": {
    "anchor": "bottom-center",
    "offsetX": 0,
    "offsetY": -20,
    "scale": 0.8
  },
  "style": {
    "shadowEnabled": true,
    "shadowOpacity": 0.4,
    "shadowBlur": 20,
    "shadowOffsetY": 10,
    "matchLuminance": true,
    "luminanceTarget": 0.5
  },
  "output": {
    "format": "png",
    "quality": 95
  },
  "debug": false
}
```

#### cURL Examples

**JSON request:**
```bash
curl -X POST http://localhost:3000/api/compose \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "background": "https://example.com/background.jpg",
    "product": "https://example.com/product.png",
    "placement": {
      "anchor": "bottom-center",
      "scale": 0.6
    },
    "style": {
      "shadowEnabled": true,
      "shadowOpacity": 0.5
    }
  }'
```

**Multipart form-data:**
```bash
curl -X POST http://localhost:3000/api/compose \
  -F "background=@background.jpg" \
  -F "product=@product.png" \
  -F 'config={"placement":{"anchor":"bottom-center"},"style":{"shadowEnabled":true}}' \
  -o output.png
```

**Get raw image:**
```bash
curl -X POST http://localhost:3000/api/compose \
  -H "Content-Type: application/json" \
  -d '{"background":"https://...","product":"https://..."}' \
  -o composed.png
```

#### Response (JSON)

```json
{
  "success": true,
  "requestId": "abc123",
  "data": {
    "image": "data:image/png;base64,...",
    "mimeType": "image/png",
    "width": 1080,
    "height": 1080,
    "storedKey": "compose/abc123.png",
    "storedUrl": "/storage/compose/abc123.png",
    "timing": {
      "total_ms": 1234,
      "load_images_ms": 100,
      "shadow_ms": 200,
      "compose_ms": 300,
      "gemini_ms": 0,
      "encode_ms": 50
    }
  }
}
```

### POST /api/compose (AUTO_LAYOUT mode)

AI-powered layout with text rendering.

#### JSON Body

```json
{
  "mode": "AUTO_LAYOUT",
  "backgroundUrl": "https://example.com/bg.jpg",
  "productPngUrl": "data:image/png;base64,...",
  "copy": {
    "headline": "Headline text",
    "subheadline": "Supporting copy",
    "cta": "Call to action",
    "badge": "SALE",
    "disclaimer": "Terms apply"
  },
  "autoLayoutOptions": {
    "layoutHint": "product on left, text on right",
    "skipAI": false,
    "presetName": "SPLIT_LEFT",
    "renderText": true,
    "includeLayoutSpec": true,
    "minConfidence": 0.55
  },
  "output": {
    "format": "png",
    "quality": 95
  }
}
```

#### AUTO_LAYOUT Response

```json
{
  "success": true,
  "requestId": "xyz789",
  "data": {
    "image": "data:image/png;base64,...",
    "mimeType": "image/png",
    "width": 1080,
    "height": 1350,
    "layoutSpec": {
      "version": "1.0",
      "canvas": { "width": 1080, "height": 1350, "safeMargin": 64 },
      "product": { "x": 0.1, "y": 0.3, "width": 0.35, "height": 0.5, "anchor": "center", "zIndex": 1 },
      "textBlocks": [
        { "id": "headline", "content": "Headline text", "x": 0.55, "y": 0.15, "maxWidth": 0.4, "fontSize": 56, "fontWeight": "bold", "color": "#FFFFFF", "textAlign": "left", "textTransform": "none" }
      ],
      "overlays": [],
      "confidence": 0.78
    },
    "fallbackLayoutUsed": false,
    "timing": { "total_ms": 2500 }
  }
}
```

### POST /api/render-text

Render text overlays on images or transparent backgrounds.

#### JSON Body

```json
{
  "width": 1080,
  "height": 1080,
  "backgroundColor": "#1a1a1a",
  "safeArea": {
    "top": 50,
    "right": 50,
    "bottom": 200,
    "left": 50
  },
  "elements": [
    {
      "text": "Big Sale Today!",
      "font": {
        "family": "Inter",
        "size": 72,
        "weight": "700",
        "color": "#FFFFFF"
      },
      "effects": {
        "shadow": {
          "offsetX": 0,
          "offsetY": 4,
          "blur": 8,
          "color": "rgba(0,0,0,0.5)"
        }
      },
      "align": "center",
      "verticalAlign": "middle",
      "box": {
        "x": 50,
        "y": 50,
        "width": 980,
        "height": 200
      },
      "maxLines": 2,
      "wordWrap": true
    }
  ],
  "format": "png",
  "autoContrast": true,
  "debug": false
}
```

#### cURL Examples

**Render text on transparent background:**
```bash
curl -X POST http://localhost:3000/api/render-text \
  -H "Content-Type: application/json" \
  -d '{
    "width": 1080,
    "height": 1080,
    "elements": [{
      "text": "Hello World",
      "font": {"size": 64, "color": "#FFFFFF"},
      "align": "center",
      "verticalAlign": "middle",
      "box": {"x": 0, "y": 0, "width": 1080, "height": 1080}
    }],
    "format": "png"
  }' \
  -o text.png
```

**Render text on background image:**
```bash
curl -X POST http://localhost:3000/api/render-text \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "width": 1080,
    "height": 1080,
    "backgroundImage": "https://example.com/image.jpg",
    "elements": [{
      "text": "Limited Offer",
      "font": {"size": 48, "weight": "700"},
      "align": "center",
      "box": {"x": 100, "y": 900, "width": 880, "height": 100}
    }],
    "autoContrast": true
  }'
```

**Multiple text elements:**
```bash
curl -X POST http://localhost:3000/api/render-text \
  -H "Content-Type: application/json" \
  -d '{
    "width": 1080,
    "height": 1920,
    "backgroundColor": "#000000",
    "elements": [
      {
        "id": "headline",
        "text": "Summer Collection",
        "font": {"size": 80, "weight": "800", "color": "#FFFFFF"},
        "align": "center",
        "box": {"x": 50, "y": 100, "width": 980, "height": 200}
      },
      {
        "id": "subhead",
        "text": "Up to 50% Off",
        "font": {"size": 48, "weight": "600", "color": "#FFD700"},
        "align": "center", 
        "box": {"x": 50, "y": 320, "width": 980, "height": 100}
      },
      {
        "id": "cta",
        "text": "Shop Now",
        "font": {"size": 36, "weight": "700", "color": "#000000"},
        "background": {"enabled": true, "color": "#FFFFFF", "borderRadius": 50, "padding": 20},
        "align": "center",
        "box": {"x": 340, "y": 1700, "width": 400, "height": 80}
      }
    ]
  }' \
  -o ad.png
```

## Running Tests

```bash
# Shadow generation tests
npx tsx scripts/test-shadow-generation.ts

# Text wrapping tests
npx tsx scripts/test-text-wrapping.ts
```

## Directory Structure

```
src/
├── services/
│   ├── product-composer/
│   │   ├── index.ts          # Barrel export
│   │   ├── types.ts          # Zod schemas & types
│   │   ├── utils.ts          # Image utilities
│   │   └── composer.ts       # Main compose function
│   │
│   └── text-renderer/
│       ├── index.ts          # Barrel export
│       ├── types.ts          # Zod schemas & types
│       ├── utils.ts          # Text utilities
│       └── renderer.ts       # Main render function
│
├── lib/
│   ├── logger/
│   │   └── index.ts          # Structured logging
│   ├── metrics/
│   │   └── index.ts          # Timing & counting
│   └── storage/
│       ├── index.ts          # Factory & exports
│       ├── types.ts          # StorageProvider interface
│       └── local.ts          # Local filesystem impl
│
└── app/
    └── api/
        ├── compose/
        │   └── route.ts      # POST /api/compose
        └── render-text/
            └── route.ts      # POST /api/render-text
```

## Feature Flags

| Flag | Values | Description |
|------|--------|-------------|
| `COMPOSER_MODE` | `mvp`, `advanced` | Controls which composition pipeline to use |
| `COMPOSER_ENABLE_GEMINI` | `true`, `false` | Enable AI enhancement in advanced mode |
| `TEXT_RENDER_ENGINE` | `svg`, `canvas` | SVG is default, Canvas for complex typography |
| `STORAGE_PROVIDER` | `local`, `s3`, `gcs` | Where to store generated images |

## Scaling to Microservices

The architecture is designed for easy extraction:

1. **Each service module** (`product-composer`, `text-renderer`) is self-contained
2. **Shared libraries** (`logger`, `metrics`, `storage`) can be published as packages
3. **API routes** can be moved to standalone Express/Fastify servers
4. **Storage abstraction** allows switching to S3/GCS without code changes

To extract as microservice:
```bash
# 1. Copy service directory
cp -r src/services/product-composer ./product-composer-service/src/

# 2. Copy shared libs
cp -r src/lib ./product-composer-service/src/lib/

# 3. Create standalone entry point
# 4. Containerize with Docker
# 5. Deploy independently
```

## Performance Considerations

- **Sharp vs Gemini**: MVP mode (Sharp-only) is ~10x faster than advanced mode
- **Image caching**: Frequently used backgrounds can be pre-loaded
- **Batch processing**: Use `Promise.all` for multiple compositions
- **Output format**: WebP is smaller than PNG, JPEG is smallest but lossy

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "requestId": "abc123",
  "error": "Missing required field: product",
  "duration_ms": 5
}
```

HTTP status codes:
- `400`: Invalid request (missing fields, validation errors)
- `415`: Unsupported Content-Type
- `500`: Server error (image processing failed)
