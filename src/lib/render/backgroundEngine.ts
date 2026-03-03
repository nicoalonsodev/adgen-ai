/**
 * backgroundEngine – stub
 * TODO: implement editorial and scene background generation
 */

import type { ScenePlan } from "@/lib/meta/scene/scenePlan";

export const EDITORIAL_WIDTH = 1080;
export const EDITORIAL_HEIGHT = 1350;
export const EDITORIAL_ASPECT_RATIO = "4:5";

export type EditorialLayoutId =
  | "hero_center"
  | "hero_left"
  | "hero_right"
  | "split_top"
  | "split_bottom"
  | "diagonal"
  | "floating"
  | "minimal";

export interface BackgroundResult {
  dataUrl: string;
  mimeType: string;
  model: string;
}

export interface SceneBackgroundResult {
  dataUrl: string;
  foreground?: { dataUrl: string };
  mimeType: string;
  model: string;
}

const LAYOUT_TEMPLATE_MAP: Record<EditorialLayoutId, string> = {
  hero_center: "T_SPLIT_EDITORIAL_V1",
  hero_left: "T_SPLIT_EDITORIAL_V1",
  hero_right: "T_SPLIT_EDITORIAL_V1",
  split_top: "T_SPLIT_EDITORIAL_V1",
  split_bottom: "T_SPLIT_EDITORIAL_V1",
  diagonal: "T_SPLIT_EDITORIAL_V1",
  floating: "T_SPLIT_EDITORIAL_V1",
  minimal: "T_SPLIT_EDITORIAL_V1",
};

const LAYOUT_PROMPT_MAP: Record<EditorialLayoutId, string> = {
  hero_center: "Minimalist studio background, centered composition, soft gradient",
  hero_left: "Minimalist studio background, left-side negative space, soft gradient",
  hero_right: "Minimalist studio background, right-side negative space, soft gradient",
  split_top: "Minimalist studio background, top negative space, soft gradient",
  split_bottom: "Minimalist studio background, bottom negative space, soft gradient",
  diagonal: "Minimalist studio background, diagonal composition, soft gradient",
  floating: "Minimalist studio background, floating composition, soft gradient",
  minimal: "Minimalist studio background, clean white, very minimal",
};

export function layoutToEditorialTemplate(layoutId: string): string {
  return LAYOUT_TEMPLATE_MAP[layoutId as EditorialLayoutId] ?? "T_SPLIT_EDITORIAL_V1";
}

export function getEditorialPromptForLayout(layoutId: string): string {
  return LAYOUT_PROMPT_MAP[layoutId as EditorialLayoutId] ?? "Minimalist studio background";
}

export async function generateEditorialBackground(
  _layoutId: string,
  _options?: { verbose?: boolean }
): Promise<BackgroundResult> {
  throw new Error("generateEditorialBackground: not implemented");
}

export async function generateSceneBackground(
  _scenePlan: ScenePlan,
  _options?: { verbose?: boolean; skipForeground?: boolean }
): Promise<SceneBackgroundResult> {
  throw new Error("generateSceneBackground: not implemented");
}
