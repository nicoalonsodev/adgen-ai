/**
 * Pipeline V2 — Debug Logger
 *
 * Writes structured JSON logs for each pipeline step to /tmp/pipeline-v2-debug/.
 * Activated by setting DEBUG_PIPELINE_V2=true in the environment.
 *
 * Each pipeline run creates a timestamped directory with one file per step:
 *   /tmp/pipeline-v2-debug/
 *     2026-03-09T14-30-00_crema-hidratante/
 *       00_input.json
 *       01_brief_system_prompt.txt
 *       01_brief_user_prompt.txt
 *       01_brief_output.json
 *       02_gemini_prompts.json
 *       03_background_prompt.txt
 *       04_scene_prompt.txt
 *       05_summary.json
 */

import fs from "fs";
import path from "path";

const DEBUG_DIR = "/tmp/pipeline-v2-debug";

/** Check if debug logging is enabled */
export function isDebugEnabled(): boolean {
  return process.env.DEBUG_PIPELINE_V2 === "true";
}

/** Sanitize a string for use as a directory name */
function sanitizeForPath(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

/** Create a run directory and return the path + a writer function */
export function createDebugRun(productName: string): DebugRun {
  if (!isDebugEnabled()) {
    return {
      dir: null,
      write: () => {},
      writeText: () => {},
    };
  }

  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const slug = sanitizeForPath(productName);
  const dir = path.join(DEBUG_DIR, `${ts}_${slug}`);

  fs.mkdirSync(dir, { recursive: true });
  console.log(`[pipelineV2:debug] Logging to ${dir}`);

  return {
    dir,
    write(filename: string, data: unknown) {
      try {
        const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        fs.writeFileSync(path.join(dir, filename), content, "utf-8");
      } catch (err) {
        console.warn(`[pipelineV2:debug] Failed to write ${filename}:`, err);
      }
    },
    writeText(filename: string, text: string) {
      try {
        fs.writeFileSync(path.join(dir, filename), text, "utf-8");
      } catch (err) {
        console.warn(`[pipelineV2:debug] Failed to write ${filename}:`, err);
      }
    },
  };
}

export interface DebugRun {
  dir: string | null;
  /** Write JSON data to a file in the run directory */
  write(filename: string, data: unknown): void;
  /** Write raw text to a file in the run directory */
  writeText(filename: string, text: string): void;
}
