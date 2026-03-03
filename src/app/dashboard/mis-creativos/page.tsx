"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PromptsPanel, type PromptsUsed } from "@/components/PromptsPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupabaseCreativo {
  id: string;
  name: string;
  template_id: string;
  angle: string | null;
  image_url: string;
  thumbnail_url: string | null;  // null en creativos viejos → fallback a image_url
  copy_data: {
    product?: string;
    offer?: string;
    audience?: string;
    problem?: string;
    tone?: string;
    creationMode?: string;
    angleName?: string;
    slideRole?: string | null;
    slideNumber?: number | null;
    copy?: Record<string, unknown>;
    promptsUsed?: PromptsUsed;
  } | null;
  is_favorite: boolean;
  created_at: string;
}

interface CreativoBatch {
  batchKey: string;        // hash único de la tanda
  product: string;
  offer: string;
  audience: string;
  problem: string;
  tone: string;
  creationMode: string;
  creatives: SupabaseCreativo[];
  startedAt: string;       // created_at del primer creativo
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_LABELS: Record<string, string> = {
  "classic-editorial-right": "Classic Editorial",
  "promo-urgencia-bottom": "Promo Urgencia",
  "hero-center-bottom": "Hero Center",
  "headline-top-left": "Headline Top Left",
  "pain-point-left": "Punto de Dolor",
  "comparacion-split": "Comparación Split",
};

const TONE_LABELS: Record<string, string> = {
  emocional: "😊 Emocional",
  tecnico: "🔬 Técnico",
  urgente: "⚡ Urgente",
  inspiracional: "✨ Inspiracional",
};

const BATCH_WINDOW_MS = 20 * 60 * 1000; // 20 minutos

// ─── Design tokens ────────────────────────────────────────────────────────────

const S = {
  bg: "#0A0A0A",
  card: "#141414",
  border: "#2A2A2A",
  accent: "#00B5AD",
  text: "#F5F5F7",
  muted: "#86868B",
  inputBg: "#1C1C1E",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Agrupa creativos en tandas:
 * - Mismo producto + oferta + audiencia + problema + tono + modo
 * - Creados dentro de una ventana de 20 minutos del primero del grupo
 */
function groupIntoBatches(creatives: SupabaseCreativo[]): CreativoBatch[] {
  const sorted = [...creatives].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const batches: CreativoBatch[] = [];

  for (const creativo of sorted) {
    const cd = creativo.copy_data;
    const campaignKey = [
      cd?.product ?? "",
      cd?.offer ?? "",
      cd?.audience ?? "",
      cd?.problem ?? "",
      cd?.tone ?? "",
      cd?.creationMode ?? "",
    ].join("|");

    const createdAt = new Date(creativo.created_at).getTime();

    const existing = batches.find((b) => {
      if (b.batchKey !== campaignKey) return false;
      const batchStart = new Date(b.startedAt).getTime();
      return createdAt - batchStart <= BATCH_WINDOW_MS;
    });

    if (existing) {
      existing.creatives.push(creativo);
    } else {
      batches.push({
        batchKey: campaignKey,
        product: cd?.product ?? "Sin producto",
        offer: cd?.offer ?? "",
        audience: cd?.audience ?? "",
        problem: cd?.problem ?? "",
        tone: cd?.tone ?? "",
        creationMode: cd?.creationMode ?? "independiente",
        creatives: [creativo],
        startedAt: creativo.created_at,
      });
    }
  }

  return batches.reverse();
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg
        width="64" height="64" viewBox="0 0 64 64" fill="none"
        style={{ marginBottom: 20, opacity: 0.25 }}
      >
        <rect x="4" y="4" width="24" height="24" rx="4" stroke="#F5F5F7" strokeWidth="2" />
        <rect x="36" y="4" width="24" height="24" rx="4" stroke="#F5F5F7" strokeWidth="2" />
        <rect x="4" y="36" width="24" height="24" rx="4" stroke="#F5F5F7" strokeWidth="2" />
        <rect x="36" y="36" width="24" height="24" rx="4" stroke="#F5F5F7" strokeWidth="2" />
      </svg>
      <p style={{ color: S.muted, fontSize: 16, marginBottom: 20 }}>
        Todavía no generaste ningún creativo
      </p>
      <a
        href="/dashboard/fabrica-de-contenido"
        style={{
          background: S.accent, color: "#fff", borderRadius: 10,
          padding: "10px 20px", fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}
      >
        → Ir a Fábrica de Creativos
      </a>
    </div>
  );
}

// ─── Creativo Card (dentro del detalle de tanda) ──────────────────────────────

function CreativoCard({ creativo }: { creativo: SupabaseCreativo }) {
  const [hovered, setHovered] = useState(false);
  const templateLabel = TEMPLATE_LABELS[creativo.template_id] ?? creativo.template_id;
  const isSequence = !!(creativo.copy_data?.slideRole || creativo.copy_data?.slideNumber);

  async function handleDownload() {
    try {
      const res = await fetch(creativo.image_url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${creativo.name ?? "creativo"}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(creativo.image_url, "_blank");
    }
  }

  return (
    <div
      style={{
        background: S.inputBg, border: `1px solid ${S.border}`,
        borderRadius: 14, overflow: "hidden", position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "relative", aspectRatio: "1 / 1" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={creativo.thumbnail_url ?? creativo.image_url}
          alt={creativo.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0, transition: "opacity 200ms ease",
          }}
        >
          <button
            type="button" onClick={handleDownload}
            style={{
              background: S.accent, border: "none", color: "#000",
              borderRadius: 8, padding: "8px 18px", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            ⬇️ Descargar
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
          <span
            style={{
              background: "rgba(0,181,173,0.15)", border: "1px solid rgba(0,181,173,0.3)",
              color: S.accent, borderRadius: 999, fontSize: 10, fontWeight: 600, padding: "2px 8px",
            }}
          >
            {templateLabel}
          </span>
          {(creativo.angle || creativo.copy_data?.angleName) && (
            <span
              style={{
                background: "#222", border: `1px solid ${S.border}`,
                color: S.muted, borderRadius: 999, fontSize: 10, padding: "2px 8px",
              }}
            >
              {isSequence
                ? `Slide ${creativo.copy_data?.slideNumber ?? "?"}`
                : (creativo.angle ?? creativo.copy_data?.angleName)}
            </span>
          )}
        </div>
        {isSequence && creativo.copy_data?.slideRole && (
          <p style={{ color: S.muted, fontSize: 11, marginTop: 2 }}>
            {String(creativo.copy_data.slideRole)}
          </p>
        )}
        {creativo.copy_data?.promptsUsed && (
          <PromptsPanel prompts={creativo.copy_data.promptsUsed} />
        )}
      </div>
    </div>
  );
}

// ─── Batch Detail View ────────────────────────────────────────────────────────

function BatchDetail({ batch, onBack }: { batch: CreativoBatch; onBack: () => void }) {
  const router = useRouter();
  const isSequence = batch.creationMode === "secuencia";

  function handleUsarConfig() {
    try {
      localStorage.setItem(
        "adgen_draft_batch",
        JSON.stringify({
          product: batch.product,
          offer: batch.offer,
          audience: batch.audience,
          problem: batch.problem,
          tone: batch.tone,
          creationMode: batch.creationMode,
        })
      );
    } catch {
      // ignore
    }
    router.push("/dashboard/fabrica-de-contenido");
  }

  async function handleDownloadAll() {
    for (const creativo of batch.creatives) {
      try {
        const res = await fetch(creativo.image_url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${creativo.name ?? "creativo"}.png`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(creativo.image_url, "_blank");
      }
    }
  }

  return (
    <div>
      <button
        type="button" onClick={onBack}
        className="flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: S.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = S.text)}
        onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
      >
        ← Volver a mis tandas
      </button>

      {/* Header de la tanda */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: S.card, border: `1px solid ${S.border}` }}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                style={{
                  background: isSequence ? "rgba(139,92,246,0.15)" : "rgba(0,181,173,0.15)",
                  border: `1px solid ${isSequence ? "rgba(139,92,246,0.3)" : "rgba(0,181,173,0.3)"}`,
                  color: isSequence ? "#A78BFA" : S.accent,
                  borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "2px 10px",
                }}
              >
                {isSequence ? "🎬 Secuencia" : "🎯 Creativos independientes"}
              </span>
              <span style={{ color: S.muted, fontSize: 12 }}>{formatDateShort(batch.startedAt)}</span>
            </div>
            <h2 style={{ color: S.text, fontSize: 22, fontWeight: 600 }}>{batch.product || "Sin nombre"}</h2>
            {batch.offer && <p style={{ color: S.accent, fontSize: 14, marginTop: 2 }}>{batch.offer}</p>}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button" onClick={handleUsarConfig}
              style={{
                background: "transparent", color: S.accent,
                border: `1px solid ${S.accent}`,
                borderRadius: 10, padding: "8px 18px", fontSize: 13,
                fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              ✏️ Usar esta config
            </button>
            <button
              type="button" onClick={handleDownloadAll}
              style={{
                background: S.accent, color: "#000", border: "none",
                borderRadius: 10, padding: "8px 18px", fontSize: 13,
                fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              ⬇️ Descargar todos ({batch.creatives.length})
            </button>
          </div>
        </div>

        {/* Config grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          style={{ borderTop: `1px solid ${S.border}`, paddingTop: 16 }}
        >
          {[
            { label: "Producto", value: batch.product },
            { label: "Oferta", value: batch.offer || "—" },
            { label: "Audiencia", value: batch.audience || "—" },
            { label: "Problema / Beneficio", value: batch.problem || "—" },
            { label: "Tono", value: (TONE_LABELS[batch.tone] ?? batch.tone) || "—" },
            {
              label: "Modo",
              value: isSequence ? "Secuencia" : `${batch.creatives.length} ángulos independientes`,
            },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: S.inputBg, borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ color: S.muted, fontSize: 11, marginBottom: 3 }}>{label}</p>
              <p style={{ color: S.text, fontSize: 13, fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Creativos */}
      <div className="rounded-2xl p-6" style={{ background: S.card, border: `1px solid ${S.border}` }}>
        <h3 style={{ color: S.text, fontWeight: 600, marginBottom: 16, fontSize: 16 }}>
          {isSequence ? "🎬 Slides generados" : "🖼️ Creativos generados"}{" "}
          <span style={{ color: S.muted, fontWeight: 400 }}>
            — {batch.creatives.length} {batch.creatives.length === 1 ? "creativo" : "creativos"}
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batch.creatives.map((c) => (
            <CreativoCard key={c.id} creativo={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Batch Card (en el listado) ───────────────────────────────────────────────

function BatchCard({ batch, onClick }: { batch: CreativoBatch; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isSequence = batch.creationMode === "secuencia";
  const preview = batch.creatives.slice(0, 4);
  const templates = [...new Set(batch.creatives.map((c) => TEMPLATE_LABELS[c.template_id] ?? c.template_id))];

  return (
    <button
      type="button" onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: S.card,
        border: `1px solid ${hovered ? S.accent : S.border}`,
        borderRadius: 16, overflow: "hidden",
        cursor: "pointer", textAlign: "left", width: "100%",
        transition: "border-color 180ms ease", padding: 0,
      }}
    >
      {/* Preview grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: preview.length >= 2 ? "1fr 1fr" : "1fr",
          gridTemplateRows: preview.length >= 3 ? "1fr 1fr" : "1fr",
          aspectRatio: "1 / 1", overflow: "hidden", background: S.inputBg,
        }}
      >
        {preview.map((c, i) => (
          <div
            key={c.id}
              // en el preview de la BatchCard también usar thumbnail
            style={{
              position: "relative", overflow: "hidden",
              gridColumn: preview.length === 3 && i === 2 ? "1 / -1" : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.thumbnail_url ?? c.image_url} alt={c.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ))}
        {preview.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: S.muted, fontSize: 32 }}>
            🖼️
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
          <span
            style={{
              background: isSequence ? "rgba(139,92,246,0.15)" : "rgba(0,181,173,0.15)",
              border: `1px solid ${isSequence ? "rgba(139,92,246,0.3)" : "rgba(0,181,173,0.3)"}`,
              color: isSequence ? "#A78BFA" : S.accent,
              borderRadius: 999, fontSize: 10, fontWeight: 600, padding: "2px 8px",
            }}
          >
            {isSequence ? "🎬 Secuencia" : "🎯 Independiente"}
          </span>
          <span
            style={{
              background: "#1C1C1E", border: `1px solid ${S.border}`,
              color: S.muted, borderRadius: 999, fontSize: 10, padding: "2px 8px",
            }}
          >
            {batch.creatives.length} {batch.creatives.length === 1 ? "creativo" : "creativos"}
          </span>
        </div>
        <p style={{ color: S.text, fontSize: 14, fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>
          {batch.product || "Sin nombre"}
        </p>
        {batch.offer && (
          <p style={{ color: S.accent, fontSize: 12, marginBottom: 6 }}>{batch.offer}</p>
        )}
        <p style={{ color: S.muted, fontSize: 11, marginBottom: 6 }}>
          {templates.slice(0, 2).join(", ")}{templates.length > 2 ? ` +${templates.length - 2}` : ""}
        </p>
        <p style={{ color: "#555", fontSize: 11 }}>{formatDate(batch.startedAt)}</p>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MisCreativosPage() {
  const [batches, setBatches] = useState<CreativoBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<CreativoBatch | null>(null);

  const loadCreativos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/creatives?limit=200");
      if (!res.ok) throw new Error("Error cargando creativos");
      const { data } = await res.json();
      const grouped = groupIntoBatches(data ?? []);
      setBatches(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCreativos();
  }, [loadCreativos]);

  const totalCreativos = batches.reduce((acc, b) => acc + b.creatives.length, 0);

  return (
    <main style={{ background: S.bg, minHeight: "100vh", color: S.text }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 1100 }}>

        {/* Header */}
        {!selectedBatch && (
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 style={{ color: S.text }} className="text-3xl font-semibold tracking-tight mb-1">
                  Mis Creativos
                </h1>
                <p style={{ color: S.muted }} className="text-sm">
                  Tus tandas de creativos agrupadas por campaña
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {!loading && batches.length > 0 && (
                  <span
                    style={{
                      background: "rgba(0,181,173,0.15)", border: "1px solid rgba(0,181,173,0.3)",
                      color: S.accent, borderRadius: 999, fontSize: 13,
                      fontWeight: 600, padding: "4px 14px", whiteSpace: "nowrap",
                    }}
                  >
                    {batches.length} {batches.length === 1 ? "tanda" : "tandas"} · {totalCreativos} creativos
                  </span>
                )}
                <a
                  href="/dashboard/fabrica-de-contenido"
                  style={{
                    background: S.accent, color: "#000", borderRadius: 10,
                    padding: "8px 16px", fontSize: 13, fontWeight: 600,
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  + Nueva tanda
                </a>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div style={{ color: S.muted, fontSize: 14 }}>Cargando creativos...</div>
          </div>
        ) : error ? (
          <div
            className="rounded-xl px-5 py-4 text-sm"
            style={{ background: "#2A0A0A", color: "#FF453A", border: "1px solid #3A1010" }}
          >
            {error}{" "}
            <button
              type="button" onClick={loadCreativos}
              style={{ color: S.accent, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
            >
              Reintentar
            </button>
          </div>
        ) : selectedBatch ? (
          <BatchDetail batch={selectedBatch} onBack={() => setSelectedBatch(null)} />
        ) : batches.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {batches.map((batch, i) => (
              <BatchCard
                key={`${batch.batchKey}-${i}`}
                batch={batch}
                onClick={() => setSelectedBatch(batch)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
