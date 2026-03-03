/**
 * Scene Plan v2 – Contextual scene generation for visual depth
 *
 * Generates deterministic scene plans based on variant index.
 * Scenes add realism without people.
 */

/* ════════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════════ */

export type SceneType =
  | "MORNING_KITCHEN"
  | "WORK_DESK"
  | "TRAVEL_MODE"
  | "COZY_HOME";

export type Surface =
  | "WOOD"
  | "MARBLE"
  | "DESK"
  | "NEUTRAL";

export type SceneLight =
  | "LEFT_WINDOW"
  | "RIGHT_WINDOW"
  | "SOFT_TOP";

export type ForegroundElement =
  | "BLUR_MATE"
  | "NONE";

export type SceneMood =
  | "CALM"
  | "WARM"
  | "CLEAN";

export type ScenePlan = {
  sceneType: SceneType;
  surface: Surface;
  light: SceneLight;
  foregroundElement: ForegroundElement;
  mood: SceneMood;
};

/* ════════════════════════════════════════════════════════════════
   ROTATION ARRAYS
════════════════════════════════════════════════════════════════ */

const SCENE_TYPES: readonly SceneType[] = [
  "MORNING_KITCHEN",
  "WORK_DESK",
  "TRAVEL_MODE",
  "COZY_HOME",
] as const;

const SURFACES: readonly Surface[] = [
  "WOOD",
  "MARBLE",
  "DESK",
  "NEUTRAL",
] as const;

const SCENE_LIGHTS: readonly SceneLight[] = [
  "LEFT_WINDOW",
  "RIGHT_WINDOW",
  "SOFT_TOP",
] as const;

const FOREGROUND_ELEMENTS: readonly ForegroundElement[] = [
  "BLUR_MATE",
  "NONE",
  "NONE", // Higher probability for NONE
] as const;

const SCENE_MOODS: readonly SceneMood[] = [
  "CALM",
  "WARM",
  "CLEAN",
] as const;

/* ════════════════════════════════════════════════════════════════
   MAIN FUNCTION
════════════════════════════════════════════════════════════════ */

/**
 * Generate deterministic scene plan based on variant index.
 *
 * @param index - Variant index (0-based)
 * @returns ScenePlan object with all scene parameters
 *
 * @example
 * generateScenePlan(0) // => { sceneType: "MORNING_KITCHEN", surface: "WOOD", ... }
 * generateScenePlan(1) // => { sceneType: "WORK_DESK", surface: "MARBLE", ... }
 */
export function generateScenePlan(index: number): ScenePlan {
  const i = Math.abs(Math.floor(index));

  return {
    sceneType: SCENE_TYPES[i % SCENE_TYPES.length],
    surface: SURFACES[i % SURFACES.length],
    light: SCENE_LIGHTS[i % SCENE_LIGHTS.length],
    foregroundElement: FOREGROUND_ELEMENTS[i % FOREGROUND_ELEMENTS.length],
    mood: SCENE_MOODS[i % SCENE_MOODS.length],
  };
}

/* ════════════════════════════════════════════════════════════════
   PROMPT GENERATION
════════════════════════════════════════════════════════════════ */

/**
 * Scene type to environment description
 */
function getSceneEnvironment(sceneType: SceneType): string {
  switch (sceneType) {
    case "MORNING_KITCHEN":
      return "clean modern kitchen counter, morning atmosphere, soft breakfast vibes";
    case "WORK_DESK":
      return "minimal work desk setup, professional environment, organized space";
    case "TRAVEL_MODE":
      return "travel scene, hotel room or airport lounge, sophisticated wanderer aesthetic";
    case "COZY_HOME":
      return "cozy home interior, comfortable living space, soft relaxed atmosphere";
    default:
      return "clean minimal interior space";
  }
}

/**
 * Surface to material description
 */
function getSurfaceDescription(surface: Surface): string {
  switch (surface) {
    case "WOOD":
      return "natural wood surface with subtle grain texture, warm tones";
    case "MARBLE":
      return "elegant marble surface with soft veining, luxurious feel";
    case "DESK":
      return "clean desk surface, matte finish, professional look";
    case "NEUTRAL":
      return "neutral flat surface, soft seamless gradient";
    default:
      return "clean smooth surface";
  }
}

/**
 * Light direction to lighting description
 */
function getLightDescription(light: SceneLight): string {
  switch (light) {
    case "LEFT_WINDOW":
      return "soft natural light from left window, gentle shadows to the right";
    case "RIGHT_WINDOW":
      return "soft natural light from right window, gentle shadows to the left";
    case "SOFT_TOP":
      return "soft diffused overhead lighting, minimal shadows, even illumination";
    default:
      return "soft ambient lighting";
  }
}

/**
 * Mood to atmosphere description
 */
function getMoodDescription(mood: SceneMood): string {
  switch (mood) {
    case "CALM":
      return "calm serene atmosphere, muted tones, peaceful ambiance";
    case "WARM":
      return "warm inviting atmosphere, golden undertones, welcoming feel";
    case "CLEAN":
      return "clean crisp atmosphere, bright whites, fresh modern aesthetic";
    default:
      return "balanced neutral atmosphere";
  }
}

/**
 * Generate complete background prompt from ScenePlan.
 *
 * Rules enforced:
 * - Surface description
 * - Lighting direction
 * - No text
 * - Leave negative space for typography
 * - High realism
 * - Subtle depth of field
 * - No people
 * - No product
 */
export function generateScenePrompt(plan: ScenePlan): string {
  const environment = getSceneEnvironment(plan.sceneType);
  const surface = getSurfaceDescription(plan.surface);
  const light = getLightDescription(plan.light);
  const mood = getMoodDescription(plan.mood);

  const promptParts = [
    // Core scene
    environment,
    surface,
    
    // Lighting
    light,
    
    // Mood
    mood,
    
    // Technical requirements
    "subtle depth of field with soft background blur",
    "high realism, photographic quality",
    "leave negative space on right side for typography",
    
    // Exclusions
    "no text, no logos, no watermarks",
    "no people, no hands, no faces",
    "no product, empty space for product placement",
  ];

  return promptParts.join(", ");
}

/**
 * Generate foreground element prompt for blur mate effect.
 */
export function generateForegroundPrompt(plan: ScenePlan): string | null {
  if (plan.foregroundElement !== "BLUR_MATE") {
    return null;
  }

  // Foreground elements matching scene context
  const foregroundMap: Record<SceneType, string> = {
    MORNING_KITCHEN: "blurred coffee cup edge in foreground, soft bokeh, out of focus ceramic mug",
    WORK_DESK: "blurred notebook corner in foreground, soft bokeh, out of focus stationery",
    TRAVEL_MODE: "blurred luggage edge in foreground, soft bokeh, out of focus travel accessory",
    COZY_HOME: "blurred plant leaf edge in foreground, soft bokeh, out of focus greenery",
  };

  return foregroundMap[plan.sceneType] || null;
}

/* ════════════════════════════════════════════════════════════════
   EXPORTS
════════════════════════════════════════════════════════════════ */

export const SCENE_PLAN_CONSTANTS = {
  SCENE_TYPES,
  SURFACES,
  SCENE_LIGHTS,
  FOREGROUND_ELEMENTS,
  SCENE_MOODS,
} as const;
