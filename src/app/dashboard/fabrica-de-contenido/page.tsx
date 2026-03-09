"use client";

import { useState, useCallback, useEffect } from "react";
import { BUSINESS_CATEGORIES } from "@/lib/businessCategories";
import { TEMPLATE_META_LIST } from "@/services/product-composer/templates/meta";
import { PromptsPanel, type PromptsUsed, type PromptLayer } from "@/components/PromptsPanel";
import { CreativeAnalysisPanel } from "@/components/CreativeAnalysisPanel";
import type { CreativeAnalysisResult } from "@/lib/ai/gemini";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Single source of truth: all template data lives in meta.ts.
 * To add/edit a template: edit meta.ts only.
 */
const TEMPLATES = TEMPLATE_META_LIST;

/**
 * Zone constraint passed to PRODUCT_IA per template.
 * Uses productIAZone when set (intentional override), otherwise falls back to copyZone.
 */
const TEMPLATE_COPY_ZONES: Record<string, "right" | "left" | "top" | "bottom" | "center" | "none" | "full"> = Object.fromEntries(
  TEMPLATE_META_LIST.map((t) => [t.id, t.productIAZone ?? t.copyZone]),
);


const ANGLE_NAMES = [
  "Emocional",
  "Problema/Solución",
  "Urgencia",
  "Beneficio Técnico",
  "Aspiracional",
  "Curiosidad",
  "Social Proof",
  "Escasez",
];

const ANGLE_COUNTS = [1, 2, 3, 5, 8];

const CONCURRENCY = 5;

function getTemplateSchema(templateId: string): string[] {
  return TEMPLATE_META_LIST.find((t) => t.id === templateId)?.copySchema
    ?? ["title", "headline", "subheadline", "badge", "bullets", "productPrompt", "backgroundColorHint"];
}

function getTemplateHint(templateId: string): string | undefined {
  return TEMPLATE_META_LIST.find((t) => t.id === templateId)?.templateHint;
}

function resolveBgPrompt(
  meta: (typeof TEMPLATE_META_LIST)[number] | null | undefined,
  copy: any,
  businessProfile: any,
  colorMode?: "light" | "dark",
): string {
  // Dark mode con prompt específico → usarlo directamente (rawBackgroundPrompt implícito)
  if (colorMode === "dark" && (meta as any)?.darkBackgroundPrompt) {
    return (meta as any).darkBackgroundPrompt as string;
  }

  const basePrompt =
    ((businessProfile?.category as string) && meta?.categoryBackgroundPrompts?.[businessProfile.category as string])
    ?? meta?.defaultBackgroundPrompt
    ?? "Fondo minimalista neutro, tonos beige y crema, iluminación suave, sin objetos, sin texto, sin personas.";

  // 1. rawBackgroundPrompt → usar prompt del template sin modificar
  if ((meta as any)?.rawBackgroundPrompt) {
    return basePrompt;
  }

  // 2. backgroundPrompt generado por OpenAI (sorteo-giveaway, producto-hero-top)
  if (copy?.backgroundPrompt) {
    return copy.backgroundPrompt as string;
  }

  // 3. colorHint sobre el base prompt del template
  if (copy?.backgroundColorHint) {
    return `${basePrompt}\n\nCOLOR ADJUSTMENT: Shift the palette so that "${copy.backgroundColorHint}" becomes the dominant tone. Keep all other details exactly as described. The result must remain compatible with dark typography.`;
  }

  return basePrompt;
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onProgress: (completed: number, total: number) => void
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;
  let completed = 0;

  async function runNext(): Promise<void> {
    const index = currentIndex++;
    if (index >= tasks.length) return;
    results[index] = await tasks[index]();
    completed++;
    onProgress(completed, tasks.length);
    await runNext();
  }

  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => runNext());

  await Promise.all(workers);
  return results;
}

const TONES = ["emocional", "tecnico", "urgente", "inspiracional"] as const;
type Tone = (typeof TONES)[number];

const TONE_LABELS: Record<Tone, string> = {
  emocional: "Emocional",
  tecnico: "Técnico",
  urgente: "Urgente",
  inspiracional: "Inspiracional",
};

const STEPS = ["Negocio", "Plantilla", "Producto", "Generar"] as const;

const TRANSPARENT_PNG_FILE = (): File => {
  const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], "transparent.png", { type: "image/png" });
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedVariant {
  copy: Record<string, unknown>;
  backgroundImage: string;
  resultImage: string;
  template: string;
  angle: number;
  angleName: string;
  slideNumber?: number;
  slideRole?: string;
  promptsUsed?: PromptsUsed;
  timings?: Record<string, number>;
}

const SLIDE_ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  HOOK:      { bg: "rgba(255,149,0,0.15)",  text: "#FF9500" },
  PROBLEMA:  { bg: "rgba(255,69,58,0.15)",  text: "#FF453A" },
  AGITACION: { bg: "rgba(255,69,58,0.2)",   text: "#FF6B6B" },
  SOLUCION:  { bg: "rgba(0,181,173,0.15)",  text: "#00B5AD" },
  PRUEBA:    { bg: "rgba(10,132,255,0.15)", text: "#0A84FF" },
  CTA:       { bg: "rgba(48,209,88,0.15)",  text: "#30D158" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

function makeImageBriefLayer(log: { input: Record<string, unknown>; output: string } | null | undefined): PromptLayer | null {
  if (!log) return null;
  return {
    name: "Image Brief (Gemini Flash)",
    model: "gemini-flash",
    input: JSON.stringify(log.input, null, 2),
    prompt: log.output,
    status: "completed",
  };
}

export default function FabricaDeContenido() {
  const [step, setStep] = useState(0);

  // Step 1: Business info
  const [bizProduct, setBizProduct] = useState("");
  const [bizOffer, setBizOffer] = useState("");
  const [bizAudience, setBizAudience] = useState("");
  const [bizProblem, setBizProblem] = useState("");
  const [bizTone, setBizTone] = useState<Tone>("emocional");

  // Step 2: Templates (multi-select) + angle count
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(["classic-editorial-right"]);
  const [numAngles, setNumAngles] = useState(3);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("");

  // Creation mode (Step 1)
  const [creationMode, setCreationMode] = useState<"independiente" | "secuencia" | "sorteo">("independiente");
  const [sequenceNarrative, setSequenceNarrative] = useState("");
  const [sequenceCount, setSequenceCount] = useState(3);

  // Sorteo fields (Step 1, when mode === "sorteo")
  const [sorteoPremios, setSorteoPremios] = useState("");
  const [sorteoColaboradores, setSorteoColaboradores] = useState("");
  const [sorteoCondiciones, setSorteoCondiciones] = useState("");

  // Step 3: Product upload
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // Reference creative
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [referenceAnalysis, setReferenceAnalysis] = useState<any>(null);
  const [analyzingReference, setAnalyzingReference] = useState(false);

  // Business profile (from Mi Negocio localStorage)
  const [businessProfile, setBusinessProfile] = useState<Record<string, unknown> | null>(null);
  const [businessLogo, setBusinessLogo] = useState<{ base64: string; mimeType: string } | null>(null);
  const [businessLogoDark, setBusinessLogoDark] = useState<{ base64: string; mimeType: string } | null>(null);
  const [businessLogoLight, setBusinessLogoLight] = useState<{ base64: string; mimeType: string } | null>(null);

  useEffect(() => {
    async function loadBusinessProfile() {
      let profile: Record<string, unknown> | null = null;

      // 1. Try localStorage first
      try {
        const saved = localStorage.getItem("negocio_perfil");
        if (saved) profile = JSON.parse(saved);
      } catch { /* ignore */ }

      // 2. If no logo in localStorage, check sessionStorage fallback
      // (used when localStorage quota was exceeded during save)
      if (profile && !profile.logoBase64 && !profile.logoDarkBase64 && !profile.logoLightBase64) {
        try {
          const sessionSaved = sessionStorage.getItem("negocio_perfil_session");
          if (sessionSaved) {
            const sessionProfile = JSON.parse(sessionSaved);
            profile = { ...profile, ...sessionProfile };
          }
        } catch { /* ignore */ }
      }

      if (profile) {
        setBusinessProfile(profile);
        if (profile.logoBase64) {
          setBusinessLogo({ base64: profile.logoBase64 as string, mimeType: (profile.logoMimeType as string) ?? "image/png" });
        }
        if (profile.logoDarkBase64) {
          setBusinessLogoDark({ base64: profile.logoDarkBase64 as string, mimeType: (profile.logoDarkMimeType as string) ?? "image/png" });
        }
        if (profile.logoLightBase64) {
          setBusinessLogoLight({ base64: profile.logoLightBase64 as string, mimeType: (profile.logoLightMimeType as string) ?? "image/png" });
        }
        if (profile.category) {
          setTemplateCategoryFilter(profile.category as string);
        }
      }

      // 3. If still no logo, fetch from API (covers cross-device / fresh sessions)
      const hasLogo = profile?.logoBase64 || profile?.logoDarkBase64 || profile?.logoLightBase64;
      if (!hasLogo) {
        try {
          const res = await fetch("/api/user/business-profile");
          if (res.ok) {
            const { data } = await res.json();
            if (data) {
              if (!profile) {
                setBusinessProfile(data);
                if (data.product_category) setTemplateCategoryFilter(data.product_category as string);
              }
              if (data.logo_url) {
                const base64 = data.logo_url.split(",")[1];
                const mimeType = data.logo_url.split(";")[0]?.split(":")[1] ?? "image/png";
                if (base64) setBusinessLogo({ base64, mimeType });
              }
              if (data.metadata?.logoDark) {
                const base64 = data.metadata.logoDark.split(",")[1];
                const mimeType = data.metadata.logoDark.split(";")[0]?.split(":")[1] ?? "image/png";
                if (base64) setBusinessLogoDark({ base64, mimeType });
              }
              if (data.metadata?.logoLight) {
                const base64 = data.metadata.logoLight.split(",")[1];
                const mimeType = data.metadata.logoLight.split(";")[0]?.split(":")[1] ?? "image/png";
                if (base64) setBusinessLogoLight({ base64, mimeType });
              }
            }
          }
        } catch { /* ignore */ }
      }
    }

    loadBusinessProfile();
  }, []);

  // Auto-select sorteo template when switching to sorteo mode
  useEffect(() => {
    if (creationMode === "sorteo") {
      setSelectedTemplates(["sorteo-giveaway-center"]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creationMode]);

  // Pre-rellenar desde "Usar esta config" de Mis Creativos
  useEffect(() => {
    try {
      const draft = localStorage.getItem("adgen_draft_batch");
      if (!draft) return;
      localStorage.removeItem("adgen_draft_batch");
      const config = JSON.parse(draft);
      if (config.product)  setBizProduct(config.product);
      if (config.offer)    setBizOffer(config.offer);
      if (config.audience) setBizAudience(config.audience);
      if (config.problem)  setBizProblem(config.problem);
      if (config.tone && ["emocional", "tecnico", "urgente", "inspiracional"].includes(config.tone)) {
        setBizTone(config.tone);
      }
      if (config.creationMode === "secuencia" || config.creationMode === "independiente" || config.creationMode === "sorteo") {
        setCreationMode(config.creationMode);
      }
      setStep(0);
    } catch {
      // ignore
    }
  }, []);

  // Step 4: Generation state
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoStep, setAutoStep] = useState<string | null>(null);
  const [variantsGenerating, setVariantsGenerating] = useState(false);
  const [variantsProgress, setVariantsProgress] = useState("");
  const [totalCreatives, setTotalCreatives] = useState(0);
  const [completedCreatives, setCompletedCreatives] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  const [singleTimings, setSingleTimings] = useState<Record<string, number> | null>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const templateNeedsSceneOrProduct = (templateId: string): boolean => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template?.noProductLayer) return false;
    return (
      TEMPLATE_COPY_ZONES[templateId] !== undefined &&
      (productFile !== null || template?.requiresSceneGeneration === true)
    );
  };

  // ─── Save creativo to Supabase + localStorage (backup) ────────────────────

  const saveCreativo = useCallback(
    async (
      imageDataUrl: string,
      templateId: string,
      angleName?: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      copy?: Record<string, any>,
      slideRole?: string,
      slideNumber?: number,
      promptsUsed?: PromptsUsed,
    ) => {
      // 1. localStorage como backup rápido
      try {
        const existing = JSON.parse(localStorage.getItem("creativos_guardados") ?? "[]");
        const newCreativo = {
          id: Date.now().toString(),
          image: imageDataUrl,
          template: templateId,
          angulo: angleName,
          producto: bizProduct,
          oferta: bizOffer,
          fecha: new Date().toISOString(),
        };
        localStorage.setItem(
          "creativos_guardados",
          JSON.stringify([newCreativo, ...existing].slice(0, 50))
        );
      } catch {
        // ignore storage errors
      }

      // 2. Supabase (fire and forget — no bloquea la UI)
      try {
        // Extraer solo el base64 puro para reducir overhead (sin prefijo data:...)
        const base64Data = imageDataUrl.startsWith('data:')
          ? imageDataUrl.split(',')[1]
          : imageDataUrl

        await fetch('/api/user/creatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            templateId,
            angleName,
            copyData: {
              product: bizProduct,
              offer: bizOffer,
              audience: bizAudience,
              problem: bizProblem,
              tone: bizTone,
              creationMode,
              angleName,
              slideRole: slideRole ?? null,
              slideNumber: slideNumber ?? null,
              copy: copy ?? null,
              promptsUsed: promptsUsed ?? undefined,
            },
          }),
        })
      } catch {
        // no bloquear la UI si falla el guardado
      }
    },
    [bizProduct, bizOffer, bizAudience, bizProblem, bizTone, creationMode]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAnalyzeReference = async () => {
    if (!referenceImage) return;
    setAnalyzingReference(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(referenceImage);
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        const mimeType = referenceImage.type;
        const res = await fetch("/api/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "ANALYZE_REFERENCE",
            imageBase64: base64,
            mimeType,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setReferenceAnalysis(json.data.analysis);
        }
        setAnalyzingReference(false);
      };
    } catch {
      setAnalyzingReference(false);
    }
  };

  const handleProductFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = async () => {
    const primaryTemplate = selectedTemplates[0];
    setAutoGenerating(true);
    setAutoStep("Generando copy...");
    setError(null);
    setResultImage(null);
    setVariants([]);
    setSingleTimings(null);
    const _t0 = Date.now();
    const _timings: Record<string, number> = {};

    try {
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
          templateSchema: getTemplateSchema(primaryTemplate),
          templateHint: getTemplateHint(primaryTemplate),
          copyZone: TEMPLATES.find((t) => t.id === primaryTemplate)?.copyZone ?? "left",
          rawProductPrompt: TEMPLATES.find((t) => t.id === primaryTemplate)?.rawProductPrompt === true || undefined,
          personOnly: TEMPLATES.find((t) => t.id === primaryTemplate)?.personOnly === true || undefined,
          businessProfile: businessProfile ?? undefined,
          referenceStyle: referenceAnalysis ? referenceAnalysis.recommendations : undefined,
          backgroundStyleGuide: (() => {
            const tpl = TEMPLATES.find((t) => t.id === primaryTemplate);
            const cat = (businessProfile?.category as string) ?? "";
            return (cat && tpl?.categoryBackgroundPrompts?.[cat]) ?? tpl?.defaultBackgroundPrompt ?? undefined;
          })(),
          sorteoData: creationMode === "sorteo" ? { premios: sorteoPremios, colaboradores: sorteoColaboradores, condiciones: sorteoCondiciones } : undefined,
        }),
      });
      const copyData = await copyRes.json();
      if (!copyRes.ok) throw new Error(copyData.error || `Error ${copyRes.status}`);
      const copy = copyData.data?.copy;
      if (!copy) throw new Error("No se generó copy");
      const _imageBriefLog: { input: Record<string, unknown>; output: string } | null = copyData.data?.imageBriefLog ?? null;
      _timings["Copy"] = Date.now() - _t0;

      const templateDef = TEMPLATES.find((t) => t.id === primaryTemplate);

      // ═══════════════════════════════════════════════════════════════
      // PIPELINE V2: Creative Brief → Background → Scene (all-in-one)
      // Activated when template has pipelineV2: true
      // ═══════════════════════════════════════════════════════════════
      if (templateDef?.pipelineV2 === true) {
        setAutoStep("Pipeline V2: Generando brief + escena...");
        const _t1 = Date.now();
        const v2Res = await fetch("/api/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            mode: "PIPELINE_V2",
            templateId: primaryTemplate,
            productName: bizProduct,
            productDescription: bizProblem,
            businessProfile: businessProfile ?? undefined,
            offer: bizOffer ? { active: true, type: "general", label: bizOffer } : undefined,
            variantIndex: 0,
            aspectRatio: "1:1",
          }),
        });
        const v2Data = await v2Res.json();
        if (!v2Res.ok) throw new Error(v2Data.error || `Error ${v2Res.status}`);
        _timings["Pipeline V2 (Brief+BG+Scene)"] = Date.now() - _t1;

        const sceneDataUrl = v2Data.data?.sceneImage;
        if (!sceneDataUrl) throw new Error("Pipeline V2 no generó escena");
        setResultImage(sceneDataUrl); // show intermediate scene

        // Apply TEMPLATE_BETA: text overlay on top of the V2 scene
        setAutoStep("Aplicando texto y diseño...");
        const sceneBlob = await fetch(sceneDataUrl).then((r) => r.blob());
        const sceneBgFile = new File([sceneBlob], "v2-scene.png", { type: "image/png" });

        const fd = new FormData();
        fd.append("background", sceneBgFile);
        if (businessLogo) {
          fd.append("logoBase64", businessLogo.base64);
          fd.append("logoMimeType", businessLogo.mimeType);
        }
        if (businessLogoDark) {
          fd.append("logoDarkBase64", businessLogoDark.base64);
          fd.append("logoDarkMimeType", businessLogoDark.mimeType);
        }
        if (businessLogoLight) {
          fd.append("logoLightBase64", businessLogoLight.base64);
          fd.append("logoLightMimeType", businessLogoLight.mimeType);
        }
        fd.append("config", JSON.stringify({
          mode: "TEMPLATE_BETA",
          outputFormat: "png",
          quality: 95,
          copy: {
            cta: copy.title || undefined,
            headline: copy.headline || undefined,
            subheadline: copy.subheadline || undefined,
            badge: copy.badge || undefined,
            bullets: Array.isArray(copy.bullets) ? copy.bullets : undefined,
            primaryColor: typeof copy.primaryColor === "string" ? copy.primaryColor : undefined,
            brandColors: Array.isArray(businessProfile?.coloresMarca) && (businessProfile.coloresMarca as string[]).some(Boolean)
              ? businessProfile.coloresMarca as string[]
              : undefined,
          },
          templateBetaOptions: {
            templateId: primaryTemplate,
            canvas: { width: 1080, height: 1080 },
            includeLayoutSpec: true,
          },
        }));
        const _t2 = Date.now();
        const templateRes = await fetch("/api/compose", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: fd,
        });
        const templateData = await templateRes.json();
        if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
        _timings["Template"] = Date.now() - _t2;

        const finalImage = templateData.data?.image || templateData.data?.imageUrl;
        if (finalImage) {
          setResultImage(finalImage);
          _timings["Total"] = Date.now() - _t0;
          setSingleTimings({ ..._timings });
          const v2Brief = v2Data.data?.brief;
          const promptsUsed: PromptsUsed = {
            layers: [
              { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(primaryTemplate).join(", ")}`, status: "completed" },
              { name: "Creative Brief", model: "gpt-4.1-mini", prompt: v2Brief ? `mood="${v2Brief.mood}" scene="${v2Brief.scene_description?.slice(0, 80)}…"` : "V2 brief", status: "completed" },
              { name: "Background", model: "gemini-2.5-flash", prompt: v2Data.data?.prompts?.backgroundPrompt?.slice(0, 120) ?? "V2 background", status: "completed" },
              { name: "Escena con Persona", model: "gemini-2.5-flash", prompt: v2Data.data?.prompts?.personPrompt?.slice(0, 120) ?? "V2 person", status: "completed" },
              { name: "Template", prompt: primaryTemplate, status: "completed" },
            ],
          };
          saveCreativo(finalImage, primaryTemplate, undefined, copy, undefined, undefined, promptsUsed);
        }

        // Skip the rest of handleGenerate (V1 flow)
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // PIPELINE V1: Legacy flow (GENERATE_BACKGROUND → PRODUCT_IA → TEMPLATE_BETA)
      // ═══════════════════════════════════════════════════════════════
      setAutoStep("Generando background...");
      const _t1 = Date.now();
      const bgPrompt = resolveBgPrompt(templateDef, copy, businessProfile);
      const bgRes = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          mode: "GENERATE_BACKGROUND",
          prompt: bgPrompt,
          aspectRatio: "1:1",
        }),
      });
      const bgData = await bgRes.json();
      if (!bgRes.ok) throw new Error(bgData.error || `Error ${bgRes.status}`);
      const bgDataUrl = bgData.data?.image;
      if (!bgDataUrl) throw new Error("No se generó background");
      _timings["Background"] = Date.now() - _t1;
      const bgBlob = await fetch(bgDataUrl).then((r) => r.blob());
      const bgFile = new File([bgBlob], "generated-bg.png", { type: "image/png" });

      // sceneWithProduct + avatar: run PRODUCT_IA first (clean bg) → TEMPLATE_BETA second (text on top).
      // This prevents Gemini from overwriting pre-rendered copy when the person lands in the wrong zone.
      const _sceneWithProductAuto = TEMPLATES.find((t) => t.id === primaryTemplate)?.sceneWithProduct === true;
      const isSceneWithProductFlow = _sceneWithProductAuto && !!avatarFile && templateNeedsSceneOrProduct(primaryTemplate);

      // Helper: build the TEMPLATE_BETA FormData (used in both flow paths)
      const buildTemplateBetaForm = (bgInputFile: File) => {
        const fd = new FormData();
        fd.append("background", bgInputFile);
        if (businessLogo) {
          fd.append("logoBase64", businessLogo.base64);
          fd.append("logoMimeType", businessLogo.mimeType);
        }
        if (businessLogoDark) {
          fd.append("logoDarkBase64", businessLogoDark.base64);
          fd.append("logoDarkMimeType", businessLogoDark.mimeType);
        }
        if (businessLogoLight) {
          fd.append("logoLightBase64", businessLogoLight.base64);
          fd.append("logoLightMimeType", businessLogoLight.mimeType);
        }
        fd.append("config", JSON.stringify({
          mode: "TEMPLATE_BETA",
          outputFormat: "png",
          quality: 95,
          copy: {
            cta: copy.title || undefined,
            headline: copy.headline || undefined,
            subheadline: copy.subheadline || undefined,
            badge: copy.badge || undefined,
            bullets: Array.isArray(copy.bullets) ? copy.bullets : undefined,
            columnTitle: typeof copy.columnTitle === "string" ? copy.columnTitle : undefined,
            competitionTitle: typeof copy.competitionTitle === "string" ? copy.competitionTitle : undefined,
            competitionBullets: Array.isArray(copy.competitionBullets) ? copy.competitionBullets : undefined,
            primaryColor: typeof copy.primaryColor === "string" ? copy.primaryColor : undefined,
            brandColors: Array.isArray(businessProfile?.coloresMarca) && (businessProfile.coloresMarca as string[]).some(Boolean)
              ? businessProfile.coloresMarca as string[]
              : undefined,
          },
          templateBetaOptions: {
            templateId: primaryTemplate,
            canvas: { width: 1080, height: 1080 },
            includeLayoutSpec: true,
          },
        }));
        return fd;
      };

      if (isSceneWithProductFlow) {
        // ── NEW ORDER: PRODUCT_IA (clean bg) → TEMPLATE_BETA (text on top) ──────────
        setAutoStep("Generando escena con persona...");
        const templateMeta = TEMPLATES.find((t) => t.id === primaryTemplate);
        const effectiveProductPromptScene = (templateMeta?.copySchema?.includes("productPrompt") ? (copy.productPrompt as string) : undefined) || templateMeta?.defaultProductPrompt || "";
        const zoneSideScene: "left" | "right" | "bottom" | "top" | "center" =
          (TEMPLATE_COPY_ZONES[primaryTemplate] ?? "left") as "left" | "right" | "bottom" | "top" | "center";

        const productFormData = new FormData();
        productFormData.append("background", bgFile); // clean background — no text pre-rendered
        productFormData.append("product", productFile ?? TRANSPARENT_PNG_FILE());
        productFormData.append("avatarFile", avatarFile);
        productFormData.append("config", JSON.stringify({
          mode: "PRODUCT_IA",
          outputFormat: "png",
          quality: 95,
          copy: {},
          productIAOptions: {
            prompt: effectiveProductPromptScene,
            copyZone: zoneSideScene,
            includeLayoutSpec: false,
            skipTextRender: true,
            avatarSceneWithProduct: true,
            rawProductPrompt: (templateMeta as any)?.rawProductPrompt === true ? true : undefined,
            sharpProductOverlay: (templateMeta as any)?.sharpProductOverlay ?? undefined,
          },
        }));
        const _t2 = Date.now();
        const productRes = await fetch("/api/compose", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: productFormData,
        });
        const productData = await productRes.json();
        if (!productRes.ok) throw new Error(productData.error || `Error ${productRes.status}`);
        _timings["Escena"] = Date.now() - _t2;
        const sceneDataUrl = productData.data?.image || productData.data?.imageUrl;
        if (sceneDataUrl) setResultImage(sceneDataUrl); // show intermediate

        // TEMPLATE_BETA: apply gradient + text overlay on top of the Gemini scene
        setAutoStep("Aplicando texto y diseño...");
        let sceneBgFile = bgFile;
        if (sceneDataUrl) {
          const sceneBlob = await fetch(sceneDataUrl).then((r) => r.blob());
          sceneBgFile = new File([sceneBlob], "scene-bg.png", { type: "image/png" });
        }
        const _t3 = Date.now();
        const templateRes = await fetch("/api/compose", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: buildTemplateBetaForm(sceneBgFile),
        });
        const templateData = await templateRes.json();
        if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
        _timings["Template"] = Date.now() - _t3;
        const finalImage = templateData.data?.image || templateData.data?.imageUrl;
        if (finalImage) {
          setResultImage(finalImage);
          _timings["Total"] = Date.now() - _t0;
          setSingleTimings({ ..._timings });
          const promptsUsed: PromptsUsed = {
            layers: ([
              { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(primaryTemplate).join(", ")}`, status: "completed" },
              makeImageBriefLayer(_imageBriefLog),
              { name: "Background", model: "gemini", prompt: bgData.data?.promptUsed ?? bgPrompt, status: "completed" },
              { name: "Escena con Persona", model: "gemini", prompt: productData.data?.promptUsed, status: "completed" },
              { name: "Template", prompt: primaryTemplate, status: "completed" },
            ] as (PromptLayer | null)[]).filter((l): l is PromptLayer => l !== null),
          };
          saveCreativo(finalImage, primaryTemplate, undefined, copy, undefined, undefined, promptsUsed);
        }
      } else {
        // ── ORIGINAL ORDER: TEMPLATE_BETA (text on bg) → PRODUCT_IA (product/scene) ──
        setAutoStep("Componiendo template...");
        const _t2 = Date.now();
        const templateRes = await fetch("/api/compose", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: buildTemplateBetaForm(bgFile),
        });
        const templateData = await templateRes.json();
        if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
        _timings["Template"] = Date.now() - _t2;
        const templateResultImage = templateData.data?.image || templateData.data?.imageUrl;
        if (templateResultImage) setResultImage(templateResultImage);

        if (templateNeedsSceneOrProduct(primaryTemplate) && templateResultImage) {
          setAutoStep("Integrando producto...");
          const composedBgBlob = await fetch(templateResultImage).then((r) => r.blob());
          const composedBgFile = new File([composedBgBlob], "composed-bg.png", { type: "image/png" });

          const isSceneTemplate = TEMPLATES.find((t) => t.id === primaryTemplate)?.requiresSceneGeneration === true;
          const effectiveProductFile = productFile ?? TRANSPARENT_PNG_FILE();
          const productFormData = new FormData();
          productFormData.append("background", composedBgFile);
          productFormData.append("product", effectiveProductFile);
          if (isSceneTemplate && avatarFile) {
            productFormData.append("avatarFile", avatarFile);
          }
          const templateMeta = TEMPLATES.find((t) => t.id === primaryTemplate);
          const hasRawProductPrompt = (templateMeta as any)?.rawProductPrompt === true;
          const effectiveProductPrompt = (templateMeta?.copySchema?.includes("productPrompt") ? (copy.productPrompt as string) : undefined) || templateMeta?.defaultProductPrompt || "";
          console.log(`[page:productIA] templateId=${primaryTemplate} copy.productPrompt=${JSON.stringify((copy as Record<string,unknown>).productPrompt ?? null)} inSchema=${templateMeta?.copySchema?.includes("productPrompt")} effectiveProductPrompt="${effectiveProductPrompt.slice(0, 80)}"`);
          const zoneSide: "left" | "right" | "bottom" | "top" | "center" = (
            primaryTemplate === "editorial-lifestyle-left" &&
            (copy as Record<string, unknown>).textSide === "right"
          ) ? "right" : ((TEMPLATE_COPY_ZONES[primaryTemplate] ?? "left") as "left" | "right" | "bottom" | "top" | "center");
          const effectiveScenePrompt = isSceneTemplate
            ? ((copy.sceneAction as string) || effectiveProductPrompt)
            : effectiveProductPrompt;
          productFormData.append("config", JSON.stringify({
            mode: "PRODUCT_IA",
            outputFormat: "png",
            quality: 95,
            copy: {},
            productIAOptions: {
              prompt: effectiveScenePrompt,
              copyZone: zoneSide,
              includeLayoutSpec: false,
              skipTextRender: true,
              sceneMode: isSceneTemplate && !templateMeta?.sceneWithProduct && !avatarFile,
              useAvatarAsScene: isSceneTemplate && !templateMeta?.sceneWithProduct && !!avatarFile,
              splitComparison: templateMeta?.splitComparison ?? false,
              rawProductPrompt: hasRawProductPrompt ? true : undefined,
              personScene: templateMeta?.personScene === true ? true : undefined,
              sharpProductOverlay: (templateMeta as any)?.sharpProductOverlay ?? undefined,
              hasRealProduct: !!productFile,
              sceneFullBleed: templateMeta?.sceneFullBleed === true ? true : undefined,
            },
          }));
          const _t3 = Date.now();
          const productRes = await fetch("/api/compose", {
            method: "POST",
            headers: { Accept: "application/json" },
            body: productFormData,
          });
          const productData = await productRes.json();
          if (!productRes.ok) throw new Error(productData.error || `Error ${productRes.status}`);
          _timings["Producto"] = Date.now() - _t3;
          const finalImage = productData.data?.image || productData.data?.imageUrl;
          if (finalImage) {
            setResultImage(finalImage);
            _timings["Total"] = Date.now() - _t0;
            setSingleTimings({ ..._timings });
            const promptsUsed: PromptsUsed = {
              layers: ([
                { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(primaryTemplate).join(", ")}`, status: "completed" },
                makeImageBriefLayer(_imageBriefLog),
                { name: "Background", model: "gemini", prompt: bgData.data?.promptUsed ?? bgPrompt, status: "completed" },
                { name: "Template", prompt: primaryTemplate, status: "completed" },
                { name: "Producto/Escena", model: "gemini", prompt: productData.data?.promptUsed, status: "completed" },
              ] as (PromptLayer | null)[]).filter((l): l is PromptLayer => l !== null),
            };
            saveCreativo(finalImage, primaryTemplate, undefined, copy, undefined, undefined, promptsUsed);
          }
        } else if (templateResultImage) {
          _timings["Total"] = Date.now() - _t0;
          setSingleTimings({ ..._timings });
          const promptsUsed: PromptsUsed = {
            layers: ([
              { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(primaryTemplate).join(", ")}`, status: "completed" },
              makeImageBriefLayer(_imageBriefLog),
              { name: "Background", model: "gemini", prompt: bgData.data?.promptUsed ?? bgPrompt, status: "completed" },
              { name: "Template", prompt: primaryTemplate, status: "completed" },
              { name: "Producto/Escena", status: "skipped" },
            ] as (PromptLayer | null)[]).filter((l): l is PromptLayer => l !== null),
          };
          saveCreativo(templateResultImage, primaryTemplate, undefined, copy, undefined, undefined, promptsUsed);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en secuencia automática");
    } finally {
      setAutoGenerating(false);
      setAutoStep(null);
    }
  };

  const handleGenerateAngles = async () => {
    setVariantsGenerating(true);
    setVariants([]);
    setResultImage(null);
    setError(null);
    setProgressPercent(0);
    setCompletedCreatives(0);

    try {
      // Step 1: Generate copy for all templates in parallel
      setVariantsProgress("Generando copy para todas las plantillas...");
      const allCopiesAndLogs = await Promise.all(
        selectedTemplates.map(async (templateId) => {
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
              templateSchema: getTemplateSchema(templateId),
              numberOfVariants: numAngles,
              templateHint: getTemplateHint(templateId),
              copyZone: TEMPLATES.find((t) => t.id === templateId)?.copyZone ?? "left",
              rawProductPrompt: TEMPLATES.find((t) => t.id === templateId)?.rawProductPrompt === true || undefined,
              personOnly: TEMPLATES.find((t) => t.id === templateId)?.personOnly === true || undefined,
              businessProfile: businessProfile ?? undefined,
              referenceStyle: referenceAnalysis ? referenceAnalysis.recommendations : undefined,
              backgroundStyleGuide: (() => {
                const tpl = TEMPLATES.find((t) => t.id === templateId);
                const cat = (businessProfile?.category as string) ?? "";
                return (cat && tpl?.categoryBackgroundPrompts?.[cat]) ?? tpl?.defaultBackgroundPrompt ?? undefined;
              })(),
              sorteoData: creationMode === "sorteo" ? { premios: sorteoPremios, colaboradores: sorteoColaboradores, condiciones: sorteoCondiciones } : undefined,
            }),
          });
          const copyData = await copyRes.json();
          if (!copyRes.ok) throw new Error(copyData.error || `Error ${copyRes.status}`);
          const rawCopy = copyData.data?.copy;
          const copies: Record<string, unknown>[] = Array.isArray(rawCopy)
            ? rawCopy
            : rawCopy
              ? [rawCopy]
              : [];
          if (copies.length === 0) {
            const meta = TEMPLATES.find((t) => t.id === templateId);
            throw new Error(
              `No se generaron ángulos para ${meta ? `${meta.icon} ${meta.name}` : templateId}`
            );
          }
          const imageBriefLog: { input: Record<string, unknown>; output: string } | null = copyData.data?.imageBriefLog ?? null;
          return { copies, imageBriefLog };
        })
      );
      const allCopies = allCopiesAndLogs.map((r) => r.copies);
      const imageBriefLogByTemplate = new Map(
        selectedTemplates.map((id, i) => [id, allCopiesAndLogs[i].imageBriefLog])
      );

      // Step 2: Build task list — background se genera dentro de cada pipeline individual
      interface TaskItem {
        templateId: string;
        angleIndex: number;
        copy: Record<string, unknown>;
        colorMode?: "light" | "dark";
      }
      const taskList: TaskItem[] = [];
      for (let ti = 0; ti < selectedTemplates.length; ti++) {
        for (let ai = 0; ai < allCopies[ti].length; ai++) {
          const tId = selectedTemplates[ti];
          const tCopy = allCopies[ti][ai];
          if (tId === "classic-editorial-right") {
            taskList.push({ templateId: tId, angleIndex: ai, copy: tCopy, colorMode: "light" });
            taskList.push({ templateId: tId, angleIndex: ai, copy: tCopy, colorMode: "dark" });
          } else {
            taskList.push({ templateId: tId, angleIndex: ai, copy: tCopy });
          }
        }
      }

      const totalTasks = taskList.length;
      setTotalCreatives(totalTasks);
      setVariantsProgress(`Generando creativos... 0/${totalTasks}`);

      // Accumulator for incremental display as tasks complete
      const variantAccumulator: GeneratedVariant[] = [];

      // Step 3: Pipeline completo por creativo con concurrencia CONCURRENCY.
      // Cada tarea genera su fondo y lo compone de forma independiente.
      // Los creativos aparecen en pantalla a medida que terminan, sin esperar a los demás.
      const tasks = taskList.map(({ templateId, angleIndex, copy, colorMode }) =>
        async (): Promise<GeneratedVariant> => {
          const baseAngleName = ANGLE_NAMES[angleIndex] ?? `Ángulo ${angleIndex + 1}`;
          const angleName = colorMode ? `${baseAngleName} · ${colorMode === "dark" ? "Dark" : "Light"}` : baseAngleName;
          const tplMeta = TEMPLATES.find((t) => t.id === templateId);

          // ═══════════════════════════════════════════════════════════
          // PIPELINE V2 (angles): Brief → BG → Scene all-in-one
          // ═══════════════════════════════════════════════════════════
          if (tplMeta?.pipelineV2 === true) {
            const _tV2 = Date.now();
            const _taskTimings: Record<string, number> = {};
            const v2Res = await fetch("/api/compose", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({
                mode: "PIPELINE_V2",
                templateId,
                productName: bizProduct,
                productDescription: bizProblem,
                businessProfile: businessProfile ?? undefined,
                offer: bizOffer ? { active: true, type: "general", label: bizOffer } : undefined,
                variantIndex: angleIndex,
                aspectRatio: "1:1",
              }),
            });
            const v2Data = await v2Res.json();
            if (!v2Res.ok) throw new Error(v2Data.error || `Error ${v2Res.status}`);
            _taskTimings["Pipeline V2"] = Date.now() - _tV2;

            const sceneDataUrl = v2Data.data?.sceneImage;
            if (!sceneDataUrl) throw new Error(`Pipeline V2 no generó escena para ${angleName}`);

            // TEMPLATE_BETA: text overlay
            const sceneBlob = await fetch(sceneDataUrl).then((r) => r.blob());
            const sceneBgFile = new File([sceneBlob], `v2-scene-${templateId}-${angleIndex}.png`, { type: "image/png" });
            const fd = new FormData();
            fd.append("background", sceneBgFile);
            if (businessLogo) { fd.append("logoBase64", businessLogo.base64); fd.append("logoMimeType", businessLogo.mimeType); }
            if (businessLogoDark) { fd.append("logoDarkBase64", businessLogoDark.base64); fd.append("logoDarkMimeType", businessLogoDark.mimeType); }
            if (businessLogoLight) { fd.append("logoLightBase64", businessLogoLight.base64); fd.append("logoLightMimeType", businessLogoLight.mimeType); }
            fd.append("config", JSON.stringify({
              mode: "TEMPLATE_BETA",
              outputFormat: "png",
              quality: 95,
              copy: {
                cta: copy.title || undefined,
                headline: copy.headline || undefined,
                subheadline: copy.subheadline || undefined,
                badge: copy.badge || undefined,
                bullets: Array.isArray(copy.bullets) ? copy.bullets : undefined,
                primaryColor: typeof copy.primaryColor === "string" ? copy.primaryColor : undefined,
                brandColors: Array.isArray(businessProfile?.coloresMarca) && (businessProfile.coloresMarca as string[]).some(Boolean)
                  ? businessProfile.coloresMarca as string[]
                  : undefined,
                colorMode: colorMode ?? undefined,
              },
              templateBetaOptions: { templateId, canvas: { width: 1080, height: 1080 }, includeLayoutSpec: false },
            }));
            const _tTpl = Date.now();
            const templateRes = await fetch("/api/compose", { method: "POST", headers: { Accept: "application/json" }, body: fd });
            const templateData = await templateRes.json();
            if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
            _taskTimings["Template"] = Date.now() - _tTpl;
            _taskTimings["Total"] = Date.now() - _tV2;

            const finalImg = (templateData.data?.image || templateData.data?.imageUrl || sceneDataUrl) as string;
            const v2Brief = v2Data.data?.brief;
            const promptsUsed: PromptsUsed = {
              layers: [
                { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(templateId).join(", ")}`, status: "completed" },
                { name: "Creative Brief", model: "gpt-4.1-mini", prompt: v2Brief ? `mood="${v2Brief.mood}"` : "V2 brief", status: "completed" },
                { name: "Background + Scene", model: "gemini-2.5-flash", prompt: v2Data.data?.prompts?.backgroundPrompt?.slice(0, 80) ?? "V2", status: "completed" },
                { name: "Template", prompt: templateId, status: "completed" },
              ],
            };
            const variant: GeneratedVariant = { copy, backgroundImage: v2Data.data?.backgroundImage ?? sceneDataUrl, resultImage: finalImg, template: templateId, angle: angleIndex, angleName, promptsUsed, timings: _taskTimings };
            variantAccumulator.push(variant);
            setVariants([...variantAccumulator]);
            saveCreativo(finalImg, templateId, angleName, copy, undefined, undefined, promptsUsed);
            return variant;
          }

          // ═══════════════════════════════════════════════════════════
          // PIPELINE V1 (angles): Legacy flow
          // ═══════════════════════════════════════════════════════════

          // 1. Generar fondo para este creativo específico
          const bgPrompt = resolveBgPrompt(tplMeta, copy, businessProfile, colorMode);
          const _bgRes = await fetch("/api/compose", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              mode: "GENERATE_BACKGROUND",
              prompt: bgPrompt,
              aspectRatio: "1:1",
            }),
          });
          const _bgData = await _bgRes.json();
          if (!_bgRes.ok) throw new Error(_bgData.error || `Error ${_bgRes.status}`);
          const bgDataUrl = _bgData.data?.image as string;
          if (!bgDataUrl) {
            const _m = TEMPLATES.find((t) => t.id === templateId);
            throw new Error(`No se generó fondo para ${_m ? `${_m.icon} ${_m.name}` : templateId} ángulo ${angleIndex + 1}`);
          }
          const _bgBlob = await fetch(bgDataUrl).then((r) => r.blob());
          const bgFile = new File([_bgBlob], `bg-${templateId}-${angleIndex}.png`, { type: "image/png" });

          // 2. Componer template + producto/escena
          const _sceneWithProductAngles = tplMeta?.sceneWithProduct === true;
          const isSceneWithProductFlowAngles = _sceneWithProductAngles && !!avatarFile && templateNeedsSceneOrProduct(templateId);

          // Helper: build TEMPLATE_BETA FormData for this angle
          const buildAngleTemplateBetaForm = (bgInputFile: File) => {
            const fd = new FormData();
            fd.append("background", bgInputFile);
            if (businessLogo) {
              fd.append("logoBase64", businessLogo.base64);
              fd.append("logoMimeType", businessLogo.mimeType);
            }
            if (businessLogoDark) {
              fd.append("logoDarkBase64", businessLogoDark.base64);
              fd.append("logoDarkMimeType", businessLogoDark.mimeType);
            }
            if (businessLogoLight) {
              fd.append("logoLightBase64", businessLogoLight.base64);
              fd.append("logoLightMimeType", businessLogoLight.mimeType);
            }
            fd.append("config", JSON.stringify({
              mode: "TEMPLATE_BETA",
              outputFormat: "png",
              quality: 95,
              copy: {
                cta: copy.title || undefined,
                headline: copy.headline || undefined,
                subheadline: copy.subheadline || undefined,
                badge: copy.badge || undefined,
                bullets: Array.isArray(copy.bullets) ? copy.bullets : undefined,
                columnTitle: typeof copy.columnTitle === "string" ? copy.columnTitle : undefined,
                competitionTitle: typeof copy.competitionTitle === "string" ? copy.competitionTitle : undefined,
                competitionBullets: Array.isArray(copy.competitionBullets) ? copy.competitionBullets : undefined,
                primaryColor: typeof copy.primaryColor === "string" ? copy.primaryColor : undefined,
                brandColors: Array.isArray(businessProfile?.coloresMarca) && (businessProfile.coloresMarca as string[]).some(Boolean)
                  ? businessProfile.coloresMarca as string[]
                  : undefined,
                colorMode: colorMode ?? undefined,
              },
              templateBetaOptions: {
                templateId,
                canvas: { width: 1080, height: 1080 },
                includeLayoutSpec: false,
              },
            }));
            return fd;
          };

          if (isSceneWithProductFlowAngles) {
            // ── NEW ORDER: PRODUCT_IA (clean bg) → TEMPLATE_BETA (text on top) ──────────
            const effectiveProductPromptScene = (tplMeta?.copySchema?.includes("productPrompt") ? (copy.productPrompt as string) : undefined) || tplMeta?.defaultProductPrompt || "";
            const zoneSideScene = (TEMPLATE_COPY_ZONES[templateId] ?? "left") as "left" | "right" | "bottom" | "top" | "center";

            const productForm = new FormData();
            productForm.append("background", bgFile); // clean bg — no text pre-rendered
            productForm.append("product", productFile ?? TRANSPARENT_PNG_FILE());
            productForm.append("avatarFile", avatarFile);
            productForm.append("config", JSON.stringify({
              mode: "PRODUCT_IA",
              outputFormat: "png",
              quality: 95,
              copy: {},
              productIAOptions: {
                prompt: effectiveProductPromptScene,
                copyZone: zoneSideScene,
                includeLayoutSpec: false,
                skipTextRender: true,
                avatarSceneWithProduct: true,
                sharpProductOverlay: (tplMeta as any)?.sharpProductOverlay ?? undefined,
              },
            }));
            const _tTask = Date.now();
            const _taskTimings: Record<string, number> = {};
            const _tScene = Date.now();
            const productRes = await fetch("/api/compose", {
              method: "POST",
              headers: { Accept: "application/json" },
              body: productForm,
            });
            const productData = await productRes.json();
            if (!productRes.ok) throw new Error(productData.error || `Error ${productRes.status}`);
            _taskTimings["Escena"] = Date.now() - _tScene;
            const sceneDataUrl = productData.data?.image || productData.data?.imageUrl;

            // TEMPLATE_BETA: apply text overlay on top of the Gemini scene
            let sceneBgFile = bgFile;
            if (sceneDataUrl) {
              const sceneBlob = await fetch(sceneDataUrl).then((r) => r.blob());
              sceneBgFile = new File([sceneBlob], `scene-${templateId}-${angleIndex}.png`, { type: "image/png" });
            }
            const _tTpl = Date.now();
            const templateRes = await fetch("/api/compose", {
              method: "POST",
              headers: { Accept: "application/json" },
              body: buildAngleTemplateBetaForm(sceneBgFile),
            });
            const templateData = await templateRes.json();
            if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
            _taskTimings["Template"] = Date.now() - _tTpl;
            _taskTimings["Total"] = Date.now() - _tTask;
            const finalImg = (templateData.data?.image || templateData.data?.imageUrl || sceneDataUrl) as string;

            const promptsUsed: PromptsUsed = {
              layers: ([
                { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(templateId).join(", ")}`, status: "completed" },
                makeImageBriefLayer(imageBriefLogByTemplate.get(templateId)),
                { name: "Background", model: "gemini", prompt: bgDataUrl ? bgPrompt : undefined, status: "completed" },
                { name: "Escena con Persona", model: "gemini", prompt: productData.data?.promptUsed, status: "completed" },
                { name: "Template", prompt: templateId, status: "completed" },
              ] as (PromptLayer | null)[]).filter((l): l is PromptLayer => l !== null),
            };
            const variant: GeneratedVariant = { copy, backgroundImage: bgDataUrl, resultImage: finalImg, template: templateId, angle: angleIndex, angleName, promptsUsed, timings: _taskTimings };
            variantAccumulator.push(variant);
            setVariants([...variantAccumulator]);
            saveCreativo(finalImg, templateId, angleName, copy, undefined, undefined, promptsUsed);
            return variant;
          }

          // ── ORIGINAL ORDER: TEMPLATE_BETA → PRODUCT_IA ───────────────────────────────
          // TEMPLATE_BETA
          const _tTask = Date.now();
          const _taskTimings: Record<string, number> = {};
          const _tTpl = Date.now();
          const templateRes = await fetch("/api/compose", {
            method: "POST",
            headers: { Accept: "application/json" },
            body: buildAngleTemplateBetaForm(bgFile),
          });
          const templateData = await templateRes.json();
          if (!templateRes.ok)
            throw new Error(templateData.error || `Error ${templateRes.status}`);
          _taskTimings["Template"] = Date.now() - _tTpl;
          const resultImg = (templateData.data?.image || templateData.data?.imageUrl) as string;
          if (!resultImg) {
            throw new Error(
              `No se generó imagen para ${tplMeta ? `${tplMeta.icon} ${tplMeta.name}` : templateId} ángulo ${angleIndex + 1}`
            );
          }

          // PRODUCT_IA (optional — runs if product file exists OR template requires scene generation)
          let finalImg = resultImg;
          if (templateNeedsSceneOrProduct(templateId)) {
            const isSceneTemplate = tplMeta?.requiresSceneGeneration === true;
            const effectiveProductFile = productFile ?? TRANSPARENT_PNG_FILE();
            const variantBgBlob = await fetch(resultImg).then((r) => r.blob());
            const variantBgFile = new File([variantBgBlob], `composed-${templateId}-${angleIndex}.png`, { type: "image/png" });
            const productForm = new FormData();
            productForm.append("background", variantBgFile);
            productForm.append("product", effectiveProductFile);
            if (isSceneTemplate && avatarFile) {
              productForm.append("avatarFile", avatarFile);
            }
            const hasRawProductPromptAngles = (tplMeta as any)?.rawProductPrompt === true;
            const effectiveProductPrompt = (tplMeta?.copySchema?.includes("productPrompt") ? (copy.productPrompt as string) : undefined) || tplMeta?.defaultProductPrompt || "";
            const zoneSide = TEMPLATE_COPY_ZONES[templateId] ?? "left";
            const effectiveScenePrompt = isSceneTemplate
              ? ((copy.sceneAction as string) || effectiveProductPrompt)
              : effectiveProductPrompt;
            productForm.append("config", JSON.stringify({
              mode: "PRODUCT_IA",
              outputFormat: "png",
              quality: 95,
              copy: {},
              productIAOptions: {
                prompt: effectiveScenePrompt,
                copyZone: zoneSide,
                includeLayoutSpec: false,
                skipTextRender: true,
                sceneMode: isSceneTemplate && !tplMeta?.sceneWithProduct && !avatarFile,
                useAvatarAsScene: isSceneTemplate && !tplMeta?.sceneWithProduct && !!avatarFile,
                splitComparison: tplMeta?.splitComparison ?? false,
                rawProductPrompt: hasRawProductPromptAngles ? true : undefined,
                personScene: tplMeta?.personScene === true ? true : undefined,
                sharpProductOverlay: (tplMeta as any)?.sharpProductOverlay ?? undefined,
                hasRealProduct: !!productFile,
                sceneFullBleed: tplMeta?.sceneFullBleed === true ? true : undefined,
              },
            }));
            const _tProd = Date.now();
            const productRes = await fetch("/api/compose", {
              method: "POST",
              headers: { Accept: "application/json" },
              body: productForm,
            });
            const productData = await productRes.json();
            if (!productRes.ok) throw new Error(productData.error || `Error ${productRes.status}`);
            _taskTimings["Producto"] = Date.now() - _tProd;
            _taskTimings["Total"] = Date.now() - _tTask;
            finalImg = productData.data?.image || productData.data?.imageUrl || resultImg;
            const promptsUsed: PromptsUsed = {
              layers: ([
                { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(templateId).join(", ")}`, status: "completed" },
                makeImageBriefLayer(imageBriefLogByTemplate.get(templateId)),
                { name: "Background", model: "gemini", prompt: bgDataUrl ? bgPrompt : undefined, status: "completed" },
                { name: "Template", prompt: templateId, status: "completed" },
                { name: "Producto/Escena", model: "gemini", prompt: productData.data?.promptUsed, status: "completed" },
              ] as (PromptLayer | null)[]).filter((l): l is PromptLayer => l !== null),
            };
            const variant: GeneratedVariant = { copy, backgroundImage: bgDataUrl, resultImage: finalImg, template: templateId, angle: angleIndex, angleName, promptsUsed, timings: _taskTimings };
            variantAccumulator.push(variant);
            setVariants([...variantAccumulator]);
            saveCreativo(finalImg, templateId, angleName, copy, undefined, undefined, promptsUsed);
            return variant;
          }

          _taskTimings["Total"] = Date.now() - _tTask;
          const promptsUsedNoProduct: PromptsUsed = {
            layers: ([
              { name: "Copy", model: "gpt-4o-mini", prompt: `Schema: ${getTemplateSchema(templateId).join(", ")}`, status: "completed" },
              makeImageBriefLayer(imageBriefLogByTemplate.get(templateId)),
              { name: "Background", model: "gemini", prompt: bgDataUrl ? bgPrompt : undefined, status: "completed" },
              { name: "Template", prompt: templateId, status: "completed" },
              { name: "Producto/Escena", status: "skipped" },
            ] as (PromptLayer | null)[]).filter((l): l is PromptLayer => l !== null),
          };
          const variant: GeneratedVariant = { copy, backgroundImage: bgDataUrl, resultImage: finalImg, template: templateId, angle: angleIndex, angleName, promptsUsed: promptsUsedNoProduct, timings: _taskTimings };
          variantAccumulator.push(variant);
          setVariants([...variantAccumulator]);
          saveCreativo(finalImg, templateId, angleName, copy, undefined, undefined, promptsUsedNoProduct);
          return variant;
        }
      );

      await runWithConcurrency(tasks, CONCURRENCY, (completed, total) => {
        setVariantsProgress(`Generando creativos... ${completed}/${total}`);
        setProgressPercent(Math.round((completed / total) * 100));
        setCompletedCreatives(completed);
      });

      setVariantsProgress(`${variantAccumulator.length} creativos generados`);
      setProgressPercent(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando ángulos de venta");
      setVariantsProgress("");
    } finally {
      setVariantsGenerating(false);
    }
  };

  const handleGenerateSequence = async () => {
    const templateId =
      selectedTemplates.find((id) => TEMPLATES.find((t) => t.id === id)?.supportsSequence) ??
      TEMPLATES.find((t) => t.supportsSequence)?.id ??
      "pain-point-left";
    const tplDef = TEMPLATES.find((t) => t.id === templateId);
    const isSceneWithProductSequence = (tplDef?.sceneWithProduct === true) && !!avatarFile;

    setVariantsGenerating(true);
    setVariants([]);
    setResultImage(null);
    setError(null);
    setProgressPercent(0);
    setCompletedCreatives(0);

    try {
      // Step 1: Generate sequence copy
      setVariantsProgress("Creando narrativa de la secuencia...");
      const copyRes = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          mode: "GENERATE_SEQUENCE_COPY",
          product: bizProduct,
          offer: bizOffer,
          targetAudience: bizAudience,
          problem: bizProblem,
          tone: bizTone,
          narrative: sequenceNarrative,
          slideCount: sequenceCount,
          sceneWithProduct: isSceneWithProductSequence,
          businessProfile: businessProfile ?? undefined,
        }),
      });
      const copyData = await copyRes.json();
      if (!copyRes.ok) throw new Error(copyData.error || `Error ${copyRes.status}`);
      const slides = copyData.data?.slides as Array<Record<string, unknown>>;
      if (!Array.isArray(slides) || slides.length === 0) throw new Error("No se generaron slides");

      const totalTasks = slides.length;
      setTotalCreatives(totalTasks);
      setVariantsProgress(`Generando slides... 0/${totalTasks}`);

      const variantAccumulator: GeneratedVariant[] = [];

      // Step 2: For each slide in parallel: background → TEMPLATE_BETA → PRODUCT_IA
      const tasks = slides.map((slide, slideIndex) =>
        async (): Promise<GeneratedVariant> => {
          const bgPrompt = resolveBgPrompt(tplDef, slide, businessProfile);

          // Background
          const bgRes = await fetch("/api/compose", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ mode: "GENERATE_BACKGROUND", prompt: bgPrompt, aspectRatio: "1:1" }),
          });
          const bgData = await bgRes.json();
          if (!bgRes.ok) throw new Error(bgData.error || `Error ${bgRes.status}`);
          const bgDataUrl = bgData.data?.image as string;
          if (!bgDataUrl) throw new Error(`No se generó fondo para slide ${slideIndex + 1}`);
          const bgBlob = await fetch(bgDataUrl).then((r) => r.blob());
          const bgFile = new File([bgBlob], `bg-slide-${slideIndex}.png`, { type: "image/png" });

          let finalImg: string;

          if (isSceneWithProductSequence) {
            // sceneWithProduct order: PRODUCT_IA (clean bg) → TEMPLATE_BETA (text on scene)
            // Step A: generate person+product scene on clean background
            const productPromptForSlide =
              (tplDef?.copySchema?.includes("productPrompt") ? (slide.productPrompt as string) : undefined) ||
              tplDef?.defaultProductPrompt ||
              "A confident person holding the product at chest height, right side of canvas only, left half completely clean.";

            const productForm = new FormData();
            productForm.append("background", bgFile);
            productForm.append("product", productFile ?? TRANSPARENT_PNG_FILE());
            productForm.append("avatarFile", avatarFile!);
            productForm.append(
              "config",
              JSON.stringify({
                mode: "PRODUCT_IA",
                outputFormat: "png",
                quality: 95,
                copy: {},
                productIAOptions: {
                  prompt: productPromptForSlide,
                  copyZone: tplDef?.copyZone ?? "left",
                  includeLayoutSpec: false,
                  skipTextRender: true,
                  avatarSceneWithProduct: true,
                },
              })
            );
            const productRes = await fetch("/api/compose", {
              method: "POST",
              headers: { Accept: "application/json" },
              body: productForm,
            });
            const productData = await productRes.json();
            if (!productRes.ok) throw new Error(productData.error || `Error ${productRes.status}`);
            const sceneDataUrl = (productData.data?.image || productData.data?.imageUrl) as string;
            if (!sceneDataUrl) throw new Error(`No se generó escena para slide ${slideIndex + 1}`);

            // Step B: apply text overlay on the Gemini scene
            const sceneBlob = await fetch(sceneDataUrl).then((r) => r.blob());
            const sceneBgFile = new File([sceneBlob], `scene-slide-${slideIndex}.png`, { type: "image/png" });

            const variantForm = new FormData();
            variantForm.append("background", sceneBgFile);
            if (businessLogo) {
              variantForm.append("logoBase64", businessLogo.base64);
              variantForm.append("logoMimeType", businessLogo.mimeType);
            }
            if (businessLogoDark) {
              variantForm.append("logoDarkBase64", businessLogoDark.base64);
              variantForm.append("logoDarkMimeType", businessLogoDark.mimeType);
            }
            if (businessLogoLight) {
              variantForm.append("logoLightBase64", businessLogoLight.base64);
              variantForm.append("logoLightMimeType", businessLogoLight.mimeType);
            }
            variantForm.append(
              "config",
              JSON.stringify({
                mode: "TEMPLATE_BETA",
                outputFormat: "png",
                quality: 95,
                copy: {
                  headline: slide.headline || undefined,
                  subheadline: slide.subheadline || undefined,
                  badge: slide.badge || undefined,
                  brandColors: Array.isArray(businessProfile?.coloresMarca) && (businessProfile.coloresMarca as string[]).some(Boolean)
                    ? businessProfile.coloresMarca as string[]
                    : undefined,
                },
                templateBetaOptions: {
                  templateId,
                  canvas: { width: 1080, height: 1080 },
                  includeLayoutSpec: false,
                },
              })
            );
            const templateRes = await fetch("/api/compose", {
              method: "POST",
              headers: { Accept: "application/json" },
              body: variantForm,
            });
            const templateData = await templateRes.json();
            if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
            finalImg = (templateData.data?.image || templateData.data?.imageUrl || sceneDataUrl) as string;
          } else {
            // Default order: TEMPLATE_BETA (text on clean bg) → PRODUCT_IA (scene on text)
            const variantForm = new FormData();
            variantForm.append("background", bgFile);
            if (businessLogo) {
              variantForm.append("logoBase64", businessLogo.base64);
              variantForm.append("logoMimeType", businessLogo.mimeType);
            }
            if (businessLogoDark) {
              variantForm.append("logoDarkBase64", businessLogoDark.base64);
              variantForm.append("logoDarkMimeType", businessLogoDark.mimeType);
            }
            if (businessLogoLight) {
              variantForm.append("logoLightBase64", businessLogoLight.base64);
              variantForm.append("logoLightMimeType", businessLogoLight.mimeType);
            }
            variantForm.append(
              "config",
              JSON.stringify({
                mode: "TEMPLATE_BETA",
                outputFormat: "png",
                quality: 95,
                copy: {
                  headline: slide.headline || undefined,
                  subheadline: slide.subheadline || undefined,
                  badge: slide.badge || undefined,
                  brandColors: Array.isArray(businessProfile?.coloresMarca) && (businessProfile.coloresMarca as string[]).some(Boolean)
                    ? businessProfile.coloresMarca as string[]
                    : undefined,
                },
                templateBetaOptions: {
                  templateId,
                  canvas: { width: 1080, height: 1080 },
                  includeLayoutSpec: false,
                },
              })
            );
            const templateRes = await fetch("/api/compose", {
              method: "POST",
              headers: { Accept: "application/json" },
              body: variantForm,
            });
            const templateData = await templateRes.json();
            if (!templateRes.ok) throw new Error(templateData.error || `Error ${templateRes.status}`);
            const templateResultImage = (templateData.data?.image || templateData.data?.imageUrl) as string;
            if (!templateResultImage) throw new Error(`No se generó imagen para slide ${slideIndex + 1}`);

            const composedBgBlob = await fetch(templateResultImage).then((r) => r.blob());
            const composedBgFile = new File([composedBgBlob], `composed-slide-${slideIndex}.png`, { type: "image/png" });

            const productForm = new FormData();
            productForm.append("background", composedBgFile);
            productForm.append("product", TRANSPARENT_PNG_FILE());
            if (avatarFile) {
              productForm.append("avatarFile", avatarFile);
            }
            const slideRole = ((slide.slideRole as string) ?? "").toLowerCase();
            const scenePrompt = `Photography style, editorial quality, real person.
${(slide.sceneAction as string) ?? ""}.
The person must be photographed in a REAL environment that matches the emotional context of a "${slide.slideRole}" slide — not a white studio background.
Background environment: subtle, blurred (bokeh), coherent with the emotion.
Person positioned on RIGHT 50% of frame. LEFT 50% must be completely empty/clean.
Full body or 3/4 shot. Natural lighting. Hyper-realistic. No text, no objects, no products. The person's expression and body language must clearly communicate: ${
              slideRole === "hook" ? "concern or curiosity" :
              slideRole === "problema" ? "pain, discomfort or frustration" :
              slideRole === "agitacion" ? "anxiety or emotional distress" :
              slideRole === "solucion" ? "discovery, relief, hope" :
              slideRole === "prueba" ? "confidence, satisfaction, results" :
              "excitement, decision, empowerment"
            }.`;
            productForm.append(
              "config",
              JSON.stringify({
                mode: "PRODUCT_IA",
                outputFormat: "png",
                quality: 95,
                copy: {},
                productIAOptions: {
                  prompt: scenePrompt,
                  copyZone: "left",
                  includeLayoutSpec: false,
                  skipTextRender: true,
                  sceneMode: !avatarFile,
                  useAvatarAsScene: !!avatarFile,
                },
              })
            );
            const productRes = await fetch("/api/compose", {
              method: "POST",
              headers: { Accept: "application/json" },
              body: productForm,
            });
            const productData = await productRes.json();
            if (!productRes.ok) throw new Error(productData.error || `Error ${productRes.status}`);
            finalImg = (productData.data?.image || productData.data?.imageUrl || templateResultImage) as string;
          }

          const variant: GeneratedVariant = {
            copy: slide,
            backgroundImage: bgDataUrl,
            resultImage: finalImg,
            template: templateId,
            angle: slideIndex,
            angleName: (slide.slideRole as string) ?? `Slide ${slideIndex + 1}`,
            slideNumber: slideIndex + 1,
            slideRole: (slide.slideRole as string) ?? undefined,
          };

          variantAccumulator.push(variant);
          variantAccumulator.sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0));
          setVariants([...variantAccumulator]);
          saveCreativo(
            finalImg,
            templateId,
            `Slide ${slideIndex + 1} — ${slide.slideRole ?? ""}`,
            slide,
            (slide.slideRole as string) ?? undefined,
            slideIndex + 1,
          );
          return variant;
        }
      );

      await runWithConcurrency(tasks, 3, (completed, total) => {
        setVariantsProgress(`Generando slides... ${completed}/${total}`);
        setProgressPercent(Math.round((completed / total) * 100));
        setCompletedCreatives(completed);
      });

      setVariantsProgress(`Secuencia de ${variantAccumulator.length} slides generada`);
      setProgressPercent(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando secuencia");
      setVariantsProgress("");
    } finally {
      setVariantsGenerating(false);
    }
  };

  const isGenerating = autoGenerating || variantsGenerating;
  const canProceedStep1 = bizProduct.trim().length > 0;
  const canGenerate = !isGenerating && bizProduct.trim().length > 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ background: "#0A0A0A", color: "#F5F5F7" }}>
      {/* Top Nav */}
      <div
        className="border-b px-6 py-4 flex items-center gap-3"
        style={{ borderColor: "#2A2A2A", background: "#0A0A0A" }}
      >
       
        <span style={{ color: "#3A3A3C" }}>/</span>
        <span className="text-sm font-medium" style={{ color: "#F5F5F7" }}>
          Fábrica de Contenido
        </span>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            
           
           <a
              href="/dashboard/mi-negocio"
              style={{ color: "#86868B" }}
              className="text-sm hover:text-white transition ml-auto underline underline-offset-4 whitespace-nowrap"
            >
              Mi ADN
            </a>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1 text-balance">Fábrica de Contenido</h1>
          <p className="text-sm text-balance" style={{ color: "#86868B" }}>
            Generá creativos publicitarios en segundos con IA.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-10">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => (idx <= step ? setStep(idx) : undefined)}
                className="flex flex-col items-center gap-1.5"
                style={{ cursor: idx <= step ? "pointer" : "default" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                  style={{
                    background: idx <= step ? "#00B5AD" : "#1C1C1E",
                    color: idx <= step ? "#000" : "#86868B",
                    border: `2px solid ${idx <= step ? "#00B5AD" : "#2A2A2A"}`,
                  }}
                >
                  {idx < step ? "✓" : idx + 1}
                </div>
                <span
                  className="text-xs font-medium whitespace-nowrap"
                  style={{ color: idx === step ? "#F5F5F7" : "#86868B" }}
                >
                  {label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-3 mb-5 transition-all duration-300"
                  style={{ background: idx < step ? "#00B5AD" : "#2A2A2A" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 0 && (
          <StepNegocio
            bizProduct={bizProduct}
            setBizProduct={setBizProduct}
            bizOffer={bizOffer}
            setBizOffer={setBizOffer}
            bizAudience={bizAudience}
            setBizAudience={setBizAudience}
            bizProblem={bizProblem}
            setBizProblem={setBizProblem}
            bizTone={bizTone}
            setBizTone={setBizTone}
            onNext={() => setStep(1)}
            canNext={canProceedStep1}
            referenceImage={referenceImage}
            referencePreview={referencePreview}
            referenceAnalysis={referenceAnalysis}
            analyzingReference={analyzingReference}
            onAnalyzeReference={handleAnalyzeReference}
            onClearReference={() => {
              setReferenceImage(null);
              setReferencePreview("");
              setReferenceAnalysis(null);
            }}
            onReferenceFileChange={(file: File) => {
              setReferenceImage(file);
              const reader = new FileReader();
              reader.onload = () => setReferencePreview(reader.result as string);
              reader.readAsDataURL(file);
            }}
            creationMode={creationMode}
            setCreationMode={setCreationMode}
            sequenceNarrative={sequenceNarrative}
            setSequenceNarrative={setSequenceNarrative}
            sequenceCount={sequenceCount}
            setSequenceCount={setSequenceCount}
            sorteoPremios={sorteoPremios}
            setSorteoPremios={setSorteoPremios}
            sorteoColaboradores={sorteoColaboradores}
            setSorteoColaboradores={setSorteoColaboradores}
            sorteoCondiciones={sorteoCondiciones}
            setSorteoCondiciones={setSorteoCondiciones}
          />
        )}

        {step === 1 && (
          <StepPlantilla
            selectedTemplates={selectedTemplates}
            setSelectedTemplates={setSelectedTemplates}
            numAngles={numAngles}
            setNumAngles={setNumAngles}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            creationMode={creationMode}
            templateCategoryFilter={templateCategoryFilter}
            setTemplateCategoryFilter={setTemplateCategoryFilter}
          />
        )}

        {step === 2 && (
          <StepProducto
            productFile={productFile}
            productPreview={productPreview}
            onFileChange={handleProductFile}
            onClear={() => {
              setProductFile(null);
              setProductPreview("");
            }}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            avatarFile={avatarFile}
            avatarPreview={avatarPreview}
            onAvatarFileChange={(file) => {
              setAvatarFile(file);
              const reader = new FileReader();
              reader.onload = () => setAvatarPreview(reader.result as string);
              reader.readAsDataURL(file);
            }}
            onAvatarClear={() => {
              setAvatarFile(null);
              setAvatarPreview("");
            }}
          />
        )}

        {step === 3 && (
          <StepGenerar
            bizProduct={bizProduct}
            bizOffer={bizOffer}
            bizAudience={bizAudience}
            bizProblem={bizProblem}
            bizTone={bizTone}
            selectedTemplates={selectedTemplates}
            numAngles={numAngles}
            productFile={productFile}
            businessProfileName={businessProfile ? (businessProfile.nombre as string) || "" : null}
            autoGenerating={autoGenerating}
            autoStep={autoStep}
            variantsGenerating={variantsGenerating}
            variantsProgress={variantsProgress}
            totalCreatives={totalCreatives}
            completedCreatives={completedCreatives}
            progressPercent={progressPercent}
            error={error}
            resultImage={resultImage}
            variants={variants}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            onGenerateAngles={handleGenerateAngles}
            onGenerateSequence={handleGenerateSequence}
            onBack={() => setStep(2)}
            creationMode={creationMode}
            sequenceCount={sequenceCount}
            singleTimings={singleTimings}
          />
        )}
      </div>
    </main>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "#86868B" }}>
      {children}
    </label>
  );
}

function StyledInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
      style={{ background: "#1C1C1E", border: "1px solid #2A2A2A", color: "#F5F5F7" }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "#00B5AD")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A2A")}
    />
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continuar →",
  canNext = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  canNext?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between pt-6 mt-6"
      style={{ borderTop: "1px solid #2A2A2A" }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: "#86868B", background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F5F7")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#86868B")}
        >
          ← Atrás
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: canNext ? "#00B5AD" : "#2A2A2A",
          color: canNext ? "#000" : "#555",
          cursor: canNext ? "pointer" : "not-allowed",
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function GeneratingLoader({
  step,
  completed,
  total,
  percent,
}: {
  step: string;
  completed: number;
  total: number;
  percent: number;
}) {
  return (
    <>
      <style>{`
        @keyframes gl-spin-cw  { from { transform: rotate(0deg); }    to { transform: rotate(360deg); }  }
        @keyframes gl-spin-ccw { from { transform: rotate(0deg); }    to { transform: rotate(-360deg); } }
        @keyframes gl-pulse    { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>
      <div
        style={{
          marginTop: 20,
          padding: "28px 20px 24px",
          borderRadius: 20,
          background: "linear-gradient(140deg, #0C1918 0%, #091210 100%)",
          border: "1px solid rgba(0,181,173,0.22)",
          boxShadow: "0 0 40px rgba(0,181,173,0.07)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Animated concentric rings */}
        <div style={{ position: "relative", width: 96, height: 96 }}>
          {/* Outer ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid rgba(0,181,173,0.12)",
              borderTop: "2px solid rgba(0,181,173,0.75)",
              animation: "gl-spin-cw 2.8s linear infinite",
            }}
          />
          {/* Middle ring */}
          <div
            style={{
              position: "absolute",
              inset: 13,
              borderRadius: "50%",
              border: "2px solid rgba(0,181,173,0.08)",
              borderBottom: "2px solid #00D4CB",
              animation: "gl-spin-ccw 1.9s linear infinite",
              boxShadow: "0 0 10px rgba(0,212,203,0.25)",
            }}
          />
          {/* Inner ring */}
          <div
            style={{
              position: "absolute",
              inset: 26,
              borderRadius: "50%",
              border: "1.5px solid rgba(0,181,173,0.08)",
              borderTop: "1.5px solid rgba(0,212,203,0.9)",
              animation: "gl-spin-cw 1.1s linear infinite",
            }}
          />
          {/* Center: counter or "IA" pulse */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {total > 0 ? (
              <>
                <span style={{ color: "#00D4CB", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                  {completed}
                </span>
                <span style={{ color: "#4D6068", fontSize: 10, fontWeight: 500, marginTop: 1 }}>
                  / {total}
                </span>
              </>
            ) : (
              <span
                style={{
                  color: "#00D4CB",
                  fontSize: 11,
                  fontWeight: 600,
                  animation: "gl-pulse 1.8s ease-in-out infinite",
                }}
              >
                IA
              </span>
            )}
          </div>
        </div>

        {/* Step label */}
        <p
          style={{
            margin: 0,
            textAlign: "center",
            color: "#B8C6D0",
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.55,
            maxWidth: 300,
            animation: "gl-pulse 2.5s ease-in-out infinite",
          }}
        >
          {step}
        </p>

        {/* Progress bar — only in batch mode */}
        {total > 0 && (
          <div style={{ width: "100%", maxWidth: 340 }}>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 99,
                background: "#16201E",
                overflow: "hidden",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  width: `${percent}%`,
                  background: "linear-gradient(90deg, #007A74 0%, #00D4CB 100%)",
                  boxShadow: "0 0 14px rgba(0,212,203,0.45)",
                  transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
            <p style={{ margin: "8px 0 0", textAlign: "center", color: "#4D6068", fontSize: 12 }}>
              {completed} de {total} creativos completados
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Step 1: Negocio ──────────────────────────────────────────────────────────

function StepNegocio({
  bizProduct,
  setBizProduct,
  bizOffer,
  setBizOffer,
  bizAudience,
  setBizAudience,
  bizProblem,
  setBizProblem,
  bizTone,
  setBizTone,
  onNext,
  canNext,
  referenceImage,
  referencePreview,
  referenceAnalysis,
  analyzingReference,
  onAnalyzeReference,
  onClearReference,
  onReferenceFileChange,
  creationMode,
  setCreationMode,
  sequenceNarrative,
  setSequenceNarrative,
  sequenceCount,
  setSequenceCount,
  sorteoPremios,
  setSorteoPremios,
  sorteoColaboradores,
  setSorteoColaboradores,
  sorteoCondiciones,
  setSorteoCondiciones,
}: {
  bizProduct: string;
  setBizProduct: (v: string) => void;
  bizOffer: string;
  setBizOffer: (v: string) => void;
  bizAudience: string;
  setBizAudience: (v: string) => void;
  bizProblem: string;
  setBizProblem: (v: string) => void;
  bizTone: Tone;
  setBizTone: (v: Tone) => void;
  onNext: () => void;
  canNext: boolean;
  referenceImage: File | null;
  referencePreview: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  referenceAnalysis: any;
  analyzingReference: boolean;
  onAnalyzeReference: () => void;
  onClearReference: () => void;
  onReferenceFileChange: (file: File) => void;
  creationMode: "independiente" | "secuencia" | "sorteo";
  setCreationMode: (v: "independiente" | "secuencia" | "sorteo") => void;
  sequenceNarrative: string;
  setSequenceNarrative: (v: string) => void;
  sequenceCount: number;
  setSequenceCount: (n: number) => void;
  sorteoPremios: string;
  setSorteoPremios: (v: string) => void;
  sorteoColaboradores: string;
  setSorteoColaboradores: (v: string) => void;
  sorteoCondiciones: string;
  setSorteoCondiciones: (v: string) => void;
}) {
  const [referenceOpen, setReferenceOpen] = useState(false);

  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: "#141414", border: "1px solid #2A2A2A" }}
    >
      <h2 className="text-xl font-semibold mb-1 text-balance">Contanos tu negocio</h2>
      <p className="text-sm mb-6 text-balance" style={{ color: "#86868B" }}>
        Esta info le da contexto a la IA para generar copy relevante y un background acorde.
      </p>

      {/* Mode selector */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-3">Modo de creación</p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: "independiente" as const, label: "Independiente", sub: "Ángulos distintos" },
              { value: "secuencia" as const, label: "Secuencia", sub: "Historia / Carrusel" },
              { value: "sorteo" as const, label: "Sorteo", sub: "Giveaway / Colaboración" },
            ] as const
          ).map(({ value, label, sub }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCreationMode(value)}
              className="rounded-2xl p-4 text-left transition-all"
              style={{
                background: creationMode === value ? "#001F1E" : "#1C1C1E",
                border: `2px solid ${creationMode === value ? "#00B5AD" : "#2A2A2A"}`,
              }}
            >
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs mt-0.5" style={{ color: "#86868B" }}>{sub}</div>
            </button>
          ))}
        </div>

        {creationMode === "sorteo" && (
          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel>Premios</FieldLabel>
              <StyledInput
                value={sorteoPremios}
                onChange={setSorteoPremios}
                placeholder="Ej: Kit de skincare completo valorado en $50.000"
              />
            </div>
            <div>
              <FieldLabel>Colaboradores</FieldLabel>
              <StyledInput
                value={sorteoColaboradores}
                onChange={setSorteoColaboradores}
                placeholder="Ej: @marcacolaboradora, @otracolaboradora"
              />
            </div>
            <div>
              <FieldLabel>Condiciones del sorteo</FieldLabel>
              <textarea
                value={sorteoCondiciones}
                onChange={(e) => setSorteoCondiciones(e.target.value)}
                rows={3}
                placeholder="Ej: Seguir a todas las cuentas participantes, comentar con un amigo, compartir en stories."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                style={{ background: "#1C1C1E", border: "1px solid #2A2A2A", color: "#F5F5F7" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#00B5AD")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
            </div>
          </div>
        )}

        {creationMode === "secuencia" && (
          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel>¿Cuál es la historia o secuencia?</FieldLabel>
              <textarea
                value={sequenceNarrative}
                onChange={(e) => setSequenceNarrative(e.target.value)}
                rows={5}
                placeholder="Ej: Primero mostrar el problema de las estrías, luego cómo afecta la confianza, después presentar la solución y finalmente el llamado a la acción con la oferta."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                style={{ background: "#1C1C1E", border: "1px solid #2A2A2A", color: "#F5F5F7" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#00B5AD")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A2A")}
              />
            </div>
            <div>
              <FieldLabel>¿Cuántos slides?</FieldLabel>
              <div className="flex gap-2 flex-wrap">
                {[3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSequenceCount(n)}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    style={{
                      background: sequenceCount === n ? "#00B5AD" : "#1A1A1A",
                      color: sequenceCount === n ? "#000" : "#666",
                      border: `1.5px solid ${sequenceCount === n ? "#00B5AD" : "#3A3A3C"}`,
                    }}
                  >
                    {n} slides
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reference creative — collapsible */}
      <div className="mb-6 rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A2A" }}>
        <button
          type="button"
          onClick={() => setReferenceOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
          style={{ background: "#1C1C1E" }}
        >
          <div>
            <div className="text-sm font-medium">Creativo de referencia (opcional)</div>
            <div className="text-xs mt-0.5" style={{ color: "#86868B" }}>
              Subí un creativo ganador y la IA replicará su estilo
            </div>
          </div>
          <span className="text-xs ml-4 shrink-0" style={{ color: "#86868B" }}>
            {referenceOpen ? "▲" : "▼"}
          </span>
        </button>

        {referenceOpen && (
          <div className="px-4 pb-4 pt-3 space-y-3" style={{ background: "#141414" }}>
            {!referencePreview ? (
              <label
                className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                style={{ border: "2px dashed #2A2A2A", minHeight: "160px" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00B5AD")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A2A")}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onReferenceFileChange(file);
                  }}
                  className="hidden"
                />
                <div className="text-sm font-medium">Subí tu creativo ganador</div>
                <div className="text-xs" style={{ color: "#86868B" }}>
                  PNG, JPG — tu estilo de referencia
                </div>
              </label>
            ) : (
              <div
                className="flex items-center gap-4 rounded-xl p-3"
                style={{ background: "#1C1C1E", border: "1px solid #2A2A2A" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referencePreview}
                  alt="Referencia"
                  className="h-20 w-20 object-contain rounded-lg shrink-0"
                  style={{ background: "#0A0A0A" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate mb-2">{referenceImage?.name}</div>
                  <button
                    type="button"
                    onClick={onClearReference}
                    className="text-xs transition-colors"
                    style={{ color: "#86868B" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FF453A")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#86868B")}
                  >
                    ✕ Quitar
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onAnalyzeReference}
              disabled={!referenceImage || analyzingReference}
              className="w-full py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "transparent",
                color: referenceImage && !analyzingReference ? "#00B5AD" : "#555",
                border: `1px solid ${referenceImage && !analyzingReference ? "#00B5AD" : "#2A2A2A"}`,
                cursor: referenceImage && !analyzingReference ? "pointer" : "not-allowed",
              }}
            >
              {analyzingReference ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Analizando tu creativo...
                </span>
              ) : (
                "Analizar estilo"
              )}
            </button>

            {referenceAnalysis && (
              <div className="bg-teal-950/20 border border-teal-700/30 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold" style={{ color: "#00B5AD" }}>
                  Estilo analizado
                </div>

                {/* Copy subsection */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: "#171717", border: "1px solid #262626" }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#F5F5F7" }}>Copy</div>
                  {(
                    [
                      ["Hook usado", referenceAnalysis.copyAnalysis?.hookType],
                      ["Titular", referenceAnalysis.copyAnalysis?.headline],
                      ["Subtitular", referenceAnalysis.copyAnalysis?.subheadline],
                      ["CTA", referenceAnalysis.copyAnalysis?.ctaStyle],
                      ["Gatillos", referenceAnalysis.copyAnalysis?.emotionalTriggers],
                    ] as [string, string][]
                  ).map(([label, value]) =>
                    value ? (
                      <div key={label} className="text-sm">
                        <span style={{ color: "#666" }}>{label}: </span>
                        <span style={{ color: "#F5F5F7" }}>{value}</span>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Visual subsection */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: "#171717", border: "1px solid #262626" }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#F5F5F7" }}>Visual</div>
                  {(
                    [
                      ["Paleta", referenceAnalysis.colorPalette],
                      ["Fondo", referenceAnalysis.backgroundStyle],
                      ["Tipografía", referenceAnalysis.typographyStyle],
                    ] as [string, string][]
                  ).map(([label, value]) =>
                    value ? (
                      <div key={label} className="text-sm">
                        <span style={{ color: "#666" }}>{label}: </span>
                        <span style={{ color: "#F5F5F7" }}>{value}</span>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Scene subsection */}
                <div className="rounded-xl p-3 space-y-2" style={{ background: "#171717", border: "1px solid #262626" }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#F5F5F7" }}>Escena</div>
                  {(
                    [
                      ["Sujeto", referenceAnalysis.sceneAnalysis?.subject],
                      ["Posición", referenceAnalysis.sceneAnalysis?.placement],
                      ["Iluminación", referenceAnalysis.sceneAnalysis?.lighting],
                      ["Acción", referenceAnalysis.sceneAnalysis?.action],
                      ["Emoción", referenceAnalysis.sceneAnalysis?.emotion],
                    ] as [string, string][]
                  ).map(([label, value]) =>
                    value ? (
                      <div key={label} className="text-sm">
                        <span style={{ color: "#666" }}>{label}: </span>
                        <span style={{ color: "#F5F5F7" }}>{value}</span>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Recommendations */}
                <p className="text-sm text-teal-200">{referenceAnalysis.recommendations}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <FieldLabel>Producto o servicio *</FieldLabel>
          <StyledInput
            value={bizProduct}
            onChange={setBizProduct}
            placeholder="Ej: Crema reafirmante anti-estrías"
          />
        </div>
        <div>
          <FieldLabel>Oferta principal</FieldLabel>
          <StyledInput
            value={bizOffer}
            onChange={setBizOffer}
            placeholder="Ej: 60% OFF en la segunda unidad"
          />
        </div>
        <div>
          <FieldLabel>Público objetivo</FieldLabel>
          <StyledInput
            value={bizAudience}
            onChange={setBizAudience}
            placeholder="Ej: Mujeres de 30-50 años interesadas en skincare"
          />
        </div>
        <div>
          <FieldLabel>Problema que resuelve</FieldLabel>
          <StyledInput
            value={bizProblem}
            onChange={setBizProblem}
            placeholder="Ej: Reduce estrías y mejora la firmeza de la piel"
          />
        </div>
        <div>
          <FieldLabel>Tono del copy</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBizTone(t)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: bizTone === t ? "#00B5AD" : "#1C1C1E",
                  color: bizTone === t ? "#000" : "#86868B",
                  border: `1px solid ${bizTone === t ? "#00B5AD" : "#2A2A2A"}`,
                }}
              >
                {TONE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <NavButtons onNext={onNext} canNext={canNext} />
    </div>
  );
}

// ─── Step 2: Plantilla ────────────────────────────────────────────────────────

function StepPlantilla({
  selectedTemplates,
  setSelectedTemplates,
  numAngles,
  setNumAngles,
  onBack,
  onNext,
  creationMode,
  templateCategoryFilter,
  setTemplateCategoryFilter,
}: {
  selectedTemplates: string[];
  setSelectedTemplates: (ids: string[]) => void;
  numAngles: number;
  setNumAngles: (n: number) => void;
  onBack: () => void;
  onNext: () => void;
  creationMode: "independiente" | "secuencia" | "sorteo";
  templateCategoryFilter: string;
  setTemplateCategoryFilter: (v: string) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visibleTemplates = creationMode === "secuencia"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? TEMPLATES.filter((t) => (t as any).supportsSequence === true && t.active !== false)
    : TEMPLATES.filter((t) => t.active !== false);

  // Auto-select the first supportsSequence template when switching to sequence mode
  useEffect(() => {
    if (creationMode === "secuencia") {
      const hasValid = selectedTemplates.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (id) => (TEMPLATES.find((t) => t.id === id) as any)?.supportsSequence === true
      );
      if (!hasValid) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const first = TEMPLATES.find((t) => (t as any).supportsSequence === true);
        if (first) setSelectedTemplates([first.id]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creationMode]);

  function toggleTemplate(id: string) {
    if (selectedTemplates.includes(id)) {
      if (selectedTemplates.length === 1) return; // keep at least 1
      setSelectedTemplates(selectedTemplates.filter((t) => t !== id));
    } else {
      setSelectedTemplates([...selectedTemplates, id]);
    }
  }

  const totalCreatives = selectedTemplates.length * numAngles;

  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: "#141414", border: "1px solid #2A2A2A" }}
    >
      <h2 className="text-xl font-semibold mb-1 text-balance">Elegí tus plantillas</h2>
      <p className="text-sm mb-6 text-balance" style={{ color: "#86868B" }}>
        Podés seleccionar una o más. Se generarán creativos para cada plantilla con los ángulos elegidos.
      </p>

      {/* Category filter pills */}
      {(() => {
        const categoryIds = Array.from(
          new Set(TEMPLATES.flatMap((t) => t.recommendedFor ?? []))
        );
        const pillCategories = BUSINESS_CATEGORIES.filter((c) => categoryIds.includes(c.id));
        return (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              type="button"
              onClick={() => setTemplateCategoryFilter("")}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: templateCategoryFilter === "" ? "#00B5AD" : "#1C1C1E",
                color: templateCategoryFilter === "" ? "#000" : "#86868B",
                border: `1.5px solid ${templateCategoryFilter === "" ? "#00B5AD" : "#2A2A2A"}`,
              }}
            >
              Todos
            </button>
            {pillCategories.map((cat) => {
              const active = templateCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTemplateCategoryFilter(active ? "" : cat.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: active ? "#00B5AD" : "#1C1C1E",
                    color: active ? "#000" : "#86868B",
                    border: `1.5px solid ${active ? "#00B5AD" : "#2A2A2A"}`,
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Template cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {visibleTemplates.map((t) => {
          const isSelected = selectedTemplates.includes(t.id);
          const isRecommended =
            templateCategoryFilter !== "" &&
            (t.recommendedFor ?? []).includes(templateCategoryFilter);
          const isDimmed =
            templateCategoryFilter !== "" && !isRecommended;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTemplate(t.id)}
              className="text-left rounded-2xl p-5 transition-all relative"
              style={{
                background: isSelected ? "#001F1E" : "#1C1C1E",
                border: `2px solid ${isSelected ? "#00B5AD" : "#2A2A2A"}`,
                boxShadow: isSelected ? "0 0 0 3px rgba(0,181,173,0.12)" : "none",
                opacity: isDimmed ? 0.35 : 1,
              }}
            >
              {/* Checkmark badge top-right */}
              {isSelected && (
                <div
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "#00B5AD", color: "#000" }}
                >
                  ✓
                </div>
              )}

              {/* Recomendado badge top-right (only when not selected) */}
              {isRecommended && !isSelected && (
                <div
                  className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(0,181,173,0.15)",
                    color: "#00B5AD",
                    border: "1px solid rgba(0,181,173,0.3)",
                  }}
                >
                  Recomendado
                </div>
              )}

              {/* SVG Mockup */}
              <div className="mb-4 rounded-xl overflow-hidden" style={{ background: "#0A0A0A" }}>
                {t.id === "classic-editorial-right" ? (
                  <ClassicEditorialMockup />
                ) : t.id === "promo-urgencia-bottom" ? (
                  <PromoUrgenciaMockup />
                ) : (
                  <HeroCenterBottomMockup />
                )}
              </div>

              <div>
                {t.tag && (
                  <span
                    className="inline-block text-xs font-semibold mb-1.5 px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(0,181,173,0.12)",
                      color: "#00B5AD",
                      border: "1px solid rgba(0,181,173,0.25)",
                    }}
                  >
                    {t.tag}
                  </span>
                )}
                <div className="font-semibold text-sm">
                  {t.icon} {t.name}
                </div>
                <div className="text-xs mt-0.5 text-balance" style={{ color: "#86868B" }}>
                  {t.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Angle count selector — hidden in sequence mode (slide count set in Step 1) */}
      {creationMode === "independiente" && (
        <div className="mb-5">
          <p className="text-sm font-medium mb-3">¿Cuántos ángulos de venta querés generar?</p>
          <div className="flex gap-2 flex-wrap">
            {ANGLE_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumAngles(n)}
                className="w-11 h-10 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: numAngles === n ? "#00B5AD" : "#1A1A1A",
                  color: numAngles === n ? "#000" : "#666",
                  border: `1.5px solid ${numAngles === n ? "#00B5AD" : "#3A3A3C"}`,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary line */}
      <div
        className="px-4 py-3 rounded-xl text-sm"
        style={{ background: "#1A1A1A", color: "#86868B" }}
      >
        <span style={{ color: "#F5F5F7" }}>{selectedTemplates.length}</span>{" "}
        {selectedTemplates.length === 1 ? "plantilla seleccionada" : "plantillas seleccionadas"}{" "}
        {creationMode === "independiente" ? (
          <>
            · <span style={{ color: "#F5F5F7" }}>{numAngles}</span>{" "}
            {numAngles === 1 ? "ángulo" : "ángulos"} ·{" "}
            <span style={{ color: "#00B5AD", fontWeight: 600 }}>
              {totalCreatives} {totalCreatives === 1 ? "creativo" : "creativos"} en total
            </span>
          </>
        ) : (
          <>· modo <span style={{ color: "#00B5AD", fontWeight: 600 }}>Secuencia</span></>
        )}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function ClassicEditorialMockup() {
  return (
    <svg viewBox="0 0 320 320" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradCE" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a3a3a" />
          <stop offset="100%" stopColor="#0d1f1f" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#bgGradCE)" />
      <rect x="165" y="0" width="155" height="320" fill="rgba(0,0,0,0.6)" />
      <rect x="18" y="70" width="132" height="180" rx="8" fill="rgba(0,181,173,0.07)" stroke="#00B5AD" strokeWidth="1" strokeDasharray="4 3" />
      <text x="84" y="165" textAnchor="middle" fill="#00B5AD" fontSize="10" opacity="0.6">producto</text>
      <rect x="180" y="55" width="58" height="14" rx="5" fill="#00B5AD" opacity="0.75" />
      <rect x="188" y="60" width="42" height="5" rx="2" fill="white" opacity="0.9" />
      <rect x="180" y="82" width="118" height="18" rx="4" fill="white" opacity="0.9" />
      <rect x="180" y="108" width="100" height="10" rx="3" fill="white" opacity="0.5" />
      <rect x="180" y="124" width="112" height="10" rx="3" fill="white" opacity="0.4" />
      <circle cx="186" cy="158" r="3" fill="#00B5AD" opacity="0.75" />
      <rect x="194" y="154" width="82" height="8" rx="3" fill="white" opacity="0.4" />
      <circle cx="186" cy="176" r="3" fill="#00B5AD" opacity="0.75" />
      <rect x="194" y="172" width="72" height="8" rx="3" fill="white" opacity="0.4" />
      <circle cx="186" cy="194" r="3" fill="#00B5AD" opacity="0.75" />
      <rect x="194" y="190" width="78" height="8" rx="3" fill="white" opacity="0.4" />
      <rect x="180" y="258" width="118" height="34" rx="7" fill="#00B5AD" opacity="0.85" />
      <rect x="202" y="271" width="74" height="8" rx="3" fill="white" opacity="0.95" />
    </svg>
  );
}

function PromoUrgenciaMockup() {
  return (
    <svg viewBox="0 0 320 320" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradPU" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a2a3a" />
          <stop offset="100%" stopColor="#0d1a2a" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#bgGradPU)" />
      <rect x="90" y="24" width="140" height="170" rx="8" fill="rgba(0,181,173,0.07)" stroke="#00B5AD" strokeWidth="1" strokeDasharray="4 3" />
      <text x="160" y="115" textAnchor="middle" fill="#00B5AD" fontSize="10" opacity="0.6">producto</text>
      <rect x="0" y="212" width="320" height="108" fill="rgba(0,0,0,0.78)" />
      <rect x="18" y="222" width="72" height="18" rx="5" fill="#00B5AD" opacity="0.85" />
      <rect x="26" y="228" width="56" height="6" rx="2" fill="white" opacity="0.95" />
      <rect x="18" y="250" width="210" height="16" rx="4" fill="white" opacity="0.9" />
      <rect x="18" y="274" width="170" height="10" rx="3" fill="white" opacity="0.5" />
      <rect x="220" y="248" width="84" height="34" rx="7" fill="#00B5AD" opacity="0.85" />
      <rect x="236" y="261" width="52" height="8" rx="3" fill="white" opacity="0.95" />
    </svg>
  );
}

function HeroCenterBottomMockup() {
  return (
    <svg viewBox="0 0 320 320" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradHC" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a1a2a" />
          <stop offset="100%" stopColor="#1a1a2a" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#bgGradHC)" />
      <rect x="0" y="0" width="320" height="72" fill="rgba(0,0,0,0.55)" />
      <rect x="60" y="20" width="200" height="14" rx="4" fill="white" opacity="0.85" />
      <rect x="80" y="42" width="160" height="9" rx="3" fill="white" opacity="0.4" />
      <rect x="96" y="55" width="128" height="9" rx="3" fill="white" opacity="0.3" />
      <rect x="90" y="80" width="140" height="142" rx="8" fill="rgba(0,181,173,0.06)" stroke="#00B5AD" strokeWidth="1.2" strokeDasharray="5 3" />
      <text x="160" y="155" textAnchor="middle" fill="#00B5AD" fontSize="10" opacity="0.55">producto</text>
      <rect x="0" y="230" width="320" height="90" fill="rgba(0,0,0,0.65)" />
      <rect x="24" y="243" width="272" height="22" rx="5" fill="white" opacity="0.9" />
      <rect x="48" y="271" width="224" height="18" rx="5" fill="white" opacity="0.75" />
      <rect x="98" y="299" width="124" height="16" rx="8" fill="#00B5AD" opacity="0.85" />
      <rect x="118" y="305" width="84" height="5" rx="2" fill="white" opacity="0.8" />
    </svg>
  );
}

// ─── Step 3: Producto ─────────────────────────────────────────────────────────

function StepProducto({
  productFile,
  productPreview,
  onFileChange,
  onClear,
  onBack,
  onNext,
  avatarFile,
  avatarPreview,
  onAvatarFileChange,
  onAvatarClear,
}: {
  productFile: File | null;
  productPreview: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onBack: () => void;
  onNext: () => void;
  avatarFile: File | null;
  avatarPreview: string;
  onAvatarFileChange: (file: File) => void;
  onAvatarClear: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: "#141414", border: "1px solid #2A2A2A" }}
    >
      <h2 className="text-xl font-semibold mb-1 text-balance">Imagen del producto</h2>
      <p className="text-sm mb-6 text-balance" style={{ color: "#86868B" }}>
        Subí la imagen de tu producto para que la IA lo integre en el creativo. Es opcional — si
        no subís nada, el creativo se genera solo con copy y fondo.
      </p>

      {!productPreview ? (
        <label
          className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all"
          style={{ border: "2px dashed #2A2A2A", background: "#1C1C1E", minHeight: "200px" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00B5AD")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A2A")}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
          <div className="text-4xl">📦</div>
          <div className="text-sm font-medium">Arrastrá o hacé click para subir</div>
          <div className="text-xs" style={{ color: "#86868B" }}>
            PNG, JPG o WebP · Se recomienda PNG con fondo transparente
          </div>
        </label>
      ) : (
        <div
          className="rounded-2xl flex items-center gap-5 p-5"
          style={{ background: "#1C1C1E", border: "1px solid #2A2A2A" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productPreview}
            alt="Producto"
            className="h-28 w-28 object-contain rounded-xl shrink-0"
            style={{ background: "#141414" }}
          />
          <div className="min-w-0">
            <div className="font-medium text-sm truncate mb-1">{productFile?.name}</div>
            <div className="text-xs mb-3" style={{ color: "#86868B" }}>
              {productFile ? (productFile.size / 1024).toFixed(0) + " KB" : ""}
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: "#FF453A", border: "1px solid #2A2A2A", background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2A0A0A")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Quitar imagen
            </button>
          </div>
        </div>
      )}

      <div
        className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
        style={{ background: "#1C1C1E", color: "#86868B" }}
      >
        <span>
          Si no subís imagen, el creativo igual se genera con copy y fondo IA. La integración del
          producto ocurre automáticamente si lo subís.
        </span>
      </div>

      {/* Avatar section */}
      <div className="mt-6 pt-6" style={{ borderTop: "1px solid #2A2A2A" }}>
        <h3 className="text-sm font-semibold mb-1">Avatar (opcional)</h3>
        <p className="text-xs mb-4" style={{ color: "#86868B" }}>
          Para plantillas de Punto de Dolor — si no subís uno, la IA genera la persona
        </p>

        {!avatarPreview ? (
          <label
            className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all"
            style={{ border: "2px dashed #2A2A2A", background: "#1C1C1E", minHeight: "140px" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00B5AD")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A2A")}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAvatarFileChange(file);
              }}
              className="hidden"
            />
            <div className="text-sm font-medium">Arrastrá o hacé click para subir avatar</div>
            <div className="text-xs" style={{ color: "#86868B" }}>PNG, JPG o WebP</div>
          </label>
        ) : (
          <div
            className="rounded-2xl flex items-center gap-5 p-5"
            style={{ background: "#1C1C1E", border: "1px solid #2A2A2A" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-28 w-28 object-contain rounded-xl shrink-0"
              style={{ background: "#141414" }}
            />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate mb-1">{avatarFile?.name}</div>
              <div className="text-xs mb-3" style={{ color: "#86868B" }}>
                {avatarFile ? (avatarFile.size / 1024).toFixed(0) + " KB" : ""}
              </div>
              <button
                type="button"
                onClick={onAvatarClear}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ color: "#FF453A", border: "1px solid #2A2A2A", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2A0A0A")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Quitar avatar
              </button>
            </div>
          </div>
        )}
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={productFile ? "Continuar →" : "Saltear →"}
      />
    </div>
  );
}

// ─── Step 4: Generar ──────────────────────────────────────────────────────────

function StepGenerar({
  bizProduct,
  bizOffer,
  bizAudience,
  bizProblem,
  bizTone,
  selectedTemplates,
  numAngles,
  productFile,
  businessProfileName,
  autoGenerating,
  autoStep,
  variantsGenerating,
  variantsProgress,
  totalCreatives,
  completedCreatives,
  progressPercent,
  error,
  resultImage,
  variants,
  canGenerate,
  onGenerate,
  onGenerateAngles,
  onGenerateSequence,
  onBack,
  creationMode,
  sequenceCount,
  singleTimings,
}: {
  bizProduct: string;
  bizOffer: string;
  bizAudience: string;
  bizProblem: string;
  bizTone: Tone;
  selectedTemplates: string[];
  numAngles: number;
  productFile: File | null;
  businessProfileName: string | null;
  autoGenerating: boolean;
  autoStep: string | null;
  variantsGenerating: boolean;
  variantsProgress: string;
  totalCreatives: number;
  completedCreatives: number;
  progressPercent: number;
  error: string | null;
  resultImage: string | null;
  variants: GeneratedVariant[];
  canGenerate: boolean;
  onGenerate: () => void;
  onGenerateAngles: () => void;
  onGenerateSequence: () => void;
  onBack: () => void;
  creationMode: "independiente" | "secuencia" | "sorteo";
  sequenceCount: number;
  singleTimings: Record<string, number> | null;
}) {
  const isGenerating = autoGenerating || variantsGenerating;
  const showSingleResult = resultImage && !variantsGenerating && variants.length === 0;
  const canDownloadAll = variants.length > 0 && !isGenerating;

  const handleDownloadAll = () => {
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const templateMeta = TEMPLATES.find((t) => t.id === variant.template);
      const templateName = (templateMeta?.name ?? variant.template)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const angleName = variant.angleName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const downloadName = `${String(i + 1).padStart(2, "0")}-${templateName}-${angleName}.png`;

      const link = document.createElement("a");
      link.href = variant.resultImage;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Group completed variants by template
  const templateGroups = selectedTemplates
    .map((tId) => {
      const meta = TEMPLATES.find((t) => t.id === tId);
      return {
        templateId: tId,
        templateName: meta?.name ?? tId,
        templateIcon: meta?.icon ?? "",
        items: variants.filter((v) => v.template === tId),
      };
    })
    .filter((g) => g.items.length > 0);

  const templateNamesList = selectedTemplates
    .map((id) => TEMPLATES.find((t) => t.id === id)?.name ?? id)
    .join(", ");

  return (
    <div className="space-y-4">
      {/* Summary + Actions */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#141414", border: "1px solid #2A2A2A" }}
      >
        <div className="flex items-start justify-between mb-4 gap-3">
          <h2 className="text-xl font-semibold text-balance">Resumen y generación</h2>
          {businessProfileName !== null && (
            <span className="text-xs font-medium whitespace-nowrap mt-1" style={{ color: "#00B5AD" }}>
              Perfil aplicado{businessProfileName ? ` — ${businessProfileName}` : ""}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <SummaryItem label="Producto" value={bizProduct || "—"} />
          <SummaryItem label="Oferta" value={bizOffer || "—"} />
          <SummaryItem label="Audiencia" value={bizAudience || "—"} />
          <SummaryItem label="Problema" value={bizProblem || "—"} />
          <SummaryItem label="Tono" value={TONE_LABELS[bizTone]} />
          <SummaryItem label="Ángulos" value={numAngles.toString()} />
          <SummaryItem label="Plantillas" value={templateNamesList} span={2} />
          <SummaryItem
            label="Imagen producto"
            value={productFile ? `✓ ${productFile.name}` : "Sin imagen"}
            span={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={onGenerate}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: canGenerate ? "#00B5AD" : "#2A2A2A",
              color: canGenerate ? "#000" : "#555",
              cursor: canGenerate ? "pointer" : "not-allowed",
            }}
          >
            {autoGenerating ? "Generando..." : "Generar 1 creativo"}
          </button>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={creationMode === "secuencia" ? onGenerateSequence : onGenerateAngles}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "transparent",
              color: canGenerate ? "#00B5AD" : "#555",
              cursor: canGenerate ? "pointer" : "not-allowed",
              border: `1.5px solid ${canGenerate ? "#00B5AD" : "#2A2A2A"}`,
            }}
          >
            {variantsGenerating
              ? "Generando..."
              : creationMode === "secuencia"
              ? `Generar secuencia (${sequenceCount} slides)`
              : creationMode === "sorteo"
              ? "Generar creativos de sorteo"
              : "Generar ángulos de venta"}
          </button>
        </div>

        {variants.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              disabled={!canDownloadAll}
              onClick={handleDownloadAll}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: canDownloadAll ? "#1C1C1E" : "#2A2A2A",
                color: canDownloadAll ? "#F5F5F7" : "#555",
                cursor: canDownloadAll ? "pointer" : "not-allowed",
                border: "1px solid #2A2A2A",
              }}
            >
              Descargar todos los creativos
            </button>
          </div>
        )}

        {/* Single generate progress */}
        {autoStep && (
          <GeneratingLoader step={autoStep} completed={0} total={0} percent={0} />
        )}

        {/* Angles generate progress */}
        {variantsProgress && (
          <GeneratingLoader
            step={variantsProgress}
            completed={completedCreatives}
            total={variantsGenerating ? totalCreatives : 0}
            percent={progressPercent}
          />
        )}

        {error && (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: "#2A0A0A", color: "#FF453A", border: "1px solid #3A1010" }}
          >
            {error}
          </div>
        )}

        {/* Back */}
        <div className="mt-6 pt-6" style={{ borderTop: "1px solid #2A2A2A" }}>
          <button
            type="button"
            onClick={onBack}
            disabled={isGenerating}
            className="text-sm transition-colors"
            style={{ color: "#86868B", cursor: isGenerating ? "not-allowed" : "pointer" }}
            onMouseEnter={(e) => !isGenerating && (e.currentTarget.style.color = "#F5F5F7")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#86868B")}
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Single creativo result */}
      {showSingleResult && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "#141414", border: "1px solid #2A2A2A" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Creativo generado</h3>
            <a
              href={resultImage!}
              download="creativo.png"
              className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
              style={{ background: "#00B5AD", color: "#000" }}
            >
              Descargar
            </a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultImage!}
            alt="Creativo generado"
            className="w-full rounded-xl"
            style={{ maxWidth: "540px", margin: "0 auto", display: "block" }}
          />
          {singleTimings && (
            <div style={{ maxWidth: "540px", margin: "12px auto 0" }}>
              <TimingBar timings={singleTimings} />
            </div>
          )}
        </div>
      )}

      {/* Secuencia — shown in sequence mode */}
      {creationMode === "secuencia" && variants.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "#141414", border: "1px solid #2A2A2A" }}
        >
          <h3 className="font-semibold mb-4">
            Secuencia{" "}
            <span style={{ color: "#86868B", fontWeight: 400 }}>
              — {variants.length} {variants.length === 1 ? "slide" : "slides"}
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map((v, idx) => (
              <SlideCard key={idx} variant={v} productFile={productFile} />
            ))}
          </div>
        </div>
      )}

      {/* Ángulos de venta — grouped by template (independiente mode only) */}
      {creationMode === "independiente" && templateGroups.map((group) => (
        <div
          key={group.templateId}
          className="rounded-2xl p-6"
          style={{ background: "#141414", border: "1px solid #2A2A2A" }}
        >
          <h3 className="font-semibold mb-4">
            {group.templateName}{" "}
            <span style={{ color: "#86868B", fontWeight: 400 }}>
              — {group.items.length} {group.items.length === 1 ? "ángulo" : "ángulos"}
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((v, idx) => (
              <AngleCard key={idx} variant={v} productFile={productFile} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: number;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ${span === 2 ? "col-span-2" : ""}`}
      style={{ background: "#1C1C1E", border: "1px solid #2A2A2A" }}
    >
      <div className="text-xs mb-0.5" style={{ color: "#86868B" }}>
        {label}
      </div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}

function TimingBar({ timings }: { timings: Record<string, number> }) {
  const fmt = (ms: number) =>
    ms >= 60000 ? `${(ms / 60000).toFixed(1)}m` : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(timings).map(([key, ms]) => (
        <span
          key={key}
          className="text-xs px-1.5 py-0.5 rounded font-mono"
          style={{
            background: key === "Total" ? "rgba(52,199,89,0.08)" : "#1A1A1A",
            color: key === "Total" ? "#34C759" : "#86868B",
            border: `1px solid ${key === "Total" ? "rgba(52,199,89,0.2)" : "#2A2A2A"}`,
          }}
        >
          {key} {fmt(ms)}
        </span>
      ))}
    </div>
  );
}

function AngleCard({ variant, productFile }: { variant: GeneratedVariant; productFile: File | null }) {
  const templateMeta = TEMPLATES.find((t) => t.id === variant.template);
  const templateName = templateMeta?.name ?? variant.template;
  const downloadName = `${variant.angleName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${variant.angle + 1}.png`;
  const [analysis, setAnalysis] = useState<CreativeAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const creativeBase64 = variant.resultImage.replace(/^data:[^;]+;base64,/, "");
    let productBase64: string | undefined;
    if (productFile) {
      const buf = await productFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      productBase64 = btoa(binary);
    }
    const res = await fetch("/api/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ANALYZE_CREATIVE", creativeBase64, productBase64, copy: variant.copy }),
    });
    const data = await res.json();
    if (data.success) setAnalysis(data.data);
    setIsAnalyzing(false);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#1C1C1E", border: "1px solid #2A2A2A" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variant.resultImage}
        alt={variant.angleName}
        className="w-full aspect-square object-cover"
      />
      <div className="p-3">
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#2A2A2A", color: "#86868B" }}
          >
            {templateName}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "rgba(0,181,173,0.12)",
              color: "#00B5AD",
              border: "1px solid rgba(0,181,173,0.25)",
            }}
          >
            {variant.angleName}
          </span>
        </div>
        <div className="flex gap-2">
          <a
            href={variant.resultImage}
            download={downloadName}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium text-center transition-all"
            style={{ background: "#2A2A2A", color: "#F5F5F7" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#00B5AD";
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2A2A2A";
              e.currentTarget.style.color = "#F5F5F7";
            }}
          >
            Descargar
          </a>
          <button
            type="button"
            className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: "transparent",
              color: "#86868B",
              border: "1px solid #2A2A2A",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#00B5AD";
              e.currentTarget.style.color = "#00B5AD";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2A2A2A";
              e.currentTarget.style.color = "#86868B";
            }}
          >
            Usar como principal
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full text-xs py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: isAnalyzing ? "#1C1C1E" : "transparent",
              color: isAnalyzing ? "#555" : "#86868B",
              border: "1px solid #2A2A2A",
              cursor: isAnalyzing ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isAnalyzing) {
                e.currentTarget.style.borderColor = "#7C5CBF";
                e.currentTarget.style.color = "#A97BFF";
              }
            }}
            onMouseLeave={(e) => {
              if (!isAnalyzing) {
                e.currentTarget.style.borderColor = "#2A2A2A";
                e.currentTarget.style.color = "#86868B";
              }
            }}
          >
            {isAnalyzing ? "Analizando..." : "🔍 Analizar con IA"}
          </button>
        </div>
        {variant.promptsUsed && <PromptsPanel prompts={variant.promptsUsed} />}
        {variant.timings && <TimingBar timings={variant.timings} />}
        {analysis && <CreativeAnalysisPanel analysis={analysis} />}
      </div>
    </div>
  );
}

function SlideCard({ variant, productFile }: { variant: GeneratedVariant; productFile: File | null }) {
  const slideNum = variant.slideNumber ?? (variant.angle + 1);
  const role = variant.slideRole ?? variant.angleName;
  const roleColor = SLIDE_ROLE_COLORS[role] ?? { bg: "#2A2A2A", text: "#86868B" };
  const downloadName = `slide-${String(slideNum).padStart(2, "0")}-${role.toLowerCase()}.png`;
  const [analysis, setAnalysis] = useState<CreativeAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const creativeBase64 = variant.resultImage.replace(/^data:[^;]+;base64,/, "");
    let productBase64: string | undefined;
    if (productFile) {
      const buf = await productFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      productBase64 = btoa(binary);
    }
    const res = await fetch("/api/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ANALYZE_CREATIVE", creativeBase64, productBase64, copy: variant.copy }),
    });
    const data = await res.json();
    if (data.success) setAnalysis(data.data);
    setIsAnalyzing(false);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#1C1C1E", border: "1px solid #2A2A2A" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variant.resultImage}
        alt={`Slide ${slideNum} — ${role}`}
        className="w-full aspect-square object-cover"
      />
      <div className="p-3">
        <div className="flex gap-1.5 mb-2.5 flex-wrap items-center">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: "#2A2A2A", color: "#F5F5F7" }}
          >
            #{slideNum}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: roleColor.bg, color: roleColor.text }}
          >
            {role}
          </span>
        </div>
        <div className="flex gap-2">
          <a
            href={variant.resultImage}
            download={downloadName}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium text-center transition-all"
            style={{ background: "#2A2A2A", color: "#F5F5F7" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#00B5AD";
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2A2A2A";
              e.currentTarget.style.color = "#F5F5F7";
            }}
          >
            Descargar
          </a>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: isAnalyzing ? "#1C1C1E" : "transparent",
              color: isAnalyzing ? "#555" : "#86868B",
              border: "1px solid #2A2A2A",
              cursor: isAnalyzing ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isAnalyzing) {
                e.currentTarget.style.borderColor = "#7C5CBF";
                e.currentTarget.style.color = "#A97BFF";
              }
            }}
            onMouseLeave={(e) => {
              if (!isAnalyzing) {
                e.currentTarget.style.borderColor = "#2A2A2A";
                e.currentTarget.style.color = "#86868B";
              }
            }}
          >
            {isAnalyzing ? "Analizando..." : "🔍 Analizar"}
          </button>
        </div>
        {variant.promptsUsed && <PromptsPanel prompts={variant.promptsUsed} />}
        {variant.timings && <TimingBar timings={variant.timings} />}
        {analysis && <CreativeAnalysisPanel analysis={analysis} />}
      </div>
    </div>
  );
}
