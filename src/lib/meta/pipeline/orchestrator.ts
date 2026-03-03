/**
 * Pipeline Orchestrator – Creative Mode System
 *
 * Orchestrates the creative generation pipeline based on mode:
 * - clean: Editorial backgrounds, standard templates
 * - lifestyle: Contextual scenes, lifestyle template
 * - narrative: Story-driven scenes, narrative template with tags
 *
 * Steps:
 * 1. decideCreativeMode (if auto)
 * 2. generateSceneBrief (lifestyle/narrative)
 * 3. generateNarrativeAngle (narrative only)
 * 4. generateBackground (mode-aware)
 * 5. analyzeLightZones
 * 6. pickTypographyPlan
 * 7. selectTemplate (mode-aware)
 */

import type { CreativeMode, CreativeModeInput, PipelineContext, SceneBrief, NarrativeAngle, TypographyPlan, LightZoneAnalysis } from "./schemas";
import type { TemplateId, StylePackId } from "../spec/creativeSpec";

// Steps
import {
  decideCreativeMode,
  type StrategicCore,
  type Offer,
} from "./steps/decideCreativeMode";
import { generateSceneBrief } from "./steps/generateSceneBrief";
import { generateNarrativeAngle } from "./steps/generateNarrativeAngle";
import { analyzeLightZones } from "./steps/analyzeLightZones";
import { pickTypographyPlan, type BrandHints } from "./steps/pickTypographyPlan";
import { generateContextualBackground, generateFallbackBackground } from "./steps/generateContextualBackground";

// Existing background generator
import { generateEditorialBackground } from "@/lib/render/backgroundEngine";

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export interface OrchestratorInput {
  /** Product info */
  productName: string;
  productDescription?: string;
  
  /** Strategic core from AI */
  strategicCore: StrategicCore;
  
  /** Offer if active */
  offer?: Offer;
  
  /** Existing template selection (for offers/proofs) */
  selectedTemplateId?: TemplateId;
  
  /** Style pack to use */
  stylePackId: StylePackId;
  
  /** User-specified mode ("auto" | "clean" | "lifestyle" | "narrative") */
  creativeModeInput: CreativeModeInput;
  
  /** Brand hints for typography */
  brandHints?: BrandHints;
  
  /** Verbose logging */
  verbose?: boolean;
}

export interface OrchestratorResult {
  /** Resolved creative mode */
  mode: CreativeMode;
  
  /** Final template to use */
  templateId: TemplateId;
  
  /** Background image data URL */
  backgroundDataUrl: string;
  
  /** Scene brief (if generated) */
  sceneBrief: SceneBrief | null;
  
  /** Narrative angle (if generated) */
  narrativeAngle: NarrativeAngle | null;
  
  /** Light zone analysis */
  lightZones: LightZoneAnalysis | null;
  
  /** Typography plan */
  typographyPlan: TypographyPlan | null;
  
  /** Timing breakdown */
  timing: {
    modeDecisionMs: number;
    sceneBriefMs: number;
    narrativeAngleMs: number;
    backgroundMs: number;
    lightZonesMs: number;
    typographyMs: number;
    totalMs: number;
  };
}

/* ════════════════════════════════════════════════════════════════
   TEMPLATE SELECTION BY MODE
════════════════════════════════════════════════════════════════ */

function selectTemplateByMode(
  mode: CreativeMode,
  existingTemplateId?: TemplateId
): TemplateId {
  // If a specific template was already selected (offer/proof), use it
  // unless it's the default editorial template
  if (
    existingTemplateId &&
    existingTemplateId !== "T_SPLIT_EDITORIAL_V1"
  ) {
    return existingTemplateId;
  }

  // Select by mode
  switch (mode) {
    case "lifestyle":
      return "T_LIFESTYLE_HERO_V1";
    case "narrative":
      return "T_NARRATIVE_HERO_V1";
    case "clean":
    default:
      return existingTemplateId || "T_SPLIT_EDITORIAL_V1";
  }
}

/* ════════════════════════════════════════════════════════════════
   MAIN ORCHESTRATOR
════════════════════════════════════════════════════════════════ */

/**
 * Orchestrates the full creative pipeline.
 *
 * @param input - Orchestrator input
 * @returns Pipeline result with all generated artifacts
 */
export async function orchestratePipeline(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  const {
    productName,
    productDescription,
    strategicCore,
    offer,
    selectedTemplateId,
    stylePackId,
    creativeModeInput,
    brandHints,
    verbose = false,
  } = input;

  const pipelineStart = Date.now();
  const timing = {
    modeDecisionMs: 0,
    sceneBriefMs: 0,
    narrativeAngleMs: 0,
    backgroundMs: 0,
    lightZonesMs: 0,
    typographyMs: 0,
    totalMs: 0,
  };

  /* ═══════════════════════════════════════════════════════════════
     STEP 1: Decide Creative Mode
  ═══════════════════════════════════════════════════════════════ */
  const modeStart = Date.now();
  let mode: CreativeMode;

  if (creativeModeInput === "auto") {
    const decision = decideCreativeMode({
      strategicCore,
      offer,
      category: strategicCore.category,
    });
    mode = decision.mode;
    
    if (verbose) {
      console.log(`[orchestrator] Mode decision: ${mode} (${decision.reason})`);
    }
  } else {
    mode = creativeModeInput;
    if (verbose) {
      console.log(`[orchestrator] Mode forced: ${mode}`);
    }
  }

  timing.modeDecisionMs = Date.now() - modeStart;

  /* ═══════════════════════════════════════════════════════════════
     STEP 2: Generate Scene Brief (lifestyle/narrative)
  ═══════════════════════════════════════════════════════════════ */
  const sceneBriefStart = Date.now();
  let sceneBrief: SceneBrief | null = null;

  if (mode === "lifestyle" || mode === "narrative") {
    try {
      const result = await generateSceneBrief({
        productName,
        productDescription,
        category: strategicCore.category,
        coreBenefit: strategicCore.coreBenefit,
        mode,
      });
      sceneBrief = result.sceneBrief;
      
      if (verbose) {
        console.log(`[orchestrator] Scene brief: ${sceneBrief.environment}`);
      }
    } catch (err: any) {
      console.error("[orchestrator] Scene brief failed:", err?.message);
      // Continue with fallback
    }
  }

  timing.sceneBriefMs = Date.now() - sceneBriefStart;

  /* ═══════════════════════════════════════════════════════════════
     STEP 3: Generate Narrative Angle (narrative only)
  ═══════════════════════════════════════════════════════════════ */
  const narrativeStart = Date.now();
  let narrativeAngle: NarrativeAngle | null = null;

  if (mode === "narrative") {
    try {
      const result = await generateNarrativeAngle({
        productName,
        productDescription,
        category: strategicCore.category,
        coreBenefit: strategicCore.coreBenefit,
      });
      narrativeAngle = result.narrativeAngle;
      
      if (verbose) {
        console.log(
          `[orchestrator] Narrative: ${narrativeAngle.angle_type}/${narrativeAngle.emotional_trigger}` +
          (narrativeAngle.tag_label ? ` (tag: ${narrativeAngle.tag_label})` : "")
        );
      }
    } catch (err: any) {
      console.error("[orchestrator] Narrative angle failed:", err?.message);
    }
  }

  timing.narrativeAngleMs = Date.now() - narrativeStart;

  /* ═══════════════════════════════════════════════════════════════
     STEP 4: Generate Background
  ═══════════════════════════════════════════════════════════════ */
  const bgStart = Date.now();
  let backgroundDataUrl: string;

  if (mode === "clean" || !sceneBrief) {
    // Use editorial background for clean mode
    try {
      const result = await generateEditorialBackground("hero_left", {
        verbose,
      });
      backgroundDataUrl = result.dataUrl;
    } catch (err: any) {
      console.error("[orchestrator] Editorial background failed:", err?.message);
      // Try fallback
      const fallback = await generateFallbackBackground();
      backgroundDataUrl = fallback.dataUrl;
    }
  } else {
    // Use contextual background for lifestyle/narrative
    try {
      const result = await generateContextualBackground({
        sceneBrief,
        mode,
        category: strategicCore.category,
        verbose,
      });
      backgroundDataUrl = result.dataUrl;
    } catch (err: any) {
      console.error("[orchestrator] Contextual background failed:", err?.message);
      // Fallback to editorial
      const fallback = await generateEditorialBackground("hero_left", { verbose });
      backgroundDataUrl = fallback.dataUrl;
    }
  }

  timing.backgroundMs = Date.now() - bgStart;

  if (verbose) {
    console.log(`[orchestrator] Background generated in ${timing.backgroundMs}ms`);
  }

  /* ═══════════════════════════════════════════════════════════════
     STEP 5: Analyze Light Zones
  ═══════════════════════════════════════════════════════════════ */
  const lightStart = Date.now();
  let lightZones: LightZoneAnalysis | null = null;

  try {
    lightZones = await analyzeLightZones(backgroundDataUrl);
    
    if (verbose) {
      console.log(
        `[orchestrator] Light zones: best=${lightZones.bestZone?.position}, ` +
        `dominant=${lightZones.imageStats.dominantRegion}`
      );
    }
  } catch (err: any) {
    console.error("[orchestrator] Light zone analysis failed:", err?.message);
  }

  timing.lightZonesMs = Date.now() - lightStart;

  /* ═══════════════════════════════════════════════════════════════
     STEP 6: Pick Typography Plan
  ═══════════════════════════════════════════════════════════════ */
  const typoStart = Date.now();
  let typographyPlan: TypographyPlan | null = null;

  if (lightZones) {
    typographyPlan = pickTypographyPlan({
      lightZones,
      brandHints,
      sceneTextPreference: sceneBrief?.safe_text_area_preference,
    });
    
    if (verbose) {
      console.log(
        `[orchestrator] Typography: ${typographyPlan.textColor}, ` +
        `pos=${typographyPlan.position}, backplate=${typographyPlan.useBackplate}`
      );
    }
  }

  timing.typographyMs = Date.now() - typoStart;

  /* ═══════════════════════════════════════════════════════════════
     STEP 7: Select Template
  ═══════════════════════════════════════════════════════════════ */
  const templateId = selectTemplateByMode(mode, selectedTemplateId);

  if (verbose) {
    console.log(`[orchestrator] Template: ${templateId}`);
  }

  /* ═══════════════════════════════════════════════════════════════
     COMPLETE
  ═══════════════════════════════════════════════════════════════ */
  timing.totalMs = Date.now() - pipelineStart;

  console.log(
    `[orchestrator] Pipeline complete: mode=${mode}, template=${templateId} in ${timing.totalMs}ms`
  );

  return {
    mode,
    templateId,
    backgroundDataUrl,
    sceneBrief,
    narrativeAngle,
    lightZones,
    typographyPlan,
    timing,
  };
}

/* ════════════════════════════════════════════════════════════════
   HELPER: Quick Mode Check
════════════════════════════════════════════════════════════════ */

/**
 * Quick check if mode requires scene generation.
 */
export function modeRequiresSceneBrief(mode: CreativeMode): boolean {
  return mode === "lifestyle" || mode === "narrative";
}

/**
 * Quick check if mode requires narrative angle.
 */
export function modeRequiresNarrativeAngle(mode: CreativeMode): boolean {
  return mode === "narrative";
}
