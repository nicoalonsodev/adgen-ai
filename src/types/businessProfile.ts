export type Language = "es" | "en";

export type Objective =
  | "awareness"
  | "leads"
  | "sales"
  | "traffic"
  | "retention";

export type BrandTone =
  | "friendly"
  | "direct"
  | "premium"
  | "professional"
  | "playful"
  | "serious"
  | "educational"
  | "custom";

export type MarketAwarenessLevel =
  | "unaware"
  | "problem_aware"
  | "solution_aware"
  | "product_aware"
  | "most_aware";

export type ClaimRisk =
  | "low"
  | "medium"
  | "high"; // ej: salud, finanzas, resultados garantizados

export type EvidenceType =
  | "testimonials"
  | "reviews"
  | "case_studies"
  | "certifications"
  | "expert_endorsement"
  | "data"
  | "ugc"
  | "none";

export interface BusinessIdentity {
  name: string;
  industry?: string;
  website?: string;
  country?: string;
  language: Language;
}

export interface OfferInfo {
  name: string;              // nombre del producto/servicio/oferta
  type?: "product" | "service" | "subscription" | "info" | "other";
  price?: string;            // simple para MVP: "$49/mes", "USD 99", etc.
  promo?: string;            // "50% OFF", "2x1", "envío gratis"
  guarantee?: string;        // "7 días", "satisfacción garantizada", etc.
  availability?: string;     // "stock limitado", "cupos", etc.
}

export interface AudiencePersona {
  name?: string;             // "Emprendedor ocupado", "Madres primerizas", etc.
  description: string;       // texto corto
  pains: string[];           // problemas/dolores
  desires: string[];         // deseos/aspiraciones
  objections: string[];      // frenos/objeciones
  triggers?: string[];       // eventos disparadores: "verano", "nuevo trabajo"
}

export interface Positioning {
  category: string;          // "botellas térmicas premium", "CRM para pymes"
  uniqueMechanism?: string;  // “por qué funciona” (si existe)
  differentiators: string[]; // diferenciales reales
  competitors?: string[];    // opcional
}

export interface BrandVoice {
  tone: BrandTone;
  toneCustom?: string;       // requerido si tone="custom"
  adjectives: string[];      // "cercano", "confiable", "sin humo"
  do: string[];              // “sí decir/hacer”
  dont: string[];            // “no decir/hacer”
}

export interface ProofAssets {
  evidenceTypes: EvidenceType[];
  examples?: string[];       // ej: "4.8⭐ 2.100 reseñas", "caso: +32% ROAS"
  constraints?: string[];    // ej: "no mencionar marcas", "no claims médicos"
}

export interface Compliance {
  claimRisk: ClaimRisk;
  forbiddenClaims: string[]; // ej: "cura", "garantizado", "antes/después"
  requiredDisclaimers?: string[]; // si aplica
}

export interface CreativeAngle {
  id: string;                // "pain", "social_proof", etc.
  label: string;             // humano
  reasoning: string;         // por qué aplica
  keyMessage: string;        // “el mensaje central”
  hooks: string[];           // hooks sugeridos (texto)
  visualDirections: string[]; // instrucciones para imagen/creativo
}

export interface GapsAndQuestions {
  missingFields: string[];   // paths: "offer.price", "audience.objections"
  questions: string[];       // preguntas que el usuario debería responder
  confidence: number;        // 0..1
}

export interface BusinessProfile {
  version: "1.0";
  identity: BusinessIdentity;
  offer: OfferInfo;
  audience: AudiencePersona;
  positioning: Positioning;
  voice: BrandVoice;
  proof: ProofAssets;
  compliance: Compliance;

  // Recomendaciones estratégicas
  objectiveDefaults: Objective[]; // ej: ["sales", "leads"]
  awarenessLevel?: MarketAwarenessLevel;

  // Output listo para creatividades
  angles: CreativeAngle[];

  // Control de calidad
  gaps: GapsAndQuestions;

  // metadata
  sources?: Array<{
    type: "text" | "pdf" | "doc" | "url";
    name?: string;
  }>;
  updatedAtISO: string;
}
