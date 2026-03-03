"use client";

import { useMemo, useState } from "react";

type Step = 1 | 2 | 3 | 4;

type IngestOk = { ok: true; profile: any };
type IngestErr = { ok: false; error: string };

type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

type CopyItem = {
  angleId: string;
  line1: string; // Hook
  line2: string; // Promesa/beneficio
  line3: string; // Oferta/CTA
  disclaimer?: string; // opcional
};

type ImageItem = {
  angle: string; // id
  headline: string;
  dataUrl: string;
  mimeType: string;
  model: string;
  error?: string;
};

type Creative = {
  angleId: string;
  angleLabel: string;
  image?: ImageItem;
  copy: CopyItem;
};

type FinalPng = { angleId: string; dataUrl: string; templateId: string };

export default function MetaStudioPage() {
  const [step, setStep] = useState<Step>(1);

  // STEP 1 inputs
  const [businessText, setBusinessText] = useState(
    `Negocio: ¿Qué vendés y a quién?
Oferta: ¿Qué incluye y cuál es la promo?
Avatar: ¿Qué dolores y deseos tiene tu cliente ideal?
Tono: ¿Cómo querés sonar? (premium, cercano, profesional, etc.)`
  );
  const [businessFile, setBusinessFile] = useState<File | null>(null);

  // Ingest output
  const [profile, setProfile] = useState<any | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // STEP 2 uploads (opcionales)
  const [ownerFile, setOwnerFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);

  const ownerPreview = useMemo(() => (ownerFile ? URL.createObjectURL(ownerFile) : null), [ownerFile]);
  const productPreview = useMemo(() => (productFile ? URL.createObjectURL(productFile) : null), [productFile]);

  // STEP 3 settings
  const [finalBrief, setFinalBrief] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [variants, setVariants] = useState(12);

  const [copyStyle, setCopyStyle] = useState<"premium" | "ugc" | "minimal" | "direct">("premium");
  const [aggressiveness, setAggressiveness] = useState<"conservative" | "balanced" | "aggressive">("balanced");

  // STEP 4 results
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  // Final PNGs por angleId
  const [finalPngByAngle, setFinalPngByAngle] = useState<Map<string, FinalPng>>(new Map());
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const canGoStep2 = !!profile;
  const canGoStep3 = !!profile;
  const canGenerate = !!profile && !genLoading;

  const anglesCount = profile?.angles?.length ?? 0;

  async function runIngest() {
    setIngestLoading(true);
    setIngestError(null);
    setProfile(null);

    try {
      const fd = new FormData();
      if (businessText.trim()) fd.append("text", businessText.trim());
      if (businessFile) fd.append("file", businessFile);

      const res = await fetch("/api/knowledge/ingest", { method: "POST", body: fd });
      const data = (await res.json()) as IngestOk | IngestErr;

      if (!res.ok || (data as any)?.ok === false) {
        setIngestError((data as IngestErr)?.error ?? "Error en ingest");
        return;
      }

      setProfile((data as IngestOk).profile);
      localStorage.setItem("businessProfile", JSON.stringify((data as IngestOk).profile));
      setStep(2);
    } catch (e: any) {
      setIngestError(e?.message ?? "Error de red");
    } finally {
      setIngestLoading(false);
    }
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  // Fallback copy si aún no existe /api/copy/meta-overlay-batch
  function fallbackCopyForAngle(angle: any, offerPromo?: string): CopyItem {
    const angleId = String(angle?.id ?? "angle");
    const hooks: string[] = Array.isArray(angle?.hooks) ? angle.hooks : [];
    const line1 = (hooks[0] ?? angle?.label ?? "Descubrí una mejor opción").slice(0, 60);
    const line2 = (hooks[1] ?? angle?.keyMessage ?? "Beneficio claro y directo.").slice(0, 70);
    const line3 = offerPromo ? offerPromo.slice(0, 50) : "Oferta por tiempo limitado";
    const disclaimer = "Stock limitado";
    return { angleId, line1, line2, line3, disclaimer };
  }

  async function generateCreatives() {
    setGenLoading(true);
    setGenError(null);
    setCreatives([]);

    try {
      const v = clamp(Number(variants || 12), 1, 30);
      const selectedAngles: any[] = Array.isArray(profile?.angles) ? profile.angles.slice(0, v) : [];
      if (!selectedAngles.length) {
        setGenError("No hay ángulos en el BusinessProfile. Corré ingest primero.");
        return;
      }

      // -------- A) IMÁGENES (SIN TEXTO) PRIMERO --------
      const payload = {
        profile,
        variants: v,
        aspectRatio,
        finalBrief: finalBrief.trim() || undefined,
        noText: true,
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      if (ownerFile) fd.append("ownerImage", ownerFile);
      if (productFile) fd.append("productImage", productFile);

      const resImg = await fetch("/api/image/meta-batch-with-images", {
        method: "POST",
        body: fd,
      });

      const dataImg = await resImg.json();
      if (!resImg.ok || dataImg?.ok === false) {
        setGenError(dataImg?.error ?? "No se pudo generar el batch de imágenes.");
        return;
      }

      const imageItems: ImageItem[] = Array.isArray(dataImg?.items) ? dataImg.items : [];
      const imgMap = new Map<string, ImageItem>();
      for (const it of imageItems) imgMap.set(String(it.angle), it);

      // Merge inicial con copy fallback (temporal)
      let merged: Creative[] = selectedAngles.map((a) => {
        const angleId = String(a?.id ?? "angle");
        const angleLabel = String(a?.label ?? a?.id ?? "Ángulo");
        const copy = fallbackCopyForAngle(a, profile?.offer?.promo ?? null);
        const image = imgMap.get(angleId);
        return { angleId, angleLabel, image, copy };
      });

      // Guardamos creativos con copies temporales para mostrar previo
      setCreatives(merged);

      // -------- B) COPY (proceso aparte) --------
      let copyItems: CopyItem[] = [];
      try {
        const resCopy = await fetch("/api/copy/meta-overlay-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            variants: v,
            style: copyStyle,
            aggressiveness,
          }),
        });

        const dataCopy = await resCopy.json();
        if (resCopy.ok && dataCopy?.ok && Array.isArray(dataCopy?.items)) {
          copyItems = dataCopy.items as CopyItem[];
        } else {
          const promo = profile?.offer?.promo ?? null;
          copyItems = selectedAngles.map((a) => fallbackCopyForAngle(a, promo));
        }
      } catch {
        const promo = profile?.offer?.promo ?? null;
        copyItems = selectedAngles.map((a) => fallbackCopyForAngle(a, promo));
      }

      // Mapa copy por angleId y merge final
      const copyMap = new Map<string, CopyItem>();
      for (const c of copyItems) copyMap.set(String(c.angleId), c);

      merged = merged.map((m) => ({ ...m, copy: copyMap.get(m.angleId) ?? m.copy }));

      setCreatives(merged);
      // Render final PNGs automáticamente para los creativos que tienen imagen base
      try {
        await renderFinalBatch(merged);
      } catch (e) {
        console.warn("Error renderizando batch final:", e);
      }

      setStep(4);
    } catch (e: any) {
      setGenError(e?.message ?? "Error de red");
    } finally {
      setGenLoading(false);
    }
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function updateCopy(angleId: string, patch: Partial<CopyItem>) {
    // noop: copy is generated automatically and not editable in Meta Studio
    console.warn("updateCopy disabled: copy is not editable in Meta Studio");
  }

  // Ejecuta workers en paralelo con un limite de concurrencia, manteniendo el orden
  async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) break;
        results[i] = await worker(items[i], i);
      }
    });

    await Promise.all(runners);
    return results;
  }

  // Renderiza en batch y guarda PNGs en finalPngByAngle
  async function renderFinalBatch(creativesForRender: Creative[]) {
    setRenderLoading(true);
    setRenderError(null);
    try {
      const jobs = creativesForRender
        .map((c, idx) => ({ angleId: c.angleId, baseImageDataUrl: c.image?.dataUrl, variantIndex: idx }))
        .filter((j) => !!j.baseImageDataUrl) as { angleId: string; baseImageDataUrl: string; variantIndex: number }[];

      if (!jobs.length) {
        setRenderError("No hay imágenes base para renderizar.");
        return;
      }

      const worker = async (job: { angleId: string; baseImageDataUrl: string; variantIndex: number }) => {
        try {
          // Llamar a add-copy (el endpoint genera hook único con palabra iluminada)
          const addResp = await fetch("/api/image/add-copy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              baseImageDataUrl: job.baseImageDataUrl, 
              aspectRatio,
              variantIndex: job.variantIndex,
              angleId: job.angleId,
              seed: job.variantIndex,
            }),
          });

          const addJson = await addResp.json();
          if (!addResp.ok || !addJson?.ok || !addJson?.dataUrl) throw new Error(addJson?.error ?? "add-copy failed");
          
          return { 
            angleId: job.angleId, 
            dataUrl: addJson.dataUrl, 
            templateId: "ai_hook",
            variant: addJson.variant,
          } as FinalPng & { variant?: any };
        } catch (err) {
          console.warn("add-copy failed for", job.angleId, err);
          return null as any;
        }
      };

      const results = await runWithConcurrency(jobs, 3, async (job) => await worker(job));

      // Update creatives with returned edited images and also fill finalPngByAngle
      const finalMap = new Map<string, FinalPng>();
      const updated = creativesForRender.map((c) => {
        const r = results.find((res) => res && res.angleId === c.angleId);
        if (r && r.dataUrl) {
          finalMap.set(c.angleId, r);
          return { ...c, image: { ...(c.image ?? {}), dataUrl: r.dataUrl } } as Creative;
        }
        return c;
      });

      setCreatives(updated);
      setFinalPngByAngle(finalMap);
    } catch (e: any) {
      setRenderError(e?.message ?? "Error al renderizar PNGs");
    } finally {
      setRenderLoading(false);
    }
  }

  async function renderOnePNG(angleId: string, variantIndex?: number) {
    const creative = creatives.find((c) => c.angleId === angleId);
    if (!creative) return;
    if (!creative.image?.dataUrl) {
      setRenderError("No hay imagen base para este ángulo.");
      return;
    }

    setRenderLoading(true);
    setRenderError(null);

    try {
      const newSeed = variantIndex ?? Math.floor(Math.random() * 1000);
      const addResp = await fetch("/api/image/add-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          baseImageDataUrl: creative.image.dataUrl, 
          aspectRatio,
          variantIndex: newSeed,
          angleId,
          seed: newSeed,
        }),
      });

      const addJson = await addResp.json();
      if (!addResp.ok || !addJson?.ok || !addJson?.dataUrl) throw new Error(addJson?.error ?? "add-copy failed");

      const resObj: FinalPng = { angleId, dataUrl: addJson.dataUrl, templateId: "ai_hook" };
      setFinalPngByAngle((prev) => {
        const m = new Map(prev);
        m.set(angleId, resObj);
        return m;
      });
      // also update creatives image for display
      setCreatives((prev) => prev.map((p) => (p.angleId === angleId ? { ...p, image: { ...(p.image ?? {}), dataUrl: addJson.dataUrl } } as Creative : p)));
    } catch (e: any) {
      setRenderError(e?.message ?? "Error al renderizar PNG");
    } finally {
      setRenderLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Header
          step={step}
          setStep={setStep}
          canGoStep2={canGoStep2}
          canGoStep3={canGoStep3}
        />

        {/* STEP 1 */}
        {step === 1 && (
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
              <h2 className="text-lg font-semibold">Paso 1 — Info del negocio</h2>

              <div>
                <label className="text-xs text-neutral-400">Texto (negocio + oferta + avatar)</label>
                <textarea
                  value={businessText}
                  onChange={(e) => setBusinessText(e.target.value)}
                  rows={10}
                  className="mt-2 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="text-sm font-medium">Documento (opcional)</div>
                <div className="text-xs text-neutral-500">PDF / DOCX / TXT</div>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.json,.csv"
                  className="mt-3 block w-full text-xs text-neutral-300 file:mr-3 file:rounded-lg file:border file:border-neutral-700 file:bg-neutral-900/40 file:px-3 file:py-1.5 file:text-xs file:text-neutral-200 hover:file:bg-neutral-800"
                  onChange={(e) => setBusinessFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <button
                onClick={runIngest}
                disabled={ingestLoading || (!businessText.trim() && !businessFile)}
                className="w-full rounded-xl bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                type="button"
              >
                {ingestLoading ? "Procesando…" : "Procesar con IA"}
              </button>

              {ingestError && (
                <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {ingestError}
                </div>
              )}
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
              <h3 className="text-sm font-medium text-neutral-200">Qué hace este paso</h3>
              <p className="mt-2 text-sm text-neutral-400">
                Genera un <span className="font-semibold">BusinessProfile</span> con ángulos para Meta.
                Luego usaremos esos ángulos para:
              </p>
              <ul className="mt-3 text-sm text-neutral-300 list-disc ml-5 space-y-1">
                <li>Crear copy perfecto (por IA de texto, validado)</li>
                <li>Crear imágenes sin texto (IA de imagen)</li>
                <li>Componer el creativo final en la app (sin errores tipográficos)</li>
              </ul>
            </div>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
              <h2 className="text-lg font-semibold">Paso 2 — Fotos (opcionales)</h2>
              <p className="text-sm text-neutral-400">
                Estas imágenes se usan como referencia visual (no identificación).
              </p>

              <UploadCard
                title="Dueño / representante (opcional)"
                subtitle="Para vibe testimonial / UGC"
                preview={ownerPreview}
                onPick={setOwnerFile}
              />

              <UploadCard
                title="Producto / oferta (opcional)"
                subtitle="Para consistencia del producto"
                preview={productPreview}
                onPick={setProductFile}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-neutral-800 px-4 py-2.5 text-sm hover:bg-neutral-900"
                  type="button"
                >
                  Volver
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-xl bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium hover:opacity-90"
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
              <h3 className="text-sm font-medium text-neutral-200">BusinessProfile (preview)</h3>
              <pre className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-neutral-300">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
              <h2 className="text-lg font-semibold">Paso 3 — Copy perfecto + imágenes</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400">Formato</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
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
                    className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                  />
                </div>
              </div>

              {/* Nota: copy automático con variación */}
              <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-200">
                ✨ Cada creativo es una <strong>variante única</strong>: el copy, estilo e intensidad visual se generan automáticamente con variación controlada.
              </div>

              <div>
                <label className="text-xs text-neutral-400">Brief final (opcional)</label>
                <textarea
                  value={finalBrief}
                  onChange={(e) => setFinalBrief(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                  placeholder='Ej: "Estilo minimalista, evitar claims absolutos, look premium."'
                />
              </div>

              <button
                onClick={generateCreatives}
                disabled={!canGenerate}
                className="w-full rounded-xl bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                type="button"
              >
                {genLoading ? "Generando…" : `Generar ${clamp(variants, 1, 30)} creativos`}
              </button>

              {genError && (
                <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {genError}
                </div>
              )}

              <div className="text-xs text-neutral-500">
                Ángulos disponibles en profile: {anglesCount}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-xl border border-neutral-800 px-4 py-2.5 text-sm hover:bg-neutral-900"
                  type="button"
                >
                  Volver
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!creatives.length}
                  className="flex-1 rounded-xl border border-neutral-800 px-4 py-2.5 text-sm hover:bg-neutral-900 disabled:opacity-50"
                  type="button"
                >
                  Ver resultados
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
              <h3 className="text-sm font-medium text-neutral-200">Cómo evitamos errores de copy</h3>
              <p className="mt-2 text-sm text-neutral-400">
                El texto lo genera una IA de texto (validado) y tu app lo renderiza como overlay.
                La IA de imágenes está obligada a NO escribir texto dentro de la imagen.
              </p>

              <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
                Resultado: tipografía perfecta, acentos correctos, jerarquía consistente.
              </div>
            </div>
          </section>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Resultados</h2>
                <p className="text-sm text-neutral-400">{creatives.length} creativos</p>
              </div>

              <div className="flex gap-2">
                {/* El render final se hace automáticamente tras generar creativos. */}

                <button
                  onClick={() => setStep(3)}
                  className="rounded-xl border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900"
                  type="button"
                >
                  Ajustar y regenerar
                </button>
              </div>
            
              {renderLoading && (
                <div className="mt-3 rounded-xl border border-yellow-800/60 bg-yellow-950/20 px-3 py-2 text-sm text-yellow-200">
                  Renderizando PNG finales…
                </div>
              )}

              {renderError && (
                <div className="mt-3 rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {renderError}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creatives.map((c, idx) => {
                const img = c.image;
                const final = finalPngByAngle.get(c.angleId);
                const showFinal = !!final?.dataUrl;

                // Count missing to show indicator later
                return (
                  <div
                    key={c.angleId}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900/30 overflow-hidden"
                  >
                    <div className={"relative " + aspectClass(aspectRatio)}>
                      {/* Imagen final (si existe) o base como fallback dentro de contenedor con ratio */}
                      {showFinal ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={final!.dataUrl} alt={c.angleLabel} className="absolute inset-0 w-full h-full object-cover" />
                      ) : img?.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.dataUrl} alt={c.angleLabel} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className={`absolute inset-0 flex items-center justify-center text-sm text-neutral-500 bg-neutral-950/40`}>
                          {img?.error ? `Error: ${img.error}` : "Sin imagen"}
                        </div>
                      )}

                      {/* Solo mostrar overlay HTML si NO hay imagen final (la imagen final ya tiene el copy renderizado por IA) */}
                      {!showFinal && <ProOverlay copy={c.copy} aspectRatio={aspectRatio} />}
                    </div>

                    <div className="p-3 space-y-2">
                      <div className="text-xs text-neutral-400">Ángulo</div>
                      <div className="text-sm font-semibold">{c.angleLabel}</div>
                      <div className="text-[11px] text-neutral-500">{img?.model ? `Model: ${img.model}` : ""}</div>
                      {showFinal && (
                        <div className="text-[11px] text-cyan-400">✨ Variante única generada automáticamente</div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {finalPngByAngle.get(c.angleId) ? (
                          <button
                            className="rounded-xl bg-white text-neutral-950 px-3 py-2 text-sm font-medium"
                            onClick={() =>
                              downloadDataUrl(finalPngByAngle.get(c.angleId)!.dataUrl, `meta-final-${c.angleId}-${idx + 1}.png`)
                            }
                            type="button"
                          >
                            Descargar creativo
                          </button>
                        ) : img?.dataUrl ? (
                          <button
                            className="rounded-xl border border-neutral-800 px-3 py-2 text-sm hover:bg-neutral-900"
                            onClick={() => downloadDataUrl(img.dataUrl, `meta-${c.angleId}-${idx + 1}.png`)}
                            type="button"
                          >
                            Descargar imagen base
                          </button>
                        ) : (
                          <div className="text-xs text-white/60">—</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// Pro overlay component para estilo 'creativos pro'
function ProOverlay({ copy, aspectRatio }: { copy: CopyItem; aspectRatio: AspectRatio }) {
  // highlight palabra más larga >=6 o segunda
  function renderHeadlineWithHighlight(text: string) {
    if (!text) return text;
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return text;
    const sorted = [...words].sort((a, b) => b.length - a.length);
    const pick = (sorted[0] && sorted[0].length >= 6) ? sorted[0] : (sorted[1] && sorted[1].length >= 6 ? sorted[1] : null);
    if (!pick) return text;
    const idx = words.findIndex((w) => w === pick);
    if (idx === -1) return text;
    return (
      <>
        {words.slice(0, idx).join(" ")}{words.slice(0, idx).length ? " " : ""}
        <span className="bg-yellow-400 text-black px-2 rounded">{words[idx]}</span>
        {words.slice(idx + 1).length ? " " + words.slice(idx + 1).join(" ") : ""}
      </>
    );
  }

  const headlineStyle: any = {
    textShadow: "0 6px 18px rgba(0,0,0,0.65), 0 2px 4px rgba(0,0,0,0.75)",
    lineHeight: 0.92,
  };

  return (
    <>
      {/* Gradiente superior */}
      <div className="absolute inset-x-0 top-0 h-[28%] pointer-events-none bg-gradient-to-b from-black/70 to-transparent" />

      {/* Gradiente inferior */}
      <div className="absolute inset-x-0 bottom-0 h-[26%] pointer-events-none bg-gradient-to-t from-black/75 to-transparent" />

      <div className="absolute left-0 top-6 p-6 max-w-[70%]">
        <div className="text-[10px] uppercase tracking-widest text-white/70">HOOK</div>
        <h3
          className="mt-2 text-white font-extrabold uppercase tracking-tight leading-[0.92]"
          style={{ ...headlineStyle, fontSize: "clamp(30px,3.2vw,56px)" }}
        >
          {renderHeadlineWithHighlight(copy.line1)}
        </h3>
        <div
          className="mt-2 text-white/90 font-medium text-sm max-w-prose"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}
        >
          {copy.line2}
        </div>
      </div>

      <div className="absolute left-0 bottom-6 p-6 max-w-[68%]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-white/70">OFERTA</div>
            <div className="mt-1 text-white font-semibold text-base">{copy.line3}</div>
            {copy.disclaimer ? <div className="mt-1 text-white/75 text-xs">{copy.disclaimer}</div> : null}
          </div>

          <div className="hidden sm:block">
            <span className="inline-block bg-white/90 text-black rounded-full px-4 py-2 font-extrabold">OBTENER</span>
          </div>
        </div>
      </div>
    </>
  );
}

function aspectClass(r: AspectRatio) {
  switch (r) {
    case "9:16":
      return "aspect-[9/16]";
    case "4:5":
      return "aspect-[4/5]";
    case "1:1":
      return "aspect-[1/1]";
    case "16:9":
      return "aspect-[16/9]";
    default:
      return "aspect-[4/5]";
  }
}

function Header({
  step,
  setStep,
  canGoStep2,
  canGoStep3,
}: {
  step: Step;
  setStep: (s: Step) => void;
  canGoStep2: boolean;
  canGoStep3: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Meta Studio</h1>
        <p className="mt-1 text-neutral-400">
          Flujo completo: negocio → copy perfecto → imagen sin texto → overlay final.
        </p>
      </div>

      <div className="flex gap-2">
        <StepBtn active={step === 1} onClick={() => setStep(1)} label="1. Info" />
        <StepBtn
          active={step === 2}
          onClick={() => canGoStep2 && setStep(2)}
          label="2. Fotos"
          disabled={!canGoStep2}
        />
        <StepBtn
          active={step === 3}
          onClick={() => canGoStep3 && setStep(3)}
          label="3. Generar"
          disabled={!canGoStep3}
        />
        <StepBtn active={step === 4} onClick={() => setStep(4)} label="4. Resultados" disabled={step !== 4} />
      </div>
    </div>
  );
}

function StepBtn({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl border px-3 py-2 text-xs transition",
        active
          ? "border-neutral-200 bg-white text-neutral-950"
          : "border-neutral-800 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-800",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {label}
    </button>
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
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

