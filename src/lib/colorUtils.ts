// ─── Color Utilities ──────────────────────────────────────────────────────────
// Funciones puras de teoría del color para generación de paletas de marca.
// Sin dependencias externas. Compatible con Server y Client Components.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColorRole = {
  hex: string;
  role: string;
  name: string;
  usage: string;
  isLight: boolean;
};

export type BrandPalette = {
  primary: ColorRole;
  primaryLight: ColorRole;
  primaryDark: ColorRole;
  primaryPale: ColorRole;
  accent: ColorRole;
  accentLight: ColorRole;
  accentDark: ColorRole;
};

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Valida si un string es un color hexadecimal válido.
 * @param hex - Color en formato "#RGB", "#RRGGBB", "RGB" o "RRGGBB"
 * @returns `true` si es un hex válido
 * @example isValidHex("#3B6EF5") // true
 * @example isValidHex("fff")     // true
 * @example isValidHex("xyz")     // false
 */
export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

/**
 * Normaliza un color hex a formato "#rrggbb" en lowercase.
 * @param hex - Color hex en cualquier formato aceptado
 * @returns Color normalizado, ej: "#ffffff"
 * @example normalizeHex("#fff")    // "#ffffff"
 * @example normalizeHex("3B6EF5") // "#3b6ef5"
 */
export function normalizeHex(hex: string): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return `#${h.toLowerCase()}`;
}

// ─── Converters ───────────────────────────────────────────────────────────────

/**
 * Convierte un color hexadecimal a componentes RGB.
 * @param hex - Color hex (acepta "#RGB", "#RRGGBB", "RGB", "RRGGBB")
 * @returns Tupla [R, G, B] con valores 0-255
 * @example hexToRgb("#3B6EF5") // [59, 110, 245]
 */
export function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex).slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return [
    clamp(r, 0, 255),
    clamp(g, 0, 255),
    clamp(b, 0, 255),
  ];
}

/**
 * Convierte un color hexadecimal a componentes HSL.
 * @param hex - Color hex
 * @returns Tupla [H, S, L] donde H: 0-360, S: 0-100, L: 0-100
 * @example hexToHsl("#3B6EF5") // [219, 88, 59]  (aprox)
 */
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === rn) {
      h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
    } else if (max === gn) {
      h = ((bn - rn) / delta + 2) * 60;
    } else {
      h = ((rn - gn) / delta + 4) * 60;
    }
  }

  return [
    Math.round(h) % 360,
    Math.round(s * 100),
    Math.round(l * 100),
  ];
}

/**
 * Convierte componentes HSL a color hexadecimal.
 * H se normaliza con módulo 360, S y L se clampean a 0-100.
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Color hex normalizado, ej: "#3b6ef5"
 * @example hslToHex(219, 88, 59) // "#3b6ef5"  (aprox)
 */
export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let rn: number, gn: number, bn: number;

  if (hh < 60) {
    [rn, gn, bn] = [c, x, 0];
  } else if (hh < 120) {
    [rn, gn, bn] = [x, c, 0];
  } else if (hh < 180) {
    [rn, gn, bn] = [0, c, x];
  } else if (hh < 240) {
    [rn, gn, bn] = [0, x, c];
  } else if (hh < 300) {
    [rn, gn, bn] = [x, 0, c];
  } else {
    [rn, gn, bn] = [c, 0, x];
  }

  const r = Math.round((rn + m) * 255);
  const g = Math.round((gn + m) * 255);
  const b = Math.round((bn + m) * 255);

  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

// ─── Palette Generation ───────────────────────────────────────────────────────

/**
 * Genera una paleta de marca completa a partir de un color principal.
 * Incluye variantes claras, oscuras, pálidas y colores complementarios (acento).
 * @param primaryHex - Color principal de la marca en formato hex
 * @returns Objeto `BrandPalette` con 7 roles de color
 * @example
 * const palette = generateBrandPalette("#3B6EF5");
 * palette.primary.hex      // "#3b6ef5"
 * palette.accent.hex       // complementario (H+180)
 * palette.primaryLight.hex // versión clara
 */
export function generateBrandPalette(primaryHex: string): BrandPalette {
  const [h, s, l] = hexToHsl(primaryHex);
  const accentH = (h + 180) % 360;

  const makeRole = (
    hue: number,
    sat: number,
    lig: number,
    role: string,
    name: string,
    usage: string,
  ): ColorRole => ({
    hex: hslToHex(hue, sat, lig),
    role,
    name,
    usage,
    isLight: lig > 55,
  });

  return {
    primary: makeRole(h, s, l, "primary", "Color Principal", "CTAs, botones, logo"),
    primaryLight: makeRole(
      h,
      Math.max(s - 15, 10),
      Math.min(l + 30, 93),
      "primaryLight",
      "Principal Claro",
      "Fondos de secciones, áreas destacadas",
    ),
    primaryDark: makeRole(
      h,
      Math.min(s + 10, 100),
      Math.max(l - 25, 8),
      "primaryDark",
      "Principal Oscuro",
      "Textos, headers, peso visual",
    ),
    primaryPale: makeRole(
      h,
      Math.max(s - 30, 8),
      Math.min(l + 42, 96),
      "primaryPale",
      "Principal Suave",
      "Fondos sutiles, cards, hovers",
    ),
    accent: makeRole(accentH, s, l, "accent", "Color Acento", "CTA secundario, highlights"),
    accentLight: makeRole(
      accentH,
      Math.max(s - 15, 10),
      Math.min(l + 28, 93),
      "accentLight",
      "Acento Claro",
      "Badges, tags, chips",
    ),
    accentDark: makeRole(
      accentH,
      Math.min(s + 10, 100),
      Math.max(l - 22, 8),
      "accentDark",
      "Acento Oscuro",
      "Texto sobre fondos claros",
    ),
  };
}

// ─── Accessibility ────────────────────────────────────────────────────────────

/**
 * Calcula el ratio de contraste WCAG 2.1 entre dos colores.
 * @param hex1 - Primer color hex
 * @param hex2 - Segundo color hex
 * @returns Ratio de contraste (ej: 4.52). Rango 1-21.
 * @example getContrastRatio("#000000", "#ffffff") // 21
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Determina el nivel de conformidad WCAG según un ratio de contraste.
 * @param ratio - Ratio de contraste numérico
 * @returns "AAA" | "AA" | "AA-Large" | "Fail"
 * @example getWcagLevel(7.5) // "AAA"
 * @example getWcagLevel(4.8) // "AA"
 */
export function getWcagLevel(ratio: number): "AAA" | "AA" | "AA-Large" | "Fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-Large";
  return "Fail";
}

/**
 * Retorna el color de texto ideal (oscuro o claro) para usar sobre un fondo dado.
 * @param backgroundHex - Color de fondo en hex
 * @returns "#111111" para fondos claros, "#f5f5f5" para fondos oscuros
 * @example getTextColorForBackground("#ffffff") // "#111111"
 * @example getTextColorForBackground("#000000") // "#f5f5f5"
 */
export function getTextColorForBackground(backgroundHex: string): "#111111" | "#f5f5f5" {
  const [, , l] = hexToHsl(backgroundHex);
  return l > 55 ? "#111111" : "#f5f5f5";
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function toHex2(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
}

function linearize(channel: number): number {
  const v = channel / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ─── Template Color Resolution ───────────────────────────────────────────────

export type TemplateColorMode = "light" | "dark";

export type TemplateColors = {
  /** Color para títulos y headlines */
  headline: string;
  /** Color para texto secundario (subheadline, body) */
  body: string;
  /** Color para bullets y texto terciario */
  muted: string;
  /** Color de fondo del badge/pill CTA */
  badgeBg: string;
  /** Color del texto dentro del badge/pill */
  badgeText: string;
  /** Color para overlays sólidos (si el template necesita) */
  overlayBg: string;
  /** Opacidad sugerida para el overlay */
  overlayOpacity: number;
  /** Paleta completa por si el template necesita acceso directo */
  palette: BrandPalette;
};

/**
 * Resuelve los colores que un template debe usar según el color de marca y el modo de fondo.
 *
 * - **"light"**: el template tiene fondo claro (imagen lifestyle, producto sobre blanco).
 *   Usa `primaryDark` para texto, `accent` para CTAs.
 * - **"dark"**: el template tiene fondo oscuro (overlay denso, color sólido).
 *   Usa colores claros para texto, `accent` o `accentLight` para CTAs.
 *
 * Si `primaryColor` es undefined, retorna null (el template debe usar sus fallbacks hardcodeados).
 *
 * Antes de retornar, verifica contraste WCAG AA (≥ 4.5) entre headline y overlay/fondo,
 * y entre badgeText y badgeBg. Si no pasa, ajusta lightness automáticamente.
 *
 * @param primaryColor - Color hex principal de marca (puede ser undefined)
 * @param mode - "light" o "dark" según el fondo que usa el template
 * @returns Colores resueltos o null si no hay primaryColor
 *
 * @example
 * // Template con fondo lifestyle claro:
 * const colors = resolveTemplateColors("#3B6EF5", "light");
 * // colors.headline → primaryDark (#1a3199 aprox)
 * // colors.badgeBg  → accent (naranja complementario)
 *
 * @example
 * // Template con overlay oscuro:
 * const colors = resolveTemplateColors("#3B6EF5", "dark");
 * // colors.headline → "#f5f5f5"
 * // colors.badgeBg  → accentLight
 */
export function resolveTemplateColors(
  primaryColor: string | undefined,
  mode: TemplateColorMode,
): TemplateColors | null {
  if (!primaryColor || !isValidHex(primaryColor)) return null;

  const palette = generateBrandPalette(primaryColor);

  let headline: string;
  let body: string;
  let muted: string;
  let badgeBg: string;
  let badgeText: string;
  let overlayBg: string;
  let overlayOpacity: number;

  if (mode === "light") {
    // Fondo claro → texto negro legible, solo CTA con color de marca
    headline = "#1A1A1A";
    body = "#1A1A1A";
    muted = "#444444";
    badgeBg = palette.accent.hex;
    badgeText = getTextColorForBackground(palette.accent.hex);
    overlayBg = palette.primaryPale.hex;
    overlayOpacity = 0.6;
  } else {
    // Fondo oscuro → texto claro, CTA con acento claro
    headline = "#f5f5f5";
    body = palette.accentLight.hex;
    muted = palette.primaryLight.hex;
    badgeBg = palette.accent.hex;
    badgeText = getTextColorForBackground(palette.accent.hex);
    overlayBg = palette.primaryDark.hex;
    overlayOpacity = 0.85;
  }

  // ── Verificar contraste y ajustar si es necesario ──
  badgeText = ensureContrast(badgeText, badgeBg);

  // Para modo light, verificar headline contra un fondo blanco estimado
  if (mode === "light") {
    headline = ensureContrast(headline, "#ffffff");
    body = ensureContrast(body, "#ffffff");
  }

  return {
    headline,
    body,
    muted,
    badgeBg,
    badgeText,
    overlayBg,
    overlayOpacity,
    palette,
  };
}

/**
 * Resuelve los colores de template usando la paleta de marca guardada por el negocio.
 *
 * A diferencia de `resolveTemplateColors` (que regenera desde el primario),
 * esta función usa directamente el array `coloresMarca` guardado, respetando
 * cualquier personalización individual que haya hecho el usuario.
 *
 * Índices esperados (coinciden con COLOR_ROLES en mi-negocio/page.tsx):
 *   [0] primary, [1] primaryLight, [2] primaryDark, [3] primaryPale,
 *   [4] accent,  [5] accentLight,  [6] accentDark
 *
 * @param brandColors - Array de 7 hex proveniente de coloresMarca[]
 * @param mode - "light" o "dark" según el fondo del template
 * @returns TemplateColors resueltos, o null si el array no tiene colores válidos
 */
export function resolveTemplateColorsFromPalette(
  brandColors: string[] | undefined,
  mode: TemplateColorMode,
): TemplateColors | null {
  if (!brandColors || brandColors.length === 0) return null;

  const primary     = brandColors[0];
  const primaryLight = brandColors[1];
  const primaryDark  = brandColors[2];
  const primaryPale  = brandColors[3];
  const accent       = brandColors[4];
  const accentLight  = brandColors[5];
  const accentDark   = brandColors[6];

  // Necesitamos al menos el color principal válido
  if (!primary || !isValidHex(primary)) return null;

  // Para los colores que falten, generamos la paleta automáticamente como fallback
  const generated = generateBrandPalette(primary);

  const safeLight  = (primaryLight && isValidHex(primaryLight))  ? primaryLight  : generated.primaryLight.hex;
  const safeDark   = (primaryDark  && isValidHex(primaryDark))   ? primaryDark   : generated.primaryDark.hex;
  const safePale   = (primaryPale  && isValidHex(primaryPale))   ? primaryPale   : generated.primaryPale.hex;
  const safeAccent = (accent       && isValidHex(accent))        ? accent        : generated.accent.hex;
  const safeAccentL = (accentLight && isValidHex(accentLight))   ? accentLight   : generated.accentLight.hex;
  const safeAccentD = (accentDark  && isValidHex(accentDark))    ? accentDark    : generated.accentDark.hex;

  // Construir BrandPalette desde los colores guardados
  const makeColorRole = (hex: string, role: string, name: string, usage: string): ColorRole => ({
    hex,
    role,
    name,
    usage,
    isLight: hexToHsl(hex)[2] > 55,
  });

  const palette: BrandPalette = {
    primary:      makeColorRole(primary,      "primary",      "Color Principal",   "CTAs, botones, logo"),
    primaryLight: makeColorRole(safeLight,    "primaryLight", "Principal Claro",   "Fondos de secciones"),
    primaryDark:  makeColorRole(safeDark,     "primaryDark",  "Principal Oscuro",  "Textos, headers"),
    primaryPale:  makeColorRole(safePale,     "primaryPale",  "Principal Suave",   "Fondos sutiles"),
    accent:       makeColorRole(safeAccent,   "accent",       "Color Acento",      "CTA secundario, badge"),
    accentLight:  makeColorRole(safeAccentL,  "accentLight",  "Acento Claro",      "Badges, tags"),
    accentDark:   makeColorRole(safeAccentD,  "accentDark",   "Acento Oscuro",     "Texto sobre fondos claros"),
  };

  let headline: string;
  let body: string;
  let muted: string;
  let badgeBg: string;
  let badgeText: string;
  let overlayBg: string;
  let overlayOpacity: number;

  if (mode === "light") {
    // Fondo claro → usar primaryDark de la marca para texto (brand-tinted headline)
    // con fallback a near-black si el contraste es insuficiente
    headline      = ensureContrast(safeDark, "#ffffff");
    body          = ensureContrast(safeDark, "#ffffff");
    muted         = ensureContrast(safeAccentD, "#ffffff", 3.5);
    badgeBg       = safeAccent;
    badgeText     = getTextColorForBackground(safeAccent);
    overlayBg     = safePale;
    overlayOpacity = 0.6;
  } else {
    // Fondo oscuro → texto claro sobre overlay
    headline      = "#f5f5f5";
    body          = safeAccentL;
    muted         = safeLight;
    badgeBg       = safeAccent;
    badgeText     = getTextColorForBackground(safeAccent);
    overlayBg     = safeDark;
    overlayOpacity = 0.85;
  }

  // Verificar contraste badge
  badgeText = ensureContrast(badgeText, badgeBg);

  return {
    headline,
    body,
    muted,
    badgeBg,
    badgeText,
    overlayBg,
    overlayOpacity,
    palette,
  };
}

/**
 * Ajusta el color de texto para garantizar contraste WCAG mínimo contra un fondo.
 * Si el contraste es insuficiente, oscurece o aclara el texto en pasos de L ±5.
 * @param textHex - Color del texto
 * @param bgHex - Color del fondo
 * @param minRatio - Ratio mínimo requerido (default 4.5 = WCAG AA)
 * @returns Color de texto ajustado
 */
function ensureContrast(textHex: string, bgHex: string, minRatio = 4.5): string {
  let ratio = getContrastRatio(textHex, bgHex);
  if (ratio >= minRatio) return textHex;

  const [h, s, l] = hexToHsl(textHex);
  const bgIsLight = hexToHsl(bgHex)[2] > 50;
  // Si el fondo es claro, oscurecer el texto; si es oscuro, aclarar
  const step = bgIsLight ? -5 : 5;
  let adjusted = l;

  for (let i = 0; i < 18; i++) {
    adjusted = clamp(adjusted + step, 0, 100);
    const candidate = hslToHex(h, s, adjusted);
    ratio = getContrastRatio(candidate, bgHex);
    if (ratio >= minRatio) return candidate;
  }

  // Fallback extremo: blanco o negro
  return bgIsLight ? "#111111" : "#f5f5f5";
}
