"use client";

import { useState } from "react";

export interface PromptLayer {
  name: string;
  model?: string;
  /** Rendered as "INPUT" block before the main prompt output */
  input?: string;
  prompt?: string;
  status: "completed" | "skipped";
}

export interface PromptsUsed {
  layers: PromptLayer[];
}

const CODE_BLOCK_STYLE: React.CSSProperties = {
  marginTop: 4,
  background: "#0A0A0A",
  padding: "6px 8px",
  borderRadius: 4,
  fontSize: 10,
  color: "#666",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 200,
  overflow: "auto",
};

export function PromptsPanel({ prompts }: { prompts: PromptsUsed }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);

  const completedCount = prompts.layers.filter((l) => l.status === "completed").length;

  return (
    <div
      style={{
        marginTop: 8,
        border: "1px solid #2A2A2A",
        borderRadius: 8,
        overflow: "hidden",
        fontSize: 11,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "6px 10px",
          background: "#141414",
          color: "#555",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>Prompts usados — {completedCount}/{prompts.layers.length} capas</span>
        <span style={{ fontSize: 9 }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid #2A2A2A" }}>
          {prompts.layers.map((layer, i) => (
            <div
              key={i}
              style={{
                padding: "6px 10px",
                borderBottom: i < prompts.layers.length - 1 ? "1px solid #1C1C1E" : undefined,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                <span>{layer.status === "completed" ? "✅" : "⏭️"}</span>
                <span style={{ fontWeight: 600, color: "#D0D0D0" }}>{layer.name}</span>
                {layer.model && (
                  <span style={{ color: "#444", fontSize: 10 }}>{layer.model}</span>
                )}
              </div>

              {/* INPUT block (only shown when expanded) */}
              {layer.input && expandedLayer === i && (
                <div style={{ paddingLeft: 20, marginBottom: 4 }}>
                  <span style={{ color: "#666", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>INPUT</span>
                  <pre style={CODE_BLOCK_STYLE}>{layer.input}</pre>
                </div>
              )}

              {/* OUTPUT / prompt block */}
              {layer.prompt && (
                <div style={{ paddingLeft: 20 }}>
                  {layer.input && expandedLayer === i && (
                    <span style={{ color: "#666", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>OUTPUT</span>
                  )}
                  <p style={{ color: "#555", lineHeight: 1.4 }}>
                    {expandedLayer === i
                      ? layer.prompt
                      : layer.prompt.slice(0, 120) + (layer.prompt.length > 120 ? "…" : "")}
                  </p>
                  {layer.prompt.length > 120 && (
                    <button
                      type="button"
                      onClick={() => setExpandedLayer(expandedLayer === i ? null : i)}
                      style={{
                        color: "#00B5AD",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      {expandedLayer === i ? "Ver menos" : "Ver completo"}
                    </button>
                  )}
                  {expandedLayer === i && (
                    <pre style={CODE_BLOCK_STYLE}>{layer.prompt}</pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
