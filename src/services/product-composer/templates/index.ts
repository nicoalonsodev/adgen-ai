/**
 * Template Registry
 *
 * Para agregar un nuevo template:
 *  1. Agregar los metadatos en meta.ts (prompts, flags, copyZone, etc.)
 *  2. Crear el archivo de layout en esta carpeta
 *  3. Registrar el buildLayout en LAYOUT_BUILDERS abajo
 */

import { buildClassicEditorialLayout, type TemplateCopy } from "./classic-editorial";
import { buildPromoUrgenciaBottomLayout } from "./promo-urgencia-bottom";
import { buildHeroCenterBottomLayout } from "./hero-center-bottom";
import { buildHeadlineTopLeftLayout } from "./headline-top-left";
import { buildPainPointLeftLayout } from "./pain-point-left";
import { buildComparacionSplitLayout, buildComparacionSplitIALayout } from "./comparacion-split";
import { buildSorteoGiveawayCenterLayout } from "./sorteo-giveaway-center";
import { buildAntesDespuesLayout } from "./antes-despues";
import { buildBeneficiosProductoLayout } from "./beneficios-producto";
import { buildRazonesProductoLayout } from "./razones-producto";
import { buildEditorialLifestyleLeftLayout } from "./editorial-lifestyle-left";
import { buildEditorialLifestyleRightLayout } from "./editorial-lifestyle-right";
import { buildEditorialLifestyleBottomLayout } from "./editorial-lifestyle-bottom";
import { buildEditorialLifestyleTopLayout } from "./editorial-lifestyle-top";
import { buildEditorialCenterTopLayout } from "./editorial-center-top";
import { buildProductoBeneficiosVerticalLayout } from "./producto-beneficios-vertical";
import { buildTestimonioReviewLayout } from "./testimonio-review";
import { buildProductoHeroTopLayout } from "./producto-hero-top";
import { buildPersonaProductoLeftLayout } from "./persona-producto-left";
import { buildPersonaHeroBottomLayout } from "./persona-hero-bottom";
import { TEMPLATE_META_LIST, type TemplateMetadata } from "./meta";
import type { LayoutSpec } from "../layoutSpec";

export type { TemplateMetadata };
export { TEMPLATE_META_LIST };

export interface TemplateDefinition extends TemplateMetadata {
  buildLayout: (copy: TemplateCopy, canvas: { width: number; height: number }) => LayoutSpec;
}

type BuildLayoutFn = (copy: TemplateCopy, canvas: { width: number; height: number }) => LayoutSpec;

const LAYOUT_BUILDERS: Record<string, BuildLayoutFn> = {
  "classic-editorial-right": buildClassicEditorialLayout,
  "promo-urgencia-bottom": buildPromoUrgenciaBottomLayout as BuildLayoutFn,
  "hero-center-bottom": buildHeroCenterBottomLayout,
  "headline-top-left": buildHeadlineTopLeftLayout as BuildLayoutFn,
  "pain-point-left": buildPainPointLeftLayout as BuildLayoutFn,
  "comparacion-split": buildComparacionSplitLayout as BuildLayoutFn,
  "comparacion-split-ia": buildComparacionSplitIALayout as BuildLayoutFn,
  "sorteo-giveaway-center": buildSorteoGiveawayCenterLayout as BuildLayoutFn,
  "antes-despues": buildAntesDespuesLayout as BuildLayoutFn,
  "beneficios-producto": buildBeneficiosProductoLayout as BuildLayoutFn,
  "razones-producto": buildRazonesProductoLayout as BuildLayoutFn,
  "editorial-lifestyle-left": buildEditorialLifestyleLeftLayout as BuildLayoutFn,
  "editorial-lifestyle-right": buildEditorialLifestyleRightLayout as BuildLayoutFn,
  "editorial-lifestyle-bottom": buildEditorialLifestyleBottomLayout as BuildLayoutFn,
  "editorial-lifestyle-top": buildEditorialLifestyleTopLayout as BuildLayoutFn,
  "editorial-center-top": buildEditorialCenterTopLayout as BuildLayoutFn,
  "producto-beneficios-vertical": buildProductoBeneficiosVerticalLayout as BuildLayoutFn,
  "testimonio-review": buildTestimonioReviewLayout as BuildLayoutFn,
  "producto-hero-top": buildProductoHeroTopLayout as BuildLayoutFn,
  "persona-producto-left": buildPersonaProductoLeftLayout as BuildLayoutFn,
  "persona-hero-bottom": buildPersonaHeroBottomLayout as BuildLayoutFn,
};

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = Object.fromEntries(
  TEMPLATE_META_LIST.map((meta) => [
    meta.id,
    {
      ...meta,
      buildLayout: LAYOUT_BUILDERS[meta.id],
    },
  ]),
);

export function getTemplate(id: string): TemplateDefinition {
  const t = TEMPLATE_REGISTRY[id];
  if (!t) throw new Error(`Template no encontrado: "${id}". Disponibles: ${Object.keys(TEMPLATE_REGISTRY).join(", ")}`);
  return t;
}
