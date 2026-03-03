/**
 * Test: Text Renderer - Text Wrapping
 *
 * Unit tests for text wrapping and layout utilities.
 * Run with: npx tsx scripts/test-text-wrapping.ts
 */

import {
  wrapText,
  applyEllipsis,
  calculateTextLayout,
  parseColor,
  calculateLuminance,
  getContrastColor,
  calculateContrastRatio,
  ensureContrast,
  createApproximateMeasureFn,
  type MeasureTextFn,
} from "../src/services/text-renderer/utils";
import type { TextElement, FontStyle } from "../src/services/text-renderer/types";

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`✅ ${message}`);
    passed++;
  } else {
    console.log(`❌ ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (isEqual) {
    console.log(`✅ ${message}`);
    passed++;
  } else {
    console.log(`❌ ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// Mock measure function with fixed character width
const createMockMeasure = (charWidth: number = 10): MeasureTextFn => {
  return (text: string, font: FontStyle) => ({
    width: text.length * charWidth,
    height: font.size * font.lineHeight,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Test: Color Parsing
// ─────────────────────────────────────────────────────────────────────────────

function testColorParsing(): void {
  console.log("\n🎨 Testing Color Parsing...\n");

  // Hex 3 digits
  const hex3 = parseColor("#F0A");
  assert(hex3 !== null, "Should parse 3-digit hex");
  assert(hex3?.r === 255 && hex3?.g === 0 && hex3?.b === 170, "3-digit hex values correct");

  // Hex 6 digits
  const hex6 = parseColor("#FF00AA");
  assert(hex6 !== null, "Should parse 6-digit hex");
  assert(hex6?.r === 255 && hex6?.g === 0 && hex6?.b === 170, "6-digit hex values correct");

  // Hex 8 digits (with alpha)
  const hex8 = parseColor("#FF00AA80");
  assert(hex8 !== null, "Should parse 8-digit hex");
  assert(hex8?.a !== undefined && Math.abs(hex8.a - 0.5) < 0.01, "8-digit hex alpha correct");

  // RGB
  const rgb = parseColor("rgb(100, 150, 200)");
  assert(rgb !== null, "Should parse rgb()");
  assert(rgb?.r === 100 && rgb?.g === 150 && rgb?.b === 200, "RGB values correct");

  // RGBA
  const rgba = parseColor("rgba(100, 150, 200, 0.5)");
  assert(rgba !== null, "Should parse rgba()");
  assert(rgba?.a === 0.5, "RGBA alpha correct");

  // Invalid
  const invalid = parseColor("notacolor");
  assert(invalid === null, "Should return null for invalid color");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Contrast Calculation
// ─────────────────────────────────────────────────────────────────────────────

function testContrastCalculation(): void {
  console.log("\n📐 Testing Contrast Calculation...\n");

  // White on black = maximum contrast (21:1)
  const whiteBlack = calculateContrastRatio("#FFFFFF", "#000000");
  assert(whiteBlack > 20 && whiteBlack <= 21, `White/black contrast should be ~21:1 (got ${whiteBlack.toFixed(2)})`);

  // Same color = minimum contrast (1:1)
  const same = calculateContrastRatio("#FF0000", "#FF0000");
  assert(same === 1, `Same color contrast should be 1:1 (got ${same.toFixed(2)})`);

  // getContrastColor tests
  const forDark = getContrastColor("#1a1a1a");
  assert(forDark === "#FFFFFF", "Dark background should get white text");

  const forLight = getContrastColor("#f0f0f0");
  assert(forLight === "#000000", "Light background should get black text");

  // ensureContrast tests
  const ensured = ensureContrast("#333333", "#222222", 4.5);
  assert(ensured === "#FFFFFF", "Low contrast should be corrected to white");

  const alreadyGood = ensureContrast("#FFFFFF", "#000000", 4.5);
  assert(alreadyGood === "#FFFFFF", "Good contrast should be unchanged");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Text Wrapping
// ─────────────────────────────────────────────────────────────────────────────

function testTextWrapping(): void {
  console.log("\n📝 Testing Text Wrapping...\n");

  const measureFn = createMockMeasure(10); // 10px per char
  const font: FontStyle = {
    family: "Inter",
    size: 16,
    weight: "400",
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#000000",
  };

  // Short text that fits
  const short = wrapText("Hello", 100, font, measureFn);
  assertEqual(short, ["Hello"], "Short text should not wrap");

  // Text that needs wrapping
  const needsWrap = wrapText("Hello World Today", 120, font, measureFn);
  assert(needsWrap.length > 1, `Long text should wrap (got ${needsWrap.length} lines)`);

  // Multiple spaces preserved
  const multiWord = wrapText("One Two Three Four Five", 80, font, measureFn);
  assert(multiWord.length >= 3, `Multiple words should create multiple lines`);

  // Single very long word
  const longWord = wrapText("Supercalifragilisticexpialidocious", 100, font, measureFn);
  assert(longWord.length > 1, "Very long word should be broken");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Ellipsis Application
// ─────────────────────────────────────────────────────────────────────────────

function testEllipsis(): void {
  console.log("\n✂️ Testing Ellipsis...\n");

  const measureFn = createMockMeasure(10);
  const font: FontStyle = {
    family: "Inter",
    size: 16,
    weight: "400",
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#000000",
  };

  // Lines within limit
  const withinLimit = applyEllipsis(["Line 1", "Line 2"], 3, 200, font, measureFn);
  assertEqual(withinLimit, ["Line 1", "Line 2"], "Lines within limit should be unchanged");

  // Lines exceeding limit
  const exceeding = applyEllipsis(["Line 1", "Line 2", "Line 3", "Line 4"], 2, 200, font, measureFn);
  assert(exceeding.length === 2, "Should truncate to max lines");
  assert(exceeding[1].endsWith("..."), "Last line should have ellipsis");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Layout Calculation
// ─────────────────────────────────────────────────────────────────────────────

function testLayoutCalculation(): void {
  console.log("\n📐 Testing Layout Calculation...\n");

  const measureFn = createApproximateMeasureFn();

  const element: TextElement = {
    text: "Hello World",
    font: {
      family: "Inter",
      size: 32,
      weight: "700",
      lineHeight: 1.2,
      letterSpacing: 0,
      color: "#FFFFFF",
    },
    effects: undefined,
    align: "center",
    verticalAlign: "middle",
    box: {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      padding: 10,
    },
    wordWrap: true,
    ellipsis: true,
  };

  const layout = calculateTextLayout(element, measureFn);

  assert(layout.lines.length > 0, "Layout should have lines");
  assert(layout.totalHeight > 0, "Layout should have height");
  assert(!layout.overflow, "Short text should not overflow");

  // Check center alignment
  const firstLine = layout.lines[0];
  assert(firstLine.x > 0, "Centered text should have positive x offset");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Vertical Alignment
// ─────────────────────────────────────────────────────────────────────────────

function testVerticalAlignment(): void {
  console.log("\n↕️ Testing Vertical Alignment...\n");

  const measureFn = createApproximateMeasureFn();
  const baseElement: Omit<TextElement, "verticalAlign"> = {
    text: "Test",
    font: {
      family: "Inter",
      size: 32,
      weight: "700",
      lineHeight: 1.2,
      letterSpacing: 0,
      color: "#FFFFFF",
    },
    effects: undefined,
    align: "left",
    box: {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      padding: 0,
    },
    wordWrap: false,
    ellipsis: false,
  };

  // Top alignment
  const topLayout = calculateTextLayout(
    { ...baseElement, verticalAlign: "top" } as TextElement,
    measureFn
  );

  // Middle alignment
  const middleLayout = calculateTextLayout(
    { ...baseElement, verticalAlign: "middle" } as TextElement,
    measureFn
  );

  // Bottom alignment
  const bottomLayout = calculateTextLayout(
    { ...baseElement, verticalAlign: "bottom" } as TextElement,
    measureFn
  );

  const topY = topLayout.lines[0].y;
  const middleY = middleLayout.lines[0].y;
  const bottomY = bottomLayout.lines[0].y;

  assert(topY < middleY, "Top should have smaller Y than middle");
  assert(middleY < bottomY, "Middle should have smaller Y than bottom");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Approximate Measure Function
// ─────────────────────────────────────────────────────────────────────────────

function testApproximateMeasure(): void {
  console.log("\n📏 Testing Approximate Measure...\n");

  const measureFn = createApproximateMeasureFn();
  const font: FontStyle = {
    family: "Inter",
    size: 16,
    weight: "400",
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#000000",
  };

  // Narrow characters should be narrower
  const narrow = measureFn("iiii", font);
  const wide = measureFn("MMMM", font);
  assert(narrow.width < wide.width, "Narrow chars (i) should be narrower than wide chars (M)");

  // Height should be based on font size and line height
  const measurement = measureFn("Test", font);
  assert(
    Math.abs(measurement.height - font.size * font.lineHeight) < 0.01,
    "Height should equal fontSize * lineHeight"
  );

  // Letter spacing should increase width
  const normalSpacing = measureFn("Test", font);
  const wideSpacing = measureFn("Test", { ...font, letterSpacing: 5 });
  assert(
    wideSpacing.width > normalSpacing.width,
    "Letter spacing should increase width"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           Text Renderer - Text Wrapping Tests              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    testColorParsing();
    testContrastCalculation();
    testTextWrapping();
    testEllipsis();
    testLayoutCalculation();
    testVerticalAlignment();
    testApproximateMeasure();

    console.log("\n════════════════════════════════════════════════════════════");
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Test suite failed with error:", error);
    process.exit(1);
  }
}

main();
