"use client";

import { useMemo, useState } from "react";

type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

type Item = {
  angle: string;
  headline: string;
  visualPrompt: string;
  dataUrl: string;
  mimeType: string;
  model: string;
};

export default function MetaImagesWithImagesPage() {
  const [product, setProduct] = useState("Botella térmica premium");
  const [offer, setOffer] = useState("50% OFF + envío gratis");
  const [audience, setAudience] = useState(
    "Personas activas que trabajan y entrenan fuera de casa"
  );
  const [brandStyle, setBrandStyle] = useState("minimalista, premium, negro y gris");
  const [basePrompt, setBasePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [variants, setVariants] = useState(12);

  const [ownerFile, setOwnerFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerPreview = useMemo(
    () => (ownerFile ? URL.createObjectURL(ownerFile) : null),
    [ownerFile]
  );
  const productPreview = useMemo(
    () => (productFile ? URL.createObjectURL(productFile) : null),
    [productFile]
  );

  const canGenerate = !loading && product.trim() && offer.trim() && audience.trim();

  async function generateBatch() {
    setLoading(true);
    setError(null);
    setItems([]);

    try {
      const payload = {
        product,
        offer,
        audience,
        brandStyle,
        basePrompt: basePrompt.trim() || undefined,
        aspectRatio,
        variants,
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      if (ownerFile) fd.append("ownerImage", ownerFile);
      if (productFile) fd.append("productImage", productFile);

      const res = await fetch("/api/image/meta-batch-with-images", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "No se pudo generar el batch.");
        return;
      }

      setItems(data.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error de red");
    } finally {
      setLoading(false);
    }
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">
              Meta Batch (con referencias: dueño + producto)
            </h1>
            <p className="mt-1 text-neutral-400">
              Generá creativos que mantengan coherencia visual usando imágenes de referencia.
            </p>
          </div>
          <a
            href="/dashboard/meta-images"
            className="text-sm underline underline-offset-4 text-neutral-300 hover:text-white"
          >
            Volver a batch normal
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Controls */}
          <section className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
            <Field label="Producto" value={product} onChange={setProduct} />
            <Field label="Oferta" value={offer} onChange={setOffer} />
            <Field label="Audiencia" value={audience} onChange={setAudience} />
            <Field label="Estilo de marca" value={brandStyle} onChange={setBrandStyle} />

            <div>
              <label className="text-xs text-neutral-400">Contexto extra (opcional)</label>
              <textarea
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400">Formato</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                >
                  <option value="4:5">4:5 (Feed)</option>
                  <option value="9:16">9:16 (Stories/Reels)</option>
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400">Variantes</label>
                <input
                  type="number"
                  value={variants}
                  min={1}
                  max={30}
                  onChange={(e) => setVariants(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>
            </div>

            {/* Uploads */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="text-sm font-medium text-neutral-200">Imágenes de referencia</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <UploadCard
                  title="Dueño / representante"
                  subtitle="Para testimonial/UGC"
                  preview={ownerPreview}
                  onPick={setOwnerFile}
                />
                <UploadCard
                  title="Producto / oferta"
                  subtitle="Consistencia visual"
                  preview={productPreview}
                  onPick={setProductFile}
                />
              </div>
            </div>

            <button
              onClick={generateBatch}
              disabled={!canGenerate}
              className="w-full rounded-xl bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              type="button"
            >
              {loading ? "Generando..." : `Generar ${variants} creativos`}
            </button>

            {error && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="text-xs text-neutral-500">
              Tip: con foto del dueño podés obtener creativos estilo UGC. Con foto del producto, mantenés coherencia.
            </div>
          </section>

          {/* Results */}
          <section className="lg:col-span-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-neutral-200">Resultados</h2>
                <p className="text-xs text-neutral-500">
                  {items.length ? `${items.length} creativos generados` : "Aún no generaste nada"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.dataUrl} alt={it.angle} className="w-full h-auto" />
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>Ángulo</span>
                      <span className="font-medium text-neutral-200">{it.angle}</span>
                    </div>
                    <div className="text-sm font-semibold">{it.headline}</div>

                    <details>
                      <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-300">
                        Ver prompt base
                      </summary>
                      <pre className="mt-2 text-xs text-neutral-300 whitespace-pre-wrap">
                        {it.visualPrompt}
                      </pre>
                    </details>

                    <div className="flex gap-2 pt-1">
                      <button
                        className="flex-1 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800"
                        onClick={() => downloadDataUrl(it.dataUrl, `meta-${it.angle}-${idx + 1}.png`)}
                        type="button"
                      >
                        Descargar
                      </button>
                    </div>

                    <div className="text-[11px] text-neutral-500">Model: {it.model}</div>
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="mt-4 text-sm text-neutral-400">
                Generando… esto puede tardar según cuota y cantidad.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
      />
    </div>
  );
}

function UploadCard({
  title,
  subtitle,
  preview,
  onPick,
}: {
  title: string;
  subtitle: string;
  preview: string | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
      <div className="text-xs text-neutral-400">{subtitle}</div>
      <div className="text-sm font-medium text-neutral-200 mt-0.5">{title}</div>

      <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/50 overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={title} className="w-full h-24 object-cover" />
        ) : (
          <div className="h-24 flex items-center justify-center text-xs text-neutral-500">
            Sin imagen
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        className="mt-3 block w-full text-xs text-neutral-300 file:mr-3 file:rounded-lg file:border file:border-neutral-700 file:bg-neutral-900/40 file:px-3 file:py-1.5 file:text-xs file:text-neutral-200 hover:file:bg-neutral-800"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onPick(f);
        }}
      />
    </div>
  );
}
