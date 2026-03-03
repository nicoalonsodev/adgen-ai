import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Health check endpoint for @napi-rs/canvas native binding.
 * GET /api/render/canvas-health
 *
 * Returns:
 *   { ok: true, version: string } on success
 *   { ok: false, error: string } on failure
 */
export async function GET() {
  try {
    const canvas = await import("@napi-rs/canvas");

    // Quick sanity check: create a tiny canvas
    const testCanvas = canvas.createCanvas(1, 1);
    const ctx = testCanvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1, 1);

    return NextResponse.json(
      {
        ok: true,
        message: "Canvas native binding loaded successfully",
        platform: process.platform,
        arch: process.arch,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[canvas-health] Error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error loading canvas binding",
        platform: process.platform,
        arch: process.arch,
        hint: "Try: rm -rf node_modules package-lock.json && npm i",
      },
      { status: 500 }
    );
  }
}
