"use client";

import { useState, useCallback } from "react";

/**
 * DevComposePanel - AI Product Compose Test Panel
 *
 * Panel colapsable para testear el endpoint /api/compose
 * Solo visible cuando dev=1 está en la URL
 *
 * Soporta:
 * - STANDARD mode: Manual placement (anchor, scale)
 * - AUTO_LAYOUT mode: AI analyzes background and proposes layout
 * - SMART_USAGE_V1 mode: Fully automatic pipeline with QA scoring
 * - PRESET mode: Predefined templates without AI
 * - TEMPLATE_BETA mode: Template determinístico + paso 2 opcional con IA
 */

const ANCHORS = [
  "floor",
  "table",
  "center",
  "bottom_center",
  "bottom_left",
  "bottom_right",
] as const;



const SCENE_PRESETS = [
  { id: "custom", label: "Custom prompt", prompt: "" },
  {
    id: "kitchen",
    label: "Kitchen",
    prompt:
      "A modern clean kitchen countertop, warm lighting, professional product photography, 8k, ultra realistic",
  },
  {
    id: "bathroom",
    label: "Bathroom",
    prompt:
      "A spa-like bathroom vanity with marble countertop, soft natural light, clean minimalist, professional product photography",
  },
  {
    id: "nature",
    label: "Nature",
    prompt:
      "Natural outdoor setting with soft sunlight, green plants and foliage, organic feel, professional product photography",
  },
  {
    id: "studio",
    label: "Studio",
    prompt:
      "Professional photography studio with seamless white background and soft studio lighting",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    prompt:
      "Modern living room interior with warm natural light, cozy atmosphere, lifestyle photography",
  },
] as const;

const LAYOUT_PRESETS = [
  {
    id: "AI",
    label: "AI Auto",
    description: "Gemini analiza el fondo y propone layout",
  },
  {
    id: "SPLIT_LEFT",
    label: "Split Left",
    description: "Producto abajo, texto arriba izquierda",
  },
  {
    id: "SPLIT_RIGHT",
    label: "Split Right",
    description: "Producto izquierda, texto derecha",
  },
  {
    id: "HERO_CENTER",
    label: "Hero Center",
    description: "Producto centrado, texto abajo",
  },
] as const;

// Registry de copyZone por template — agregar acá cuando haya nuevos templates
const TEMPLATE_COPY_ZONES: Record<string, "right" | "left" | "bottom"> = {
  "classic-editorial-right": "right",
  "promo-urgencia-bottom": "bottom",
  "producto-beneficios-vertical": "left",
};

const TEMPLATES = [
  { id: "classic-editorial-right", name: "🖼️ Classic Editorial", copyZone: "right" },
  { id: "promo-urgencia-bottom", name: "⚡ Promo Urgencia", copyZone: "bottom" },
];

const VARIANT_ANGLE_NAMES = ["Emocional", "Problema/Solución", "Urgencia", "Técnico", "Aspiracional"] as const;

function getTemplateSchema(templateId: string): string[] {
  if (templateId === "promo-urgencia-bottom") {
    return ["badge", "headline", "subheadline", "cta", "backgroundPrompt", "productPrompt"];
  }
  return ["title", "headline", "subheadline", "badge", "bullets", "backgroundPrompt", "productPrompt"];
}

interface LayoutSpec {
  version: string;
  canvas: { width: number; height: number };
  product: {
    anchor: string;
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  textBlocks: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    content?: string;
    fontSize: number;
  }>;
  overlays: Array<{
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    opacity: number;
  }>;
  confidence: number;
  rationale: string;
  warnings: string[];
}

interface ComposeResult {
  success: boolean;
  requestId?: string;
  data?: {
    image?: string;
    imageUrl?: string;
    layoutSpec?: LayoutSpec;
    templateId?: string;
    fallbackLayoutUsed?: boolean;
    timings?: Record<string, number>;
    cost?: { geminiCalls: number; estimatedCostUsd: number };
    debug?: Record<string, unknown>;
  };
  error?: string;
}

export default function DevComposePanel() {
  const [isExpanded, setIsExpanded] = useState(false);
const [bulletsText, setBulletsText] = useState("");
  // Form state
  const [composeMode, setComposeMode] = useState<
    | "STANDARD"
    | "AUTO_LAYOUT"
    | "SMART_USAGE_V1"
    | "PRESET"
    | "PRODUCT_IA"
    | "TEMPLATE_BETA"
  >("STANDARD");

  // PRODUCT_IA specific state
  const [productIABackgroundFile, setProductIABackgroundFile] =
    useState<File | null>(null);
  const [productIABackgroundPreview, setProductIABackgroundPreview] = useState<
    string | null
  >(null);
  const [productIAProductFile, setProductIAProductFile] = useState<File | null>(
    null,
  );
  const [productIAProductPreview, setProductIAProductPreview] = useState<
    string | null
  >(null);
  const [productIAPrompt, setProductIAPrompt] = useState("");

  // PRODUCT_IA file handlers
  const handleProductIABackgroundFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setProductIABackgroundFile(file);
      const reader = new FileReader();
      reader.onload = () =>
        setProductIABackgroundPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleProductIAProductFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setProductIAProductFile(file);
      const reader = new FileReader();
      reader.onload = () => setProductIAProductPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  // General state
  const [backgroundMode, setBackgroundMode] = useState<"file" | "ai">("ai");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(
    null,
  );
  const [scenePreset, setScenePreset] = useState("kitchen");
  const [customPrompt, setCustomPrompt] = useState("");
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<string>("bottom_center");
  const [scale, setScale] = useState(0.7);
  const [aspectRatio, setAspectRatio] = useState<string>("4:5");

  // AUTO_LAYOUT specific state
  const [layoutPreset, setLayoutPreset] = useState<string>("AI");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [cta, setCta] = useState("");
  const [renderText, setRenderText] = useState(true);

  // SMART_USAGE_V1 specific state
  const [smartProductName, setSmartProductName] = useState("");
  const [smartProductDesc, setSmartProductDesc] = useState("");
  const [qaThreshold, setQaThreshold] = useState(0.75);
  const [enableRepair, setEnableRepair] = useState(true);

  // PRESET specific state
  const [selectedPresetId, setSelectedPresetId] = useState(
    "HERO_LEFT_COPY_RIGHT_BADGE_V1",
  );
  const [badgeText, setBadgeText] = useState("");

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultTemplateId, setResultTemplateId] = useState<string | null>(null);

  // TEMPLATE_BETA paso 2 state
  const [step2ProductFile, setStep2ProductFile] = useState<File | null>(null);
  const [step2ProductPreview, setStep2ProductPreview] = useState<string | null>(
    null,
  );
  const [step2Prompt, setStep2Prompt] = useState("");
  const [step2Loading, setStep2Loading] = useState(false);

  // TEMPLATE_BETA background generation state
  const [templateBgMode, setTemplateBgMode] = useState<"upload" | "generate">("upload");
  const [templateBgPrompt, setTemplateBgPrompt] = useState("");
  const [templateBgColorHint, setTemplateBgColorHint] = useState<string | undefined>(undefined);
  const [bgGenerating, setBgGenerating] = useState(false);

  // Copy generator state
  const [copyGenExpanded, setCopyGenExpanded] = useState(false);
  const [bizProduct, setBizProduct] = useState("");
  const [bizOffer, setBizOffer] = useState("");
  const [bizAudience, setBizAudience] = useState("");
  const [bizProblem, setBizProblem] = useState("");
  const [bizTone, setBizTone] = useState<"emocional" | "tecnico" | "urgente" | "inspiracional">("emocional");
  const [copyGenerating, setCopyGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoStep, setAutoStep] = useState<string | null>(null);
  const [autoProductFile, setAutoProductFile] = useState<File | null>(null);
  const [autoProductPreview, setAutoProductPreview] = useState<string>("");

  // Variants state
  const [variants, setVariants] = useState<Array<{ copy: Record<string, unknown>; backgroundImage: string; resultImage: string }>>([]);
  const [variantsGenerating, setVariantsGenerating] = useState(false);
  const [variantsProgress, setVariantsProgress] = useState("");

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState("classic-editorial-right");

  const handleStep2ProductFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setStep2ProductFile(file);
      const reader = new FileReader();
      reader.onload = () => setStep2ProductPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  // Get current prompt
  const getCurrentPrompt = () => {
    if (scenePreset === "custom") return customPrompt;
    return SCENE_PRESETS.find((p) => p.id === scenePreset)?.prompt || "";
  };

  // File handlers
  const handleBackgroundFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBackgroundFile(file);
      const reader = new FileReader();
      reader.onload = () => setBackgroundPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleProductFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setProductFile(file);
      const reader = new FileReader();
      reader.onload = () => setProductPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  // Submit handler
  const handleCompose = async () => {
    // Branch PRODUCT_IA
    if (composeMode === "PRODUCT_IA") {
      if (!productIABackgroundFile || !productIAProductFile) {
        setError("Debes subir ambos archivos: background y producto PNG.");
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      setResultImage(null);
      setResultTemplateId(null);
      try {
        const formData = new FormData();
        formData.append("background", productIABackgroundFile);
        formData.append("product", productIAProductFile);
        const config = {
          mode: "PRODUCT_IA",
          outputFormat: "png",
          quality: 95,
          prompt: productIAPrompt,
          copy: {
            headline: headline || undefined,
            subheadline: subheadline || undefined,
            badge: badgeText || undefined,
          },
        };
        formData.append("config", JSON.stringify(config));
        const res = await fetch("/api/compose", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        setResult(data);
        if (data.data?.image) setResultImage(data.data.image);
        else if (data.data?.imageUrl) setResultImage(data.data.imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Branch TEMPLATE_BETA
    if (composeMode === "TEMPLATE_BETA") {
      if (!backgroundFile) {
        setError("Debes subir un background para TEMPLATE_BETA.");
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      setResultImage(null);
      setResultTemplateId(null);
      // Resetear paso 2
      setStep2ProductFile(null);
      setStep2ProductPreview(null);
      setStep2Prompt("");
      try {
        const formData = new FormData();
        formData.append("background", backgroundFile);
        const config = {
          mode: "TEMPLATE_BETA",
          outputFormat: "png",
          quality: 95,
          copy: {
            cta: cta || undefined,
            headline: headline || undefined,
            subheadline: subheadline || undefined,
            badge: badgeText || undefined,
             bullets: bulletsText ? bulletsText.split("\n").filter(Boolean) : undefined,
          },
          templateBetaOptions: {
            templateId: selectedTemplate,
            canvas: { width: 1080, height: 1080 },
            includeLayoutSpec: true,
          },
        };
        formData.append("config", JSON.stringify(config));
        const res = await fetch("/api/compose", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        setResult(data);
        if (data.data?.templateId) setResultTemplateId(data.data.templateId);
        if (data.data?.image) setResultImage(data.data.image);
        else if (data.data?.imageUrl) setResultImage(data.data.imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validate inputs para otros modos
    if (!productFile) {
      setError("Sube el PNG del producto");
      return;
    }
    if (backgroundMode === "file" && !backgroundFile) {
      setError("Sube una imagen de background o cambia a modo AI");
      return;
    }
    if (backgroundMode === "ai" && !getCurrentPrompt()) {
      setError("Ingresa un prompt para generar el background");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setResultImage(null);
    setResultTemplateId(null);

    try {
      const formData = new FormData();
      formData.append("product", productFile);

      if (backgroundMode === "file" && backgroundFile) {
        formData.append("background", backgroundFile);
      }

      const config: Record<string, unknown> = {
        mode: composeMode,
        outputFormat: "png",
        quality: 95,
      };

      if (composeMode === "STANDARD") {
        config.placement = { anchor, scale };
        config.style = {
          shadow: {
            enabled: true,
            blur: 20,
            opacity: 0.4,
            offsetX: 0,
            offsetY: 10,
            color: "rgba(0,0,0,0.5)",
          },
        };
      }

      if (composeMode === "AUTO_LAYOUT") {
        if (headline || subheadline || cta) {
          config.copy = {
            headline: headline || undefined,
            subheadline: subheadline || undefined,
            cta: cta || undefined,
          };
        }
        config.autoLayoutOptions = {
          skipAI: layoutPreset !== "AI",
          presetName: layoutPreset !== "AI" ? layoutPreset : undefined,
          renderText,
          includeLayoutSpec: true,
        };
      }

      if (composeMode === "SMART_USAGE_V1") {
        config.smartUsageOptions = {
          productName: smartProductName || "Producto",
          productDescription: smartProductDesc || "Producto de skincare",
          qaThreshold,
          enableRepair,
        };
        if (headline || subheadline || cta) {
          config.copy = {
            headline: headline || undefined,
            subheadline: subheadline || undefined,
            cta: cta || undefined,
          };
        }
      }

      if (composeMode === "PRESET") {
        config.presetOptions = {
          presetId: selectedPresetId,
          renderText: true,
          includeLayoutSpec: true,
        };
        config.copy = {
          headline: headline || undefined,
          subheadline: subheadline || undefined,
          cta: cta || undefined,
          badge: badgeText || undefined,
        };
      }

      if (backgroundMode === "ai") {
        config.backgroundPrompt = getCurrentPrompt();
        config.aspectRatio = aspectRatio;
      }

      formData.append("config", JSON.stringify(config));

      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      const data: ComposeResult = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      setResult(data);
      if (data.data?.image) setResultImage(data.data.image);
      else if (data.data?.imageUrl) setResultImage(data.data.imageUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: agregar producto con IA sobre el resultado del paso 1
  const handleStep2Compose = async () => {
    if (!step2ProductFile || !resultImage) return;
    setStep2Loading(true);
    setError(null);
    try {
      // Convertir resultImage (base64 data URL) a File
      const res = await fetch(resultImage);
      const bgBlob = await res.blob();
      const bgFile = new File([bgBlob], "background.png", {
        type: "image/png",
      });

      // Leer copyZone del template usado — el producto va al lado opuesto
      const copyZone = resultTemplateId
        ? (TEMPLATE_COPY_ZONES[resultTemplateId] ?? "right")
        : "right";

      const formData = new FormData();
      formData.append("background", bgFile);
      formData.append("product", step2ProductFile);
      formData.append(
        "config",
        JSON.stringify({
          mode: "PRODUCT_IA",
          outputFormat: "png",
          quality: 95,
          productIAOptions: {
            prompt: step2Prompt || undefined,
            copyZone,
            includeLayoutSpec: false,
            skipTextRender: true,
          },
        }),
      );

      const response = await fetch("/api/compose", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || `Error ${response.status}`);

      if (data.data?.image) setResultImage(data.data.image);
      else if (data.data?.imageUrl) setResultImage(data.data.imageUrl);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setStep2Loading(false);
    }
  };

  // Clear all
  const handleClear = () => {
    setBackgroundFile(null);
    setBackgroundPreview(null);
    setProductFile(null);
    setProductPreview(null);
    setResult(null);
    setResultImage(null);
    setResultTemplateId(null);
    setError(null);
    setHeadline("");
    setSubheadline("");
    setCta("");
    setBadgeText("");
    setStep2ProductFile(null);
    setStep2ProductPreview(null);
    setStep2Prompt("");
    setBulletsText("");
    setTemplateBgPrompt("");
    setBizProduct("");
    setBizOffer("");
    setBizAudience("");
    setBizProblem("");
    setBizTone("emocional");
    setCopySuccess(null);
    setAutoProductFile(null);
    setAutoProductPreview("");
    setVariants([]);
    setVariantsProgress("");
    setSelectedTemplate("classic-editorial-right");
  };

  return (
    <div className="border-2 border-cyan-600/50 rounded-xl bg-cyan-950/20 overflow-hidden">
      {/* Header - Colapsable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-cyan-900/30 hover:bg-cyan-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧪</span>
          <span className="font-semibold text-cyan-300">
            AI Product Compose (DEV)
          </span>
          <span className="px-2 py-0.5 text-xs bg-cyan-600 rounded">
            /api/compose
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-cyan-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Panel Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* ── Compose Mode Toggle ── */}
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Compose Mode
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setComposeMode("STANDARD")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${composeMode === "STANDARD" ? "bg-green-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
              >
                🎯 STANDARD
              </button>
              <button
                type="button"
                onClick={() => setComposeMode("AUTO_LAYOUT")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${composeMode === "AUTO_LAYOUT" ? "bg-purple-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
              >
                🤖 AUTO_LAYOUT
              </button>
              <button
                type="button"
                onClick={() => setComposeMode("SMART_USAGE_V1")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${composeMode === "SMART_USAGE_V1" ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
              >
                ✨ SMART_USAGE
              </button>
              <button
                type="button"
                onClick={() => setComposeMode("PRESET")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${composeMode === "PRESET" ? "bg-amber-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
              >
                📐 PRESET
              </button>
              <button
                type="button"
                onClick={() => setComposeMode("PRODUCT_IA")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${composeMode === "PRODUCT_IA" ? "bg-pink-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
              >
                🧬 PRODUCT_IA
              </button>
              <button
                type="button"
                onClick={() => setComposeMode("TEMPLATE_BETA")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${composeMode === "TEMPLATE_BETA" ? "bg-teal-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
              >
                🖼️ TEMPLATE_BETA
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {composeMode === "STANDARD"
                ? "Manual placement: tú controlas anchor y scale del producto"
                : composeMode === "AUTO_LAYOUT"
                  ? "AI analiza el fondo y propone layout óptimo con texto"
                  : composeMode === "SMART_USAGE_V1"
                    ? "Pipeline automático con inferencia de uso, QA scoring y auto-repair"
                    : composeMode === "TEMPLATE_BETA"
                      ? "Paso 1: genera plantilla con copy. Paso 2 (opcional): agrega producto con IA."
                      : "Templates predefinidos, sin IA - máxima consistencia"}
            </p>
          </div>

          {/* ── PRODUCT_IA options ── */}
          {composeMode === "PRODUCT_IA" && (
            <div className="space-y-4 p-4 bg-pink-950/30 border border-pink-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-pink-400 font-semibold">
                  🧬 PRODUCT_IA Mode
                </span>
                <span className="text-xs text-neutral-500">
                  Gemini image-to-image composition
                </span>
              </div>
              <div>
                <label className="block text-xs text-pink-300 mb-1">
                  Background PNG *
                </label>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleProductIABackgroundFile}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-pink-700 text-sm"
                />
                {productIABackgroundPreview && (
                  <img
                    src={productIABackgroundPreview}
                    alt="Background preview"
                    className="mt-2 w-full h-24 object-cover rounded-lg"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-pink-300 mb-1">
                  Product PNG (transparente) *
                </label>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleProductIAProductFile}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-pink-700 text-sm"
                />
                {productIAProductPreview && (
                  <img
                    src={productIAProductPreview}
                    alt="Product preview"
                    className="mt-2 w-full h-24 object-contain bg-neutral-800 rounded-lg p-2"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-pink-300 mb-1">
                  Prompt *
                </label>
                <input
                  type="text"
                  value={productIAPrompt}
                  onChange={(e) => setProductIAPrompt(e.target.value)}
                  placeholder="Describe la composición..."
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-pink-700 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-pink-300 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Tu título principal..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-pink-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-pink-300 mb-1">
                    Subheadline
                  </label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Subtítulo..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-pink-700 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-pink-300 mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="NUEVO • 20% OFF"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-pink-700 text-sm"
                />
              </div>
            </div>
          )}

          {/* ── Generador de Copy con IA ── */}
          {composeMode === "TEMPLATE_BETA" && (
            <div className="border border-violet-700/50 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setCopyGenExpanded(!copyGenExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-violet-950/40 hover:bg-violet-950/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-violet-300 font-semibold">🧠 Generador de Copy con IA</span>
                  <span className="text-xs text-neutral-500">auto-rellena los campos del template</span>
                </div>
                <svg
                  className={`w-4 h-4 text-violet-400 transition-transform ${copyGenExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {copyGenExpanded && (
                <div className="p-4 space-y-3 bg-violet-950/30 border-t border-violet-700/50">
                  <div>
                    <label className="block text-xs text-violet-300 mb-1">Producto</label>
                    <input
                      type="text"
                      value={bizProduct}
                      onChange={(e) => setBizProduct(e.target.value)}
                      placeholder="Crema reafirmante anti-estrías"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-violet-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-violet-300 mb-1">Oferta principal</label>
                    <input
                      type="text"
                      value={bizOffer}
                      onChange={(e) => setBizOffer(e.target.value)}
                      placeholder="60% OFF en la segunda unidad"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-violet-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-violet-300 mb-1">Público objetivo</label>
                    <input
                      type="text"
                      value={bizAudience}
                      onChange={(e) => setBizAudience(e.target.value)}
                      placeholder="Mujeres de 30-50 años"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-violet-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-violet-300 mb-1">Problema que resuelve</label>
                    <input
                      type="text"
                      value={bizProblem}
                      onChange={(e) => setBizProblem(e.target.value)}
                      placeholder="Reduce estrías y mejora la firmeza"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-violet-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-violet-300 mb-1">Tono</label>
                    <div className="flex flex-wrap gap-2">
                      {(["emocional", "tecnico", "urgente", "inspiracional"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setBizTone(t)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${bizTone === t ? "bg-violet-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-violet-300 mb-1">
                      Imagen del producto <span className="text-neutral-500">(opcional — se integrará automáticamente)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAutoProductFile(file);
                        const reader = new FileReader();
                        reader.onload = () => setAutoProductPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-violet-700 text-sm"
                    />
                    {autoProductPreview && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={autoProductPreview}
                          alt="Producto"
                          className="h-16 w-16 object-contain bg-neutral-800 rounded-lg p-1"
                        />
                        <button
                          type="button"
                          onClick={() => { setAutoProductFile(null); setAutoProductPreview(""); }}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {/* ── Generar Copy solo ── */}
                    <button
                      type="button"
                      disabled={variantsGenerating || copyGenerating || autoGenerating || !bizProduct}
                      onClick={async () => {
                        setCopyGenerating(true);
                        setCopySuccess(null);
                        try {
                          const res = await fetch("/api/compose", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            body: JSON.stringify({
                              mode: "GENERATE_COPY",
                              product: bizProduct,
                              offer: bizOffer,
                              targetAudience: bizAudience,
                              problem: bizProblem,
                              tone: bizTone,
                              templateSchema: getTemplateSchema(selectedTemplate),
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
                          const copy = data.data?.copy;
                          if (copy) {
                            if (copy.title) setCta(copy.title);
                            if (copy.cta) setCta(copy.cta as string);
                            if (copy.headline) setHeadline(copy.headline);
                            if (copy.subheadline) setSubheadline(copy.subheadline);
                            if (copy.badge) setBadgeText(copy.badge);
                            if (Array.isArray(copy.bullets)) setBulletsText(copy.bullets.join("\n"));
                            if (copy.backgroundPrompt) setTemplateBgPrompt(copy.backgroundPrompt);
                            setTemplateBgColorHint(typeof copy.backgroundColorHint === "string" ? copy.backgroundColorHint : undefined);
                          }
                          setCopySuccess("✅ Copy generado. Revisá y editá antes de continuar.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Error generando copy");
                        } finally {
                          setCopyGenerating(false);
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
                    >
                      {copyGenerating ? "Generando..." : "🧠 Generar Copy"}
                    </button>

                    {/* ── Generar y Componer automático ── */}
                    <button
                      type="button"
                      disabled={variantsGenerating || copyGenerating || autoGenerating || !bizProduct}
                      onClick={async () => {
                        setAutoGenerating(true);
                        setAutoStep("⚙️ Generando copy...");
                        setCopySuccess(null);
                        setError(null);
                        setResult(null);
                        setResultImage(null);
                        setResultTemplateId(null);
                        try {
                          // Step 1: GENERATE_COPY
                          const copyRes = await fetch("/api/compose", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            body: JSON.stringify({
                              mode: "GENERATE_COPY",
                              product: bizProduct,
                              offer: bizOffer,
                              targetAudience: bizAudience,
                              problem: bizProblem,
                              tone: bizTone,
                              templateSchema: getTemplateSchema(selectedTemplate),
                            }),
                          });
                          const copyData = await copyRes.json();
                          if (!copyRes.ok) throw new Error(copyData.error || `Error ${copyRes.status}`);
                          const copy = copyData.data?.copy;
                          if (!copy) throw new Error("No se generó copy");

                          // Step 2: GENERATE_BACKGROUND
                          setAutoStep("🎨 Generando background...");
                          const bgRes = await fetch("/api/compose", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            body: JSON.stringify({
                              mode: "GENERATE_BACKGROUND",
                              prompt: copy.backgroundPrompt,
                              aspectRatio: "1:1",
                              primaryColor: copy.primaryColor,
                              backgroundColorHint: copy.backgroundColorHint,
                            }),
                          });
                          const bgData = await bgRes.json();
                          if (!bgRes.ok) throw new Error(bgData.error || `Error ${bgRes.status}`);
                          const bgDataUrl = bgData.data?.image;
                          if (!bgDataUrl) throw new Error("No se generó background");
                          const bgBlob = await fetch(bgDataUrl).then((r) => r.blob());
                          const bgFile = new File([bgBlob], "generated-bg.png", { type: "image/png" });

                          // Step 3: TEMPLATE_BETA
                          setAutoStep("🖼️ Componiendo template...");
                          const formData = new FormData();
                          formData.append("background", bgFile);
                          formData.append("config", JSON.stringify({
                            mode: "TEMPLATE_BETA",
                            outputFormat: "png",
                            quality: 95,
                            copy: {
                              cta: copy.title || undefined,
                              headline: copy.headline || undefined,
                              subheadline: copy.subheadline || undefined,
                              badge: copy.badge || undefined,
                              bullets: Array.isArray(copy.bullets) ? copy.bullets : undefined,
                            },
                            templateBetaOptions: {
                              templateId: selectedTemplate,
                              canvas: { width: 1080, height: 1080 },
                              includeLayoutSpec: true,
                            },
                          }));
                          const templateRes = await fetch("/api/compose", {
                            method: "POST",
                            headers: { Accept: "application/json" },
                            body: formData,
                          });
                          const templateData = await templateRes.json();
                          if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);

                          // Fill form fields with what was used
                          if (copy.title) setCta(copy.title);
                          if (copy.cta) setCta(copy.cta as string);
                          if (copy.headline) setHeadline(copy.headline);
                          if (copy.subheadline) setSubheadline(copy.subheadline);
                          if (copy.badge) setBadgeText(copy.badge);
                          if (Array.isArray(copy.bullets)) setBulletsText(copy.bullets.join("\n"));
                          if (copy.backgroundPrompt) setTemplateBgPrompt(copy.backgroundPrompt);
                          setTemplateBgColorHint(typeof copy.backgroundColorHint === "string" ? copy.backgroundColorHint : undefined);
                          setBackgroundFile(bgFile);
                          setBackgroundPreview(bgDataUrl);

                          // Set result
                          setResult(templateData);
                          if (templateData.data?.templateId) setResultTemplateId(templateData.data.templateId);
                          const templateResultImage = templateData.data?.image || templateData.data?.imageUrl;
                          if (templateResultImage) setResultImage(templateResultImage);

                          // Step 4: PRODUCT_IA — integrate product (only if uploaded and template supports it)
                          const productFileAuto = autoProductFile ?? step2ProductFile;
                          if (productFileAuto && TEMPLATE_COPY_ZONES[selectedTemplate] !== undefined && templateResultImage) {
                            setAutoStep("🛍️ Integrando producto...");
                            const composedBgRes = await fetch(templateResultImage);
                            const composedBgBlob = await composedBgRes.blob();
                            const composedBgFile = new File([composedBgBlob], "composed-bg.png", { type: "image/png" });

                            const productFormData = new FormData();
                            productFormData.append("background", composedBgFile);
                            productFormData.append("product", productFileAuto);
                            productFormData.append("config", JSON.stringify({
                              mode: "PRODUCT_IA",
                              outputFormat: "png",
                              quality: 95,
                              copy: {},
                              productIAOptions: {
                                prompt: (copy.productPrompt as string) ?? step2Prompt ?? "",
                                copyZone: TEMPLATE_COPY_ZONES[selectedTemplate],
                                includeLayoutSpec: false,
                                skipTextRender: true,
                              },
                            }));

                            const productRes = await fetch("/api/compose", {
                              method: "POST",
                              headers: { Accept: "application/json" },
                              body: productFormData,
                            });
                            const productData = await productRes.json();
                            if (!productRes.ok) throw new Error(productData.error || `Error ${productRes.status}`);

                            const finalImage = productData.data?.image || productData.data?.imageUrl;
                            if (finalImage) setResultImage(finalImage);
                            setCopySuccess("✅ Creativo final listo.");
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Error en secuencia automática");
                        } finally {
                          setAutoGenerating(false);
                          setAutoStep(null);
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
                    >
                      {autoGenerating ? "Ejecutando..." : "🚀 Generar y Componer"}
                    </button>

                    {/* ── Generar 5 variantes ── */}
                    <button
                      type="button"
                      disabled={variantsGenerating || copyGenerating || autoGenerating || !bizProduct}
                      onClick={async () => {
                        setVariantsGenerating(true);
                        setVariants([]);
                        setVariantsProgress("⚙️ Generando copy para 5 variantes...");
                        setError(null);
                        try {
                          // Step 1: GENERATE_COPY with numberOfVariants: 5
                          const copyRes = await fetch("/api/compose", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            body: JSON.stringify({
                              mode: "GENERATE_COPY",
                              product: bizProduct,
                              offer: bizOffer,
                              targetAudience: bizAudience,
                              problem: bizProblem,
                              tone: bizTone,
                              templateSchema: getTemplateSchema(selectedTemplate),
                              numberOfVariants: 5,
                            }),
                          });
                          const copyData = await copyRes.json();
                          if (!copyRes.ok) throw new Error(copyData.error || `Error ${copyRes.status}`);
                          const copies: Record<string, unknown>[] = copyData.data?.copy;
                          if (!Array.isArray(copies) || copies.length === 0) throw new Error("No se generaron variantes");

                          // Step 2: For each variant sequentially
                          const newVariants: Array<{ copy: Record<string, unknown>; backgroundImage: string; resultImage: string }> = [];
                          for (let i = 0; i < copies.length; i++) {
                            const copy = copies[i];
                            setVariantsProgress(`🎨 Generando variante ${i + 1} de ${copies.length}...`);

                            const bgRes = await fetch("/api/compose", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Accept: "application/json" },
                              body: JSON.stringify({
                                mode: "GENERATE_BACKGROUND",
                                prompt: copy.backgroundPrompt,
                                aspectRatio: "1:1",
                                primaryColor: copy.primaryColor,
                                backgroundColorHint: copy.backgroundColorHint,
                              }),
                            });
                            const bgData = await bgRes.json();
                            if (!bgRes.ok) throw new Error(bgData.error || `Error ${bgRes.status}`);
                            const bgDataUrl = bgData.data?.image as string;
                            if (!bgDataUrl) throw new Error(`No se generó background para variante ${i + 1}`);

                            const bgBlob = await fetch(bgDataUrl).then((r) => r.blob());
                            const bgFile = new File([bgBlob], `generated-bg-${i}.png`, { type: "image/png" });

                            const variantForm = new FormData();
                            variantForm.append("background", bgFile);
                            variantForm.append("config", JSON.stringify({
                              mode: "TEMPLATE_BETA",
                              outputFormat: "png",
                              quality: 95,
                              copy: {
                                cta: copy.title || undefined,
                                headline: copy.headline || undefined,
                                subheadline: copy.subheadline || undefined,
                                badge: copy.badge || undefined,
                                bullets: Array.isArray(copy.bullets) ? copy.bullets : undefined,
                              },
                              templateBetaOptions: {
                                templateId: selectedTemplate,
                                canvas: { width: 1080, height: 1080 },
                                includeLayoutSpec: false,
                              },
                            }));
                            const templateRes = await fetch("/api/compose", {
                              method: "POST",
                              headers: { Accept: "application/json" },
                              body: variantForm,
                            });
                            const templateData = await templateRes.json();
                            if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
                            const resultImg = (templateData.data?.image || templateData.data?.imageUrl) as string;
                            if (!resultImg) throw new Error(`No se generó imagen para variante ${i + 1}`);

                            // Step 3: PRODUCT_IA per variant (only if product uploaded and template supports it)
                            const productFileAuto = autoProductFile ?? step2ProductFile;
                            let finalVariantImg = resultImg;
                            if (productFileAuto && TEMPLATE_COPY_ZONES[selectedTemplate] !== undefined) {
                              setVariantsProgress(`🛍️ Integrando producto en variante ${i + 1}...`);
                              const variantBgBlob = await fetch(resultImg).then((r) => r.blob());
                              const variantBgFile = new File([variantBgBlob], `variant-composed-${i}.png`, { type: "image/png" });

                              const productVariantForm = new FormData();
                              productVariantForm.append("background", variantBgFile);
                              productVariantForm.append("product", productFileAuto);
                              productVariantForm.append("config", JSON.stringify({
                                mode: "PRODUCT_IA",
                                outputFormat: "png",
                                quality: 95,
                                copy: {},
                                productIAOptions: {
                                  prompt: (copy.productPrompt as string) ?? "",
                                  copyZone: TEMPLATE_COPY_ZONES[selectedTemplate],
                                  includeLayoutSpec: false,
                                  skipTextRender: true,
                                },
                              }));

                              const productVariantRes = await fetch("/api/compose", {
                                method: "POST",
                                headers: { Accept: "application/json" },
                                body: productVariantForm,
                              });
                              const productVariantData = await productVariantRes.json();
                              if (!productVariantRes.ok) throw new Error(productVariantData.error || `Error ${productVariantRes.status}`);
                              finalVariantImg = productVariantData.data?.image || productVariantData.data?.imageUrl || resultImg;
                            }

                            newVariants.push({ copy, backgroundImage: bgDataUrl, resultImage: finalVariantImg });
                            setVariants([...newVariants]);
                          }
                          setVariantsProgress(`✅ ${copies.length} variantes generadas`);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Error generando variantes");
                          setVariantsProgress("");
                        } finally {
                          setVariantsGenerating(false);
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-orange-700 hover:bg-orange-600 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
                    >
                      {variantsGenerating ? "Generando..." : "🚀 Generar 5 variantes"}
                    </button>
                  </div>

                  {autoStep && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      {autoStep}
                    </div>
                  )}

                  {variantsProgress && (
                    <div className="flex items-center gap-2 text-xs text-orange-400">
                      {variantsGenerating && (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      )}
                      {variantsProgress}
                    </div>
                  )}

                  {copySuccess && (
                    <p className="text-xs text-green-400">{copySuccess}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TEMPLATE_BETA: Paso 1 inputs ── */}
          {composeMode === "TEMPLATE_BETA" && (
            <div className="space-y-4 p-4 bg-teal-950/30 border border-teal-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-teal-400 font-semibold">
                  🖼️ TEMPLATE_BETA — Paso 1
                </span>
                <span className="text-xs text-neutral-500">
                  Background + copy → plantilla determinística
                </span>
              </div>

              {/* ── Template selector ── */}
              <div>
                <label className="block text-xs text-teal-300 mb-1">Plantilla</label>
                <div className="flex gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedTemplate === t.id ? "bg-teal-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-teal-300 mb-1">
                  Background *
                </label>
                {/* Tabs */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTemplateBgMode("upload")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${templateBgMode === "upload" ? "bg-teal-600 text-white" : "bg-neutral-800 text-neutral-400"}`}
                  >
                    📁 Subir imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateBgMode("generate")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${templateBgMode === "generate" ? "bg-teal-600 text-white" : "bg-neutral-800 text-neutral-400"}`}
                  >
                    ✨ Generar con IA
                  </button>
                </div>

                {templateBgMode === "upload" ? (
                  <>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBackgroundFile}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-teal-700 text-sm"
                    />
                    {backgroundPreview && (
                      <img
                        src={backgroundPreview}
                        alt="Background preview"
                        className="mt-2 w-full h-24 object-cover rounded-lg"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <textarea
                      value={templateBgPrompt}
                      onChange={(e) => setTemplateBgPrompt(e.target.value)}
                      placeholder="Describe la escena del background: colores, ambiente, texturas..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-teal-700 text-sm resize-none mb-2"
                    />
                    <button
                      type="button"
                      disabled={bgGenerating || !templateBgPrompt}
                      onClick={async () => {
                        setBgGenerating(true);
                        try {
                          const res = await fetch("/api/compose", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Accept: "application/json",
                            },
                            body: JSON.stringify({
                              mode: "GENERATE_BACKGROUND",
                              prompt: templateBgPrompt,
                              aspectRatio: "1:1",
                              backgroundColorHint: templateBgColorHint,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
                          const dataUrl = data.data?.image;
                          if (dataUrl) {
                            const blob = await fetch(dataUrl).then((r) => r.blob());
                            const file = new File([blob], "generated-bg.png", { type: "image/png" });
                            setBackgroundFile(file);
                            setBackgroundPreview(dataUrl);
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Error generando background");
                        } finally {
                          setBgGenerating(false);
                        }
                      }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                    >
                      {bgGenerating ? "Generando..." : "🎨 Generar background"}
                    </button>
                    {backgroundPreview && (
                      <img
                        src={backgroundPreview}
                        alt="Background preview"
                        className="mt-2 w-full h-24 object-cover rounded-lg"
                      />
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs text-teal-300 mb-1">
                  Title (línea superior — ingredientes o tagline)
                </label>
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Colágeno · Ácido Hialurónico · Extracto de Soja"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-teal-700 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-teal-300 mb-1">
                    Headline *
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="La piel habla cuando la cuidás"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-teal-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-teal-300 mb-1">
                    Subheadline
                  </label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Hidratación profunda y firmeza para cuello y brazos."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-teal-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-teal-300 mb-1">
                    Bullets (opcional, uno por línea)
                  </label>
                  <textarea
                    value={bulletsText}
                    onChange={(e) => setBulletsText(e.target.value)}
                    placeholder={
                      "Binoculares 20x50 con lente HD\nAlcance de hasta 1.000 metros\nVisión nocturna de alta definición"
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-teal-700 text-sm resize-none"
                  />
                </div>
              </div> 

              <div>
                <label className="block text-xs text-teal-300 mb-1">
                  Badge (oferta pill)
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="60% OFF en la segunda unidad"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-teal-700 text-sm"
                />
              </div>
            </div>
          )}

          {/* ── Modos con background + producto general ── */}
          {composeMode !== "PRODUCT_IA" && composeMode !== "TEMPLATE_BETA" && (
            <>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">
                  Background Source
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBackgroundMode("ai")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${backgroundMode === "ai" ? "bg-cyan-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                  >
                    🤖 Generate with AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundMode("file")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${backgroundMode === "file" ? "bg-cyan-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                  >
                    📁 Upload File
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {backgroundMode === "file" ? (
                    <>
                      <label className="block text-sm font-medium text-cyan-300 mb-2">
                        Background (JPG/PNG)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBackgroundFile}
                        className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-cyan-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
                      />
                      {backgroundPreview && (
                        <div className="mt-3 relative">
                          <img
                            src={backgroundPreview}
                            alt="Background preview"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <span className="absolute bottom-1 left-1 text-xs bg-black/70 px-2 py-0.5 rounded">
                            Background
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-cyan-300 mb-2">
                        Scene Preset
                      </label>
                      <select
                        value={scenePreset}
                        onChange={(e) => setScenePreset(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-cyan-700 mb-3"
                      >
                        {SCENE_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {scenePreset === "custom" ? (
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="Describe the scene for the background..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-cyan-700 resize-none"
                        />
                      ) : (
                        <p className="text-xs text-neutral-400 italic">
                          {getCurrentPrompt()}
                        </p>
                      )}
                      <div className="mt-3">
                        <label className="block text-sm text-neutral-400 mb-1">
                          Aspect Ratio
                        </label>
                        <div className="flex gap-2">
                          {["1:1", "4:5", "9:16", "16:9"].map((ar) => (
                            <button
                              key={ar}
                              type="button"
                              onClick={() => setAspectRatio(ar)}
                              className={`px-3 py-1 rounded text-sm ${aspectRatio === ar ? "bg-cyan-600 text-white" : "bg-neutral-800 text-neutral-400"}`}
                            >
                              {ar}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-300 mb-2">
                    Product PNG (con transparencia)
                  </label>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleProductFile}
                    className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-cyan-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
                  />
                  {productPreview && (
                    <div className="mt-3 relative">
                      <img
                        src={productPreview}
                        alt="Product preview"
                        className="w-full h-32 object-contain bg-neutral-800 rounded-lg p-2"
                      />
                      <span className="absolute bottom-1 left-1 text-xs bg-black/70 px-2 py-0.5 rounded">
                        Product
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── STANDARD options ── */}
          {composeMode === "STANDARD" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">
                  Anchor
                </label>
                <select
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-cyan-700 focus:border-cyan-500 focus:outline-none"
                >
                  {ANCHORS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-cyan-300 mb-2">
                  Scale: {scale.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-3 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>0.2</span>
                  <span>0.7</span>
                  <span>1.5</span>
                </div>
              </div>
            </div>
          )}

          {/* ── AUTO_LAYOUT options ── */}
          {composeMode === "AUTO_LAYOUT" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Layout
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {LAYOUT_PRESETS.map((lp) => (
                    <button
                      key={lp.id}
                      type="button"
                      onClick={() => setLayoutPreset(lp.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${layoutPreset === lp.id ? "bg-purple-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
                      title={lp.description}
                    >
                      {lp.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {
                    LAYOUT_PRESETS.find((p) => p.id === layoutPreset)
                      ?.description
                  }
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-purple-300 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Tu título principal..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-purple-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-300 mb-1">
                    Subheadline
                  </label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Subtítulo..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-purple-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-300 mb-1">
                    CTA
                  </label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Comprar ahora..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-purple-700 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={renderText}
                  onChange={(e) => setRenderText(e.target.checked)}
                  className="rounded bg-neutral-700 border-neutral-600"
                />
                Renderizar texto en la imagen final
              </label>
            </div>
          )}

          {/* ── SMART_USAGE_V1 options ── */}
          {composeMode === "SMART_USAGE_V1" && (
            <div className="space-y-4 p-4 bg-blue-950/30 border border-blue-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-400 font-semibold">
                  ✨ Smart Usage V1
                </span>
                <span className="text-xs text-neutral-500">
                  Pipeline automático con QA
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-blue-300 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    value={smartProductName}
                    onChange={(e) => setSmartProductName(e.target.value)}
                    placeholder="Crema Hidratante XYZ"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-blue-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-300 mb-1">
                    Descripción del Producto
                  </label>
                  <input
                    type="text"
                    value={smartProductDesc}
                    onChange={(e) => setSmartProductDesc(e.target.value)}
                    placeholder="Crema facial con ácido hialurónico"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-blue-700 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-blue-300 mb-1">
                    Headline (opcional)
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Tu título principal..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-blue-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-300 mb-1">
                    Subheadline
                  </label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Subtítulo..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-blue-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-300 mb-1">
                    CTA
                  </label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Comprar ahora..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-blue-700 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-blue-300 mb-1">
                    QA Threshold
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.05"
                      value={qaThreshold}
                      onChange={(e) => setQaThreshold(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-blue-400 w-12">
                      {(qaThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableRepair}
                      onChange={(e) => setEnableRepair(e.target.checked)}
                      className="rounded bg-neutral-700 border-neutral-600"
                    />
                    Auto-repair si QA &lt; threshold
                  </label>
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                El pipeline infiere el uso del producto, analiza anclas de
                escena, calcula placement matemático y aplica QA scoring
                heurístico.
              </p>
            </div>
          )}

          {/* ── PRESET options ── */}
          {composeMode === "PRESET" && (
            <div className="space-y-4 p-4 bg-amber-950/30 border border-amber-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-400 font-semibold">
                  📐 PRESET Mode
                </span>
                <span className="text-xs text-neutral-500">
                  Template sin IA
                </span>
              </div>
              <div>
                <label className="block text-xs text-amber-300 mb-1">
                  Template
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-amber-700 text-sm"
                >
                  <option value="HERO_LEFT_COPY_RIGHT_BADGE_V1">
                    Hero Left + Copy Right + Badge
                  </option>
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  Producto a la izquierda, copy a la derecha, badge centrado
                  abajo
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-amber-300 mb-1">
                    Headline *
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Tu título principal..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-amber-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-300 mb-1">
                    Subheadline
                  </label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Subtítulo..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-amber-700 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-amber-300 mb-1">
                    CTA (opcional)
                  </label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Comprar ahora..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-amber-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-300 mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="NUEVO • 20% OFF"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-amber-700 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                Sin IA: el layout es 100% determinístico. Ideal para
                consistencia en campañas publicitarias.
              </p>
            </div>
          )}

          {/* ── AI Mode Info (solo para modos con background AI) ── */}
          {backgroundMode === "ai" &&
            composeMode !== "PRODUCT_IA" &&
            composeMode !== "TEMPLATE_BETA" && (
              <div className="px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-sm">
                <p className="text-amber-300">
                  ⚡ Gemini generará el background basado en el preset
                  seleccionado
                </p>
              </div>
            )}

          {/* ── Actions ── */}
          <div className="flex gap-4">
            <button
              onClick={handleCompose}
              disabled={
                loading ||
                variantsGenerating ||
                (composeMode === "PRODUCT_IA"
                  ? !productIABackgroundFile || !productIAProductFile
                  : composeMode === "TEMPLATE_BETA"
                    ? !backgroundFile
                    : !productFile ||
                      (backgroundMode === "file" && !backgroundFile) ||
                      (backgroundMode === "ai" && !getCurrentPrompt()))
              }
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Composing…
                </>
              ) : (
                <>🎨 Compose</>
              )}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* ── Result ── */}
          {resultImage && (
            <div className="space-y-4">
              <h4 className="font-semibold text-cyan-300">
                {composeMode === "TEMPLATE_BETA"
                  ? "Resultado — Paso 1"
                  : "Result"}
              </h4>
              <div className="bg-neutral-900 rounded-lg p-4">
                <img
                  src={resultImage}
                  alt="Composed result"
                  className="max-w-full max-h-125 object-contain mx-auto rounded-lg"
                />
              </div>

              <a
                href={resultImage}
                download="composed-image.png"
                className="inline-block px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
              >
                ⬇️ Download Image
              </a>

              {/* ── TEMPLATE_BETA Paso 2 ── */}
              {composeMode === "TEMPLATE_BETA" && TEMPLATE_COPY_ZONES[selectedTemplate] !== undefined && (
                <div className="space-y-4 p-4 bg-purple-950/30 border border-purple-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-semibold">
                      🧬 Paso 2 — Agregar producto con IA
                    </span>
                    <span className="text-xs text-neutral-500">opcional</span>
                  </div>

                  {resultTemplateId && (
                    <p className="text-xs text-neutral-500">
                      Template:{" "}
                      <span className="text-teal-400">{resultTemplateId}</span>{" "}
                      — el producto se ubicará a la{" "}
                      <span className="text-purple-400">
                        {TEMPLATE_COPY_ZONES[resultTemplateId] === "right"
                          ? "izquierda"
                          : "derecha"}
                      </span>{" "}
                      (zona opuesta al copy)
                    </p>
                  )}

                  <div>
                    <label className="block text-xs text-purple-300 mb-1">
                      Producto PNG (transparente) *
                    </label>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleStep2ProductFile}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-purple-700 text-sm"
                    />
                    {step2ProductPreview && (
                      <img
                        src={step2ProductPreview}
                        alt="Producto"
                        className="mt-2 w-full h-24 object-contain bg-neutral-800 rounded-lg p-2"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-purple-300 mb-1">
                      Prompt (opcional)
                    </label>
                    <input
                      type="text"
                      value={step2Prompt}
                      onChange={(e) => setStep2Prompt(e.target.value)}
                      placeholder="una mano sosteniendo el producto desde abajo con firmeza..."
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-purple-700 text-sm"
                    />
                  </div>

                  <button
                    onClick={handleStep2Compose}
                    disabled={!step2ProductFile || step2Loading}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    {step2Loading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        Procesando con IA...
                      </>
                    ) : (
                      <>🧬 Agregar producto con IA</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Variants Grid ── */}
          {variants.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-orange-300">
                🚀 Variantes generadas ({variants.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {variants.map((variant, i) => (
                  <div key={i} className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700">
                    <img
                      src={variant.resultImage}
                      alt={`Variante ${i + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-orange-300 font-medium">{VARIANT_ANGLE_NAMES[i]}</p>
                      <div className="flex gap-2">
                        <a
                          href={variant.resultImage}
                          download={`variante-${i + 1}.png`}
                          className="flex-1 text-center px-2 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs font-medium transition-colors"
                        >
                          ⬇️ Descargar
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setResultImage(variant.resultImage);
                            if (variant.copy.title) setCta(variant.copy.title as string);
                            if (variant.copy.headline) setHeadline(variant.copy.headline as string);
                            if (variant.copy.subheadline) setSubheadline(variant.copy.subheadline as string);
                            if (variant.copy.badge) setBadgeText(variant.copy.badge as string);
                            if (Array.isArray(variant.copy.bullets)) setBulletsText((variant.copy.bullets as string[]).join("\n"));
                            if (variant.copy.backgroundPrompt) setTemplateBgPrompt(variant.copy.backgroundPrompt as string);
                            setTemplateBgColorHint(typeof variant.copy.backgroundColorHint === "string" ? variant.copy.backgroundColorHint : undefined);
                            setBackgroundPreview(variant.backgroundImage);
                            fetch(variant.backgroundImage)
                              .then((r) => r.blob())
                              .then((blob) => setBackgroundFile(new File([blob], "variant-bg.png", { type: "image/png" })));
                          }}
                          className="flex-1 px-2 py-1.5 bg-teal-700 hover:bg-teal-600 rounded text-xs font-medium transition-colors"
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Debug Info ── */}
          {result &&
            (result.data?.timings ||
              result.data?.debug ||
              result.data?.layoutSpec) && (
              <details className="bg-neutral-900 rounded-lg">
                <summary className="px-4 py-3 cursor-pointer text-sm text-neutral-400 hover:text-white">
                  📊 Debug Info{" "}
                  {result.data?.layoutSpec && (
                    <span className="text-purple-400 ml-2">
                      (includes LayoutSpec)
                    </span>
                  )}
                </summary>
                <div className="px-4 pb-4 space-y-4">
                  {result.data?.layoutSpec && (
                    <div>
                      <h5 className="text-xs font-semibold text-purple-300 mb-2">
                        LayoutSpec (confidence:{" "}
                        {result.data.layoutSpec.confidence?.toFixed(2)})
                      </h5>
                      {result.data.fallbackLayoutUsed && (
                        <p className="text-xs text-amber-400 mb-2">
                          ⚠️ Fallback layout used
                        </p>
                      )}
                      <pre className="text-xs text-purple-200 overflow-auto max-h-48 bg-purple-950/30 p-2 rounded">
                        {JSON.stringify(result.data.layoutSpec, null, 2)}
                      </pre>
                    </div>
                  )}
                  <pre className="text-xs text-green-400 overflow-auto max-h-64">
                    {JSON.stringify(
                      {
                        requestId: result.requestId,
                        templateId: result.data?.templateId,
                        timings: result.data?.timings,
                        cost: result.data?.cost,
                        debug: result.data?.debug,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </details>
            )}
        </div>
      )}
    </div>
  );
}
