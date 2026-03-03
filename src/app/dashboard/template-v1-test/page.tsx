"use client";

import { useState } from "react";

/**
 * Template V1 Test Page
 *
 * Simple test page for the /api/render/meta-template-v1 endpoint.
 * Allows manual input of all template parameters and displays the result.
 */

export default function TemplateV1TestPage() {
  // Form state
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [headline, setHeadline] = useState("El mate térmico que mantiene tu agua caliente 12 horas");
  const [subheadline, setSubheadline] = useState("Acero inoxidable premium con doble pared");
  const [cta, setCta] = useState("Comprar Ahora");

  // File uploads (converted to data URLs)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);
  const [renderMeta, setRenderMeta] = useState<{ sizeKB: number; renderTimeMs: number } | null>(null);

  // Convert file to data URL
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Render template
  async function handleRender() {
    setLoading(true);
    setError(null);
    setResultDataUrl(null);
    setRenderMeta(null);

    try {
      // Get background source
      let bgSrc = backgroundUrl.trim();
      if (backgroundFile) {
        bgSrc = await fileToDataUrl(backgroundFile);
      }
      if (!bgSrc) {
        throw new Error("Background is required");
      }

      // Get product source
      let productSrc = productUrl.trim();
      if (productFile) {
        productSrc = await fileToDataUrl(productFile);
      }
      if (!productSrc) {
        throw new Error("Product image is required");
      }

      // Get logo source (optional)
      let logoSrc: string | undefined;
      if (logoFile) {
        logoSrc = await fileToDataUrl(logoFile);
      } else if (logoUrl.trim()) {
        logoSrc = logoUrl.trim();
      }

      // Build request
      const body = {
        background: { src: bgSrc },
        product: { src: productSrc },
        logo: logoSrc ? { src: logoSrc } : undefined,
        headline: headline.trim(),
        subheadline: subheadline.trim() || undefined,
        cta: cta.trim(),
        returnBase64: true,
      };

      const res = await fetch("/api/render/meta-template-v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }

      setResultDataUrl(data.dataUrl);
      setRenderMeta(data.meta);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Download result
  function handleDownload() {
    if (!resultDataUrl) return;

    const link = document.createElement("a");
    link.href = resultDataUrl;
    link.download = `template-v1-${Date.now()}.png`;
    link.click();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Template V1 Test</h1>
        <p className="text-neutral-400 mb-8">
          Test the /api/render/meta-template-v1 endpoint with custom inputs
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Images */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
              <h2 className="text-lg font-semibold">Images</h2>

              {/* Background */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Background (URL or upload)
                </label>
                <input
                  type="text"
                  value={backgroundUrl}
                  onChange={(e) => setBackgroundUrl(e.target.value)}
                  placeholder="https://example.com/bg.jpg"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm mb-2"
                  disabled={!!backgroundFile}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBackgroundFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                {backgroundFile && (
                  <button
                    onClick={() => setBackgroundFile(null)}
                    className="ml-2 text-xs text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Product */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Product (PNG with transparency)
                </label>
                <input
                  type="text"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://example.com/product.png"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm mb-2"
                  disabled={!!productFile}
                />
                <input
                  type="file"
                  accept="image/png"
                  onChange={(e) => setProductFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                {productFile && (
                  <button
                    onClick={() => setProductFile(null)}
                    className="ml-2 text-xs text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Logo (optional)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm mb-2"
                  disabled={!!logoFile}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                {logoFile && (
                  <button
                    onClick={() => setLogoFile(null)}
                    className="ml-2 text-xs text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Text */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
              <h2 className="text-lg font-semibold">Text Content</h2>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Headline (5-80 chars)
                </label>
                <textarea
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  rows={2}
                  maxLength={80}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm resize-none"
                />
                <span className="text-xs text-neutral-500">{headline.length}/80</span>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Subheadline (optional, max 60 chars)
                </label>
                <textarea
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  rows={2}
                  maxLength={60}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm resize-none"
                />
                <span className="text-xs text-neutral-500">{subheadline.length}/60</span>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  CTA (2-24 chars)
                </label>
                <input
                  type="text"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  maxLength={24}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
                />
                <span className="text-xs text-neutral-500">{cta.length}/24</span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleRender}
              disabled={loading}
              className="w-full rounded-xl bg-white text-black font-semibold py-3 text-lg transition hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Rendering…" : "Render Template V1"}
            </button>

            {error && (
              <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-4 text-red-200">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <h2 className="text-lg font-semibold mb-4">Preview (1080×1350)</h2>

              {!resultDataUrl && !loading && (
                <div className="aspect-4/5 bg-neutral-800/50 rounded-lg flex items-center justify-center text-neutral-500">
                  Preview will appear here
                </div>
              )}

              {loading && (
                <div className="aspect-4/5 bg-neutral-800/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                    <p className="text-sm text-neutral-400">Rendering…</p>
                  </div>
                </div>
              )}

              {resultDataUrl && (
                <div className="space-y-4">
                  <img
                    src={resultDataUrl}
                    alt="Rendered template"
                    className="w-full rounded-lg shadow-2xl"
                  />

                  {renderMeta && (
                    <div className="flex gap-4 text-sm text-neutral-400">
                      <span>Size: {renderMeta.sizeKB} KB</span>
                      <span>Render time: {renderMeta.renderTimeMs} ms</span>
                    </div>
                  )}

                  <button
                    onClick={handleDownload}
                    className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium transition hover:bg-neutral-700"
                  >
                    Download PNG
                  </button>
                </div>
              )}
            </div>

            {/* curl example */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <h2 className="text-lg font-semibold mb-3">curl Example</h2>
              <pre className="text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap bg-neutral-800 p-3 rounded-lg">
{`curl -X POST http://localhost:3000/api/render/meta-template-v1 \\
  -H "Content-Type: application/json" \\
  -d '{
    "background": { "src": "https://example.com/bg.jpg" },
    "product": { "src": "https://example.com/product.png" },
    "headline": "Your headline here",
    "cta": "Buy Now",
    "returnBase64": true
  }' | jq '.dataUrl'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
