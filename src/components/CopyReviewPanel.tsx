"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CopyReviewEntry {
  templateId: string;
  copies: Record<string, unknown>[];
  imageBriefLog: { input: Record<string, unknown>; output: string } | null;
  copySystemPrompt: string | null;
  copyUserPrompt: string | null;
  copyRawOutput: string | null;
  imageSystemPrompt: string | null;
  imageUserPrompt: string | null;
  imageRawOutput: string | null;
}

interface Props {
  entries: CopyReviewEntry[];
  /** TEMPLATE_META_LIST or similar — used to get icon/name for each templateId */
  templates: { id: string; name: string; icon?: string }[];
  /** Called when the user approves (with possibly-edited copies) */
  onApprove: (entries: CopyReviewEntry[]) => void;
  onCancel: () => void;
  /** Names shown per angle index, e.g. ["Emocional", "Urgencia", ...] */
  angleNames?: string[];
}

// ─── Field metadata ───────────────────────────────────────────────────────────

const VISUAL_FIELDS = new Set([
  "backgroundPrompt", "backgroundColorHint", "sceneAction",
  "scenePrompt", "productPrompt", "primaryColor",
]);

// Fields shown as non-editable metadata badges
const METADATA_FIELDS = new Set(["slideRole", "textSide"]);

const ARRAY_FIELDS = new Set(["bullets", "competitionBullets"]);

const SHORT_FIELDS = new Set([
  "badge", "title", "cta", "primaryColor", "backgroundColorHint", "textSide",
]);

const FIELD_LABELS: Record<string, string> = {
  headline: "Titular",
  title: "Título (pills)",
  subheadline: "Subtítulo",
  badge: "Badge / Oferta",
  bullets: "Bullets (uno por línea)",
  cta: "CTA",
  disclaimer: "Disclaimer",
  columnTitle: "Título columna",
  competitionTitle: "Título competencia",
  competitionBullets: "Bullets competencia (uno por línea)",
  backgroundPrompt: "Prompt de fondo",
  backgroundColorHint: "Color hint de fondo",
  sceneAction: "Escena / Acción",
  scenePrompt: "Prompt de escena",
  productPrompt: "Prompt de producto",
  primaryColor: "Color primario",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function arrayToText(arr: unknown[]): string {
  return arr.map((item) => String(item ?? "")).join("\n");
}

function textToArray(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

// ─── CopyCard ─────────────────────────────────────────────────────────────────

function CopyCard({
  copy,
  angleName,
  onUpdate,
}: {
  copy: Record<string, unknown>;
  angleName: string;
  onUpdate: (key: string, value: unknown) => void;
}) {
  const [showVisual, setShowVisual] = useState(false);

  const slideRole = typeof copy.slideRole === "string" ? copy.slideRole : null;
  const textSide = typeof copy.textSide === "string" ? copy.textSide : null;

  // Separate copy fields from visual fields (excluding metadata)
  const copyFields = Object.entries(copy).filter(
    ([k]) => !VISUAL_FIELDS.has(k) && !METADATA_FIELDS.has(k)
  );
  const visualFields = Object.entries(copy).filter(([k]) => VISUAL_FIELDS.has(k));

  return (
    <div
      style={{
        background: "#1C1C1E",
        border: "1px solid #2A2A2A",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        minWidth: 0,
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#F5F5F7" }}>{angleName}</span>
        {slideRole && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "6px",
              background: "rgba(0,181,173,0.15)",
              color: "#00B5AD",
              letterSpacing: "0.03em",
            }}
          >
            {slideRole}
          </span>
        )}
        {textSide && (
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.05)",
              color: "#86868B",
            }}
          >
            texto: {textSide}
          </span>
        )}
      </div>

      <div style={{ width: "100%", height: "1px", background: "#2A2A2A" }} />

      {/* Copy fields */}
      {copyFields.map(([key, value]) => (
        <FieldEditor
          key={key}
          fieldKey={key}
          value={value}
          onUpdate={(v) => onUpdate(key, v)}
        />
      ))}

      {/* Visual fields — collapsible */}
      {visualFields.length > 0 && (
        <div>
          <button
            onClick={() => setShowVisual((s) => !s)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#86868B",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 0",
            }}
          >
            <span style={{ fontSize: "10px" }}>{showVisual ? "▼" : "▶"}</span>
            {showVisual ? "Ocultar prompts visuales" : `Ver prompts visuales (${visualFields.length})`}
          </button>

          {showVisual && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              {visualFields.map(([key, value]) => (
                <FieldEditor
                  key={key}
                  fieldKey={key}
                  value={value}
                  visual
                  onUpdate={(v) => onUpdate(key, v)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FieldEditor ──────────────────────────────────────────────────────────────

function FieldEditor({
  fieldKey,
  value,
  visual = false,
  onUpdate,
}: {
  fieldKey: string;
  value: unknown;
  visual?: boolean;
  onUpdate: (v: unknown) => void;
}) {
  const label = FIELD_LABELS[fieldKey] ?? fieldKey;
  const isArray = ARRAY_FIELDS.has(fieldKey);
  const isShort = SHORT_FIELDS.has(fieldKey);

  const textValue = isArray
    ? arrayToText(Array.isArray(value) ? value : [])
    : String(value ?? "");

  const handleChange = (newText: string) => {
    onUpdate(isArray ? textToArray(newText) : newText);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: visual ? "rgba(255,255,255,0.03)" : "#141414",
    border: `1px solid ${visual ? "#222" : "#333"}`,
    borderRadius: "10px",
    padding: "10px 12px",
    color: "#F5F5F7",
    fontSize: "13px",
    outline: "none",
    resize: "vertical" as const,
    fontFamily: "inherit",
    lineHeight: 1.5,
  };

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 500,
          color: visual ? "#555" : "#86868B",
          marginBottom: "6px",
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
        }}
      >
        {label}
      </label>
      {isShort ? (
        <input
          type="text"
          value={textValue}
          onChange={(e) => handleChange(e.target.value)}
          style={{ ...inputStyle, height: "38px" }}
        />
      ) : (
        <textarea
          value={textValue}
          onChange={(e) => handleChange(e.target.value)}
          rows={isArray ? 3 : fieldKey === "subheadline" ? 2 : fieldKey.includes("Action") || fieldKey.includes("Prompt") || fieldKey.includes("prompt") ? 4 : 2}
          style={inputStyle}
        />
      )}
    </div>
  );
}

// ─── CopyReviewPanel ──────────────────────────────────────────────────────────

export function CopyReviewPanel({ entries, templates, onApprove, onCancel, angleNames }: Props) {
  const [editedEntries, setEditedEntries] = useState<CopyReviewEntry[]>(
    () =>
      entries.map((e) => ({
        ...e,
        copies: e.copies.map((c) => ({ ...c })),
      }))
  );

  const updateField = (entryIdx: number, copyIdx: number, key: string, value: unknown) => {
    setEditedEntries((prev) =>
      prev.map((entry, ei) => {
        if (ei !== entryIdx) return entry;
        return {
          ...entry,
          copies: entry.copies.map((copy, ci) => {
            if (ci !== copyIdx) return copy;
            return { ...copy, [key]: value };
          }),
        };
      })
    );
  };

  const totalAngles = editedEntries.reduce((sum, e) => sum + e.copies.length, 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        paddingBottom: "120px", // room for sticky footer
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#F5F5F7",
            margin: 0,
          }}
        >
          Revisá los copies antes de generar las imágenes
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#86868B" }}>
          {totalAngles} {totalAngles === 1 ? "ángulo generado" : "ángulos generados"} — editá
          cualquier campo directamente antes de confirmar.
        </p>
      </div>

      {/* Template groups */}
      {editedEntries.map((entry, entryIdx) => {
        const tplMeta = templates.find((t) => t.id === entry.templateId);
        return (
          <div key={entry.templateId}>
            {/* Template section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              {tplMeta?.icon && (
                <span style={{ fontSize: "20px" }}>{tplMeta.icon}</span>
              )}
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#F5F5F7",
                }}
              >
                {tplMeta?.name ?? entry.templateId}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#86868B",
                  marginLeft: "4px",
                }}
              >
                {entry.copies.length}{" "}
                {entry.copies.length === 1 ? "ángulo" : "ángulos"}
              </span>
            </div>

            {/* Copy cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "16px",
              }}
            >
              {entry.copies.map((copy, copyIdx) => {
                const angleName =
                  angleNames?.[copyIdx] ?? `Ángulo ${copyIdx + 1}`;
                return (
                  <CopyCard
                    key={copyIdx}
                    copy={copy}
                    angleName={angleName}
                    onUpdate={(key, value) =>
                      updateField(entryIdx, copyIdx, key, value)
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Sticky footer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid #2A2A2A",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          zIndex: 100,
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: "#86868B", flex: 1 }}>
          {totalAngles} {totalAngles === 1 ? "creativo" : "creativos"} listos para generar
        </p>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "1px solid #3A3A3A",
            borderRadius: "10px",
            padding: "10px 20px",
            color: "#86868B",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => onApprove(editedEntries)}
          style={{
            background: "#00B5AD",
            border: "none",
            borderRadius: "10px",
            padding: "10px 24px",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Aprobar y Generar Imágenes →
        </button>
      </div>
    </div>
  );
}
