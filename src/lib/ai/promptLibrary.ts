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

export const PRODUCT_ONLY_LIBRARY  = fs.readFileSync(path.join(dir, "product-only.md"),  "utf-8");
export const SCENE_ONLY_LIBRARY    = fs.readFileSync(path.join(dir, "scene-only.md"),    "utf-8");
export const PERSON_PRODUCT_LIBRARY = fs.readFileSync(path.join(dir, "person-product.md"), "utf-8");

export type ImageBriefType = "product-only" | "scene-only" | "person-product";

export function getLibrary(type: ImageBriefType): string {
  switch (type) {
    case "product-only":   return PRODUCT_ONLY_LIBRARY;
    case "scene-only":     return SCENE_ONLY_LIBRARY;
    case "person-product": return PERSON_PRODUCT_LIBRARY;
  }
}
