/**
 * Script de prueba para analyzeLightZones
 *
 * Valida que:
 * 1. Detecta zonas claras correctamente
 * 2. Detecta zonas oscuras correctamente
 * 3. Detecta zonas mixtas correctamente
 * 4. getZonesSortedByScore retorna orden coherente
 * 5. getZonesForSide filtra correctamente
 *
 * Ejecutar: npx tsx scripts/test-analyze-light-zones.ts
 */

import { createCanvas } from "@napi-rs/canvas";
import {
  analyzeLightZones,
  getZonesSortedByScore,
  getZonesForSide,
} from "../src/lib/meta/pipeline/steps/analyzeLightZones";
import type { LightZone } from "../src/lib/meta/pipeline/schemas";

/* ═══════════════════════════════════════════════════════════════
   THRESHOLDS (copy from implementation)
═══════════════════════════════════════════════════════════════ */

const LIGHT_THRESHOLD = 0.62;
const DARK_THRESHOLD = 0.42;

/** Helper to derive category from luminance */
function getCategory(zone: LightZone): "LIGHT" | "DARK" | "MIXED" {
  if (zone.luminance >= LIGHT_THRESHOLD) return "LIGHT";
  if (zone.luminance <= DARK_THRESHOLD) return "DARK";
  return "MIXED";
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS: Create test images
═══════════════════════════════════════════════════════════════ */

function createSolidColorImage(
  r: number,
  g: number,
  b: number,
  width = 1080,
  height = 1350
): string {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL("image/png");
}

function createGradientImage(
  direction: "horizontal" | "vertical" = "horizontal",
  width = 1080,
  height = 1350
): string {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const gradient =
    direction === "horizontal"
      ? ctx.createLinearGradient(0, 0, width, 0)
      : ctx.createLinearGradient(0, 0, 0, height);

  gradient.addColorStop(0, "#000000");
  gradient.addColorStop(1, "#FFFFFF");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL("image/png");
}

function createZonedImage(width = 1080, height = 1350): string {
  // Create image with distinct zones:
  // TOP row: dark | mixed | light
  // MID row: mixed | dark | mixed
  // BOT row: light | mixed | dark
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const zoneW = width / 3;
  const zoneH = height / 3;

  // Row 0 (top)
  ctx.fillStyle = "#1a1a1a"; // dark
  ctx.fillRect(0, 0, zoneW, zoneH);
  ctx.fillStyle = "#808080"; // mixed
  ctx.fillRect(zoneW, 0, zoneW, zoneH);
  ctx.fillStyle = "#f0f0f0"; // light
  ctx.fillRect(zoneW * 2, 0, zoneW, zoneH);

  // Row 1 (middle)
  ctx.fillStyle = "#707070"; // mixed
  ctx.fillRect(0, zoneH, zoneW, zoneH);
  ctx.fillStyle = "#0a0a0a"; // dark
  ctx.fillRect(zoneW, zoneH, zoneW, zoneH);
  ctx.fillStyle = "#888888"; // mixed
  ctx.fillRect(zoneW * 2, zoneH, zoneW, zoneH);

  // Row 2 (bottom)
  ctx.fillStyle = "#ffffff"; // light
  ctx.fillRect(0, zoneH * 2, zoneW, zoneH);
  ctx.fillStyle = "#909090"; // mixed
  ctx.fillRect(zoneW, zoneH * 2, zoneW, zoneH);
  ctx.fillStyle = "#202020"; // dark
  ctx.fillRect(zoneW * 2, zoneH * 2, zoneW, zoneH);

  return canvas.toDataURL("image/png");
}

/* ═══════════════════════════════════════════════════════════════
   TEST RUNNER
═══════════════════════════════════════════════════════════════ */

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | string): void {
  try {
    const result = fn();
    if (result === true) {
      results.push({ name, passed: true, message: "OK" });
    } else {
      results.push({ name, passed: false, message: String(result) });
    }
  } catch (err) {
    results.push({
      name,
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function testAsync(
  name: string,
  fn: () => Promise<boolean | string>
): Promise<void> {
  try {
    const result = await fn();
    if (result === true) {
      results.push({ name, passed: true, message: "OK" });
    } else {
      results.push({ name, passed: false, message: String(result) });
    }
  } catch (err) {
    results.push({
      name,
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   TESTS
═══════════════════════════════════════════════════════════════ */

async function runTests() {
  console.log("\n🧪 Testing analyzeLightZones...\n");

  // Test 1: All white image should have all LIGHT zones
  await testAsync("White image → all zones LIGHT", async () => {
    const dataUrl = createSolidColorImage(255, 255, 255);
    const analysis = await analyzeLightZones(dataUrl);

    const allLight = analysis.zones.every((z) => getCategory(z) === "LIGHT");
    if (!allLight) {
      const categories = analysis.zones.map((z) => getCategory(z)).join(", ");
      return `Expected all LIGHT, got: ${categories}`;
    }

    // Luminance should be ~1.0
    const avgLum =
      analysis.zones.reduce((s, z) => s + z.luminance, 0) / analysis.zones.length;
    if (avgLum < 0.95) {
      return `Expected luminance ~1.0, got ${avgLum.toFixed(3)}`;
    }

    return true;
  });

  // Test 2: All black image should have all DARK zones
  await testAsync("Black image → all zones DARK", async () => {
    const dataUrl = createSolidColorImage(0, 0, 0);
    const analysis = await analyzeLightZones(dataUrl);

    const allDark = analysis.zones.every((z) => getCategory(z) === "DARK");
    if (!allDark) {
      const categories = analysis.zones.map((z) => getCategory(z)).join(", ");
      return `Expected all DARK, got: ${categories}`;
    }

    // Luminance should be ~0.0
    const avgLum =
      analysis.zones.reduce((s, z) => s + z.luminance, 0) / analysis.zones.length;
    if (avgLum > 0.05) {
      return `Expected luminance ~0.0, got ${avgLum.toFixed(3)}`;
    }

    return true;
  });

  // Test 3: Medium gray should be MIXED
  await testAsync("Gray image → all zones MIXED", async () => {
    const dataUrl = createSolidColorImage(128, 128, 128);
    const analysis = await analyzeLightZones(dataUrl);

    const allMixed = analysis.zones.every((z) => getCategory(z) === "MIXED");
    if (!allMixed) {
      const categories = analysis.zones.map((z) => getCategory(z)).join(", ");
      return `Expected all MIXED, got: ${categories}`;
    }

    return true;
  });

  // Test 4: Horizontal gradient should have mix of dark/mixed/light left-to-right
  await testAsync("Horizontal gradient → left=DARK, right=LIGHT", async () => {
    const dataUrl = createGradientImage("horizontal");
    const analysis = await analyzeLightZones(dataUrl);

    // Left column zones (positions contain "_left")
    const leftZones = analysis.zones.filter((z) => z.position.includes("left"));
    const leftCategories = leftZones.map((z) => getCategory(z));

    // Should be DARK or MIXED
    const leftOk = leftCategories.every((c) => c === "DARK" || c === "MIXED");
    if (!leftOk) {
      return `Expected left zones DARK/MIXED, got: ${leftCategories.join(", ")}`;
    }

    // Right column zones should be LIGHT or MIXED
    const rightZones = analysis.zones.filter((z) => z.position.includes("right"));
    const rightCategories = rightZones.map((z) => getCategory(z));

    const rightOk = rightCategories.every((c) => c === "LIGHT" || c === "MIXED");
    if (!rightOk) {
      return `Expected right zones LIGHT/MIXED, got: ${rightCategories.join(", ")}`;
    }

    return true;
  });

  // Test 5: Zoned image should detect correct categories
  await testAsync("Zoned image → correct categories per zone", async () => {
    const dataUrl = createZonedImage();
    const analysis = await analyzeLightZones(dataUrl);

    const zoneMap = new Map(analysis.zones.map((z) => [z.position, z]));

    // Check known zones
    const topLeft = zoneMap.get("top_left");
    if (getCategory(topLeft!) !== "DARK") {
      return `top_left expected DARK, got ${getCategory(topLeft!)}`;
    }

    const topRight = zoneMap.get("top_right");
    if (getCategory(topRight!) !== "LIGHT") {
      return `top_right expected LIGHT, got ${getCategory(topRight!)}`;
    }

    const midCenter = zoneMap.get("middle_center");
    if (getCategory(midCenter!) !== "DARK") {
      return `middle_center expected DARK, got ${getCategory(midCenter!)}`;
    }

    const botLeft = zoneMap.get("bottom_left");
    if (getCategory(botLeft!) !== "LIGHT") {
      return `bottom_left expected LIGHT, got ${getCategory(botLeft!)}`;
    }

    const botRight = zoneMap.get("bottom_right");
    if (getCategory(botRight!) !== "DARK") {
      return `bottom_right expected DARK, got ${getCategory(botRight!)}`;
    }

    return true;
  });

  // Test 6: getZonesSortedByScore returns correct order
  await testAsync("getZonesSortedByScore → highest score first", async () => {
    const dataUrl = createZonedImage();
    const analysis = await analyzeLightZones(dataUrl);

    const sorted = getZonesSortedByScore(analysis);

    // Check descending order
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].textSafeScore > sorted[i - 1].textSafeScore) {
        return `Zone ${sorted[i].position} (${sorted[i].textSafeScore}) > ${sorted[i - 1].position} (${sorted[i - 1].textSafeScore}) - not sorted`;
      }
    }

    return true;
  });

  // Test 7: getZonesForSide filters correctly
  await testAsync("getZonesForSide → filters left/right/top/bottom", async () => {
    const dataUrl = createZonedImage();
    const analysis = await analyzeLightZones(dataUrl);

    const leftZones = getZonesForSide(analysis, "left");
    const rightZones = getZonesForSide(analysis, "right");
    const topZones = getZonesForSide(analysis, "top");
    const bottomZones = getZonesForSide(analysis, "bottom");

    // Left should have 3 zones
    if (leftZones.length !== 3) {
      return `Expected 3 left zones, got ${leftZones.length}`;
    }
    if (!leftZones.every((z) => z.position.includes("left"))) {
      return `Left zones contain non-left: ${leftZones.map((z) => z.position).join(", ")}`;
    }

    // Right should have 3 zones
    if (rightZones.length !== 3) {
      return `Expected 3 right zones, got ${rightZones.length}`;
    }
    if (!rightZones.every((z) => z.position.includes("right"))) {
      return `Right zones contain non-right: ${rightZones.map((z) => z.position).join(", ")}`;
    }

    // Top should have 3 zones
    if (topZones.length !== 3) {
      return `Expected 3 top zones, got ${topZones.length}`;
    }
    if (!topZones.every((z) => z.position.includes("top"))) {
      return `Top zones contain non-top: ${topZones.map((z) => z.position).join(", ")}`;
    }

    // Bottom should have 3 zones
    if (bottomZones.length !== 3) {
      return `Expected 3 bottom zones, got ${bottomZones.length}`;
    }
    if (!bottomZones.every((z) => z.position.includes("bottom"))) {
      return `Bottom zones contain non-bottom: ${bottomZones.map((z) => z.position).join(", ")}`;
    }

    return true;
  });

  // Test 8: Solid color should have low variance
  await testAsync("Solid color → low variance", async () => {
    const dataUrl = createSolidColorImage(100, 100, 100);
    const analysis = await analyzeLightZones(dataUrl);

    const maxVariance = Math.max(...analysis.zones.map((z) => z.variance));

    if (maxVariance > 0.01) {
      return `Expected variance < 0.01, got ${maxVariance.toFixed(4)}`;
    }

    return true;
  });

  // Test 9: textSafeScore is between 0 and 1
  await testAsync("textSafeScore → always between 0 and 1", async () => {
    const dataUrl = createGradientImage("vertical");
    const analysis = await analyzeLightZones(dataUrl);

    for (const zone of analysis.zones) {
      if (zone.textSafeScore < 0 || zone.textSafeScore > 1) {
        return `Zone ${zone.position} has invalid textSafeScore: ${zone.textSafeScore}`;
      }
    }

    return true;
  });

  // Test 10: Has exactly 9 zones (3x3 grid)
  await testAsync("Returns exactly 9 zones", async () => {
    const dataUrl = createSolidColorImage(128, 128, 128);
    const analysis = await analyzeLightZones(dataUrl);

    if (analysis.zones.length !== 9) {
      return `Expected 9 zones, got ${analysis.zones.length}`;
    }

    const expectedPositions = [
      "top_left",
      "top_center",
      "top_right",
      "middle_left",
      "middle_center",
      "middle_right",
      "bottom_left",
      "bottom_center",
      "bottom_right",
    ];

    const actualPositions = analysis.zones.map((z) => z.position).sort();
    const sortedExpected = [...expectedPositions].sort();

    if (JSON.stringify(actualPositions) !== JSON.stringify(sortedExpected)) {
      return `Zone positions mismatch: ${actualPositions.join(", ")}`;
    }

    return true;
  });

  // Print results
  console.log("═".repeat(60));
  console.log("RESULTS:\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`${icon} ${r.name}`);
    if (!r.passed) {
      console.log(`   → ${r.message}`);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\n✨ All tests passed!\n");
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
