"use client";

import { useState, useEffect } from "react";
import { BUSINESS_CATEGORIES } from "@/lib/businessCategories";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "emocional" | "tecnico" | "urgente" | "inspiracional";

interface NegocioPerfil {
  nombre: string;
  rubro: string;
  sitioWeb: string;
  queVendes: string;
  diferenciacion: string;
  propuestaUnica: string;
  clienteIdeal: string;
  dolores: string;
  motivadores: string;
  tonos: Tone[];
  palabrasSi: string;
  palabrasNo: string;
  updatedAt: string;
  category?: string;
  logoBase64?: string;
  logoMimeType?: string;
  coloresMarca?: string[];
}

const STORAGE_KEY = "negocio_perfil";
const STORAGE_SESSION_FALLBACK_KEY = "negocio_perfil_session";

function readStoredPerfil(): NegocioPerfil | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as NegocioPerfil;
  } catch {
    // ignore malformed data
  }

  try {
    const sessionRaw = sessionStorage.getItem(STORAGE_SESSION_FALLBACK_KEY);
    if (sessionRaw) return JSON.parse(sessionRaw) as NegocioPerfil;
  } catch {
    // ignore malformed data
  }

  return null;
}

function saveStoredPerfil(perfil: NegocioPerfil) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil));
    try {
      sessionStorage.removeItem(STORAGE_SESSION_FALLBACK_KEY);
    } catch {
      // ignore session storage errors
    }
    return;
  } catch {
    // fallback to lightweight local profile + full session profile
  }

  const { logoBase64, logoMimeType, ...perfilLite } = perfil;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfilLite));
  } catch {
    // ignore local storage errors on fallback
  }

  try {
    sessionStorage.setItem(STORAGE_SESSION_FALLBACK_KEY, JSON.stringify(perfil));
  } catch {
    // ignore session storage errors
  }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchPerfilFromDB(): Promise<NegocioPerfil | null> {
  try {
    const res = await fetch('/api/user/business-profile')
    if (!res.ok) return null
    const { data } = await res.json()
    if (!data) return null

    // Mapear de Supabase → NegocioPerfil
    return {
      nombre: data.business_name ?? '',
      category: data.product_category ?? '',
      rubro: data.metadata?.rubro ?? '',
      sitioWeb: data.metadata?.sitioWeb ?? '',
      queVendes: data.business_description ?? '',
      diferenciacion: data.metadata?.diferenciacion ?? '',
      propuestaUnica: data.metadata?.propuestaUnica ?? '',
      clienteIdeal: data.target_audience ?? '',
      dolores: data.metadata?.dolores ?? '',
      motivadores: data.metadata?.motivadores ?? '',
      tonos: data.metadata?.tonos ?? ['emocional'],
      palabrasSi: data.metadata?.palabrasSi ?? '',
      palabrasNo: data.metadata?.palabrasNo ?? '',
      coloresMarca: data.metadata?.coloresMarca ?? undefined,
      updatedAt: data.updated_at ?? '',
      logoBase64: data.logo_url?.split(',')[1] ?? undefined,
      logoMimeType: data.logo_url?.split(';')[0]?.split(':')[1] ?? undefined,
    }
  } catch {
    return null
  }
}

async function savePerfilToDB(perfil: NegocioPerfil): Promise<boolean> {
  try {
    const res = await fetch('/api/user/business-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perfil),
    })
    return res.ok
  } catch {
    return false
  }
}

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: "emocional", label: "Emocional", emoji: "😊" },
  { id: "tecnico", label: "Técnico", emoji: "🔬" },
  { id: "urgente", label: "Urgente", emoji: "⚡" },
  { id: "inspiracional", label: "Inspiracional", emoji: "✨" },
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const S = {
  bg: "#0A0A0A",
  card: "#141414",
  border: "#2A2A2A",
  accent: "#00B5AD",
  accentHover: "#009E96",
  text: "#F5F5F7",
  muted: "#86868B",
  inputBg: "#1C1C1E",
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{ color: S.text, borderBottom: `1px solid ${S.border}` }}
      className="text-sm font-semibold tracking-widest uppercase pb-3 mb-5"
    >
      {children}
    </h2>
  );
}

function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ color: S.muted }}
      className="block text-xs font-medium mb-1.5 tracking-wide"
    >
      {children}{" "}
      {optional && (
        <span style={{ color: "#555" }} className="font-normal">
          (opcional)
        </span>
      )}
    </label>
  );
}

function StyledInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        background: S.inputBg,
        border: `1px solid ${S.border}`,
        color: S.text,
        borderRadius: 10,
      }}
      className="block w-full px-3.5 py-2.5 text-sm placeholder:text-[#555] outline-none focus:ring-1 focus:ring-[#00B5AD] transition"
    />
  );
}

function StyledTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={{
        background: S.inputBg,
        border: `1px solid ${S.border}`,
        color: S.text,
        borderRadius: 10,
        resize: "vertical",
      }}
      className="block w-full px-3.5 py-2.5 text-sm placeholder:text-[#555] outline-none focus:ring-1 focus:ring-[#00B5AD] transition leading-relaxed"
    />
  );
}

function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor} optional={optional}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 16,
      }}
      className="p-6 space-y-5"
    >
      {children}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
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

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease, transform 0.25s ease",
        background: "#1C1C1E",
        border: `1px solid ${S.accent}`,
        color: S.text,
        borderRadius: 12,
        padding: "12px 24px",
        fontSize: 14,
        fontWeight: 500,
        pointerEvents: "none",
        zIndex: 9999,
        whiteSpace: "nowrap",
      }}
    >
      ✅ Perfil guardado
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MiNegocioPage() {
  const [nombre, setNombre] = useState("");
  const [category, setCategory] = useState("");
  const [rubro, setRubro] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [queVendes, setQueVendes] = useState("");
  const [diferenciacion, setDiferenciacion] = useState("");
  const [propuestaUnica, setPropuestaUnica] = useState("");
  const [clienteIdeal, setClienteIdeal] = useState("");
  const [dolores, setDolores] = useState("");
  const [motivadores, setMotivadores] = useState("");
  const [tonos, setTonos] = useState<Tone[]>(["emocional"]);
  const [palabrasSi, setPalabrasSi] = useState("");
  const [palabrasNo, setPalabrasNo] = useState("");
  const [coloresMarca, setColoresMarca] = useState<string[]>(["#E8D5C0"]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Load: primero Supabase, fallback a localStorage
  useEffect(() => {
    async function loadPerfil() {
      // Intentar Supabase primero
      const dbData = await fetchPerfilFromDB()
      const data = dbData ?? readStoredPerfil()
      if (!data) return

      if (data.nombre !== undefined) setNombre(data.nombre)
      if (data.category !== undefined) setCategory(data.category)
      if (data.rubro !== undefined) setRubro(data.rubro)
      if (data.sitioWeb !== undefined) setSitioWeb(data.sitioWeb)
      if (data.queVendes !== undefined) setQueVendes(data.queVendes)
      if (data.diferenciacion !== undefined) setDiferenciacion(data.diferenciacion)
      if (data.propuestaUnica !== undefined) setPropuestaUnica(data.propuestaUnica)
      if (data.clienteIdeal !== undefined) setClienteIdeal(data.clienteIdeal)
      if (data.dolores !== undefined) setDolores(data.dolores)
      if (data.motivadores !== undefined) setMotivadores(data.motivadores)
      if (Array.isArray(data.tonos) && data.tonos.length > 0) setTonos(data.tonos)
      if (data.palabrasSi !== undefined) setPalabrasSi(data.palabrasSi)
      if (data.palabrasNo !== undefined) setPalabrasNo(data.palabrasNo)
      if (Array.isArray(data.coloresMarca) && data.coloresMarca.length > 0) setColoresMarca(data.coloresMarca)
      if (data.updatedAt) setLastUpdated(data.updatedAt)
      if (data.logoBase64) {
        setLogoPreview(`data:${data.logoMimeType ?? 'image/png'};base64,${data.logoBase64}`)
      }
    }
    loadPerfil()
  }, []);

  function toggleTone(t: Tone) {
    setTonos((prev) =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
    );
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  async function handleSave() {
    const now = new Date().toISOString()
    let existingLogoBase64: string | null = null
    let existingLogoMimeType: string | null = null
    try {
      const parsed = readStoredPerfil()
      if (parsed) {
        existingLogoBase64 = parsed.logoBase64 ?? null
        existingLogoMimeType = parsed.logoMimeType ?? null
      }
    } catch {}

    const logoBase64 = logoFile ? await fileToBase64(logoFile) : existingLogoBase64
    const logoMimeType = logoFile ? logoFile.type : existingLogoMimeType

    const perfil: NegocioPerfil = {
      nombre, category: category || undefined, rubro, sitioWeb, queVendes,
      diferenciacion, propuestaUnica, clienteIdeal, dolores, motivadores,
      tonos, palabrasSi, palabrasNo, updatedAt: now,
      coloresMarca: coloresMarca.length > 0 ? coloresMarca : undefined,
      ...(logoBase64 ? { logoBase64, logoMimeType: logoMimeType ?? 'image/png' } : {}),
    }

    // Guardar en Supabase (principal) y localStorage (backup)
    saveStoredPerfil(perfil)
    await savePerfilToDB(perfil)

    setLastUpdated(now)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  return (
    <main style={{ background: S.bg, minHeight: "100vh", color: S.text }}>
      <div className="mx-auto px-5 py-10" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <a
              href="/dashboard"
              style={{ color: S.muted }}
              className="text-sm hover:text-white transition"
            >
              Dashboard
            </a>
            <span style={{ color: S.border }} className="text-sm">
              /
            </span>
            <span style={{ color: S.text }} className="text-sm font-medium">
              Mi ADN
            </span>
          </div>

          <h1
            style={{ color: S.text }}
            className="text-3xl font-semibold tracking-tight mb-2"
          >
            Mi ADN
          </h1>
          <p style={{ color: S.muted }} className="text-sm leading-relaxed">
            Esta información se usa para personalizar todos tus copies automáticamente
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">

          {/* Section 0: Identidad de marca */}
          <Card>
            <SectionTitle>Identidad de marca</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <FieldLabel>Logo del negocio</FieldLabel>
              {!logoPreview ? (
                <label
                  style={{
                    border: `2px dashed ${S.border}`,
                    borderRadius: 12,
                    width: 160,
                    height: 160,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: S.inputBg,
                    gap: 8,
                    textAlign: "center",
                    padding: "0 12px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = S.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = S.border)}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setLogoFile(file);
                      const reader = new FileReader();
                      reader.onload = () => setLogoPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span style={{ fontSize: 32 }}>🖼️</span>
                  <span style={{ color: S.muted, fontSize: 11 }}>
                    Subí tu logo (PNG con fondo transparente recomendado)
                  </span>
                </label>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Logo"
                    style={{
                      width: 160,
                      height: 160,
                      objectFit: "contain",
                      borderRadius: 12,
                      background: S.inputBg,
                      border: `1px solid ${S.border}`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(""); }}
                    style={{ color: S.muted, fontSize: 12, background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FF453A")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = S.muted)}
                  >
                    ✕ Quitar
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Section 1: Información general */}
          <Card>
            <SectionTitle>Información general</SectionTitle>
            <Field label="Nombre del negocio" htmlFor="nombre">
              <StyledInput
                id="nombre"
                value={nombre}
                onChange={setNombre}
                placeholder="DermaLisse"
              />
            </Field>
            <Field label="Categoría de negocio" htmlFor="category">
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  background: S.inputBg,
                  border: `1px solid ${S.border}`,
                  color: category ? S.text : "#555",
                  borderRadius: 10,
                }}
                className="block w-full px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00B5AD] transition"
              >
                <option value="">Seleccionar categoría...</option>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rubro / industria" htmlFor="rubro">
              <StyledInput
                id="rubro"
                value={rubro}
                onChange={setRubro}
                placeholder="Cosmética y skincare"
              />
            </Field>
            <Field label="Sitio web" htmlFor="sitioWeb" optional>
              <StyledInput
                id="sitioWeb"
                value={sitioWeb}
                onChange={setSitioWeb}
                placeholder="www.dermalisse.com"
              />
            </Field>
          </Card>

          {/* Section 2: Propuesta de valor */}
          <Card>
            <SectionTitle>Tu propuesta de valor</SectionTitle>
            <Field label="¿Qué vendés? Descripción general" htmlFor="queVendes">
              <StyledTextarea
                id="queVendes"
                value={queVendes}
                onChange={setQueVendes}
                placeholder="Cremas y sueros para el cuidado de la piel, especializados en anti-edad y reafirmantes"
                rows={3}
              />
            </Field>
            <Field label="¿Qué te diferencia de la competencia?" htmlFor="diferenciacion">
              <StyledTextarea
                id="diferenciacion"
                value={diferenciacion}
                onChange={setDiferenciacion}
                placeholder="Fórmulas con ingredientes clínicamente probados a precios accesibles"
                rows={3}
              />
            </Field>
            <Field label="Tu propuesta única de valor" htmlFor="propuestaUnica">
              <StyledTextarea
                id="propuestaUnica"
                value={propuestaUnica}
                onChange={setPropuestaUnica}
                placeholder="Resultados visibles en 30 días o te devolvemos el dinero"
                rows={2}
              />
            </Field>
          </Card>

          {/* Section 3: Cliente ideal */}
          <Card>
            <SectionTitle>Tu cliente ideal</SectionTitle>
            <Field label="Descripción general" htmlFor="clienteIdeal">
              <StyledTextarea
                id="clienteIdeal"
                value={clienteIdeal}
                onChange={setClienteIdeal}
                placeholder="Mujeres de 30-55 años, interesadas en el autocuidado, con poder adquisitivo medio-alto"
                rows={3}
              />
            </Field>
            <Field label="Principales dolores y problemas" htmlFor="dolores">
              <StyledTextarea
                id="dolores"
                value={dolores}
                onChange={setDolores}
                placeholder="Estrías post embarazo, piel flácida, falta de tiempo para rutinas complejas"
                rows={3}
              />
            </Field>
            <Field label="Qué los motiva a comprar" htmlFor="motivadores">
              <StyledTextarea
                id="motivadores"
                value={motivadores}
                onChange={setMotivadores}
                placeholder="Ver resultados rápidos, confianza en la marca, recomendaciones de otras mujeres"
                rows={2}
              />
            </Field>
          </Card>

          {/* Section 4: Tono y estilo */}
          <Card>
            <SectionTitle>Tono y estilo de comunicación</SectionTitle>

            {/* Tone pills */}
            <div>
              <FieldLabel>Tono de marca</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => {
                  const active = tonos.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTone(t.id)}
                      style={{
                        background: active ? S.accent : S.inputBg,
                        border: `1px solid ${active ? S.accent : S.border}`,
                        color: active ? "#fff" : S.muted,
                        borderRadius: 999,
                        padding: "6px 16px",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {t.emoji} {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Palabras y frases que SÍ usás" htmlFor="palabrasSi">
              <StyledTextarea
                id="palabrasSi"
                value={palabrasSi}
                onChange={setPalabrasSi}
                placeholder="firmeza, suavidad, cuidado, resultado, transformación"
                rows={2}
              />
            </Field>
            <Field label="Palabras que NUNCA usás" htmlFor="palabrasNo">
              <StyledTextarea
                id="palabrasNo"
                value={palabrasNo}
                onChange={setPalabrasNo}
                placeholder="barato, químico, artificial"
                rows={2}
              />
            </Field>

            {/* Brand colors */}
            <div>
              <FieldLabel>Colores de marca</FieldLabel>
              <p style={{ color: S.muted, fontSize: 12, marginBottom: 10, marginTop: -4 }}>
                El generador usará estos colores como paleta para los fondos de tus creativos.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                {coloresMarca.map((color, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ position: "relative" }}>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          const next = [...coloresMarca];
                          next[idx] = e.target.value;
                          setColoresMarca(next);
                        }}
                        style={{
                          width: 52,
                          height: 52,
                          border: `2px solid ${S.border}`,
                          borderRadius: 12,
                          cursor: "pointer",
                          padding: 3,
                          background: S.inputBg,
                        }}
                      />
                      {coloresMarca.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setColoresMarca((prev) => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: "absolute",
                            top: -7,
                            right: -7,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "#555",
                            border: "none",
                            color: "#fff",
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <span style={{ color: S.muted, fontSize: 10, fontFamily: "monospace" }}>
                      {color.toUpperCase()}
                    </span>
                  </div>
                ))}
                {coloresMarca.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setColoresMarca((prev) => [...prev, "#FFFFFF"])}
                    style={{
                      width: 52,
                      height: 52,
                      border: `2px dashed ${S.border}`,
                      borderRadius: 12,
                      background: "transparent",
                      color: S.muted,
                      fontSize: 24,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Save button */}
          <div>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: S.accent,
                color: "#fff",
                borderRadius: 12,
                height: 52,
                width: "100%",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = S.accentHover)
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = S.accent)
              }
            >
              💾 Guardar perfil
            </button>

            {lastUpdated && (
              <p
                style={{ color: S.muted }}
                className="text-xs text-center mt-3"
              >
                Última actualización: {formatDate(lastUpdated)}
              </p>
            )}
          </div>
        </div>
      </div>

      <Toast visible={toastVisible} />
    </main>
  );
}
