/**
 * Prompt Library loader.
 * Reads the curated .md example files at module load time.
 * These libraries are used by generateImageBriefGemini() as few-shot context.
 *
 * To add or improve examples, edit the corresponding .md file:
 *   src/lib/ai/prompt-library/product-only.md
 *   src/lib/ai/prompt-library/scene-only.md
 *   src/lib/ai/prompt-library/person-product.md
 *   src/lib/ai/prompt-library/scenesLibrary.md
 *   src/lib/ai/prompt-library/texture-library.md
 */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/lib/ai/prompt-library");

export const PRODUCT_ONLY_LIBRARY   = fs.readFileSync(path.join(dir, "product-only.md"),   "utf-8");
export const SCENE_ONLY_LIBRARY     = fs.readFileSync(path.join(dir, "scene-only.md"),     "utf-8");
export const PERSON_PRODUCT_LIBRARY = fs.readFileSync(path.join(dir, "person-product.md"), "utf-8");
export const SCENES_LIBRARY          = fs.readFileSync(path.join(dir, "scenesLibrary.md"),  "utf-8");
export const TEXTURE_LIBRARY         = fs.readFileSync(path.join(dir, "texture-library.md"), "utf-8");

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
  "tecnologia":             ["Tecnología", "Tecnología & Lifestyle Digital"],
  "hogar-deco":             ["Hogar", "Decoración", "Hogar & Decoración"],
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

  // If no section matched the category, sample from the entire library
  const source = matched.length > 0 ? matched.join("\n") : sections.join("\n");
  const sourceIntro = matched.length > 0 ? intro : intro;

  // Each matched section may contain multiple **Example:** blocks.
  // Randomly sample EXAMPLES_PER_CALL of them to keep token usage low.
  const exampleParts = source.split(/(?=^\*\*)/m);
  const sectionHeader = exampleParts[0]; // "## Category\n description...\n"
  const examples = exampleParts.slice(1).filter(e => e.trim().length > 0);

  if (examples.length <= EXAMPLES_PER_CALL) {
    return [sourceIntro.trim(), sectionHeader.trim(), ...examples].join("\n");
  }

  const shuffled = [...examples];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return [sourceIntro.trim(), sectionHeader.trim(), ...shuffled.slice(0, EXAMPLES_PER_CALL)].join("\n");
}

/** How many examples to randomly sample from getLibrarySection per call. */
const EXAMPLES_PER_CALL = 2;

/** How many angles to randomly sample per category (keeps token usage low while varying inspiration). */
const ANGLES_PER_CALL = 1;

/**
 * Returns scene examples from scenesLibrary.md filtered by business category.
 * - Strips the "Instrucciones" and "Guía" meta-sections (not useful inside the prompt).
 * - Randomly samples ANGLES_PER_CALL angles from the matched category so each
 *   generation receives different creative inspiration.
 * Falls back to the full library when no section matches.
 */
export function getSceneLibrarySection(productCategory: string): string {
  const keywords = CATEGORY_KEYWORDS[productCategory] ?? [];

  if (keywords.length === 0) {
    console.log(JSON.stringify({
      tag: "[SCENE_LIBRARY:PROCESS]",
      timestamp: new Date().toISOString(),
      category: productCategory,
      keywords: [],
      matchedSections: 0,
      availableAngles: 0,
      selectedAngles: [],
      fallback: "full_library",
      reason: "no_keywords_for_category",
      outputChars: SCENES_LIBRARY.length,
      estimatedTokens: Math.ceil(SCENES_LIBRARY.length / 4),
    }, null, 2));
    return SCENES_LIBRARY;
  }

  const parts = SCENES_LIBRARY.split(/(?=^## )/m);
  const intro = parts[0];
  const sections = parts.slice(1);

  // Filter out meta-sections (Instrucciones, Guía) — they are not useful inside the prompt
  const contentSections = sections.filter(section => {
    const header = section.split("\n")[0].replace(/^## /, "").toLowerCase().trim();
    return !header.startsWith("instrucciones") && !header.startsWith("guía");
  });

  const matched = contentSections.filter(section => {
    const headerName = section.split("\n")[0].replace(/^## /, "").split("(")[0].toLowerCase().trim();
    return keywords.some(kw => headerName.includes(kw.toLowerCase()));
  });

  const matchedHeaders = matched.map(s => s.split("\n")[0].replace(/^## /, "").trim());

  if (matched.length === 0) {
    console.log(JSON.stringify({
      tag: "[SCENE_LIBRARY:PROCESS]",
      timestamp: new Date().toISOString(),
      category: productCategory,
      keywords,
      totalSections: contentSections.length,
      sectionHeaders: contentSections.map(s => s.split("\n")[0].replace(/^## /, "").split("(")[0].trim()),
      matchedSections: 0,
      fallback: "full_library",
      reason: "no_section_matched_keywords",
      outputChars: SCENES_LIBRARY.length,
      estimatedTokens: Math.ceil(SCENES_LIBRARY.length / 4),
    }, null, 2));
    return SCENES_LIBRARY;
  }

  // Each matched section contains multiple ### Ángulo sub-sections.
  // Randomly sample ANGLES_PER_CALL of them so every generation gets fresh inspiration.
  const combined = matched.join("\n");
  const angleParts = combined.split(/(?=^### )/m);
  const categoryHeader = angleParts[0]; // "## Category\n*subtitle*\n---\n"
  const angles = angleParts.slice(1);

  const allAngleNames = angles.map(a => a.split("\n")[0].replace(/^### /, "").trim());

  if (angles.length <= ANGLES_PER_CALL) {
    const result = [intro.trim(), categoryHeader.trim(), ...angles].join("\n");
    console.log(JSON.stringify({
      tag: "[SCENE_LIBRARY:PROCESS]",
      timestamp: new Date().toISOString(),
      category: productCategory,
      keywords,
      matchedSections: matchedHeaders,
      availableAngles: allAngleNames,
      selectedAngles: allAngleNames,
      sampling: "all (count <= ANGLES_PER_CALL)",
      outputChars: result.length,
      estimatedTokens: Math.ceil(result.length / 4),
    }, null, 2));
    return result;
  }

  // Fisher-Yates shuffle on a copy, then pick first N
  const shuffled = [...angles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, ANGLES_PER_CALL);
  const selectedNames = selected.map(a => a.split("\n")[0].replace(/^### /, "").trim());

  const result = [intro.trim(), categoryHeader.trim(), ...selected].join("\n");
  console.log(JSON.stringify({
    tag: "[SCENE_LIBRARY:PROCESS]",
    timestamp: new Date().toISOString(),
    category: productCategory,
    keywords,
    matchedSections: matchedHeaders,
    availableAngles: allAngleNames,
    selectedAngles: selectedNames,
    sampling: `${ANGLES_PER_CALL} of ${angles.length} (Fisher-Yates)`,
    outputChars: result.length,
    estimatedTokens: Math.ceil(result.length / 4),
  }, null, 2));
  return result;
}

/**
 * Returns one randomly sampled texture example from texture-library.md
 * for the given product category. Used as few-shot reference in copy generation
 * so OpenAI produces specific, photorealistic backgroundPrompt values.
 *
 * Returns empty string when:
 * - Category has no matching section
 * - Matching section has no real examples (stub/placeholder only)
 */
export function getTextureLibrarySection(productCategory: string): string {
  const keywords = CATEGORY_KEYWORDS[productCategory] ?? [];
  if (keywords.length === 0) return "";

  const parts = TEXTURE_LIBRARY.split(/(?=^## )/m);
  const sections = parts.slice(1);

  const matched = sections.filter(section => {
    const headerName = section.split("\n")[0].replace(/^## /, "").split("(")[0].toLowerCase().trim();
    return keywords.some(kw => headerName.includes(kw.toLowerCase()));
  });

  if (matched.length === 0) return "";

  // Split into **Example** blocks, filter out stub placeholders
  const source = matched.join("\n");
  const exampleParts = source.split(/(?=^\*\*)/m);
  const examples = exampleParts.slice(1).filter(e => {
    const trimmed = e.trim();
    return trimmed.length > 0 && !trimmed.startsWith("*(");
  });

  if (examples.length === 0) return "";

  // Pick one at random
  const selected = examples[Math.floor(Math.random() * examples.length)];
  return selected.trim();
}
