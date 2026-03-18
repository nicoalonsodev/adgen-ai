"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface PromptLayer {
  name: string;
  model?: string;
  /** Rendered as "SYSTEM" block — the LLM system prompt */
  systemPrompt?: string;
  /** Rendered as "INPUT" block — the user prompt / input parameters */
  input?: string;
  /** Rendered as "OUTPUT" block — the LLM response */
  prompt?: string;
  status: "completed" | "skipped";
}

export interface PromptsUsed {
  layers: PromptLayer[];
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function tryFormatJSON(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{
        background: "none",
        border: "1px solid #333",
        borderRadius: 4,
        color: copied ? "#30D158" : "#666",
        fontSize: 10,
        padding: "2px 8px",
        cursor: "pointer",
        transition: "color .2s",
      }}
    >
      {copied ? "✓ Copiado" : "Copiar"}
    </button>
  );
}

/* ── code block shared between inline and fullscreen ─────────────────────── */

function CodeBlock({ label, text, maxH }: { label: string; text: string; maxH?: number }) {
  const formatted = tryFormatJSON(text);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ color: "#888", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
        <CopyButton text={formatted} />
      </div>
      <pre
        style={{
          background: "#0C0C0C",
          border: "1px solid #1E1E1E",
          padding: "10px 12px",
          borderRadius: 6,
          fontSize: 11,
          lineHeight: 1.5,
          color: "#A0A0A0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: maxH ?? "none",
          overflow: "auto",
          margin: 0,
        }}
      >
        {formatted}
      </pre>
    </div>
  );
}

/* ── layer row (used in both inline and fullscreen) ──────────────────────── */

function LayerRow({
  layer,
  index,
  expandedLayer,
  setExpandedLayer,
  fullscreen,
}: {
  layer: PromptLayer;
  index: number;
  expandedLayer: number | null;
  setExpandedLayer: (v: number | null) => void;
  fullscreen?: boolean;
}) {
  const isExpanded = expandedLayer === index;
  const hasContent = !!(layer.systemPrompt || layer.input || layer.prompt);
  const codeMaxH = fullscreen ? undefined : 300;

  return (
    <div
      style={{
        padding: fullscreen ? "12px 16px" : "6px 10px",
        borderBottom: "1px solid #1C1C1E",
        background: isExpanded ? "#111" : "transparent",
        transition: "background .15s",
      }}
    >
      {/* header */}
      <button
        type="button"
        onClick={() => hasContent && setExpandedLayer(isExpanded ? null : index)}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          width: "100%",
          background: "none",
          border: "none",
          cursor: hasContent ? "pointer" : "default",
          textAlign: "left",
          padding: 0,
        }}
      >
        <span style={{ fontSize: fullscreen ? 14 : 12 }}>
          {layer.status === "completed" ? "✅" : "⏭️"}
        </span>
        <span style={{ fontWeight: 600, color: "#D0D0D0", fontSize: fullscreen ? 14 : 12 }}>
          {layer.name}
        </span>
        {layer.model && (
          <span
            style={{
              color: "#00B5AD",
              fontSize: fullscreen ? 11 : 10,
              background: "rgba(0,181,173,.1)",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            {layer.model}
          </span>
        )}
        {hasContent && (
          <span style={{ marginLeft: "auto", color: "#444", fontSize: 10 }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        )}
      </button>

      {/* expanded content */}
      {isExpanded && (
        <div style={{ paddingLeft: fullscreen ? 28 : 20, paddingTop: 8 }}>
          {layer.systemPrompt && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: "#8B5CF6", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>System Prompt</span>
                <CopyButton text={layer.systemPrompt} />
              </div>
              <pre
                style={{
                  background: "#0C0A1A",
                  border: "1px solid #2D1B69",
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "#C4B5FD",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: codeMaxH ?? "none",
                  overflow: "auto",
                  margin: 0,
                }}
              >
                {layer.systemPrompt}
              </pre>
            </div>
          )}
          {layer.input && <CodeBlock label="User Prompt" text={layer.input} maxH={codeMaxH} />}
          {layer.prompt && <CodeBlock label="Output" text={layer.prompt} maxH={codeMaxH} />}
        </div>
      )}

      {/* collapsed preview */}
      {!isExpanded && layer.prompt && (
        <p style={{ paddingLeft: fullscreen ? 28 : 20, color: "#444", fontSize: 11, margin: "4px 0 0", lineHeight: 1.4 }}>
          {layer.prompt.slice(0, 140)}{layer.prompt.length > 140 ? "…" : ""}
        </p>
      )}
    </div>
  );
}

/* ── fullscreen modal ────────────────────────────────────────────────────── */

function FullscreenModal({
  prompts,
  onClose,
}: {
  prompts: PromptsUsed;
  onClose: () => void;
}) {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);
  const completedCount = prompts.layers.filter((l) => l.status === "completed").length;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "92vw",
          maxWidth: 960,
          maxHeight: "90vh",
          background: "#0A0A0A",
          border: "1px solid #2A2A2A",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid #2A2A2A",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#F5F5F7" }}>
              Pipeline Log
            </span>
            <span style={{ color: "#555", fontSize: 12 }}>
              {completedCount}/{prompts.layers.length} capas completadas
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #333",
              borderRadius: 6,
              color: "#888",
              fontSize: 12,
              padding: "4px 12px",
              cursor: "pointer",
            }}
          >
            ESC ✕
          </button>
        </div>

        {/* layers */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {prompts.layers.map((layer, i) => (
            <LayerRow
              key={i}
              layer={layer}
              index={i}
              expandedLayer={expandedLayer}
              setExpandedLayer={setExpandedLayer}
              fullscreen
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── inline panel (the card that appears under each creative) ────────────── */

export function PromptsPanel({ prompts }: { prompts: PromptsUsed }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const completedCount = prompts.layers.filter((l) => l.status === "completed").length;

  return (
    <>
      <div
        style={{
          marginTop: 8,
          border: "1px solid #2A2A2A",
          borderRadius: 8,
          overflow: "hidden",
          fontSize: 11,
        }}
      >
        {/* collapsed header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#141414",
          }}
        >
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              flex: 1,
              padding: "6px 10px",
              background: "none",
              color: "#555",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 11,
            }}
          >
            <span>Prompts usados — {completedCount}/{prompts.layers.length} capas</span>
            <span style={{ fontSize: 9 }}>{expanded ? "▲" : "▼"}</span>
          </button>

          {/* fullscreen toggle */}
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            title="Ver en pantalla completa"
            style={{
              background: "none",
              border: "none",
              borderLeft: "1px solid #2A2A2A",
              color: "#555",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 13,
              lineHeight: 1,
            }}
          >
            ⛶
          </button>
        </div>

        {/* inline expanded layers */}
        {expanded && (
          <div style={{ borderTop: "1px solid #2A2A2A" }}>
            {prompts.layers.map((layer, i) => (
              <LayerRow
                key={i}
                layer={layer}
                index={i}
                expandedLayer={expandedLayer}
                setExpandedLayer={setExpandedLayer}
              />
            ))}
          </div>
        )}
      </div>

      {fullscreen && <FullscreenModal prompts={prompts} onClose={() => setFullscreen(false)} />}
    </>
  );
}
