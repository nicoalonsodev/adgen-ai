/**
 * Test: Product Composer Shadow Generation
 *
 * Unit tests for shadow generation utilities.
 * Run with: npx tsx scripts/test-shadow-generation.ts
 */

import sharp from "sharp";
import {
  generateShadow,
  generateContactShadow,
  calculateLuminance,
  adjustLuminance,
  hasValidTransparency,
} from "../src/services/product-composer/utils";

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

async function assertApprox(
  actual: number,
  expected: number,
  tolerance: number,
  message: string
): Promise<void> {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${message} (got ${actual.toFixed(3)}, expected ~${expected})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Luminance Calculation
// ─────────────────────────────────────────────────────────────────────────────

async function testLuminanceCalculation(): Promise<void> {
  console.log("\n📊 Testing Luminance Calculation...\n");

  // Create test images
  const whiteImage = sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } },
  });
  const blackImage = sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
  });
  const redImage = sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 255 } },
  });
  const grayImage = sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 255 } },
  });

  // White should have luminance close to 1
  const whiteLum = await calculateLuminance(await whiteImage.png().toBuffer());
  await assertApprox(whiteLum, 1.0, 0.05, "White luminance should be ~1.0");

  // Black should have luminance close to 0
  const blackLum = await calculateLuminance(await blackImage.png().toBuffer());
  await assertApprox(blackLum, 0.0, 0.05, "Black luminance should be ~0.0");

  // Pure red (darker than white)
  const redLum = await calculateLuminance(await redImage.png().toBuffer());
  assert(redLum > 0.1 && redLum < 0.3, `Red luminance should be ~0.21 (got ${redLum.toFixed(3)})`);

  // Gray should be around 0.2-0.3
  const grayLum = await calculateLuminance(await grayImage.png().toBuffer());
  assert(grayLum > 0.15 && grayLum < 0.35, `Gray luminance should be ~0.21 (got ${grayLum.toFixed(3)})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Luminance Adjustment
// ─────────────────────────────────────────────────────────────────────────────

async function testLuminanceAdjustment(): Promise<void> {
  console.log("\n🔆 Testing Luminance Adjustment...\n");

  // Create a gray test image
  const testImage = sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 255 },
    },
  });
  const testBuffer = await testImage.png().toBuffer();
  const originalLum = await calculateLuminance(testBuffer);

  // Brighten: target luminance > current
  const brightened = await adjustLuminance(testBuffer, 0.7);
  const brightenedLum = await calculateLuminance(brightened);
  assert(brightenedLum > originalLum, `Brightened luminance (${brightenedLum.toFixed(3)}) should be > original (${originalLum.toFixed(3)})`);

  // Darken: target luminance < current
  const darkened = await adjustLuminance(testBuffer, 0.1);
  const darkenedLum = await calculateLuminance(darkened);
  assert(darkenedLum < originalLum, `Darkened luminance (${darkenedLum.toFixed(3)}) should be < original (${originalLum.toFixed(3)})`);

  assert(brightened.length > 0, "Brightened image should produce output");
  assert(darkened.length > 0, "Darkened image should produce output");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Shadow Generation
// ─────────────────────────────────────────────────────────────────────────────

async function testShadowGeneration(): Promise<void> {
  console.log("\n🌑 Testing Shadow Generation...\n");

  // Create a simple product-like image (white square with alpha)
  const productImage = sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 },
    },
  });
  const productBuffer = await productImage.png().toBuffer();

  // Generate drop shadow
  try {
    const shadow = await generateShadow(productBuffer, {
      opacity: 0.5,
      blur: 20,
      offsetX: 0,
      offsetY: 10,
      color: "rgba(0,0,0,0.5)",
    });
    assert(shadow.length > 0, "generateShadow should produce output");

    // Verify shadow has dimensions
    const shadowMeta = await sharp(shadow).metadata();
    assert(
      (shadowMeta.width || 0) > 0 && (shadowMeta.height || 0) > 0,
      "Shadow should have valid dimensions"
    );
  } catch (error) {
    console.log(`Shadow generation error: ${error}`);
    assert(false, "generateShadow should not throw");
  }

  // Generate contact shadow
  try {
    const contactShadow = await generateContactShadow(200, 200, {
      opacity: 0.4,
      blur: 15,
    });
    assert(contactShadow.length > 0, "generateContactShadow should produce output");
  } catch (error) {
    console.log(`Contact shadow generation error: ${error}`);
    assert(false, "generateContactShadow should not throw");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Transparency Detection
// ─────────────────────────────────────────────────────────────────────────────

async function testTransparencyDetection(): Promise<void> {
  console.log("\n🔍 Testing Transparency Detection...\n");

  // Create opaque image
  const opaqueImage = sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const opaqueBuffer = await opaqueImage.png().toBuffer();

  const hasOpaqueTransparency = await hasValidTransparency(opaqueBuffer);
  assert(!hasOpaqueTransparency, "Opaque image should not have valid transparency");

  // Create image with alpha channel (semi-transparent)
  const transparentImage = sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 128 },
    },
  });
  const transparentBuffer = await transparentImage.png().toBuffer();

  const hasTransparency = await hasValidTransparency(transparentBuffer);
  assert(hasTransparency, "Transparent image should have valid transparency");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Product Composer - Shadow Generation Tests         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    await testLuminanceCalculation();
    await testLuminanceAdjustment();
    await testShadowGeneration();
    await testTransparencyDetection();

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
