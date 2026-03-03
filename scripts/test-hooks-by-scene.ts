/**
 * Test script for POST /api/copy/hooks-by-scene
 *
 * Usage:
 *   npx tsx scripts/test-hooks-by-scene.ts
 *
 * Requires the dev server running on http://localhost:3000
 * AND a valid strategicCore + scenePlan (uses mock data below).
 */

const BASE_URL_HOOKS = process.env.BASE_URL || "http://localhost:3000";

/* ── Mock StrategicCoreOutput ── */
const MOCK_STRATEGIC_CORE = {
  version: "1.0",
  strategicSummary: {
    oneLiner: "Mate térmico que mantiene el agua caliente 12 horas",
    primaryAngle: "Conveniencia y duración superior",
    awarenessLevel: "solution_aware",
  },
  messagingPillars: [
    {
      id: "p1",
      pillar: "Duración térmica",
      description: "12 horas de agua caliente sin recalentar",
      proofPoints: ["Doble pared de vacío", "Acero inoxidable 304"],
    },
    {
      id: "p2",
      pillar: "Diseño argentino",
      description: "Fabricado en Argentina con diseño ergonómico",
      proofPoints: ["6 colores disponibles", "Antideslizante"],
    },
    {
      id: "p3",
      pillar: "Practicidad diaria",
      description: "Perfecto para oficina y home office",
      proofPoints: ["500ml ideal", "Tapa hermética"],
    },
  ],
  audienceSegments: [
    {
      id: "s1",
      label: "Materos de oficina",
      description: "Profesionales 25-45 que toman mate en el trabajo",
      pains: ["Agua que se enfría", "Tener que ir a la cocina cada rato"],
      desires: ["Comodidad", "Autonomía", "Buen diseño"],
      bestPillarIds: ["p1", "p3"],
    },
    {
      id: "s2",
      label: "Diseño consciente",
      description: "Personas que valoran estética y producto argentino",
      pains: ["Mates genéricos feos", "Productos importados sin identidad"],
      desires: ["Producto premium", "Orgullo nacional", "Diferenciarse"],
      bestPillarIds: ["p2"],
    },
  ],
  objectionMap: [
    {
      objection: "Es caro para un mate",
      severity: "high" as const,
      reframe: "Es una inversión que dura años y te ahorra tiempo cada día",
      copySnippet: "Invertí una vez, disfrutá cada día",
    },
    {
      objection: "Ya tengo un termo",
      severity: "medium" as const,
      reframe: "SmartMate es mate + termo en uno, no necesitás los dos",
      copySnippet: "Todo en uno: mate y termo",
    },
    {
      objection: "No sé si mantiene realmente la temperatura",
      severity: "medium" as const,
      reframe: "Tecnología de doble pared de vacío probada",
      copySnippet: "12 horas comprobadas de agua caliente",
    },
  ],
  awarenessLadder: [
    {
      level: "problem_aware",
      goal: "Conectar con la frustración del agua fría",
      messageTone: "empático",
      sampleHook: "¿Cansado de recalentar el agua?",
    },
    {
      level: "solution_aware",
      goal: "Posicionar SmartMate como la solución ideal",
      messageTone: "directo",
      sampleHook: "12 horas de mate perfecto",
    },
    {
      level: "product_aware",
      goal: "Diferenciarse de competidores",
      messageTone: "confiado",
      sampleHook: "El único mate 100% argentino con doble vacío",
    },
  ],
  angles: [
    {
      id: "a1",
      label: "Durabilidad térmica",
      reasoning: "El beneficio principal que resuelve el pain #1",
      targetSegmentIds: ["s1"],
      hooks: ["12 horas sin recalentar", "Tu mate siempre caliente", "Olvidate del agua fría"],
      visualDirections: ["Close-up vapor saliendo del mate", "Reloj mostrando 12hs"],
    },
    {
      id: "a2",
      label: "Diseño argentino premium",
      reasoning: "Diferenciador emocional y de orgullo nacional",
      targetSegmentIds: ["s2"],
      hooks: ["Diseño 100% argentino", "Mate con identidad", "Premium y nacional"],
      visualDirections: ["Mate en escritorio moderno", "Paleta de colores lifestyle"],
    },
    {
      id: "a3",
      label: "Conveniencia oficina",
      reasoning: "Práctico para el contexto de uso principal",
      targetSegmentIds: ["s1"],
      hooks: ["Mate sin interrupciones", "Tu compañero de oficina", "Productividad matizada"],
      visualDirections: ["Escritorio con mate", "Home office setup"],
    },
    {
      id: "a4",
      label: "Oferta de lanzamiento",
      reasoning: "Incentivo de compra inmediata",
      targetSegmentIds: ["s1", "s2"],
      hooks: ["25% OFF de lanzamiento", "Precio especial", "Solo 500 unidades"],
      visualDirections: ["Badge de descuento", "Countdown visual"],
    },
    {
      id: "a5",
      label: "Social proof materos",
      reasoning: "Comunidad de materos valida la compra",
      targetSegmentIds: ["s1"],
      hooks: ["Miles ya lo eligen", "El mate que recomiendan", "Favorito de la oficina"],
      visualDirections: ["Reviews 5 estrellas", "Testimoniales lifestyle"],
    },
  ],
  ctaBank: [
    { cta: "Comprá ahora", intent: "purchase", urgency: "high" as const, bestForAngleIds: ["a4"] },
    { cta: "Conocé más", intent: "learn_more", urgency: "low" as const, bestForAngleIds: ["a1", "a2"] },
    { cta: "Ver oferta", intent: "purchase", urgency: "high" as const, bestForAngleIds: ["a4"] },
    { cta: "Descubrí SmartMate", intent: "learn_more", urgency: "low" as const, bestForAngleIds: ["a2"] },
    { cta: "Sumá el tuyo", intent: "add_to_cart", urgency: "medium" as const, bestForAngleIds: ["a1", "a3"] },
  ],
  offerStrategy: {
    hasActiveOffer: true,
    urgencyLevel: "high" as const,
    recommendedFraming: "Lanzamiento exclusivo con stock limitado",
    deadlineCopy: "Solo hasta el 28 de febrero",
  },
  generatedAtISO: new Date().toISOString(),
};

/* ── Mock SceneAdapterOutput (simplified) ── */
const MOCK_SCENE_PLAN = {
  product_name: "Mate térmico que mantiene el agua caliente 12 horas",
  scenes: [
    {
      scene_id: "AUTHORITY",
      layout_id: "hero_center",
      negative_space: "bottom",
      background_prompt: "Professional studio, neutral backdrop",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: true, allow_badge: true, allow_offer_cta: false },
    },
    {
      scene_id: "BENEFIT",
      layout_id: "hero_left",
      negative_space: "right",
      background_prompt: "Warm lifestyle kitchen",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: false, allow_badge: false, allow_offer_cta: true },
    },
    {
      scene_id: "DIFFERENTIAL",
      layout_id: "split_top",
      negative_space: "bottom",
      background_prompt: "Clean white product sweep",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: true, allow_badge: true, allow_offer_cta: false },
    },
    {
      scene_id: "OBJECTION",
      layout_id: "hero_right",
      negative_space: "left",
      background_prompt: "Approachable soft light",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: false, allow_badge: false, allow_offer_cta: false },
    },
    {
      scene_id: "OFFER",
      layout_id: "diagonal",
      negative_space: "top_left",
      background_prompt: "Vibrant commercial energy",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: true, allow_badge: true, allow_offer_cta: true },
    },
    {
      scene_id: "URGENCY",
      layout_id: "floating",
      negative_space: "top_right",
      background_prompt: "Dramatic dark background",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: true, allow_badge: true, allow_offer_cta: true },
    },
    {
      scene_id: "SOCIAL_PROOF",
      layout_id: "split_bottom",
      negative_space: "top",
      background_prompt: "Natural daylight real world",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: false, allow_badge: true, allow_offer_cta: false },
    },
    {
      scene_id: "ASPIRATIONAL",
      layout_id: "minimal",
      negative_space: "bottom",
      background_prompt: "Golden hour cinematic",
      background_negative_prompt: "no text, no logo",
      rules: { allow_uppercase: false, allow_badge: false, allow_offer_cta: true },
    },
  ],
  generated_at_iso: new Date().toISOString(),
};

async function main() {
  console.log("=".repeat(60));
  console.log("TEST: POST /api/copy/hooks-by-scene");
  console.log("=".repeat(60));

  /* ── Test 1: Happy path ── */
  console.log("\n▶ Test 1: Happy path (valid strategic core + scene plan)");
  try {
    const res = await fetch(`${BASE_URL_HOOKS}/api/copy/hooks-by-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategicCore: MOCK_STRATEGIC_CORE,
        scenePlan: MOCK_SCENE_PLAN,
      }),
    });

    const data = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  ok: ${data.ok}`);

    if (!data.ok || res.status !== 200) {
      console.error("  ✘ FAIL: expected ok=true and status 200");
      console.error("  Error:", data.error, data.details);
      process.exit(1);
    }

    const hooks = data.hooksByScene;

    const checks = [
      ["version === 1.0", hooks.version === "1.0"],
      ["8 scenes", hooks.scenes?.length === 8],
      ["each scene has 2 variants", hooks.scenes?.every((s: any) => s.variants?.length === 2)],
      [
        "all scene_ids present",
        ["AUTHORITY", "BENEFIT", "DIFFERENTIAL", "OBJECTION", "OFFER", "URGENCY", "SOCIAL_PROOF", "ASPIRATIONAL"]
          .every((id: string) => hooks.scenes?.some((s: any) => s.scene_id === id)),
      ],
      [
        "variants have A and B",
        hooks.scenes?.every((s: any) =>
          s.variants.some((v: any) => v.variant_id === "A") &&
          s.variants.some((v: any) => v.variant_id === "B")
        ),
      ],
      ["generated_at_iso is string", typeof hooks.generated_at_iso === "string"],
    ] as const;

    let allPassed = true;
    for (const [label, pass] of checks) {
      console.log(`  ${pass ? "✔" : "✘"} ${label}`);
      if (!pass) allPassed = false;
    }

    // Detailed variant info
    console.log("\n  Scene details:");
    for (const scene of hooks.scenes ?? []) {
      console.log(
        `    ${scene.scene_id} (angle: ${scene.angle_id})`
      );
      for (const v of scene.variants ?? []) {
        console.log(
          `      ${v.variant_id}: hook="${v.hook}" | cta="${v.cta}" | badge=${v.badge ?? "null"}`
        );
      }
    }

    // Rule checks
    console.log("\n  Rule checks:");
    const uppercaseScenes = ["OFFER", "URGENCY", "OBJECTION"];
    const badgeScenes = ["OFFER", "URGENCY", "SOCIAL_PROOF"];

    for (const scene of hooks.scenes ?? []) {
      for (const v of scene.variants ?? []) {
        const hookLetters = v.hook.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
        const upperRatio = hookLetters
          ? hookLetters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "").length / hookLetters.length
          : 1;
        const isUpper = upperRatio >= 0.85;

        if (uppercaseScenes.includes(scene.scene_id) && !isUpper) {
          console.log(`    ⚠ ${scene.scene_id}.${v.variant_id}: hook debería ser MAYÚSCULAS`);
          allPassed = false;
        }
        if (!uppercaseScenes.includes(scene.scene_id) && isUpper && v.hook.length > 5) {
          console.log(`    ⚠ ${scene.scene_id}.${v.variant_id}: hook NO debería ser MAYÚSCULAS`);
          allPassed = false;
        }
        if (v.badge && !badgeScenes.includes(scene.scene_id)) {
          console.log(`    ⚠ ${scene.scene_id}.${v.variant_id}: badge no permitido en esta escena`);
          allPassed = false;
        }
      }
    }

    if (allPassed) {
      console.log("\n  ✔ All checks passed.");
    } else {
      console.log("\n  ⚠ Some checks had warnings (may have been repaired).");
    }
  } catch (err) {
    console.error("  ✘ Request failed:", err);
    process.exit(1);
  }

  /* ── Test 2: Missing input ── */
  console.log("\n▶ Test 2: Validation error (empty body)");
  try {
    const res = await fetch(`${BASE_URL_HOOKS}/api/copy/hooks-by-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    console.log(`  Status: ${res.status}`);

    if (res.status === 400 && data.ok === false) {
      console.log("  ✔ Correctly rejected with 400.");
    } else {
      console.error("  ✘ Expected 400, got", res.status);
      process.exit(1);
    }
  } catch (err) {
    console.error("  ✘ Request failed:", err);
    process.exit(1);
  }

  /* ── Test 3: Invalid JSON ── */
  console.log("\n▶ Test 3: Invalid JSON body");
  try {
    const res = await fetch(`${BASE_URL_HOOKS}/api/copy/hooks-by-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });

    const data = await res.json();
    console.log(`  Status: ${res.status}`);

    if (res.status === 400 && data.ok === false) {
      console.log("  ✔ Correctly rejected with 400.");
    } else {
      console.error("  ✘ Expected 400, got", res.status);
      process.exit(1);
    }
  } catch (err) {
    console.error("  ✘ Request failed:", err);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("ALL TESTS COMPLETED ✔");
  console.log("=".repeat(60));
}

main();
