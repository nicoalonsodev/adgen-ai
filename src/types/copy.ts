// Shared types for copy generation
// No logic, only data contracts

export type BrandTone =
  | "formal"
  | "informal"
  | "humorous"
  | "serious"
  | "direct"
  | "friendly"
  | "premium"
  | "custom";

export interface CopyGenerationInput {
  business: string; // e.g. "Henko"
  offer: string; // e.g. "50% off first month"
  avatar: string; // target persona summary
  objective: "awareness" | "leads" | "sales" | "traffic" | "retention";
  benefits: string[];
  pains: string[];
  objections: string[];
  brandTone: BrandTone;
  brandToneCustom?: string; // required if brandTone === "custom"
  language?: "es" | "en";
  platform?: "meta" | "google" | "tiktok" | "linkedin" | "other";
  variants?: number; // default handled server-side (e.g. 10)
}

export interface AdVariant {
  angle: string;     // the persuasion angle (pain, desire, proof, urgency, etc.)
  hook: string;      // first line / thumb-stopper
  headline: string;  // main headline
  body: string;      // primary text
  cta: string;       // call to action
}

export interface CopyGenerationResponse {
  ads: AdVariant[];
}

export interface CopyGenerationImages {
  owner?: boolean;
  product?: boolean;
}

export type CopyItem = {
  id: string;
  angleId: string;
  angleLabel: string | null;
  headline: string;
  subheadline: string;
  cta: string;
  disclaimer: string | null;
  tags: string[] | null;
};