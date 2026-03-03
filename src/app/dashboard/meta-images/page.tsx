"use client";

import { useMemo, useState } from "react";

/* =========================
   Tipos locales (UI)
========================= */

type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

type Item = {
  angle: string;
  headline: string;
  visualPrompt: string;
  dataUrl: string;
  mimeType: string;
  model: string;
};

/* =========================
   Orden canónico de ángulos
========================= */

const META_ANGLE_ORDER = [
  "pain",
  "desire",
  "before_after",
  "social_proof",
  "authority",
  "scarcity",
  "urgency",
  "deal_savings",
  "simplicity",
  "speed",
  "guarantee",
  "objection",
  "lifestyle",
  "ugc",
  "comparison",
  "feature_focus",
  "benefit_focus",
  "fear_of_missing_out",
  "status_identity",
  "seasonal",
  "gift",
  "problem_solution",
  "myth_busting",
  "results",
  "bundle",
  "premium",
  "eco",
  "comfort",
  "performance",
  "minimal",
];

/* =========================
   Página
========================= */

export default function MetaImagesPage() {
  // Inputs
  const [product, setProduct] = useState("Botella térmica premium");
  const [offer, setOffer] = useState("50% OFF + envío gratis");
  const [audience, setAudience] = useState(
    "Personas activas que trabajan y entrenan fuera de casa"
  );
  const [brandStyle, setBrandStyle] = useState(
    "minimalista, premium, negro y gris"
  );
  const [basePrompt, setBasePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [variants, setVariants] = useState(30);

  // Estado
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =========================
     Ordenar resultados
  ========================= */

  const angleOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    META_ANGLE_ORDER.forEach((a, i) => map.set(a, i));
    return map;
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const ai = angleOrderMap.get(a.angle) ?? 999;
      const bi = angleOrderMap.get(b.angle) ?? 999;
      return ai - bi;
    });
  }, [items, angleOrderMap]);

  const canGenerate =
    !loading &&
    product.trim().length > 1 &&
    offer.trim().length > 1 &&
    audience.trim().length > 1;

  /* =========================
     Actions
  ========================= */

  async function generateBatch() {
    setLoading(true);
    setError(null);
    setItems([]);

    try {
      const res = await fetch("/api/image/meta-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          offer,
          audience,
          brandStyle,
          basePrompt: basePrompt.trim() || undefined,
          aspectRatio,
          variants,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Error al generar creatividades");
        return;
      }

      setItems(data.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error de red");
    } finally {
      setLoading(false);
    }
  }

  function downloadImage(dataUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  /* =========================
     Render
  ========================= */

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">
              Meta Ads — Ángulos de Venta
            </h1>
            <p className="mt-1 text-neutral-400">
              Generá una creatividad por cada ángulo psicológico de venta.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm underline underline-offset-4 text-neutral-300 hover:text-white"
          >
            Volver
          </a>
        </div>

        {/* Layout */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Panel izquierdo */}
          <section className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="space-y-3">
              <Input label="Producto" value={product} onChange={setProduct} />
              <Input label="Oferta" value={offer} onChange={setOffer} />
              <Input label="Audiencia" value={audience} onChange={setAudience} />
              <Input
                label="Estilo de marca"
                value={brandStyle}
                onChange={setBrandStyle}
              />

              <Textarea
                label="Contexto extra (opcional)"
                value={basePrompt}
                onChange={setBasePrompt}
                placeholder="Colores, mood, constraints, diferenciadores…"
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Formato"
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  options={[
                    { value: "4:5", label: "4:5 (Feed)" },
                    { value: "9:16", label: "9:16 (Stories/Reels)" },
                    { value: "1:1", label: "1:1" },
                    { value: "16:9", label: "16:9" },
                  ]}
                />

                <Input
                  label="Variantes"
                  type="number"
                  value={variants}
                  onChange={(v) => setVariants(Number(v))}
                />
              </div>

              <button
                onClick={generateBatch}
                disabled={!canGenerate}
                className="w-full rounded-xl bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading
                  ? "Generando ángulos..."
                  : `Generar ${variants} creatividades`}
              </button>

              {error && (
                <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="text-xs text-neutral-500">
                Recomendación: iterá con 8–12 ángulos y luego generá los 30.
              </div>
            </div>
          </section>

          {/* Resultados */}
          <section className="lg:col-span-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h2 className="text-sm font-medium text-neutral-200">
              Resultados ({sortedItems.length})
            </h2>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedItems.map((it, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.dataUrl} alt={it.angle} />

                  <div className="p-3 space-y-2">
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>Ángulo</span>
                      <span className="font-medium text-neutral-200">
                        {it.angle}
                      </span>
                    </div>

                    <div className="text-sm font-semibold">
                      {it.headline}
                    </div>

                    <details>
                      <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-300">
                        Ver prompt
                      </summary>
                      <pre className="mt-2 text-xs whitespace-pre-wrap text-neutral-300">
                        {it.visualPrompt}
                      </pre>
                    </details>

                    <div className="flex gap-2 pt-1">
                      <button
                        className="flex-1 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
                        onClick={() =>
                          navigator.clipboard.writeText(it.visualPrompt)
                        }
                      >
                        Copiar prompt
                      </button>
                      <button
                        className="flex-1 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
                        onClick={() =>
                          downloadImage(it.dataUrl, `meta-${it.angle}.png`)
                        }
                      >
                        Descargar
                      </button>
                    </div>

                    <div className="text-[11px] text-neutral-500">
                      Model: {it.model}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="mt-4 text-sm text-neutral-400">
                Generando creatividades… esto puede tardar unos minutos.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/* =========================
   Componentes UI simples
========================= */

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-neutral-400">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="mt-1 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: any) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs text-neutral-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
