import type { AspectRatio } from "@/types/image";
import { CopyItem } from "./copy";

export type MetaCreativeAngle =
  | "pain"
  | "desire"
  | "before_after"
  | "social_proof"
  | "authority"
  | "scarcity"
  | "urgency"
  | "deal_savings"
  | "simplicity"
  | "speed"
  | "guarantee"
  | "objection"
  | "lifestyle"
  | "ugc"
  | "comparison"
  | "feature_focus"
  | "benefit_focus"
  | "fear_of_missing_out"
  | "status_identity"
  | "seasonal"
  | "gift"
  | "problem_solution"
  | "myth_busting"
  | "results"
  | "bundle"
  | "premium"
  | "eco"
  | "comfort"
  | "performance"
  | "minimal";

export interface MetaBatchInput {
  product: string;        // "Botella térmica premium"
  offer: string;          // "50% OFF + envío gratis"
  audience: string;       // "Personas que entrenan y trabajan fuera de casa"
  brandStyle?: string;    // "minimalista, premium, negro y gris"
  basePrompt?: string;    // opcional: contexto extra
  aspectRatio?: AspectRatio; // recomendado Meta: "4:5"
  variants?: number;      // 1..30
}

export interface MetaPromptVariant {
  angle: MetaCreativeAngle | string;
  headline: string;     // texto sugerido para overlay
  visualPrompt: string; // prompt final para el modelo de imagen
}

export interface MetaBatchResultItem extends MetaPromptVariant {
  mimeType: string;
  dataUrl: string;
  model: string;
}

export interface MetaBatchResponse {
  items: MetaBatchResultItem[];
}

export type FinalCreative = {
  angleId: string;
  angleLabel?: string | null;
  copy: CopyItem;
  baseImageDataUrl: string;
  finalPngDataUrl: string;
  templateId: string;
};
