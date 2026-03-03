"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DevComposePanel from "./DevComposePanel";

/**
 * Meta One-Click Test Page (Template Engine V1)
 *
 * Simple form to test /api/meta/v1/generate
 * User uploads product PNG + enters name → generates creatives
 *
 * Dev mode (?dev=1):
 * - Shows template/style selectors
 * - Shows proof input fields
 */

const TEMPLATE_IDS = [
  "T_SPLIT_EDITORIAL_V1",
  "T_BADGE_OFFER_V1",
  "T_BEFORE_AFTER_V1",
  "T_QUOTE_TESTIMONIAL_V1",
  "T_LIFESTYLE_HERO_V1",
  "T_NARRATIVE_HERO_V1",
] as const;

const CREATIVE_MODES = [
  "auto",
  "clean",
  "lifestyle",
  "narrative",
] as const;

const SHADOW_MODES = [
  "off",
  "ai",
] as const;

const STYLE_PACK_IDS = [
  "EDITORIAL_SOFT",
  "CLINICAL_CLEAN",
  "BOLD_PROMO",
] as const;

interface Creative {
  templateId: string;
  headline: string;
  subheadline: string;
  cta: string;
  pngBase64: string;
}

interface GenerateResponse {
  ok: true;
  creatives: Creative[];
  meta: {
    count: number;
    totalTimeMs: number;
    templateId: string;
    stylePackId: string;
    stages: {
      coreTimeMs: number;
      copyTimeMs: number;
      backgroundTimeMs: number;
      renderTimeMs: number;
    };
  };
}

export default function MetaOneclickPage() {
  const searchParams = useSearchParams();
  const isDevMode = searchParams.get("dev") === "1";

  /* ── Form State ── */
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImageSrc, setProductImageSrc] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [count, setCount] = useState(6);

  /* ── Offer State ── */
  const [offerActive, setOfferActive] = useState(false);
  const [offerType, setOfferType] = useState<"PERCENT" | "BUNDLE" | "FREE_SHIP">("PERCENT");
  const [offerValue, setOfferValue] = useState("");
  const [offerLabel, setOfferLabel] = useState("");

  /* ── Proof State ── */
  const [proofType, setProofType] = useState<"NONE" | "BEFORE_AFTER" | "QUOTE">("NONE");
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [proofCaption, setProofCaption] = useState("");

  /* ── Dev Overrides ── */
  const [forceTemplate, setForceTemplate] = useState<string>("");
  const [forceStyle, setForceStyle] = useState<string>("");
  const [creativeMode, setCreativeMode] = useState<string>("auto");
  const [shadowMode, setShadowMode] = useState<string>("off");

  /* ── Result State ── */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  /* ── File handlers ── */
  const handleProductFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setProductImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleLogoFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setLogoSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!productName.trim()) {
      setError("Ingresa el nombre del producto");
      return;
    }
    if (!productImageSrc) {
      setError("Sube la imagen del producto");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build request body
      const body: Record<string, any> = {
        product_name: productName,
        product_description: productDescription || undefined,
        product_image_src: productImageSrc,
        logo_src: logoSrc || undefined,
        count,
      };

      // Add offer if active
      if (offerActive) {
        body.offer = {
          active: true,
          type: offerType,
          value: offerValue || undefined,
          label: offerLabel || undefined,
        };
      }

      // Add proof if selected
      if (proofType === "BEFORE_AFTER") {
        body.proof = {
          type: "BEFORE_AFTER",
          day1Label: "Día 1",
          day30Label: "Día 30",
          caption: proofCaption || undefined,
        };
      } else if (proofType === "QUOTE") {
        body.proof = {
          type: "QUOTE",
          quote: quote || "Me encantó este producto",
          author: author || undefined,
        };
      }

      // Dev mode overrides
      if (isDevMode) {
        if (forceTemplate) body.force_template = forceTemplate;
        if (forceStyle) body.force_style = forceStyle;
        if (creativeMode && creativeMode !== "auto") body.creative_mode = creativeMode;
        if (shadowMode && shadowMode !== "off") body.shadow_mode = shadowMode;
      } else {
        // Siempre enviar creative_mode (default auto)
        body.creative_mode = "auto";
      }

      const res = await fetch("/api/meta/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error en el servidor");
      }

      setResult(data as GenerateResponse);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Meta Template Engine V1</h1>
            {isDevMode && (
              <span className="px-3 py-1 bg-yellow-600 text-sm font-semibold rounded">
                DEV MODE
              </span>
            )}
          </div>
          <p className="text-neutral-400 mt-2">
            Sube una imagen de producto y genera creativos automáticamente
          </p>
          {!isDevMode && (
            <p className="text-neutral-500 text-sm mt-1">
              <a href="?dev=1" className="underline hover:text-white">
                Activar modo desarrollador
              </a>
            </p>
          )}
        </header>

        {/* Form */}
        <section className="bg-neutral-900 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre del Producto *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej: Crema Hidratante Facial"
                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Count */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Cantidad de Creativos
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-blue-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} creativo{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Ej: Crema facial con ácido hialurónico para hidratación profunda"
                rows={2}
                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Product Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Imagen del Producto (PNG) *
              </label>
              <input
                type="file"
                accept="image/png,image/webp"
                onChange={handleProductFile}
                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
              />
              {productImageSrc && (
                <div className="mt-4">
                  <img
                    src={productImageSrc}
                    alt="Product preview"
                    className="w-32 h-32 object-contain bg-neutral-800 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Logo (opcional, PNG)
              </label>
              <input
                type="file"
                accept="image/png,image/webp"
                onChange={handleLogoFile}
                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-neutral-600 file:text-white file:cursor-pointer"
              />
              {logoSrc && (
                <div className="mt-4">
                  <img
                    src={logoSrc}
                    alt="Logo preview"
                    className="w-24 h-24 object-contain bg-neutral-800 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Offer Section */}
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="offerActive"
                checked={offerActive}
                onChange={(e) => setOfferActive(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <label htmlFor="offerActive" className="font-medium">
                Tiene oferta activa
              </label>
            </div>

            {offerActive && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Tipo</label>
                  <select
                    value={offerType}
                    onChange={(e) => setOfferType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700"
                  >
                    <option value="PERCENT">Porcentaje</option>
                    <option value="BUNDLE">Bundle (3x2)</option>
                    <option value="FREE_SHIP">Envío gratis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Valor</label>
                  <input
                    type="text"
                    value={offerValue}
                    onChange={(e) => setOfferValue(e.target.value)}
                    placeholder="50%"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Label (badge)</label>
                  <input
                    type="text"
                    value={offerLabel}
                    onChange={(e) => setOfferLabel(e.target.value)}
                    placeholder="50% OFF"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dev Mode: Proof + Overrides */}
          {isDevMode && (
            <>
              {/* Proof Section */}
              <div className="mt-6 pt-6 border-t border-neutral-800">
                <label className="block text-sm font-medium mb-2">
                  Tipo de Prueba Social
                </label>
                <select
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value as any)}
                  className="w-full md:w-64 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 mb-4"
                >
                  <option value="NONE">Sin prueba</option>
                  <option value="BEFORE_AFTER">Before/After (Día 1/Día 30)</option>
                  <option value="QUOTE">Testimonio/Quote</option>
                </select>

                {proofType === "QUOTE" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Quote</label>
                      <input
                        type="text"
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        placeholder="Me encantó este producto"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Autor</label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="María G."
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700"
                      />
                    </div>
                  </div>
                )}

                {proofType === "BEFORE_AFTER" && (
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Caption</label>
                    <input
                      type="text"
                      value={proofCaption}
                      onChange={(e) => setProofCaption(e.target.value)}
                      placeholder="Resultados visibles en 30 días"
                      className="w-full md:w-96 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700"
                    />
                  </div>
                )}
              </div>

              {/* Force Overrides */}
              <div className="mt-6 pt-6 border-t border-yellow-800/50 bg-yellow-900/10 -mx-6 px-6 pb-6 rounded-b-xl">
                <p className="text-yellow-500 text-sm font-medium mb-4">
                  🔧 Dev Overrides (forzar template/style/mode)
                </p>

                {/* Creative Mode Selector */}
                <div className="mb-4">
                  <label className="block text-sm text-neutral-400 mb-1">Creative Mode</label>
                  <div className="flex gap-2">
                    {CREATIVE_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCreativeMode(m)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          creativeMode === m
                            ? m === "lifestyle"
                              ? "bg-green-700 border-green-500 text-white"
                              : m === "narrative"
                              ? "bg-purple-700 border-purple-500 text-white"
                              : m === "clean"
                              ? "bg-blue-700 border-blue-500 text-white"
                              : "bg-neutral-700 border-neutral-500 text-white"
                            : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"
                        }`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    auto=decide by product | clean=solid bg | lifestyle=scene | narrative=story
                  </p>
                </div>

                {/* Shadow Mode Selector */}
                <div className="mb-4">
                  <label className="block text-sm text-neutral-400 mb-1">Shadow Mode</label>
                  <div className="flex gap-2">
                    {SHADOW_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setShadowMode(m)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          shadowMode === m
                            ? m === "ai"
                              ? "bg-amber-700 border-amber-500 text-white"
                              : "bg-neutral-700 border-neutral-500 text-white"
                            : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"
                        }`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    off=no sombra IA | ai=genera sombra con Gemini (experimental)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Force Template</label>
                    <select
                      value={forceTemplate}
                      onChange={(e) => setForceTemplate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-yellow-700"
                    >
                      <option value="">Auto (rules-first)</option>
                      {TEMPLATE_IDS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Force Style Pack</label>
                    <select
                      value={forceStyle}
                      onChange={(e) => setForceStyle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-yellow-700"
                    >
                      <option value="">Auto (rules-first)</option>
                      {STYLE_PACK_IDS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Product Compose Test Panel */}
              <div className="mt-6 pt-6 border-t border-cyan-800/50">
                <DevComposePanel />
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto px-8 py-4 bg-linear-to-r from-blue-600 to-purple-600 rounded-lg font-semibold text-lg hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
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
                  Generando creativos…
                </span>
              ) : (
                `🚀 Generar ${count} Creativo${count > 1 ? "s" : ""}`
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}
        </section>

        {/* Results */}
        {result && (
          <section>
            {/* Stats */}
            <div className="bg-neutral-900 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap gap-6 text-sm mb-3">
                <div>
                  <span className="text-neutral-400">Total:</span>{" "}
                  <span className="font-semibold">
                    {(result.meta.totalTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Core:</span>{" "}
                  <span>{(result.meta.stages.coreTimeMs / 1000).toFixed(1)}s</span>
                </div>
                <div>
                  <span className="text-neutral-400">Copy:</span>{" "}
                  <span>{(result.meta.stages.copyTimeMs / 1000).toFixed(1)}s</span>
                </div>
                <div>
                  <span className="text-neutral-400">Background:</span>{" "}
                  <span>
                    {(result.meta.stages.backgroundTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Render:</span>{" "}
                  <span>
                    {(result.meta.stages.renderTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="px-3 py-1 bg-blue-900/50 rounded">
                  Template: <span className="font-mono">{result.meta.templateId}</span>
                </div>
                <div className="px-3 py-1 bg-purple-900/50 rounded">
                  Style: <span className="font-mono">{result.meta.stylePackId}</span>
                </div>
              </div>
            </div>

            {/* Creatives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.creatives.map((creative, i) => (
                <div
                  key={i}
                  className="bg-neutral-900 rounded-xl overflow-hidden"
                >
                  {/* Image */}
                  <div className="aspect-4/5 relative">
                    <img
                      src={creative.pngBase64}
                      alt={`Creative ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="text-xs text-neutral-500 mb-2">
                      {creative.templateId}
                    </div>
                    <div className="text-sm font-medium mb-1">
                      {creative.headline}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {creative.subheadline}
                    </div>
                  </div>

                  {/* Download */}
                  <div className="px-4 pb-4">
                    <a
                      href={creative.pngBase64}
                      download={`creative-${i + 1}.png`}
                      className="block w-full py-2 text-center text-sm bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      ⬇️ Descargar PNG
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
