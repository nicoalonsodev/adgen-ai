/**
 * Prompt Library loader.
 * Reads the curated .md example files at module load time.
 * These libraries are used by generateImageBriefGemini() as few-shot context.
 *
 * To add or improve examples, edit the corresponding .md file:
 *   src/lib/ai/prompt-library/product-only.md
 *   src/lib/ai/prompt-library/scene-only.md
 *   src/lib/ai/prompt-library/person-product.md
 */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/lib/ai/prompt-library");

export const PRODUCT_ONLY_LIBRARY   = fs.readFileSync(path.join(dir, "product-only.md"),   "utf-8");
export const SCENE_ONLY_LIBRARY     = fs.readFileSync(path.join(dir, "scene-only.md"),     "utf-8");
export const PERSON_PRODUCT_LIBRARY = fs.readFileSync(path.join(dir, "person-product.md"), "utf-8");

export type ImageBriefType = "product-only" | "scene-only" | "person-product";

export function getLibrary(type: ImageBriefType): string {
  switch (type) {
    case "product-only":   return PRODUCT_ONLY_LIBRARY;
    case "scene-only":     return SCENE_ONLY_LIBRARY;
    case "person-product": return PERSON_PRODUCT_LIBRARY;
  }
}

/**
 * Maps business category IDs to keywords present in the ## section headers of the .md files.
 * Order matters: first match wins. Add new categories here as the library grows.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "belleza-cosmetica":      ["Belleza", "Cosmética"],
  "salud-bienestar":        ["Salud", "Bienestar"],
  "salud-estetica-clinica": ["Salud", "Bienestar"],
  "fitness-deporte":        ["Fitness", "Deporte"],
  "alimentos-bebidas":      ["Alimentos", "Bebidas"],
  "gastronomia":            ["Alimentos", "Bebidas", "Gastronomía"],
  "tecnologia":             ["Tecnología"],
  "hogar-deco":             ["Hogar", "Decoración"],
  "mascotas":               ["Mascotas"],
  "joyeria-accesorios":     ["Joyería", "Accesorios"],
  "servicios-profesionales": ["Servicios", "Educación", "Profesional"],
  "educacion-cursos":       ["Servicios", "Educación"],
  "moda-indumentaria":      ["Moda", "Estilo"],
  "turismo-viajes":         ["Lifestyle", "Viajes"],
  "bienes-raices":          ["Servicios", "Profesional"],
};

/**
 * Returns only the library section(s) relevant to the given product category.
 * Falls back to the full library when the category is unknown or has no matching section.
 *
 * Each .md library is split by `## ` headers — only the matching section(s) are returned,
 * preserving the intro text so Gemini keeps the format context.
 */
export function getLibrarySection(type: ImageBriefType, productCategory: string): string {
  const library = getLibrary(type);
  const keywords = CATEGORY_KEYWORDS[productCategory] ?? [];

  if (keywords.length === 0) return library;

  // Split at every `## ` section header (keeping the delimiter)
  const parts = library.split(/(?=^## )/m);
  const intro = parts[0]; // everything before the first ## header
  const sections = parts.slice(1);

  const matched = sections.filter(section => {
    // Match only against the section category name (before the parenthetical examples)
    // e.g. "## Salud & Bienestar (suplementos...)" → "salud & bienestar"
    const headerName = section.split("\n")[0].replace(/^## /, "").split("(")[0].toLowerCase().trim();
    return keywords.some(kw => headerName.includes(kw.toLowerCase()));
  });

  // If no section matched the category, return the full library as fallback
  if (matched.length === 0) return library;

  return [intro.trim(), ...matched].join("\n");
}
