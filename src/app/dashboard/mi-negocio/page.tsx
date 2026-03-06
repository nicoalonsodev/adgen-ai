"use client";

import { useState, useEffect, useCallback } from "react";
import { BUSINESS_CATEGORIES } from "@/lib/businessCategories";
import { generateBrandPalette, isValidHex, getTextColorForBackground } from "@/lib/colorUtils";

// ─── Color roles del sistema de marca ─────────────────────────────────────────
// El orden del array determina el índice en coloresMarca[]:
// [0] primary, [1] primaryLight, [2] primaryDark, [3] primaryPale,
// [4] accent, [5] accentLight, [6] accentDark

const COLOR_ROLES = [
  { role: "primary",      name: "Principal",        usage: "CTAs, botones, logo" },
  { role: "primaryLight", name: "Principal Claro",  usage: "Fondos de secciones, áreas destacadas" },
  { role: "primaryDark",  name: "Principal Oscuro", usage: "Textos, headers, peso visual" },
  { role: "primaryPale",  name: "Principal Suave",  usage: "Fondos sutiles, cards, hovers" },
  { role: "accent",       name: "Color Acento",     usage: "CTA secundario, highlights, badge" },
  { role: "accentLight",  name: "Acento Claro",     usage: "Badges, tags, chips" },
  { role: "accentDark",   name: "Acento Oscuro",    usage: "Texto sobre fondos claros" },
] as const;

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
  const [coloresMarca, setColoresMarca] = useState<string[]>(["#E8D5C0", "", "", "", "", "", ""]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Scraper state
  const [scraperUrl, setScraperUrl] = useState("");
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperError, setScraperError] = useState("");
  const [scraperSuccess, setScraperSuccess] = useState(false);
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
      if (Array.isArray(data.coloresMarca) && data.coloresMarca.length > 0) {
        const loaded = [...data.coloresMarca];
        // Si tiene menos de 7 (datos viejos), regenerar desde el color principal
        if (loaded.length < 7 && loaded[0] && isValidHex(loaded[0])) {
          const palette = generateBrandPalette(loaded[0]);
          setColoresMarca([
            palette.primary.hex,
            palette.primaryLight.hex,
            palette.primaryDark.hex,
            palette.primaryPale.hex,
            palette.accent.hex,
            palette.accentLight.hex,
            palette.accentDark.hex,
          ]);
        } else {
          // Asegurar 7 slots
          while (loaded.length < 7) loaded.push("");
          setColoresMarca(loaded);
        }
      }
      if (data.updatedAt) setLastUpdated(data.updatedAt)
      if (data.logoBase64) {
        setLogoPreview(`data:${data.logoMimeType ?? 'image/png'};base64,${data.logoBase64}`)
      }
    }
    loadPerfil()
  }, []);

  const handlePrimaryColorChange = useCallback((hex: string) => {
    if (!isValidHex(hex)) {
      setColoresMarca((prev) => { const n = [...prev]; n[0] = hex; return n; });
      return;
    }

    const palette = generateBrandPalette(hex);
    setColoresMarca([
      palette.primary.hex,
      palette.primaryLight.hex,
      palette.primaryDark.hex,
      palette.primaryPale.hex,
      palette.accent.hex,
      palette.accentLight.hex,
      palette.accentDark.hex,
    ]);
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

  async function handleScrape() {
    if (!scraperUrl.trim()) return;
    setScraperLoading(true);
    setScraperError("");
    setScraperSuccess(false);
    try {
      const res = await fetch("/api/scrape-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scraperUrl.trim() }),
      });
      const json = await res.json();
      if (!json.ok) {
        setScraperError(json.error ?? "Error al analizar el sitio");
        return;
      }
      const d = json.data ?? {};
      if (d.nombre) setNombre(d.nombre);
      if (d.rubro) setRubro(d.rubro);
      if (d.queVendes) setQueVendes(d.queVendes);
      if (d.diferenciacion) setDiferenciacion(d.diferenciacion);
      if (d.propuestaUnica) setPropuestaUnica(d.propuestaUnica);
      if (d.clienteIdeal) setClienteIdeal(d.clienteIdeal);
      if (d.dolores) setDolores(d.dolores);
      if (d.motivadores) setMotivadores(d.motivadores);
      if (d.palabrasSi) setPalabrasSi(d.palabrasSi);
      if (d.palabrasNo) setPalabrasNo(d.palabrasNo);
      const tonoMap: Record<string, Tone> = {
        emocional: "emocional", tecnico: "tecnico",
        urgente: "urgente", inspiracional: "inspiracional",
      };
      if (d.tono && tonoMap[d.tono]) setTonos([tonoMap[d.tono]]);
      if (Array.isArray(d.coloresMarca) && d.coloresMarca.length > 0) {
        setColoresMarca((d.coloresMarca as string[]).slice(0, 4));
      }
      if (!scraperUrl.includes(sitioWeb) && scraperUrl) setSitioWeb(scraperUrl.trim());
      setScraperSuccess(true);
      setTimeout(() => setScraperSuccess(false), 4000);
    } catch {
      setScraperError("No se pudo conectar con el servidor");
    } finally {
      setScraperLoading(false);
    }
  }

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
      coloresMarca: coloresMarca.some((c) => c && isValidHex(c)) ? coloresMarca : undefined,
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

          {/* Section: Completar con IA desde web */}
          <div
            style={{
              background: "linear-gradient(135deg, #0D1F1F 0%, #141414 100%)",
              border: `1px solid ${S.accent}33`,
              borderRadius: 16,
              padding: "20px 24px",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 18 }}>✨</span>
              <span style={{ color: S.accent, fontWeight: 600, fontSize: 14 }}>
                Completar con IA desde tu sitio web
              </span>
            </div>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
              Pegá la URL de tu sitio y la IA va a analizar el contenido para completar
              automáticamente los campos de tu perfil.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={scraperUrl}
                onChange={(e) => setScraperUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !scraperLoading && handleScrape()}
                placeholder="https://www.minegocio.com"
                disabled={scraperLoading}
                style={{
                  flex: 1,
                  background: S.inputBg,
                  border: `1px solid ${scraperError ? "#FF453A" : S.border}`,
                  color: S.text,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = S.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = scraperError ? "#FF453A" : S.border)}
              />
              <button
                type="button"
                onClick={handleScrape}
                disabled={scraperLoading || !scraperUrl.trim()}
                style={{
                  background: scraperLoading || !scraperUrl.trim() ? "#1C1C1E" : S.accent,
                  color: scraperLoading || !scraperUrl.trim() ? S.muted : "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: scraperLoading || !scraperUrl.trim() ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s",
                  minWidth: 120,
                }}
              >
                {scraperLoading ? "Analizando..." : "Analizar web"}
              </button>
            </div>
            {scraperError && (
              <p style={{ color: "#FF453A", fontSize: 12, marginTop: 8 }}>
                ⚠ {scraperError}
              </p>
            )}
            {scraperSuccess && (
              <p style={{ color: "#30D158", fontSize: 12, marginTop: 8 }}>
                ✅ Perfil completado. Revisá los campos y guardá los cambios.
              </p>
            )}
          </div>

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
              <p style={{ color: S.muted, fontSize: 12, marginBottom: 14, marginTop: -4, lineHeight: 1.5 }}>
                Elegí tu color <strong style={{ color: S.text }}>Principal</strong> y se generará la paleta completa automáticamente.
                Podés personalizar cada color individualmente.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {COLOR_ROLES.map((role, idx) => {
                  const hex = coloresMarca[idx] || "#888888";
                  const isValid = isValidHex(hex);
                  const isPrimary = idx === 0;
                  const hasDivider = idx === 4; // separador antes del bloque acento

                  return (
                    <div key={role.role}>
                      {hasDivider && (
                        <div style={{ height: 1, background: S.border, margin: "8px 0" }} />
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: isPrimary ? `${S.accent}0D` : "transparent",
                          border: `1px solid ${isPrimary ? `${S.accent}33` : "transparent"}`,
                          transition: "background 0.15s",
                        }}
                      >
                        {/* Color picker */}
                        <input
                          type="color"
                          value={isValid ? hex : "#888888"}
                          onChange={(e) => {
                            if (isPrimary) {
                              handlePrimaryColorChange(e.target.value);
                            } else {
                              setColoresMarca((prev) => {
                                const next = [...prev];
                                while (next.length < 7) next.push("");
                                next[idx] = e.target.value;
                                return next;
                              });
                            }
                          }}
                          style={{
                            width: isPrimary ? 48 : 40,
                            height: isPrimary ? 48 : 40,
                            border: `2px solid ${isPrimary ? S.accent : S.border}`,
                            borderRadius: isPrimary ? 12 : 10,
                            cursor: "pointer",
                            padding: 2,
                            background: S.inputBg,
                            flexShrink: 0,
                          }}
                        />

                        {/* Swatch preview */}
                        {isValid && (
                          <div
                            style={{
                              width: isPrimary ? 48 : 40,
                              height: isPrimary ? 48 : 40,
                              borderRadius: isPrimary ? 12 : 10,
                              background: hex,
                              border: `1px solid ${S.border}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: isPrimary ? 11 : 9,
                              fontWeight: 700,
                              color: getTextColorForBackground(hex),
                              flexShrink: 0,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Aa
                          </div>
                        )}

                        {/* Labels */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            color: S.text,
                            fontSize: isPrimary ? 13 : 12,
                            fontWeight: isPrimary ? 600 : 500,
                          }}>
                            {role.name}
                            {isPrimary && (
                              <span style={{
                                marginLeft: 8,
                                fontSize: 9,
                                fontWeight: 600,
                                color: S.accent,
                                background: `${S.accent}1A`,
                                border: `1px solid ${S.accent}44`,
                                borderRadius: 4,
                                padding: "1px 6px",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}>
                                Base
                              </span>
                            )}
                          </div>
                          <div style={{ color: S.muted, fontSize: 10, marginTop: 1 }}>{role.usage}</div>
                        </div>

                        {/* Hex value */}
                        <span style={{
                          color: S.muted,
                          fontSize: 11,
                          fontFamily: "monospace",
                          flexShrink: 0,
                          background: S.inputBg,
                          border: `1px solid ${S.border}`,
                          borderRadius: 6,
                          padding: "3px 8px",
                        }}>
                          {isValid ? hex.toUpperCase() : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ color: S.muted, fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
                Estos colores se aplican automáticamente a los templates de tus anuncios.
              </p>
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
