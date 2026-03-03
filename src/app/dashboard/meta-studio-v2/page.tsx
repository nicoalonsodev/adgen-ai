"use client";

import { useState } from "react";

/* ─────────────── Types ─────────────── */

type PipelineStep =
  | "idle"
  | "strategy"
  | "scenes"
  | "hooks"
  | "backgrounds"
  | "render"
  | "done"
  | "error";

type StepStatus = "pending" | "running" | "done" | "error";

interface StepState {
  strategy: StepStatus;
  scenes: StepStatus;
  hooks: StepStatus;
  backgrounds: StepStatus;
  render: StepStatus;
}

type Creative = {
  scene_id: string;
  variant_id: "A" | "B";
  dataUrl: string;
  hook: string;
  subheadline: string;
  cta: string;
  badge: string | null;
  // SMART_USAGE_V1 extra data
  qaScore?: number;
  placement?: { x: number; y: number; scale: number };
};

/* ─────────────── Helpers ─────────────── */

const STEP_LABELS: Record<keyof StepState, string> = {
  strategy: "1. Strategic Core",
  scenes: "2. Scene Plan",
  hooks: "3. Hooks & Copy",
  backgrounds: "4. Fondos Editoriales (8)",
  render: "5. Render final (16 creativos)",
};

function statusIcon(s: StepStatus) {
  if (s === "done") return "✔";
  if (s === "running") return "⏳";
  if (s === "error") return "✘";
  return "○";
}

function statusColor(s: StepStatus) {
  if (s === "done") return "text-green-400";
  if (s === "running") return "text-yellow-400 animate-pulse";
  if (s === "error") return "text-red-400";
  return "text-neutral-500";
}

/* ─────────────── Page ─────────────── */

export default function MetaStudioV2Page() {
  /* ── Input state ── */
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [primaryBenefit, setPrimaryBenefit] = useState("");
  const [problemItSolves, setProblemItSolves] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const [offerActive, setOfferActive] = useState(true);
  const [offerType, setOfferType] = useState("discount");
  const [offerValue, setOfferValue] = useState("");
  const [offerDeadline, setOfferDeadline] = useState("");
  const [offerNotes, setOfferNotes] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  
  /* ── Compose mode ── */
  const [composeMode, setComposeMode] = useState<"AUTO_LAYOUT" | "SMART_USAGE_V1">("AUTO_LAYOUT");

  /* ── Pipeline state ── */
  const [steps, setSteps] = useState<StepState>({
    strategy: "pending",
    scenes: "pending",
    hooks: "pending",
    backgrounds: "pending",
    render: "pending",
  });
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);

  /* ── Intermediate data (for debug) ── */
  const [debugData, setDebugData] = useState<Record<string, any>>({});

  const canStart =
    productName.trim() &&
    productDescription.trim() &&
    primaryBenefit.trim() &&
    problemItSolves.trim() &&
    targetAudience.trim() &&
    logoFile &&
    productImageFile &&
    !pipelineRunning;

  /* ── File → data URL ── */
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ── Update step status ── */
  function setStepStatus(key: keyof StepState, status: StepStatus) {
    setSteps((prev) => ({ ...prev, [key]: status }));
  }

  /* ─────────────── Pipeline ─────────────── */

  async function runPipeline() {
    setPipelineRunning(true);
    setPipelineError(null);
    setCreatives([]);
    setDebugData({});
    setSteps({
      strategy: "pending",
      scenes: "pending",
      hooks: "pending",
      backgrounds: "pending",
      render: "pending",
    });

    try {
      /* ── 1) Strategy Core ── */
      setStepStatus("strategy", "running");

      const strategyRes = await fetch("/api/strategy/core", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          product_description: productDescription,
          primary_benefit: primaryBenefit,
          problem_it_solves: problemItSolves,
          target_audience: targetAudience,
          offer: {
            active: offerActive,
            type: offerType,
            value: offerValue,
            deadline_iso: offerDeadline,
            notes: offerNotes,
          },
        }),
      });

      const strategyData = await strategyRes.json();
      if (!strategyRes.ok || !strategyData.ok) {
        throw new Error(
          `Strategy failed: ${strategyData.error ?? strategyRes.statusText}`
        );
      }
      const strategicCore = strategyData.strategicCore;
      setDebugData((d) => ({ ...d, strategicCore }));
      setStepStatus("strategy", "done");

      /* ── 2) Scene Adapter (llamada local simulada via import dinámico no es posible en client, usar API) ── */
      setStepStatus("scenes", "running");

      // Scene adapter es determinístico, pero corre en server.
      // Usamos un endpoint ligero o pasamos los datos al de hooks.
      // Para MVP: construimos el scenePlan en el server dentro de hooks-by-scene.
      // Alternativa: endpoint dedicado. Usamos la alternativa simple: fetch a un mini-endpoint.
      const scenePlanRes = await fetch("/api/strategy/scene-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategicCore }),
      });
      const scenePlanData = await scenePlanRes.json();
      if (!scenePlanRes.ok || !scenePlanData.ok) {
        throw new Error(
          `Scene plan failed: ${scenePlanData.error ?? scenePlanRes.statusText}`
        );
      }
      const scenePlan = scenePlanData.scenePlan;
      setDebugData((d) => ({ ...d, scenePlan }));
      setStepStatus("scenes", "done");

      /* ── 3) Hooks by Scene ── */
      setStepStatus("hooks", "running");

      const hooksRes = await fetch("/api/copy/hooks-by-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategicCore, scenePlan }),
      });
      const hooksData = await hooksRes.json();
      if (!hooksRes.ok || !hooksData.ok) {
        throw new Error(
          `Hooks failed: ${hooksData.error ?? hooksRes.statusText}`
        );
      }
      const hooksByScene = hooksData.hooksByScene;
      setDebugData((d) => ({ ...d, hooksByScene }));
      setStepStatus("hooks", "done");

      /* ── 4) Generate 8 editorial backgrounds ── */
      setStepStatus("backgrounds", "running");

      // Build layouts array from scene plan (each scene has a layout_id)
      const layoutsForBg = scenePlan.scenes.map((s: any) => ({
        layout_id: s.layout_id,
        scene_id: s.scene_id,
      }));

      const bgRes = await fetch("/api/image/editorial-backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layouts: layoutsForBg,
          verbose: false,
        }),
      });
      const bgData = await bgRes.json();
      if (!bgRes.ok || !bgData.ok) {
        throw new Error(
          `Backgrounds failed: ${bgData.error ?? bgRes.statusText}`
        );
      }
      // Map by scene_id for lookup (items have layout_id and scene_id)
      const backgrounds = bgData.items.map((item: any) => ({
        scene_id: item.scene_id,
        dataUrl: item.dataUrl,
        template: item.template,
        generationTimeMs: item.generationTimeMs,
        error: item.error,
      }));
      setDebugData((d) => ({ ...d, backgrounds }));
      setStepStatus("backgrounds", "done");

      /* ── 5) Render 16 creatives (8 scenes × 2 variants) ── */
      setStepStatus("render", "running");

      const logoDataUrl = await fileToDataUrl(logoFile!);
      const productDataUrl = await fileToDataUrl(productImageFile!);

      const bgByScene = new Map<string, string>();
      for (const bg of backgrounds) {
        if (bg.dataUrl) bgByScene.set(bg.scene_id, bg.dataUrl);
      }

      const renderPromises: Promise<Creative | null>[] = [];

      for (const scene of hooksByScene.scenes) {
        const bgUrl = bgByScene.get(scene.scene_id);
        if (!bgUrl) continue;

        // Find layout_id from scenePlan
        const planScene = scenePlan.scenes.find(
          (s: any) => s.scene_id === scene.scene_id
        );
        const layoutId = planScene?.layout_id ?? "hero_center";

        for (const variant of scene.variants) {
          const isUpperScene = ["OFFER", "URGENCY", "OBJECTION"].includes(
            scene.scene_id
          );

          // Choose render API based on composeMode
          if (composeMode === "SMART_USAGE_V1") {
            // Use SMART_USAGE_V1 compose API
            renderPromises.push(
              fetch("/api/compose", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                },
                body: JSON.stringify({
                  mode: "SMART_USAGE_V1",
                  backgroundUrl: bgUrl,
                  productPngUrl: productDataUrl,
                  copy: {
                    headline: variant.hook,
                    subheadline: variant.subheadline,
                    cta: variant.cta,
                    badge: variant.badge ?? undefined,
                  },
                  smartUsageOptions: {
                    productName: productName,
                    productDescription: productDescription,
                    qaThreshold: 0.75,
                    enableRepair: true,
                  },
                }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.success && data.data?.image) {
                    return {
                      scene_id: scene.scene_id,
                      variant_id: variant.variant_id as "A" | "B",
                      dataUrl: data.data.image,
                      hook: variant.hook,
                      subheadline: variant.subheadline,
                      cta: variant.cta,
                      badge: variant.badge ?? null,
                      // Extra SMART_USAGE data
                      qaScore: data.data.qaResult?.score,
                      placement: data.data.placement,
                    };
                  }
                  console.warn(
                    `SMART_USAGE render failed for ${scene.scene_id}-${variant.variant_id}:`,
                    data.error || data
                  );
                  return null;
                })
                .catch((err) => {
                  console.warn(
                    `SMART_USAGE error for ${scene.scene_id}-${variant.variant_id}:`,
                    err
                  );
                  return null;
                })
            );
          } else {
            // Use standard meta-ads render API
            renderPromises.push(
              fetch("/api/render/meta-ads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  scene_id: scene.scene_id,
                  layout_id: layoutId,
                  background_image: bgUrl,
                  product_image: productDataUrl,
                  logo_image: logoDataUrl,
                  hookVariant: {
                    headline: variant.hook,
                    subheadline: variant.subheadline,
                    cta: variant.cta,
                    badge: variant.badge ?? null,
                    casing: isUpperScene ? "uppercase" : "sentence",
                  },
                }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.ok && data.dataUrl) {
                    return {
                      scene_id: scene.scene_id,
                      variant_id: variant.variant_id as "A" | "B",
                      dataUrl: data.dataUrl,
                      hook: variant.hook,
                      subheadline: variant.subheadline,
                      cta: variant.cta,
                      badge: variant.badge ?? null,
                    };
                  }
                  console.warn(
                    `Render failed for ${scene.scene_id}-${variant.variant_id}:`,
                    data.error
                  );
                  return null;
                })
                .catch((err) => {
                  console.warn(
                    `Render error for ${scene.scene_id}-${variant.variant_id}:`,
                    err
                  );
                  return null;
                })
            );
          }
        }
      }

      const results = await Promise.all(renderPromises);
      const validCreatives = results.filter(Boolean) as Creative[];
      setCreatives(validCreatives);
      setStepStatus("render", "done");
    } catch (err: any) {
      setPipelineError(err?.message ?? "Pipeline error");
      // Mark current running step as error
      setSteps((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as (keyof StepState)[]) {
          if (next[key] === "running") next[key] = "error";
        }
        return next;
      });
    } finally {
      setPipelineRunning(false);
    }
  }

  /* ─────────────── Download helper ─────────────── */

  function downloadCreative(c: Creative) {
    const a = document.createElement("a");
    a.href = c.dataUrl;
    a.download = `${c.scene_id}_${c.variant_id}.png`;
    a.click();
  }

  function downloadAll() {
    creatives.forEach((c) => downloadCreative(c));
  }

  /* ─────────────── Render ─────────────── */

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Meta Studio v2
          </h1>
          <p className="mt-1 text-neutral-400">
            Pipeline completo: Strategy → Scenes → Hooks → Backgrounds → Render
            (16 creativos)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── Left column: inputs ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Product info */}
            <Card title="Producto">
              <Field
                label="Nombre del producto"
                value={productName}
                onChange={setProductName}
                placeholder="Mate Térmico SmartMate 360"
              />
              <TextArea
                label="Descripción"
                value={productDescription}
                onChange={setProductDescription}
                placeholder="Mate térmico de acero inoxidable con doble pared..."
                rows={3}
              />
              <Field
                label="Beneficio principal"
                value={primaryBenefit}
                onChange={setPrimaryBenefit}
                placeholder="Mantiene el agua caliente 12 horas"
              />
              <Field
                label="Problema que resuelve"
                value={problemItSolves}
                onChange={setProblemItSolves}
                placeholder="El agua se enfría rápido"
              />
              <Field
                label="Audiencia objetivo"
                value={targetAudience}
                onChange={setTargetAudience}
                placeholder="Personas 25-45 años que toman mate a diario"
              />
            </Card>

            {/* Offer */}
            <Card title="Oferta">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={offerActive}
                  onChange={(e) => setOfferActive(e.target.checked)}
                  className="accent-white"
                />
                Oferta activa
              </label>
              {offerActive && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Tipo"
                      value={offerType}
                      onChange={setOfferType}
                      placeholder="discount"
                    />
                    <Field
                      label="Valor"
                      value={offerValue}
                      onChange={setOfferValue}
                      placeholder="25% OFF"
                    />
                  </div>
                  <Field
                    label="Deadline (ISO)"
                    value={offerDeadline}
                    onChange={setOfferDeadline}
                    placeholder="2026-02-28T23:59:00-03:00"
                  />
                  <Field
                    label="Notas"
                    value={offerNotes}
                    onChange={setOfferNotes}
                    placeholder="Stock limitado a 500 unidades"
                  />
                </>
              )}
            </Card>

            {/* Uploads */}
            <Card title="Imágenes">
              <UploadField
                label="Logo (PNG/SVG)"
                file={logoFile}
                onFile={setLogoFile}
                accept="image/*"
              />
              <UploadField
                label="Foto del producto"
                file={productImageFile}
                onFile={setProductImageFile}
                accept="image/*"
              />
            </Card>

            {/* Compose Mode Selector */}
            <Card title="Modo de Composición">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="composeMode"
                    value="AUTO_LAYOUT"
                    checked={composeMode === "AUTO_LAYOUT"}
                    onChange={() => setComposeMode("AUTO_LAYOUT")}
                    className="accent-white"
                  />
                  <span>AUTO_LAYOUT</span>
                  <span className="text-xs text-neutral-500">(AI analiza fondo y propone layout)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="composeMode"
                    value="SMART_USAGE_V1"
                    checked={composeMode === "SMART_USAGE_V1"}
                    onChange={() => setComposeMode("SMART_USAGE_V1")}
                    className="accent-white"
                  />
                  <span>SMART_USAGE_V1</span>
                  <span className="text-xs text-neutral-500">(Pipeline automático con QA scoring)</span>
                </label>
              </div>
              {composeMode === "SMART_USAGE_V1" && (
                <p className="mt-2 text-xs text-blue-400">
                  Usa inferencia de uso, análisis de escena, placement matemático y auto-repair.
                </p>
              )}
            </Card>

            {/* Generate button */}
            <button
              onClick={runPipeline}
              disabled={!canStart}
              className="w-full rounded-xl bg-white py-3 text-center font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pipelineRunning ? "Generando…" : "Generar 16 creativos"}
            </button>

            {/* Progress */}
            {(pipelineRunning || creatives.length > 0 || pipelineError) && (
              <Card title="Progreso">
                <ul className="space-y-1 text-sm font-mono">
                  {(Object.keys(steps) as (keyof StepState)[]).map((key) => (
                    <li key={key} className={statusColor(steps[key])}>
                      {statusIcon(steps[key])} {STEP_LABELS[key]}
                    </li>
                  ))}
                </ul>
                {pipelineError && (
                  <div className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                    {pipelineError}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* ── Right column: results ── */}
          <div className="lg:col-span-3">
            {creatives.length === 0 && !pipelineRunning && (
              <div className="flex h-full items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center text-neutral-500">
                <div>
                  <p className="text-lg">Completá los datos y generá tus creativos</p>
                  <p className="mt-1 text-sm">
                    Se generarán 8 escenas × 2 variantes = 16 creativos finales
                  </p>
                </div>
              </div>
            )}

            {pipelineRunning && creatives.length === 0 && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/40">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                  <p className="text-sm text-neutral-400">
                    Procesando pipeline…
                  </p>
                </div>
              </div>
            )}

            {creatives.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {creatives.length} creativos generados
                  </h2>
                  <button
                    onClick={downloadAll}
                    className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium transition hover:bg-neutral-700"
                  >
                    Descargar todos
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {creatives.map((c) => (
                    <div
                      key={`${c.scene_id}-${c.variant_id}`}
                      className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60"
                    >
                      {/* Image */}
                      <div className="aspect-4/5">
                        <img
                          src={c.dataUrl}
                          alt={`${c.scene_id} ${c.variant_id}`}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Overlay info */}
                      <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="p-3 text-xs">
                          <span className="inline-block rounded bg-white/20 px-2 py-0.5 font-mono text-[10px]">
                            {c.scene_id}
                          </span>
                          <span className="ml-1 inline-block rounded bg-white/10 px-2 py-0.5 font-mono text-[10px]">
                            Variant {c.variant_id}
                          </span>
                          <p className="mt-1 font-semibold leading-tight">
                            {c.hook}
                          </p>
                          <p className="mt-0.5 text-neutral-300 leading-tight">
                            {c.subheadline}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => downloadCreative(c)}
                              className="rounded bg-white/20 px-2 py-1 text-[10px] hover:bg-white/30"
                            >
                              Descargar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Labels */}
                      <div className="flex items-center justify-between border-t border-neutral-800 px-3 py-2">
                        <span className="text-xs font-medium text-neutral-400">
                          {c.scene_id}
                        </span>
                        <div className="flex items-center gap-2">
                          {c.qaScore !== undefined && (
                            <span 
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                c.qaScore >= 0.75 
                                  ? "bg-green-900/50 text-green-400" 
                                  : "bg-yellow-900/50 text-yellow-400"
                              }`}
                              title={`QA Score: ${(c.qaScore * 100).toFixed(0)}%`}
                            >
                              QA {(c.qaScore * 100).toFixed(0)}%
                            </span>
                          )}
                          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono text-neutral-500">
                            {c.variant_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ═══════════════ Shared inline UI components ═══════════════ */

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
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
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
      />
    </label>
  );
}

function UploadField({
  label,
  file,
  onFile,
  accept,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept={accept}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="hidden"
          id={`upload-${label}`}
        />
        <label
          htmlFor={`upload-${label}`}
          className="cursor-pointer rounded-lg border border-dashed border-neutral-700 bg-neutral-800/50 px-4 py-2 text-xs text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-300"
        >
          {file ? file.name : "Elegir archivo"}
        </label>
        {file && (
          <button
            onClick={() => onFile(null)}
            className="text-xs text-neutral-500 hover:text-red-400"
          >
            ✕
          </button>
        )}
      </div>
    </label>
  );
}
