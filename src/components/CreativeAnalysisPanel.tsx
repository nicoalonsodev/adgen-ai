"use client";

import { useState } from "react";
import type { CreativeAnalysisResult } from "@/lib/ai/gemini";

function scoreIcon(score: number): string {
  if (score >= 7) return "✅";
  if (score >= 5) return "⚠️";
  return "❌";
}

function scoreColor(score: number): string {
  if (score > 7.5) return "#4CAF50";
  if (score >= 5) return "#FF9800";
  return "#F44336";
}

const ASPECT_LABELS: Record<keyof CreativeAnalysisResult["aspects"], string> = {
  visualQuality: "Calidad visual",
  messageClarity: "Claridad del mensaje",
  productPresence: "Presencia del producto",
  spellingGrammar: "Ortografía y gramática",
  imageCoherence: "Coherencia visual",
};

export function CreativeAnalysisPanel({ analysis }: { analysis: CreativeAnalysisResult }) {
  const [expanded, setExpanded] = useState(false);

  const scoreCol = scoreColor(analysis.overallScore);

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
          gap: 6,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔍 Análisis IA</span>
          <span style={{ fontWeight: 700, color: scoreCol, fontSize: 12 }}>
            {analysis.overallScore.toFixed(1)}/10
          </span>
        </span>
        <span style={{ fontSize: 9 }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid #2A2A2A" }}>
          {/* 5 aspects */}
          {(Object.keys(ASPECT_LABELS) as (keyof CreativeAnalysisResult["aspects"])[]).map((key, i, arr) => {
            const aspect = analysis.aspects[key];
            return (
              <div
                key={key}
                style={{
                  padding: "5px 10px",
                  borderBottom: i < arr.length - 1 ? "1px solid #1C1C1E" : undefined,
                  display: "flex",
                  gap: 6,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ flexShrink: 0 }}>{scoreIcon(aspect.score)}</span>
                <span style={{ color: "#D0D0D0", fontWeight: 600, minWidth: 130, flexShrink: 0 }}>
                  {ASPECT_LABELS[key]}
                </span>
                <span style={{ color: scoreColor(aspect.score), fontWeight: 700, flexShrink: 0 }}>
                  {aspect.score}/10
                </span>
                <span style={{ color: "#666", lineHeight: 1.4 }}>{aspect.feedback}</span>
              </div>
            );
          })}

          {/* Critical issues */}
          {analysis.criticalIssues.length > 0 && (
            <div
              style={{
                padding: "6px 10px",
                borderTop: "1px solid #1C1C1E",
                background: "#1A0A0A",
              }}
            >
              <div style={{ color: "#F44336", fontWeight: 600, marginBottom: 3 }}>
                ⚠️ Problemas críticos
              </div>
              {analysis.criticalIssues.map((issue, i) => (
                <div key={i} style={{ color: "#CC4444", paddingLeft: 16, lineHeight: 1.4 }}>
                  • {issue}
                </div>
              ))}
            </div>
          )}

          {/* Highlights */}
          {analysis.highlights.length > 0 && (
            <div
              style={{
                padding: "6px 10px",
                borderTop: "1px solid #1C1C1E",
                background: "#0A1A0A",
              }}
            >
              <div style={{ color: "#4CAF50", fontWeight: 600, marginBottom: 3 }}>
                ✅ Puntos fuertes
              </div>
              {analysis.highlights.map((hl, i) => (
                <div key={i} style={{ color: "#4CAF50", paddingLeft: 16, lineHeight: 1.4, opacity: 0.8 }}>
                  • {hl}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div
            style={{
              padding: "6px 10px",
              borderTop: "1px solid #1C1C1E",
              color: "#777",
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            {analysis.summary}
          </div>
        </div>
      )}
    </div>
  );
}
