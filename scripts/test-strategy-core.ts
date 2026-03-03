/**
 * Test script for POST /api/strategy/core
 *
 * Usage:
 *   npx tsx scripts/test-strategy-core.ts
 *
 * Requires the dev server running on http://localhost:3000
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const TEST_BODY = {
  product_name: "Mate Térmico SmartMate 360",
  product_description:
    "Mate térmico de acero inoxidable con doble pared de vacío que mantiene la temperatura del agua hasta 12 horas. Diseño ergonómico antideslizante, tapa rosca hermética y capacidad de 500ml. Disponible en 6 colores. Fabricado en Argentina.",
  primary_benefit:
    "Mantiene el agua caliente toda la jornada sin necesidad de recalentar.",
  problem_it_solves:
    "El agua del termo se enfría rápido y hay que estar recalentando cada rato, interrumpiendo el trabajo o la rutina.",
  target_audience:
    "Personas de 25 a 45 años que toman mate a diario, trabajan en oficina o home office, y valoran productos de calidad y diseño argentino.",
  offer: {
    active: true,
    type: "discount",
    value: "25% OFF",
    deadline_iso: "2026-02-28T23:59:00-03:00",
    notes: "Lanzamiento de verano. Stock limitado a 500 unidades.",
  },
};

async function main() {
  console.log("=".repeat(60));
  console.log("TEST: POST /api/strategy/core");
  console.log("=".repeat(60));

  /* ── Test 1: Successful generation ── */
  console.log("\n▶ Test 1: Happy path (valid input)");
  try {
    const res = await fetch(`${BASE_URL}/api/strategy/core`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_BODY),
    });

    const data = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  ok: ${data.ok}`);

    if (!data.ok || res.status !== 200) {
      console.error("  ✘ FAIL: expected ok=true and status 200");
      console.error("  Error:", data.error);
      process.exit(1);
    }

    const sc = data.strategicCore;

    // Shape checks
    const checks = [
      ["version", sc.version === "1.0"],
      ["strategicSummary.oneLiner", typeof sc.strategicSummary?.oneLiner === "string"],
      ["messagingPillars length >= 3", sc.messagingPillars?.length >= 3],
      ["audienceSegments length >= 2", sc.audienceSegments?.length >= 2],
      ["objectionMap length >= 3", sc.objectionMap?.length >= 3],
      ["awarenessLadder length >= 3", sc.awarenessLadder?.length >= 3],
      ["angles length >= 5", sc.angles?.length >= 5],
      ["ctaBank length >= 5", sc.ctaBank?.length >= 5],
      ["offerStrategy.hasActiveOffer", sc.offerStrategy?.hasActiveOffer === true],
      ["generatedAtISO is string", typeof sc.generatedAtISO === "string"],
    ] as const;

    let allPassed = true;
    for (const [name, pass] of checks) {
      const icon = pass ? "✔" : "✘";
      console.log(`  ${icon} ${name}`);
      if (!pass) allPassed = false;
    }

    console.log(
      `\n  Angles: ${sc.angles?.length}, CTAs: ${sc.ctaBank?.length}, Pillars: ${sc.messagingPillars?.length}`
    );

    if (!allPassed) {
      console.error("\n  ✘ Some shape checks failed.");
      process.exit(1);
    }
    console.log("  ✔ All shape checks passed.");
  } catch (err) {
    console.error("  ✘ Request failed:", err);
    process.exit(1);
  }

  /* ── Test 2: Validation error (missing fields) ── */
  console.log("\n▶ Test 2: Validation error (empty body)");
  try {
    const res = await fetch(`${BASE_URL}/api/strategy/core`, {
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
    const res = await fetch(`${BASE_URL}/api/strategy/core`, {
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
  console.log("ALL TESTS PASSED ✔");
  console.log("=".repeat(60));
}

main();

export {};
