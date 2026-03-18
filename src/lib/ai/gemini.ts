import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import sharp from "sharp";
import { ABSOLUTE_RULES_SCENE, ABSOLUTE_RULES_PRODUCT_INJECT, ABSOLUTE_RULES_TEXT_PRESERVATION, ABSOLUTE_RULES_PRODUCT, ABSOLUTE_RULES_BACKGROUND, resolvePlacementZone } from "./promptRules";
import { getLibrarySection, getSceneLibrarySection, type ImageBriefType } from "./promptLibrary";

// OpenRouter — text generation (replaces Vercel Gateway for text)
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_TEXT_MODEL = process.env.OPENROUTER_MODEL ?? "moonshotai/kimi-k2.5";

const MODEL_NANO_BANANA = "gemini-2.5-flash-image";

/** Semaphore to limit concurrent Gemini API calls and avoid mass timeouts */
const GEMINI_MAX_CONCURRENT = 1;
let _geminiActive = 0;
const _geminiQueue: Array<() => void> = [];

async function acquireGeminiSlot(): Promise<void> {
  if (_geminiActive < GEMINI_MAX_CONCURRENT) {
    _geminiActive++;
    return;
  }
  return new Promise<void>((resolve) => {
    _geminiQueue.push(() => {
      _geminiActive++;
      resolve();
    });
  });
}

function releaseGeminiSlot(): void {
  _geminiActive--;
  const next = _geminiQueue.shift();
  if (next) next();
}

/** Rotate between available API keys with per-key cooldown tracking */
const _apiKeys: string[] = [
  process.env.GEMINI_API_KEY!,
  ...(process.env.GEMINI_API_KEY2 ? [process.env.GEMINI_API_KEY2] : []),
].filter(Boolean);
let _keyIndex = 0;

/**
 * Per-key cooldown: tracks when each key becomes available again.
 * After a successful call, the key gets a cooldown proportional to estimated token usage
 * so other incoming requests don't immediately burn the same key.
 * On 429, the key gets a much longer cooldown.
 */
const _keyCooldownUntil: number[] = _apiKeys.map(() => 0);

/** Ephemeral cooldown map for per-request user-supplied API keys (keyed by key string) */
const _userKeyCooldowns = new Map<string, number>();

/** Minimum seconds to cool down a key after a successful call (free tier TPM protection) */
const KEY_SUCCESS_COOLDOWN_BASE_MS = 8_000;
/** Additional cooldown per ~1000 estimated tokens used */
const KEY_COOLDOWN_PER_1K_TOKENS_MS = 3_000;
/** Cooldown applied to a key after a 429 error */
const KEY_429_COOLDOWN_MS = 45_000;

/**
 * Smart key selection: picks the key with the lowest/expired cooldown.
 * If all keys are in cooldown, waits for the soonest one to expire.
 * Returns { ai, keyIdx } so callers can report which key was used.
 */
async function getClientSmart(): Promise<{ ai: GoogleGenAI; keyIdx: number }> {
  const now = Date.now();

  // Find the key with the lowest cooldown (prefer already-expired ones)
  let bestIdx = 0;
  let bestCooldown = _keyCooldownUntil[0];
  for (let i = 1; i < _apiKeys.length; i++) {
    if (_keyCooldownUntil[i] < bestCooldown) {
      bestCooldown = _keyCooldownUntil[i];
      bestIdx = i;
    }
  }

  const waitMs = bestCooldown - now;
  if (waitMs > 0) {
    console.log(`[gemini:smartKey] Todas las keys en cooldown. Esperando ${Math.ceil(waitMs / 1000)}s para key ${bestIdx + 1}/${_apiKeys.length}`);
    await sleep(waitMs);
  }

  console.log(`[gemini] Usando API key ${bestIdx + 1}/${_apiKeys.length} (cooldowns: [${_keyCooldownUntil.map(c => Math.max(0, Math.ceil((c - Date.now()) / 1000))).join("s, ")}s])`);
  return { ai: new GoogleGenAI({ apiKey: _apiKeys[bestIdx] }), keyIdx: bestIdx };
}

/** Legacy wrapper — still used by call sites that haven't been refactored */
function getClient() {
  const key = _apiKeys[_keyIndex % _apiKeys.length];
  _keyIndex++;
  return new GoogleGenAI({ apiKey: key });
}

/** Record successful usage of a key, applying proportional cooldown */
function recordKeySuccess(keyIdx: number, estimatedTokens: number): void {
  const cooldownMs = KEY_SUCCESS_COOLDOWN_BASE_MS + Math.ceil(estimatedTokens / 1000) * KEY_COOLDOWN_PER_1K_TOKENS_MS;
  _keyCooldownUntil[keyIdx] = Math.max(_keyCooldownUntil[keyIdx], Date.now() + cooldownMs);
  console.log(`[gemini:smartKey] Key ${keyIdx + 1} → cooldown ${Math.ceil(cooldownMs / 1000)}s tras éxito (~${estimatedTokens} tokens)`);
}

/** Record a 429 on a specific key, applying heavy cooldown */
function recordKey429(keyIdx: number, suggestedDelayMs?: number): void {
  const cooldownMs = suggestedDelayMs ?? KEY_429_COOLDOWN_MS;
  _keyCooldownUntil[keyIdx] = Math.max(_keyCooldownUntil[keyIdx], Date.now() + cooldownMs);
  console.warn(`[gemini:smartKey] Key ${keyIdx + 1} → cooldown pesado ${Math.ceil(cooldownMs / 1000)}s tras 429`);
}

/** Select the best key from a user-supplied array using the ephemeral cooldown map */
async function selectUserKey(keys: string[]): Promise<string> {
  const now = Date.now();
  let bestKey = keys[0];
  let bestCooldown = _userKeyCooldowns.get(keys[0]) ?? 0;
  for (let i = 1; i < keys.length; i++) {
    const cd = _userKeyCooldowns.get(keys[i]) ?? 0;
    if (cd < bestCooldown) {
      bestCooldown = cd;
      bestKey = keys[i];
    }
  }
  const waitMs = bestCooldown - now;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  return bestKey;
}

/** Force rotate to next API key (called on 429) */
function rotateApiKey(): void {
  if (_apiKeys.length > 1) {
    _keyIndex++;
    console.log(`[gemini] Rotación forzada a API key ${(_keyIndex % _apiKeys.length) + 1}/${_apiKeys.length}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Global cooldown: when ANY call gets a 429, all calls wait until this timestamp */
let _geminiCooldownUntil = 0;

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toUpperCase();
  return normalized.includes("RESOURCE_EXHAUSTED") || normalized.includes('"CODE":429') || normalized.includes('"STATUS":429');
}

/** Check if the error indicates daily quota is fully exhausted (limit: 0, no point retrying) */
function isDailyQuotaExhausted(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("free_tier") && message.includes('limit: 0');
}

/** Parse Gemini's suggested retryDelay from the error message (e.g. "retryDelay":"38s") */
function parseRetryDelay(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  // Match "Please retry in 38.717s" or "retryDelay":"38s"
  const retryMatch = message.match(/retry in ([\d.]+)s/i) ?? message.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (retryMatch) {
    const seconds = parseFloat(retryMatch[1]);
    if (seconds > 0 && seconds < 300) return Math.ceil(seconds * 1000);
  }
  return null;
}

function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toUpperCase();
  return (
    normalized.includes('"STATUS":"INTERNAL"') ||
    normalized.includes('"CODE":500') ||
    normalized.includes("INTERNAL ERROR") ||
    normalized.includes("UNAVAILABLE") ||
    normalized.includes("DEADLINE_EXCEEDED") ||
    normalized.includes("RESOURCE_EXHAUSTED") ||
    normalized.includes("429") ||
    normalized.includes("503") ||
    // Timeouts propios (withTimeout) y errores de red son transitorios y merecen reintento
    normalized.includes("GEMINI TIMEOUT") ||
    normalized.includes("FETCH FAILED") ||
    normalized.includes("NETWORK")
  );
}

function findImagePart(response: any) {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    const imagePart = parts.find((part: any) => part?.inlineData?.data);
    if (imagePart) return imagePart;
  }
  return null;
}

function collectTextParts(response: any): string {
  const candidates = response?.candidates ?? [];
  const chunks: string[] = [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim().length > 0) {
        chunks.push(part.text.trim());
      }
    }
  }
  return chunks.join("\n");
}

/** Hard timeout per individual Gemini call.
 * Set to 80s so we can fit 2 retries within the 180s route limit.
 * Normal Gemini image generation takes 30-60s; if it hasn't responded by 80s it's stuck. */
const GEMINI_CALL_TIMEOUT_MS = 80_000;

/* ── Structured Logging Types ── */

interface GeminiRequestLog {
  tag: "[GEMINI:REQUEST]";
  requestId: string;
  timestamp: string;
  caller: string;
  model: string;
  attempt: number;
  maxAttempts: number;
  keyIndex: number;
  prompt: { text: string; imageCount: number; imageKB: number };
  estimatedInputTokens: number;
}

interface GeminiResponseLog {
  tag: "[GEMINI:RESPONSE]";
  requestId: string;
  timestamp: string;
  durationMs: number;
  caller: string;
  model: string;
  attempt: number;
  keyIndex: number;
  responseText: string;
  hasImage: boolean;
  usageMetadata: {
    promptTokenCount: number | null;
    candidatesTokenCount: number | null;
    totalTokenCount: number | null;
  };
  finishReasons: string[];
}

interface GeminiErrorLog {
  tag: "[GEMINI:ERROR]";
  requestId: string;
  timestamp: string;
  durationMs: number;
  caller: string;
  model: string;
  attempt: number;
  keyIndex: number;
  status: number | string | null;
  message: string;
  details: unknown;
  retryable: boolean;
  prompt: { text: string; imageCount: number; imageKB: number };
}

/* ── OpenRouter Structured Logging Types ── */

interface OpenRouterRequestLog {
  tag: "[OPENROUTER:REQUEST]";
  requestId: string;
  timestamp: string;
  caller: string;
  model: string;
  attempt: number;
  promptChars: number;
  estimatedInputTokens: number;
  messagesCount: number;
}

interface OpenRouterResponseLog {
  tag: "[OPENROUTER:RESPONSE]";
  requestId: string;
  timestamp: string;
  durationMs: number;
  caller: string;
  model: string;
  attempt: number;
  responseChars: number;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
  finishReason: string | null;
}

interface OpenRouterErrorLog {
  tag: "[OPENROUTER:ERROR]";
  requestId: string;
  timestamp: string;
  durationMs: number;
  caller: string;
  model: string;
  attempt: number;
  status: number | string | null;
  message: string;
  retryable: boolean;
  promptChars: number;
}

let _reqCounter = 0;
function generateRequestId(): string {
  _reqCounter++;
  return `gem_${Date.now().toString(36)}_${_reqCounter.toString(36)}`;
}

/** Extract readable prompt content + image stats from a Gemini request (for logging) */
function extractPromptForLog(request: Parameters<GoogleGenAI["models"]["generateContent"]>[0]): { text: string; imageCount: number; imageKB: number } {
  const texts: string[] = [];
  let imageCount = 0;
  let imageBytes = 0;
  const contents = (request as any).contents ?? [];
  for (const msg of contents) {
    for (const part of (msg.parts ?? [])) {
      if (part.text) texts.push(part.text);
      if (part.inlineData?.data) {
        imageCount++;
        imageBytes += (part.inlineData.data as string).length * 0.75;
      }
    }
  }
  return { text: texts.join("\n---\n"), imageCount, imageKB: Math.round(imageBytes / 1024) };
}

/** Extract error status code from Gemini error */
function extractErrorStatus(error: unknown): number | string | null {
  if (error && typeof error === "object") {
    const e = error as any;
    if (e.status) return e.status;
    if (e.code) return e.code;
    if (e.httpStatusCode) return e.httpStatusCode;
  }
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const m429 = msg.match(/"code"\s*:\s*(\d+)/i);
  if (m429) return parseInt(m429[1], 10);
  return null;
}

/** Extract error details array from Gemini error */
function extractErrorDetails(error: unknown): unknown {
  if (error && typeof error === "object") {
    const e = error as any;
    if (e.errorDetails) return e.errorDetails;
    if (e.details) return e.details;
  }
  return null;
}

/**
 * Compress a background buffer to JPEG before sending to Gemini.
 * Keeps original dimensions (no resize) to preserve aspect ratio and alignment.
 * Reduces file size from ~2MB PNG → ~150-400KB JPEG via quality compression only.
 */
async function compressBgForGemini(buf: Buffer): Promise<{ data: string; mimeType: string }> {
  const meta = await sharp(buf).metadata();
  const compressed = await sharp(buf)
    .jpeg({ quality: 80 })
    .toBuffer();
  console.log(`[compressBgForGemini] input: ${meta.width}×${meta.height} ${Math.round(buf.length / 1024)}KB → output: ${meta.width}×${meta.height} ${Math.round(compressed.length / 1024)}KB JPEG`);
  return { data: compressed.toString("base64"), mimeType: "image/jpeg" };
}

/**
 * Compress a product buffer to PNG before sending to Gemini.
 * Pads the product to match the background's aspect ratio (transparent padding) so Gemini
 * sees all inputs at the same aspect ratio and doesn't output at the product's native ratio.
 * Without this, Gemini via Vercel Gateway sometimes returns an image at the product's
 * portrait dimensions instead of the background's square/4:5 dimensions, causing fit:cover
 * to crop 15-20% of the image when normalizing.
 */
async function compressProductForGemini(buf: Buffer, aspectRatio?: string): Promise<{ data: string; mimeType: string }> {
  const target = TARGET_CANVAS_SIZES[aspectRatio ?? "1:1"] ?? TARGET_CANVAS_SIZES["1:1"];
  const maxSize = 768;
  // Scale the target dimensions to fit within 768px, preserving bg aspect ratio
  const scale = maxSize / Math.max(target.width, target.height);
  const padW = Math.round(target.width * scale);
  const padH = Math.round(target.height * scale);

  const metaIn = await sharp(buf).metadata();
  const compressed = await sharp(buf)
    .resize(padW, padH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 6 })
    .toBuffer();
  console.log(`[compressProductForGemini] input: ${metaIn.width}×${metaIn.height} → padded to: ${padW}×${padH} (aspect=${aspectRatio ?? "1:1"})`);
  return { data: compressed.toString("base64"), mimeType: "image/png" };
}

function toImageUrlPart(img: { data: string; mimeType: string }): { type: "image_url"; image_url: { url: string } } {
  return {
    type: "image_url",
    image_url: { url: `data:${img.mimeType};base64,${img.data}` },
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Gemini timeout: ${label} tardó más de ${ms / 1000}s`)),
      ms,
    );
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

/** Estimate the approximate payload size of a Gemini request (prompt chars + image data KB) */
function estimatePayloadSize(request: Parameters<GoogleGenAI["models"]["generateContent"]>[0]): { promptChars: number; imageDataKB: number; totalEstimatedTokens: number } {
  let promptChars = 0;
  let imageDataBytes = 0;
  const contents = (request as any).contents ?? [];
  for (const msg of contents) {
    for (const part of msg.parts ?? []) {
      if (part.text) promptChars += part.text.length;
      if (part.inlineData?.data) imageDataBytes += (part.inlineData.data as string).length * 0.75; // base64 → bytes
    }
  }
  const imageDataKB = Math.round(imageDataBytes / 1024);
  // Rough token estimation: ~4 chars per token for text, ~750 tokens per image (Gemini's typical)
  const textTokens = Math.ceil(promptChars / 4);
  const imageTokens = imageDataBytes > 0 ? Math.ceil(imageDataBytes / 1024) * 10 : 0; // ~10 tokens/KB as rough estimate
  return { promptChars, imageDataKB, totalEstimatedTokens: textTokens + imageTokens };
}

async function generateContentWithRetry(
  _ai: GoogleGenAI | null,
  request: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  options: { maxAttempts?: number; baseDelayMs?: number; timeoutMs?: number; callerName?: string; userApiKeys?: string[] } = {},
) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? GEMINI_CALL_TIMEOUT_MS;
  const caller = options.callerName ?? "unknown";
  const requestId = generateRequestId();
  const modelName = (request as any).model ?? "unknown";

  const payload = estimatePayloadSize(request);
  const promptLog = extractPromptForLog(request);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Respect global cooldown from a previous 429
    const cooldownRemaining = _geminiCooldownUntil - Date.now();
    if (cooldownRemaining > 0) {
      await sleep(cooldownRemaining);
    }

    // Smart key selection: user-supplied keys take priority over module-level keys
    let ai: GoogleGenAI;
    let keyIdx: number;
    let _selectedUserKey: string | null = null;
    if (options.userApiKeys && options.userApiKeys.length > 0) {
      _selectedUserKey = await selectUserKey(options.userApiKeys);
      ai = new GoogleGenAI({ apiKey: _selectedUserKey });
      keyIdx = -1;
    } else {
      ({ ai, keyIdx } = await getClientSmart());
    }

    // ── [GEMINI:REQUEST] ──
    const reqLog: GeminiRequestLog = {
      tag: "[GEMINI:REQUEST]",
      requestId,
      timestamp: new Date().toISOString(),
      caller,
      model: modelName,
      attempt,
      maxAttempts,
      keyIndex: keyIdx + 1,
      prompt: promptLog,
      estimatedInputTokens: payload.totalEstimatedTokens,
    };
    console.log(JSON.stringify(reqLog, null, 2));

    const t0 = Date.now();
    await acquireGeminiSlot();
    try {
      const result = await withTimeout(
        ai.models.generateContent(request),
        timeoutMs,
        `${caller} intento ${attempt}/${maxAttempts}`,
      );
      releaseGeminiSlot();
      const durationMs = Date.now() - t0;

      // ── [GEMINI:RESPONSE] ──
      const usage = (result as any).usageMetadata ?? {};
      const candidates = result?.candidates ?? [];
      const resLog: GeminiResponseLog = {
        tag: "[GEMINI:RESPONSE]",
        requestId,
        timestamp: new Date().toISOString(),
        durationMs,
        caller,
        model: modelName,
        attempt,
        keyIndex: keyIdx + 1,
        responseText: collectTextParts(result),
        hasImage: !!findImagePart(result),
        usageMetadata: {
          promptTokenCount: usage.promptTokenCount ?? null,
          candidatesTokenCount: usage.candidatesTokenCount ?? null,
          totalTokenCount: usage.totalTokenCount ?? null,
        },
        finishReasons: candidates.map((c: any) => c.finishReason ?? "UNKNOWN"),
      };
      console.log(JSON.stringify(resLog, null, 2));

      if (_selectedUserKey) {
        const cdMs = KEY_SUCCESS_COOLDOWN_BASE_MS + Math.ceil(payload.totalEstimatedTokens / 1000) * KEY_COOLDOWN_PER_1K_TOKENS_MS;
        _userKeyCooldowns.set(_selectedUserKey, Math.max(_userKeyCooldowns.get(_selectedUserKey) ?? 0, Date.now() + cdMs));
      } else {
        recordKeySuccess(keyIdx, payload.totalEstimatedTokens);
      }
      return result;
    } catch (error) {
      releaseGeminiSlot();
      const durationMs = Date.now() - t0;
      lastError = error;

      const retryable = isTransientGeminiError(error);

      // ── [GEMINI:ERROR] ──
      const errLog: GeminiErrorLog = {
        tag: "[GEMINI:ERROR]",
        requestId,
        timestamp: new Date().toISOString(),
        durationMs,
        caller,
        model: modelName,
        attempt,
        keyIndex: keyIdx + 1,
        status: extractErrorStatus(error),
        message: error instanceof Error ? error.message : String(error),
        details: extractErrorDetails(error),
        retryable,
        prompt: promptLog,
      };
      console.log(JSON.stringify(errLog, null, 2));

      const shouldRetry = attempt < maxAttempts && retryable;
      if (!shouldRetry) break;

      if (isRateLimitError(error)) {
        if (isDailyQuotaExhausted(error)) break;
        const suggestedDelay = parseRetryDelay(error);
        const rateLimitDelay = suggestedDelay
          ? suggestedDelay + Math.floor(Math.random() * 3000)
          : KEY_429_COOLDOWN_MS + Math.floor(Math.random() * 10000);
        if (_selectedUserKey) {
          _userKeyCooldowns.set(_selectedUserKey, Math.max(_userKeyCooldowns.get(_selectedUserKey) ?? 0, Date.now() + rateLimitDelay));
        } else {
          recordKey429(keyIdx, rateLimitDelay);
        }
        _geminiCooldownUntil = Math.max(_geminiCooldownUntil, Date.now() + Math.min(rateLimitDelay, 5000));
        await sleep(2000);
      } else {
        const jitter = Math.floor(Math.random() * 3000);
        await sleep(baseDelayMs * Math.pow(2, attempt - 1) + jitter);
      }
    }
  }

  throw lastError;
}


async function generateTextWithOpenRouter(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  options: {
    callerName?: string;
    model?: string;
    maxTokens?: number;
    maxAttempts?: number;
  } = {}
): Promise<string> {
  const caller = options.callerName ?? "unknown";
  const model = options.model ?? OPENROUTER_TEXT_MODEL;
  const maxTokens = options.maxTokens ?? 1000;
  const maxAttempts = options.maxAttempts ?? 3;

  const client = new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
  });

  const promptChars = messages.reduce((acc, m) => acc + m.content.length, 0);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[openrouter:text] caller=${caller} attempt=${attempt}/${maxAttempts} model=${model} promptChars=${promptChars}`);
    const t0 = Date.now();
    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
      });

      const durationMs = Date.now() - t0;
      const msg = response.choices[0]?.message as any;
      const content = msg?.content || msg?.reasoning_content || "";

      console.log(`[openrouter:text] caller=${caller} attempt=${attempt} durationMs=${durationMs} responseChars=${content.length} finishReason=${response.choices[0]?.finish_reason ?? null}`);

      if (!content) throw new Error("OpenRouter returned empty content");
      return content;

    } catch (error) {
      const durationMs = Date.now() - t0;
      lastError = error;
      const status = extractErrorStatus(error);
      const retryable = [429, 500, 503].includes(Number(status));
      console.error(`[openrouter:text] caller=${caller} attempt=${attempt} durationMs=${durationMs} status=${status} retryable=${retryable} error=${error instanceof Error ? error.message : String(error)}`);
      if (!retryable || attempt >= maxAttempts) break;
      await sleep(2000 * attempt);
    }
  }

  throw lastError;
}

/** Maps common aspect ratio strings to pixel sizes for the Imagen images API */
function aspectRatioToSize(aspectRatio: string): string {
  const map: Record<string, string> = {
    "1:1":  "1024x1024",
    "4:5":  "896x1120",
    "9:16": "768x1344",
    "16:9": "1344x768",
    "3:4":  "896x1152",
    "4:3":  "1152x896",
  };
  return map[aspectRatio] ?? "1024x1024";
}

/** Target canvas sizes — all generated images are resized to these before returning */
const TARGET_CANVAS_SIZES: Record<string, { width: number; height: number }> = {
  "1:1":  { width: 1080, height: 1080 },
  "4:5":  { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "3:4":  { width: 1080, height: 1440 },
  "4:3":  { width: 1440, height: 1080 },
};

/** Resize a generated image buffer to the target canvas size for its aspect ratio */
async function ensureTargetSize(buf: Buffer, aspectRatio: string): Promise<Buffer> {
  const target = TARGET_CANVAS_SIZES[aspectRatio] ?? TARGET_CANVAS_SIZES["1:1"];
  const meta = await sharp(buf).metadata();
  if (meta.width === target.width && meta.height === target.height) return buf;
  console.log(`[ensureTargetSize] aspect=${aspectRatio} input: ${meta.width}×${meta.height} → target: ${target.width}×${target.height} (fit:cover)`);
  return sharp(buf)
    .resize(target.width, target.height, { fit: "cover" })
    .png()
    .toBuffer();
}

/**
 * Generates an image using a RunPod serverless endpoint.
 * Used primarily for background generation.
 */
async function generateImageWithRunPod(
  prompt: string,
  options: { aspectRatio?: string; maxAttempts?: number; callerName?: string } = {}
): Promise<Buffer> {
  const caller = options.callerName ?? "unknown";
  const maxAttempts = options.maxAttempts ?? 3;
  const { width, height } = TARGET_CANVAS_SIZES[options.aspectRatio ?? "1:1"] ?? TARGET_CANVAS_SIZES["1:1"];

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const t0 = Date.now();
    console.log(`[runpod:image] caller=${caller} attempt=${attempt}/${maxAttempts} size=${width}x${height}`);

    try {
      const res = await fetch(`${process.env.RUNPOD_ENDPOINT_URL}/runsync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({
          input: {
            prompt,
            negative_prompt: "text, watermark, blurry, low quality, people, humans, products, bottles",
            steps: 25,
            cfg_scale: 7,
            width,
            height,
            sampler_name: "DPM++ 2M",
          },
        }),
      });

      const json = await res.json() as { status: string; output?: { images?: string[] } };
      const durationMs = Date.now() - t0;

      if (json.status !== "COMPLETED") {
        throw new Error(`RunPod status: ${json.status}`);
      }

      const b64 = json.output?.images?.[0];
      if (!b64) {
        throw new Error("RunPod no devolvió imagen (images vacío)");
      }

      const buf = Buffer.from(b64, "base64");
      console.log(`[runpod:image] caller=${caller} attempt=${attempt}/${maxAttempts} durationMs=${durationMs} OK imageBytes=${buf.length}`);
      return buf;

    } catch (error: any) {
      const durationMs = Date.now() - t0;
      lastError = error;
      console.error(`[runpod:image] caller=${caller} attempt=${attempt}/${maxAttempts} durationMs=${durationMs} error=${error instanceof Error ? error.message : String(error)}`);
      if (attempt < maxAttempts) await sleep(2000 * attempt);
    }
  }

  throw lastError;
}

async function generateImageWithFallback(
  _gatewayParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
  googleRequest: Parameters<typeof generateContentWithRetry>[1],
  options: {
    aspectRatio?: string;
    imageSize?: string;
    callerName?: string;
    model?: string;
    extractImageFromGoogle: (response: any) => Buffer | null;
    userApiKeys?: string[];
  }
): Promise<Buffer> {
  const caller = options.callerName ?? "unknown";

  const response = await generateContentWithRetry(null, googleRequest, { callerName: caller, maxAttempts: 3, userApiKeys: options.userApiKeys });
  const buf = options.extractImageFromGoogle(response);
  if (!buf) {
    throw new Error(`${caller}: Google GenAI no devolvió imagen.`);
  }
  console.log(`[generateImageWithFallback] ${caller}: Google GenAI OK`);
  return buf;
}

async function generateImageWithQwenRunPod(args: {
  prompt: string;
  backgroundPng: Buffer;
  productPng?: Buffer;
  avatarPng?: Buffer;
  aspectRatio?: string;
  callerName?: string;
  maxAttempts?: number;
}): Promise<Buffer> {
  const caller = args.callerName ?? "unknown";
  const maxAttempts = args.maxAttempts ?? 2;
  const { width, height } = TARGET_CANVAS_SIZES[args.aspectRatio ?? "1:1"] ?? TARGET_CANVAS_SIZES["1:1"];
  const QWEN_ENDPOINT = process.env.QWEN_RUNPOD_ENDPOINT_URL ?? "https://api.runpod.ai/v2/s8xs1pzedtog5z";

  const image_base64 = args.backgroundPng.toString("base64");
  const image_base64_2 = args.productPng?.toString("base64");
  const image_base64_3 = args.avatarPng?.toString("base64");

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const t0 = Date.now();
    console.log(`[qwen:image] caller=${caller} attempt=${attempt}/${maxAttempts} size=${width}x${height}`);
    try {
      const input: Record<string, unknown> = {
        prompt: args.prompt,
        image_base64,
        seed: Math.floor(Math.random() * 999999),
        width,
        height,
      };
      if (image_base64_2) input.image_base64_2 = image_base64_2;
      if (image_base64_3) input.image_base64_3 = image_base64_3;

      const res = await fetch(`${QWEN_ENDPOINT}/runsync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({ input }),
      });

      const json = await res.json() as { status?: string; output?: { image?: string }; error?: string };
      const durationMs = Date.now() - t0;

      if (json.error) throw new Error(`Qwen RunPod error: ${json.error}`);
      if (json.status && json.status !== "COMPLETED") throw new Error(`Qwen RunPod status: ${json.status}`);

      const b64 = json.output?.image;
      if (!b64) throw new Error("Qwen RunPod no devolvió imagen");

      const buf = Buffer.from(b64, "base64");
      console.log(`[qwen:image] caller=${caller} attempt=${attempt} durationMs=${durationMs} OK imageBytes=${buf.length}`);
      return buf;
    } catch (error: unknown) {
      const durationMs = Date.now() - t0;
      lastError = error;
      console.error(`[qwen:image] caller=${caller} attempt=${attempt} durationMs=${durationMs} error=${error instanceof Error ? error.message : String(error)}`);
      if (attempt < maxAttempts) await sleep(2000 * attempt);
    }
  }
  throw lastError;
}

export async function nanoBananaInjectProduct(args: {
  backgroundPng: Buffer;
  productPng: Buffer;
  prompt: string;
  aspectRatio?: string;
  apiKeys?: string[];
}): Promise<Buffer> {
  // 1° intento — Qwen RunPod
  try {
    console.log(`[nanoBananaInjectProduct] Intentando Qwen RunPod`);
    const buf = await generateImageWithQwenRunPod({
      prompt: args.prompt,
      backgroundPng: args.backgroundPng,
      productPng: args.productPng,
      aspectRatio: args.aspectRatio,
      callerName: "nanoBananaInjectProduct",
    });
    return ensureTargetSize(buf, args.aspectRatio ?? "1:1");
  } catch (err) {
    console.warn(`[nanoBananaInjectProduct] Qwen falló, usando Gemini. Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bgMetaIn = await sharp(args.backgroundPng).metadata();
  const prodMetaIn = await sharp(args.productPng).metadata();
  console.log(`[nanoBananaInjectProduct:input] bg=${bgMetaIn.width}×${bgMetaIn.height} product=${prodMetaIn.width}×${prodMetaIn.height} aspect=${args.aspectRatio ?? "1:1"}`);

  // Compress before upload — reduces ~4MB total to ~250-500KB, cuts Gemini latency
  const [bg, product] = await Promise.all([
    compressBgForGemini(args.backgroundPng),
    compressProductForGemini(args.productPng, args.aspectRatio),
  ]);

  console.log(`[gemini:nanoBananaInjectProduct] model=${MODEL_NANO_BANANA} prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);

  const gatewayParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    toImageUrlPart(bg),
    toImageUrlPart(product),
    { type: "text", text: args.prompt },
  ];

  const googleRequest = {
    model: MODEL_NANO_BANANA,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: bg.mimeType, data: bg.data } },
          { inlineData: { mimeType: product.mimeType, data: product.data } },
          { text: args.prompt },
        ],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: args.aspectRatio ?? "1:1",
        imageSize: "1K",
      },
      responseModalities: ["IMAGE"],
    },
  };

  const raw = await generateImageWithFallback(gatewayParts, googleRequest, {
    aspectRatio: args.aspectRatio ?? "1:1",
    imageSize: "1K",
    callerName: "nanoBananaInjectProduct",
    userApiKeys: args.apiKeys,
    extractImageFromGoogle: (response: any) => {
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p.inlineData?.data);
      return imgPart?.inlineData?.data ? Buffer.from(imgPart.inlineData.data as string, "base64") : null;
    },
  });
  const rawMeta = await sharp(raw).metadata();
  console.log(`[nanoBananaInjectProduct:output] Gemini raw=${rawMeta.width}×${rawMeta.height}`);
  return ensureTargetSize(raw, args.aspectRatio ?? "1:1");
}

export async function generateBackground(args: {
  prompt: string;
  aspectRatio?: string;
  apiKeys?: string[];
}): Promise<Buffer> {
  console.log(`[gemini:generateBackground] prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);

  const bgPrompt = `Generate a photographic background scene, no text anywhere in the image, no letters, no words, no numbers, no watermarks, no logos. No people, no humans, no hands, no faces, no body parts. No products, no bottles, no packages, no objects. Only the empty background scene:
${args.prompt}`;

  // 1. Google GenAI (Gemini) — intento principal
  try {
    console.log(`[generateBackground] Intentando Google GenAI (${MODEL_NANO_BANANA})`);
    const googleRequest = {
      model: MODEL_NANO_BANANA,
      contents: [{ role: "user", parts: [{ text: bgPrompt }] }],
      config: {
        imageConfig: { aspectRatio: args.aspectRatio ?? "1:1", imageSize: "1K" },
        responseModalities: ["IMAGE"],
      },
    };
    const response = await generateContentWithRetry(null, googleRequest, { callerName: "generateBackground", maxAttempts: 2, userApiKeys: args.apiKeys });
    const imagePart = findImagePart(response);
    if (imagePart?.inlineData?.data) {
      console.log(`[generateBackground] Google GenAI OK`);
      const buf = Buffer.from(imagePart.inlineData.data as string, "base64");
      return ensureTargetSize(buf, args.aspectRatio ?? "1:1");
    }
    throw new Error("Gemini no devolvió imagen");
  } catch (err) {
    console.warn(`[generateBackground] Gemini falló, usando RunPod. Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Fallback a RunPod
  try {
    console.log(`[generateBackground] Intentando RunPod`);
    const buf = await generateImageWithRunPod(args.prompt, {
      aspectRatio: args.aspectRatio ?? "1:1",
      callerName: "generateBackground",
      maxAttempts: 2,
    });
    return ensureTargetSize(buf, args.aspectRatio ?? "1:1");
  } catch (err) {
    console.warn(`[generateBackground] RunPod también falló. Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  throw new Error("generateBackground: ningún proveedor devolvió imagen");
}

export async function generateScene(args: {
  backgroundPng: Buffer;
  prompt: string;
  aspectRatio?: string;
  apiKeys?: string[];
}): Promise<Buffer> {
  // 1° intento — Qwen RunPod
  try {
    console.log(`[generateScene] Intentando Qwen RunPod`);
    const buf = await generateImageWithQwenRunPod({
      prompt: args.prompt,
      backgroundPng: args.backgroundPng,
      aspectRatio: args.aspectRatio,
      callerName: "generateScene",
    });
    return ensureTargetSize(buf, args.aspectRatio ?? "1:1");
  } catch (err) {
    console.warn(`[generateScene] Qwen falló, usando Gemini. Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bgMetaIn = await sharp(args.backgroundPng).metadata();
  console.log(`[generateScene:input] bg=${bgMetaIn.width}×${bgMetaIn.height} aspect=${args.aspectRatio ?? "1:1"}`);

  const bg = await compressBgForGemini(args.backgroundPng);

  console.log(`[gemini:generateScene] model=${MODEL_NANO_BANANA} prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);

  const gatewayParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    toImageUrlPart(bg),
    { type: "text", text: args.prompt },
  ];

  const googleRequest = {
    model: MODEL_NANO_BANANA,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: bg.mimeType, data: bg.data } },
          { text: args.prompt },
        ],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: args.aspectRatio ?? "1:1",
        imageSize: "1K",
      },
      responseModalities: ["IMAGE"],
    },
  };

  const raw = await generateImageWithFallback(gatewayParts, googleRequest, {
    aspectRatio: args.aspectRatio ?? "1:1",
    imageSize: "1K",
    callerName: "generateScene",
    userApiKeys: args.apiKeys,
    extractImageFromGoogle: (response: any) => {
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p.inlineData?.data);
      return imgPart?.inlineData?.data ? Buffer.from(imgPart.inlineData.data as string, "base64") : null;
    },
  });
  const rawMeta = await sharp(raw).metadata();
  console.log(`[generateScene:output] Gemini raw=${rawMeta.width}×${rawMeta.height}`);
  return ensureTargetSize(raw, args.aspectRatio ?? "1:1");
}

/**
 * Generates an advertising scene where a real person (from an avatar reference)
 * is placed in a background, naturally holding a product.
 *
 * Sends THREE images to Gemini:
 *   Image 1 — background scene
 *   Image 2 — product to be held
 *   Image 3 — avatar (reference for the person's appearance)
 *
 * The creative brief comes from the template's defaultProductPrompt (passed as `prompt`).
 */
export async function generateSceneWithAvatarAndProduct(args: {
  backgroundPng: Buffer;
  productPng: Buffer;
  avatarPng: Buffer;
  prompt: string;
  aspectRatio?: string;
  apiKeys?: string[];
}): Promise<Buffer> {
  const bgMetaIn = await sharp(args.backgroundPng).metadata();
  const prodMetaIn = await sharp(args.productPng).metadata();
  const avatarMetaIn = await sharp(args.avatarPng).metadata();
  console.log(`[generateSceneWithAvatarAndProduct:input] bg=${bgMetaIn.width}×${bgMetaIn.height} product=${prodMetaIn.width}×${prodMetaIn.height} avatar=${avatarMetaIn.width}×${avatarMetaIn.height} aspect=${args.aspectRatio ?? "1:1"}`);

  // 1° intento — Qwen RunPod
  try {
    console.log(`[generateSceneWithAvatarAndProduct] Intentando Qwen RunPod`);
    const buf = await generateImageWithQwenRunPod({
      prompt: args.prompt,
      backgroundPng: args.backgroundPng,
      productPng: args.productPng,
      avatarPng: args.avatarPng,
      aspectRatio: args.aspectRatio,
      callerName: "generateSceneWithAvatarAndProduct",
    });
    return ensureTargetSize(buf, args.aspectRatio ?? "1:1");
  } catch (err) {
    console.warn(`[generateSceneWithAvatarAndProduct] Qwen falló, usando Gemini. Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const [bg, product, avatar] = await Promise.all([
    compressBgForGemini(args.backgroundPng),
    compressProductForGemini(args.productPng, args.aspectRatio),
    compressProductForGemini(args.avatarPng, args.aspectRatio),
  ]);

  console.log(`[gemini:generateSceneWithAvatarAndProduct] model=${MODEL_NANO_BANANA} prompt_chars=${args.prompt.length}\n${args.prompt.slice(0, 300)}`);

  const gatewayParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    toImageUrlPart(bg),
    toImageUrlPart(product),
    toImageUrlPart(avatar),
    { type: "text", text: args.prompt },
  ];

  const googleRequest = {
    model: MODEL_NANO_BANANA,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: bg.mimeType, data: bg.data } },
          { inlineData: { mimeType: product.mimeType, data: product.data } },
          { inlineData: { mimeType: avatar.mimeType, data: avatar.data } },
          { text: args.prompt },
        ],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: args.aspectRatio ?? "1:1",
        imageSize: "1K",
      },
      responseModalities: ["IMAGE"],
    },
  };

  const raw = await generateImageWithFallback(gatewayParts, googleRequest, {
    aspectRatio: args.aspectRatio ?? "1:1",
    imageSize: "1K",
    callerName: "generateSceneWithAvatarAndProduct",
    userApiKeys: args.apiKeys,
    extractImageFromGoogle: (response: any) => {
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p.inlineData?.data);
      return imgPart?.inlineData?.data ? Buffer.from(imgPart.inlineData.data as string, "base64") : null;
    },
  });
  const rawMeta = await sharp(raw).metadata();
  console.log(`[generateSceneWithAvatarAndProduct:output] Gemini raw=${rawMeta.width}×${rawMeta.height}`);
  return ensureTargetSize(raw, args.aspectRatio ?? "1:1");
}

/**
 * Generates a generic/unbranded version of a product using Gemini vision.
 * Gemini analyses the original product shape, form factor and proportions,
 * then creates a new clean version with NO text/logos/labels and neutral gray tones.
 * Returns a PNG buffer with the product on a pure-white background.
 */
export async function generateGenericProduct(args: {
  productPng: Buffer;
  apiKeys?: string[];
}): Promise<Buffer> {
  const prompt = `Analyze the product in this image carefully. Your task is to generate a NEW image of a generic, unbranded version of this EXACT same product.

CRITICAL REQUIREMENTS:
1. SHAPE: The generic product MUST have the EXACT SAME 3D shape, form factor, size, proportions, and material as the original. If it's a jar, generate a jar. If it's a bottle, generate a bottle. Same cap style, same body shape.
2. NO BRANDING: REMOVE ALL text, logos, labels, brand names, and any printed graphics. Every surface must be completely smooth, clean, and blank.
3. COLOR: Use ONLY neutral light-gray tones (#C0C0C0 to #D8D8D8). No colors from the original — everything must be neutral medium gray.
4. 3D QUALITY: The product MUST look SOLID and REAL with:
   - Strong, visible shadows and ambient occlusion ONLY directly beneath the product
   - Clear specular highlights on curved surfaces
   - Visible material texture (matte plastic, glass, metal — match the original material)
   - Full volumetric 3D depth — it must NOT look flat or ghostly
5. BACKGROUND: The background MUST be PURE WHITE (#FFFFFF). Completely solid white with no gradients, no textures, no patterns. The product should clearly contrast against the white.
6. COMPOSITION: Product centered, occupying roughly 60-70% of the frame. One small tight contact shadow directly under the base — NO spreading shadow beyond the product footprint.
7. NOTHING ELSE: No text, no labels, no watermarks, no decorations, no additional objects. ONLY the gray product on white.
8. LIGHTING: Use clean studio lighting — soft diffuse from the left, subtle fill from the right. The product must be well-lit with clear form definition.
9. Think of it as a factory prototype before labeling — a real physical object, just without any branding applied yet.
10. CRITICAL EDGE RULE: The product silhouette MUST have a PERFECTLY SHARP, CLEAN boundary against the white background. ABSOLUTELY NO soft glow, NO ambient haze, NO blur, NO feathering extending beyond the product shape. The edge where product meets white background must be a hard, crisp line. Every pixel outside the product silhouette must be exactly #FFFFFF white.`;

  console.log(`[gemini:generateGenericProduct] model=${MODEL_NANO_BANANA} prompt_chars=${prompt.length}\n${prompt.slice(0, 300)}`);

  const productBase64 = args.productPng.toString("base64");

  const gatewayParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    { type: "image_url", image_url: { url: `data:image/png;base64,${productBase64}` } },
    { type: "text", text: prompt },
  ];

  const googleRequest = {
    model: MODEL_NANO_BANANA,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: productBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
      responseModalities: ["IMAGE"],
    },
  };

  return generateImageWithFallback(gatewayParts, googleRequest, {
    aspectRatio: "1:1",
    imageSize: "1K",
    callerName: "generateGenericProduct",
    userApiKeys: args.apiKeys,
    extractImageFromGoogle: (response: any) => {
      const imagePart = findImagePart(response);
      return imagePart?.inlineData?.data ? Buffer.from(imagePart.inlineData.data as string, "base64") : null;
    },
  });
}

/**
 * Analyzes a generated scene and returns the bounding box of the product being held.
 * Used to overlay the original product PNG at the exact position for pixel-perfect fidelity.
 * Returns null if detection fails.
 */
export async function detectProductBoundingBox(args: {
  scenePng: Buffer;
  productPng: Buffer;
  apiKeys?: string[];
}): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const scene = await compressBgForGemini(args.scenePng);
  const product = await compressProductForGemini(args.productPng);

  const prompt = `You are analyzing an advertising image.
Image 1: a scene of a person holding a product
Image 2: the reference product (what the person should be holding)

Identify the EXACT bounding box of the product the person is holding in Image 1.

Return ONLY a JSON object. All values are fractions from 0.0 to 1.0 relative to image dimensions:
{"x": <left edge>, "y": <top edge>, "width": <product width>, "height": <product height>}

No explanation. No markdown. Only the JSON.`;

  console.log(`[gemini:detectProductBoundingBox] model=${MODEL_NANO_BANANA}`);
  const response = await generateContentWithRetry(null, {
    model: MODEL_NANO_BANANA,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: scene.mimeType, data: scene.data } },
        { inlineData: { mimeType: product.mimeType, data: product.data } },
        { text: prompt },
      ],
    }],
  }, { callerName: "detectProductBoundingBox", userApiKeys: args.apiKeys });

  const raw = response.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join("") ?? "";

  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const bbox = JSON.parse(cleaned);
    if (
      typeof bbox.x === "number" && typeof bbox.y === "number" &&
      typeof bbox.width === "number" && typeof bbox.height === "number" &&
      bbox.x >= 0 && bbox.y >= 0 && bbox.width > 0 && bbox.height > 0 &&
      bbox.x + bbox.width <= 1.1 && bbox.y + bbox.height <= 1.1
    ) {
      return bbox;
    }
    console.warn("[detectProductBoundingBox] Invalid bbox values:", bbox);
    return null;
  } catch {
    console.warn("[detectProductBoundingBox] Failed to parse bbox:", raw.slice(0, 200));
    return null;
  }
}

export interface CreativeAnalysisResult {
  overallScore: number;
  aspects: {
    visualQuality:    { score: number; feedback: string };
    messageClarity:   { score: number; feedback: string };
    productPresence:  { score: number; feedback: string };
    spellingGrammar:  { score: number; feedback: string };
    imageCoherence:   { score: number; feedback: string };
  };
  criticalIssues: string[];
  highlights: string[];
  summary: string;
}

/**
 * Analyzes a generated creative image and its copy, returning a quality score
 * and detailed feedback across 5 dimensions.
 */
export async function analyzeCreativeQuality(args: {
  creativePng: Buffer;
  productPng?: Buffer;
  copy: Record<string, unknown>;
  apiKeys?: string[];
}): Promise<CreativeAnalysisResult> {
  const creative = await compressBgForGemini(args.creativePng);
  const product = args.productPng ? await compressProductForGemini(args.productPng) : null;

  const copyText = Object.entries(args.copy)
    .filter(([, v]) => v !== undefined && v !== null && typeof v !== "object")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `Eres un experto en creatividad publicitaria y diseño de ads digitales para redes sociales.
Analiza este creativo publicitario considerando tanto la imagen como los textos del copy.${product ? "\nImage 1: el creativo final. Image 2: el producto de referencia." : ""}

Devuelve ÚNICAMENTE un objeto JSON con este formato exacto (sin markdown, sin explicación):
{
  "overallScore": <número del 1 al 10 con un decimal>,
  "aspects": {
    "visualQuality":   { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "messageClarity":  { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "productPresence": { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "spellingGrammar": { "score": <1-10>, "feedback": "<1 oración concisa en español>" },
    "imageCoherence":  { "score": <1-10>, "feedback": "<1 oración concisa en español>" }
  },
  "criticalIssues": ["<solo si hay errores graves: faltas ortográficas, producto ausente, texto cortado, persona deformada>"],
  "highlights": ["<1-3 puntos genuinamente positivos del creativo>"],
  "summary": "<resumen ejecutivo en 2 oraciones en español>"
}

TEXTOS DEL CREATIVO:
${copyText}

CRITERIOS DE EVALUACIÓN:
- visualQuality: composición visual, iluminación, que la persona se vea natural y no generada artificialmente, calidad general de la imagen
- messageClarity: ¿el headline y el subheadline comunican claramente el beneficio principal? ¿son convincentes?
- productPresence: ¿el producto es visible en la imagen, reconocible y coherente con el producto de referencia? ¿está correctamente integrado?
- spellingGrammar: revisa TODOS los textos por errores ortográficos, tildes faltantes, errores gramaticales, puntuación incorrecta
- imageCoherence: ¿la persona/avatar se ve natural en el contexto del fondo? ¿la iluminación es coherente? ¿hay elementos incongruentes?

Sé preciso y honesto. Un score de 10 es excepcional, 7-8 es bueno, 5-6 es aceptable, <5 tiene problemas importantes.`;

  console.log(`[gemini:analyzeCreativeQuality] model=${MODEL_NANO_BANANA} copy_fields=${Object.keys(args.copy).length}`);

  const parts: object[] = [
    { inlineData: { mimeType: creative.mimeType, data: creative.data } },
  ];
  if (product) {
    parts.push({ inlineData: { mimeType: product.mimeType, data: product.data } });
  }
  parts.push({ text: prompt });

  const response = await generateContentWithRetry(null, {
    model: MODEL_NANO_BANANA,
    contents: [{ role: "user", parts }],
  }, { callerName: "analyzeCreativeQuality", userApiKeys: args.apiKeys });

  const raw = response.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join("") ?? "";

  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const result = JSON.parse(cleaned) as CreativeAnalysisResult;
    if (typeof result.overallScore !== "number" || !result.aspects) {
      throw new Error("Invalid analysis shape");
    }
    return result;
  } catch {
    throw new Error(`analyzeCreativeQuality: invalid JSON from Gemini: ${raw.slice(0, 200)}`);
  }
}

const GEMINI_COPYWRITER_SYSTEM_PROMPT = `
You are an expert direct response copywriter specialized in
persuasive advertising for Spanish-speaking Latin American markets.
You write copy that doesn't look like advertising — it infiltrates
the reader's defenses like a Trojan Horse.

## CORE PHILOSOPHY:
- Benefits over features ALWAYS. People don't want a drill,
  they want the hole. Focus on how the product changes their life.
- Write to ONE person, never a crowd. Use "vos", "tenés", "podés"
  (Argentine/Latin Spanish).
- The goal of the first sentence is to make them read the second.
- Never sound like an ad. Sound like a friend who found something amazing.
- Short punchy sentences. No academic language. No corporate speak.

## ADVERTISING STRUCTURE:
1. HOOK — Stop the scroll. Make the ideal client identify themselves.
2. PROBLEM/PAIN — Show you understand their exact situation and
   what they're losing.
3. INTEREST/SOLUTION — Make them see a huge gap between value and cost.
4. CTA — Simple and direct. Tell them exactly what to do.

## HOOK TYPES (choose based on angle):
- Identificación: "Dueño de [negocio]..." client identifies themselves
- Pregunta afirmativa: questions they answer "sí, ese soy yo"
- Si...entonces: "Si tenés X, entonces puedo ayudarte a Y"
- Resultado ridículo: shocking specific result with credibility
- Gancho negativo: "Si no hacés esto, nunca vas a lograr X"
- Gancho cotilla: "X persona hace esto que vos también podés hacer"
- Gancho fórmula: "Cómo conseguí X resultado en Y tiempo"
- Gancho sabías qué: "¿Sabés por qué no estás logrando X?"
- Gancho objeto mágico: present the product as THE solution
- Gancho 1 cosa: "Solo hay una cosa que puede lograr X"
- Gancho situación: "Si yo tuviera [problema], haría esto..."
- Gancho resultados: "Perdí X kilos en Y días sin Z"
- Gancho negar: "Nunca deberías hacer X si querés Y"
- Gancho todo el mundo: "Todo el mundo habla de esto..."
- Gancho reto: "El 99% de la gente hace esto mal..."

## PAIN/PROBLEM PRINCIPLES:
- Expose what hurts TODAY specifically
- Show what they're LOSING right now by not having the solution
- Show the RISK of staying the same (future without product)
- Formula: Cuándo (past/present/future) + Quién + Cuál pain
- Make them feel UNDERSTOOD, not sold to

## INTEREST/SOLUTION PRINCIPLES:
- Show massive gap between value and cost
- Address: desired result, nightmare scenario, perceived probability
  of success, time delay, effort/sacrifice, status improvement
- Minimize past failures, show people like them getting results
- Use social proof, credentials, guarantees when available

## PROVEN COPY TEMPLATES:
1. P.A.S (Problem-Agitation-Solution): Expose pain → Agitate it →
   Present solution
2. Caso de éxito: Real result → How they got it → CTA
3. Gancho impactante: Controversial statement → Proof → CTA
4. Curiosidad ciega: Create suspense → Force the click
5. Charla de chimenea: First person story → Natural product mention → CTA
6. Oferta directa: What they get → Why act now

## HEADLINE FORMULAS:
- "X maneras de conseguir [resultado] sin [acción indeseable]"
- "Logramos [resultado] como [experto] incluso sin [expectativa]"
- "Cómo eliminar [problema] sin [lo que odian] en [tiempo específico]"
- "[Acción difícil] en [tiempo específico] incluso si [dificultad]"

## WRITING RULES:
- Use metaphors to illustrate points — they work incredibly well
- Walk the line of controversy — bold claims that grab attention
- Specific numbers > vague claims ("perdí 5kg" > "perdí peso")
- Use "..." to create reading momentum
- Short paragraphs — 1-3 lines max
- Never list features — always translate to life benefits
- Create urgency without desperation
- The reader should feel: "This person gets me exactly"
`;

const GEMINI_VARIANT_ANGLES = [
  "Emotional angle — connects with feelings and personal transformation",
  "Problem/Solution angle — highlights the pain point and how it's solved",
  "Urgency angle — creates FOMO, limited time or stock",
  "Technical benefit angle — specific ingredients, results, data",
  "Aspirational angle — the life/identity after using the product",
] as const;

export async function generateTemplateCopyGemini(args: {
  product: string;
  offer: string;
  targetAudience: string;
  problem: string;
  tone: string;
  templateSchema: string[];
  numberOfVariants?: number;
  templateHint?: string;
  referenceStyle?: string;
  backgroundStyleGuide?: string;
  sorteoData?: {
    premios: string;
    colaboradores: string;
    condiciones: string;
  };
  businessProfile?: {
    nombre?: string;
    rubro?: string;
    propuestaValor?: string;
    diferenciacion?: string;
    clienteIdeal?: string;
    dolores?: string | string[];
    motivaciones?: string | string[];
    tono?: string | string[];
    palabrasSi?: string;
    palabrasNo?: string;
    coloresMarca?: string[];
    category?: string;
  };
  template?: {
    id: string;
    name: string;
    description: string;
    copyZone: string;
    copySchema: string[];
    pipelineV2?: boolean;
    sceneFullBleed?: boolean;
    personScene?: boolean;
    personOnly?: boolean;
    recommendedFor?: string[];
    defaultBackgroundPrompt?: string;
    defaultProductPrompt?: string;
  };
}): Promise<Record<string, unknown> | Record<string, unknown>[]> {
  const n = args.numberOfVariants ?? 1;

  const fieldRules = `FIELD RULES:
- title: 3-5 keywords separated by ' · ' max 50 chars
- headline: max 6 words, emotional, ends with period. You may wrap 1-2 key words in **word** to mark them for stronger typographic emphasis (they will render bolder). CRITICAL: always surround **word** with spaces — write "la **firmeza** y" NOT "la**firmeza**y". Only mark the most emotionally impactful word(s). For comparacion-split templates: the main comparison title, bold, max 30 chars, uppercase, must contain "VS", NO **bold** markers. Examples: "NOSOTROS VS ELLOS", "LO REAL VS LO BARATO".
- subheadline: 1-2 sentences, max 120 chars, benefit-focused. You may wrap 1-2 key words in **word** for stronger emphasis. CRITICAL: always surround **word** with spaces — write "la **palabra** siguiente" NOT "la**palabra**siguiente". Only mark the most important words.
- badge: short offer pill format, max 35 chars
- cta: action button text rendered as a pill button. Short, direct, action-oriented. Max 20 chars. Must be a complete phrase with a verb. Examples: "Quiero el mío", "Empezá ahora", "Ver la oferta", "Shop Now", "Probalo gratis".
- bullets: array of 3 items, max 40 chars each, start with relevant emoji. For comparacion-split: array of exactly 4 YOUR PRODUCT benefits, NO emojis, NO ✓ symbols. For antes-despues: array of 3-4 AFTER results/benefits, NO emojis, NO bullet points — they are added automatically. Specific measurable results.
- columnTitle: (comparacion-split only) YOUR product/brand name, short, max 20 chars, uppercase. This is the LEFT column label. Example: "MEENO", "DERMALISSE", "NOSOTROS". (antes-despues) the AFTER label, short, uppercase, max 15 chars. Example: "DÍA 90", "DESPUÉS", "CON TRATAMIENTO".
- competitionTitle: (comparacion-split only) generic competition label, max 20 chars, uppercase. This is the RIGHT column label. Example: "ELLOS", "CREMA COMÚN", "OTRAS MARCAS". (antes-despues) the BEFORE label, short, uppercase, max 15 chars. Example: "DÍA 1", "ANTES", "SIN TRATAMIENTO".
- competitionBullets: (comparacion-split only) array of exactly 4 COMPETITION weaknesses, NO emojis, NO ✗ symbols. Realistic and recognizable. Max 40 chars each. (antes-despues) array of 3-4 BEFORE problems/symptoms, NO emojis, NO bullet points. Realistic pain points the audience recognizes. Max 45 chars each.
- backgroundPrompt: A detailed prompt in Spanish to generate a background image. It must follow this exact style:
  "Fondo [tipo de ambiente y superficie], [descripción de textura]. Iluminación [tipo de luz y dirección], generando [descripción de sombras]. Ambiente [adjetivos de atmósfera], tonos [paleta de colores], estética [estilo visual]. Luz [calidad de luz], sombras [descripción]. Superficie uniforme sin objetos, sin texto, sin personas, sin productos. Estilo fotografía publicitaria de [categoría del producto], fondo limpio con profundidad sutil y sensación de [emoción relacionada al producto]."
  The prompt must be in Spanish, detailed, evocative, and adapted to the product category and tone provided by the user.
  IMPORTANT: If a BACKGROUND STYLE GUIDE is provided below, you MUST base this field on it. Keep the same visual composition, textures, and mood from the style guide, but adapt the color palette and atmosphere to the product category and tone. Do not copy it verbatim — personalize it. The style guide is a creative constraint, not a template to copy literally.
- productPrompt: A creative brief in English that tells Gemini what kind of PERSON to generate and how they NATURALLY USE or interact with the product. This is NOT a hand-only prompt — describe a FULL PERSON actively using the product.
  Structure: [person description] + [emotional/physical state] + [natural product interaction — using, applying, or presenting] + [pose and body language details].
  CRITICAL REQUIREMENTS for the prompt you generate:
  1. Describe the person specifically: age range, body type hint, clothing style, expression — make it vivid and human
  2. Describe EXACTLY how they USE the product naturally
  3. Describe their body language and energy
  4. Describe their expression in detail
  5. ALWAYS end with this exact phrase: "right side of canvas only, left half completely clean."
  Always include this field in the returned JSON regardless of the template.
- primaryColor: Brand color inferred from the industry, product name, and tone. Return as a single hex code (e.g. "#D4A5A5").
  Always include this field in the returned JSON regardless of the template.
- backgroundColorHint: (optional) ONLY the color palette modifier for the background. Must be a very light, pale tone compatible with dark typography.
  Return ONLY the color description, max 8 words.
- sceneAction: (optional — only generate if this field is explicitly listed in the template schema) A hyper-specific photography direction describing a COMPLETE SCENE: environment + person + product interaction + lighting. This is a creative brief for an AI image generation model — be vivid, cinematic, and UNIQUE.
  CRITICAL: Each variant MUST use a COMPLETELY DIFFERENT scenario, setting, body language, and visual concept. NEVER repeat the same setup across variants. Think like a creative director building a diverse campaign.
  Structure: [specific setting/environment with props] + [person age/gender/appearance/clothing] + [exact body language, expression, and product interaction] + [lighting direction and quality] + [camera/framing feel]
  Max 80 words. By default, the person fills the full canvas (full-bleed cinematic portrait) — UNLESS the TEMPLATE VISUAL DIRECTION below specifies a different positioning (e.g. "person on the RIGHT side", "LEFT 50% clean"). In that case, follow the template positioning strictly.
  IMPORTANT: If a TEMPLATE VISUAL DIRECTION block is provided below, your sceneAction MUST be coherent with it — it is a HARD CONSTRAINT, not a suggestion:
  - If the background direction says "minimalist", "muted tones", "clean", "elegant" → your scene environment must reflect those qualities
  - If the product/person direction says "Do NOT show any product" → the person must NOT hold, touch, or interact with ANY product or bottle. Show the person in a candid lifestyle moment WITHOUT the product.
  - If the product/person direction specifies positioning ("RIGHT side", "LEFT 50% clean") → follow it exactly. Override the default full-canvas framing.
  - If the product/person direction describes a specific interaction style (hand holding, surface placement, applying, etc.) → incorporate that interaction naturally
  The action must directly illustrate the headline copy. Be specific to the product category.
  SCENE SYNTHESIS PROCESS — you MUST blend THREE sources into ONE cohesive scene:
  1. TEMPLATE VISUAL DIRECTION (below) → defines the visual constraints: background style, person positioning, product interaction rules. This is the STRUCTURAL FOUNDATION — always respect it.
  2. SCENE EXAMPLES (below) → provide creative inspiration for the MOOD, SETTING TYPE, and PERSON-PRODUCT DYNAMIC specific to this product category. Extract the photographic technique, emotional tone, and interaction style — do NOT copy the scene literally.
  3. PRODUCT & BRAND CONTEXT (below) → the specific product, audience, and tone that the scene must serve.
  Your sceneAction must feel like ONE unified creative vision, not a patchwork. The template direction sets the layout rules, the scene example sets the creative mood, and the product context makes it specific.
  IMPORTANT: See the SCENE EXAMPLES section provided separately below — you MUST use it as creative inspiration for this field.
- scenePrompt: (optional — only generate if this field is explicitly listed in the template schema) A COMPLETE SCENE DESCRIPTION in English that combines the background environment, a real person, and the product into one cohesive visual narrative.
  Structure: [setting/environment with specific details] + [lighting direction and quality] + [person description: age, clothing, pose, expression] + [natural product interaction] + [mood and color palette] + [camera/framing]
  Max 120 words. Be vivid, cinematic, and specific.
  CRITICAL: Each variant MUST use a COMPLETELY DIFFERENT setting, mood, and person-product interaction.
  ALWAYS end with: "Subject and product on right side only. Left half must remain completely clean for pre-rendered text."
  SCENE SYNTHESIS PROCESS — you MUST blend THREE sources into ONE cohesive scene:
  1. TEMPLATE VISUAL DIRECTION (below) → the structural foundation: background mood, person positioning, interaction constraints. ALWAYS respect these as hard rules.
  2. SCENE EXAMPLES (below) → creative inspiration for the photographic style, emotional register, and category-specific setting. Use the TECHNIQUE and MOOD, not the literal scene.
  3. PRODUCT & BRAND CONTEXT (below) → grounds the scene in the specific product, audience, and brand voice.
  Merge all three into a single, unified visual narrative. The result should feel intentional and cohesive — as if a creative director designed one scene that naturally satisfies all three inputs.
  IMPORTANT: See the SCENE EXAMPLES section provided separately below — you MUST use it as creative inspiration for this field.`;

  const variantInstructions =
    n > 1
      ? `\nGenerate ${n} variants with these different angles:\n${GEMINI_VARIANT_ANGLES.slice(0, n)
          .map((angle, i) => `- Variant ${i + 1}: ${angle}`)
          .join("\n")}\n\nCRITICAL FOR sceneAction: Each variant MUST use a COMPLETELY DIFFERENT scenario/setting/location. If one variant uses a bathroom, NONE of the others can. If one uses a mirror, NONE of the others can. Think of ${n} different ROOMS or LOCATIONS for the person. Variety is mandatory.\n\nReturn a JSON object with a single key "variants" whose value is an array of ${n} objects, each with the same fields as specified. No markdown, no explanation, only the JSON object.`
      : `\nReturn ONLY a valid JSON object with exactly the fields requested. No markdown, no explanation, no extra text.`;

  const bp = args.businessProfile;
  const formatField = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v.join(", ") : v || "—";
  const brandContextBlock = bp
    ? `BRAND CONTEXT (use this to make copy more specific and on-brand):
- Business name: ${bp.nombre || "—"}
- Industry: ${bp.rubro || "—"}
- Business category: ${bp.category || "—"}
- Value proposition: ${bp.propuestaValor || "—"}
- Differentiation: ${bp.diferenciacion || "—"}
- Ideal client: ${bp.clienteIdeal || "—"}
- Client pain points: ${formatField(bp.dolores)}
- Purchase motivations: ${formatField(bp.motivaciones)}
- Brand tone: ${formatField(bp.tono)}
- Words to USE: ${bp.palabrasSi || "—"}
- Words to AVOID: ${bp.palabrasNo || "—"}
- Brand colors: ${bp.coloresMarca?.length ? bp.coloresMarca.join(", ") : "—"}
${bp.coloresMarca?.length ? `
IMPORTANT COLOR OVERRIDES (takes priority over generic rules):
- primaryColor field: use exactly "${bp.coloresMarca[0]}" — this is the brand's actual primary color.
- backgroundColorHint field: derive a very light/pale version of these brand colors (${bp.coloresMarca.join(", ")}) that works as a background. Must stay compatible with dark typography. Describe it in words (max 8 words).
` : ""}
Use this brand context to make the copy feel authentic, specific and consistent with the brand voice. Incorporate the brand's unique differentiators naturally.

`
    : "";

  const tpl = args.template;
  const templateContextBlock = tpl
    ? `TEMPLATE CONTEXT (the visual layout this copy will be used with):
- Template: ${tpl.name} (${tpl.id})
- Description: ${tpl.description}
- Copy zone: ${tpl.copyZone} (text renders in the ${tpl.copyZone} area of the image)
- Copy fields: ${tpl.copySchema.join(", ")}
- Scene type: ${tpl.sceneFullBleed ? "full-bleed cinematic scene" : "standard layout"}${tpl.personScene ? ", includes person in scene" : ""}${tpl.personOnly ? ", person-only (no product)" : ""}
- Pipeline: ${tpl.pipelineV2 ? "V2 (creative brief → AI scene)" : "V1 (standard background)"}
${tpl.recommendedFor?.length ? `- Recommended for categories: ${tpl.recommendedFor.join(", ")}` : ""}
Adapt the copy tone, length, and emotional register to this specific visual format.

`
    : "";

  const sorteoBlock = args.sorteoData
    ? `SORTEO / GIVEAWAY INFO (use this to craft the copy — do NOT invent prizes, collaborators or conditions):
- Premios: ${args.sorteoData.premios || "—"}
- Colaboradores: ${args.sorteoData.colaboradores || "—"}
- Condiciones: ${args.sorteoData.condiciones || "—"}

`
    : "";

  const referenceBlock = args.referenceStyle
    ? `\nREFERENCE CREATIVE STYLE (replicate this):\n${args.referenceStyle}\n`
    : "";

  const templateHintBlock = args.templateHint
    ? `TEMPLATE HINT:\n${args.templateHint}\n\n`
    : "";

  const backgroundStyleGuideBlock = args.backgroundStyleGuide
    ? `BACKGROUND STYLE GUIDE (mandatory reference for the backgroundPrompt field — keep this visual style, adapt colors/mood to the product):
${args.backgroundStyleGuide}

`
    : "";

  // Sample ONE random scene from the scenes library for this category (used by sceneAction & scenePrompt)
  const needsSceneExamples = (args.templateSchema.includes("sceneAction") || args.templateSchema.includes("scenePrompt")) && args.businessProfile?.category;
  const sceneExampleText = needsSceneExamples ? getSceneLibrarySection(args.businessProfile!.category!) : "";
  const sceneExamplesBlock = sceneExampleText
    ? `SCENE EXAMPLES FOR THIS CATEGORY — extract the photographic style, emotional tone, and person-product dynamic. Adapt the setting and mood to the specific product, do NOT copy the example literally. Use this as creative inspiration for sceneAction and/or scenePrompt fields:
${sceneExampleText}

`
    : "";

  console.log(JSON.stringify({
    tag: "[COPY_GEN:SCENE_LIBRARY]",
    timestamp: new Date().toISOString(),
    category: args.businessProfile?.category ?? "none",
    templateSchema: args.templateSchema,
    needsSceneExamples: !!needsSceneExamples,
    hasSceneAction: args.templateSchema.includes("sceneAction"),
    hasScenePrompt: args.templateSchema.includes("scenePrompt"),
    sceneExampleInjected: sceneExampleText.length > 0,
    sceneExampleChars: sceneExampleText.length,
    sceneExamplePreview: sceneExampleText.slice(0, 300),
    sceneBlockChars: sceneExamplesBlock.length,
  }, null, 2));

  const templateVisualDirectionBlock = (tpl?.defaultBackgroundPrompt || tpl?.defaultProductPrompt)
    ? `TEMPLATE VISUAL DIRECTION (STRUCTURAL FOUNDATION for scenePrompt, backgroundPrompt, and sceneAction — these are HARD CONSTRAINTS that define the visual layout and interaction rules):
${tpl.defaultBackgroundPrompt ? `- Background direction: ${tpl.defaultBackgroundPrompt}` : ""}
${tpl.defaultProductPrompt ? `- Product/person direction: ${tpl.defaultProductPrompt}` : ""}
This is the NON-NEGOTIABLE visual framework. When generating sceneAction or scenePrompt:
- The BACKGROUND DIRECTION defines the environment mood, color palette, and visual style. Your scene must live inside this world.
- The PRODUCT/PERSON DIRECTION defines how the person interacts with the product, their positioning, and what should or should NOT appear. Follow it exactly.
- Then BLEND IN the creative inspiration from the SCENE EXAMPLES (provided in the field rules) to add category-specific photographic style, emotional depth, and authentic human moments.
The final scene must feel like ONE cohesive creative vision — the template direction sets the rules, the scene examples add soul, and the product context makes it specific.

`
    : "";

  const prompt = `${GEMINI_COPYWRITER_SYSTEM_PROMPT}

You are an expert advertising copywriter specialized in direct response marketing in Spanish.

Generate copy for a visual advertising template. Output a JSON object with EXACTLY these fields: ${args.templateSchema.join(", ")}
CRITICAL: Do NOT add any field not listed above. The JSON must contain ONLY those keys.

${fieldRules}
${templateHintBlock}${templateContextBlock}${templateVisualDirectionBlock}${backgroundStyleGuideBlock}${sceneExamplesBlock}${brandContextBlock}${sorteoBlock}${referenceBlock}USER INFO:
- Product: ${args.product}
- Main offer: ${args.offer}
- Target audience: ${args.targetAudience}
- Problem it solves: ${args.problem}
- Tone: ${args.tone}

${variantInstructions}`;

  console.log(`[openrouter:generateTemplateCopyGemini] model=${OPENROUTER_TEXT_MODEL} schema=[${args.templateSchema.join(", ")}] prompt_chars=${prompt.length}`);
  const raw = await generateTextWithOpenRouter(
    [{ role: "user", content: prompt }],
    { callerName: "generateTemplateCopyGemini", maxTokens: 1000 }
  );

  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    console.log(`[openrouter:generateTemplateCopyGemini] response keys=[${Object.keys(n > 1 ? (parsed.variants?.[0] ?? parsed) : parsed).join(", ")}]`);

    console.log(JSON.stringify({
      tag: "[PIPELINE:TOKEN_SUMMARY]",
      caller: "generateTemplateCopyGemini",
      timestamp: new Date().toISOString(),
      model: OPENROUTER_TEXT_MODEL,
      estimatedInputTokens: Math.ceil(prompt.length / 4),
      responseChars: raw.length,
      estimatedOutputTokens: Math.ceil(raw.length / 4),
      estimatedTotalTokens: Math.ceil((prompt.length + raw.length) / 4),
      schemaFields: args.templateSchema,
      variants: n,
    }, null, 2));

    if (n > 1) {
      const variants = parsed.variants;
      if (!Array.isArray(variants)) throw new Error("Invalid JSON from OpenRouter: missing variants array");
      return variants as Record<string, unknown>[];
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON from OpenRouter: ${raw.slice(0, 300)}`);
  }
}

/**
 * Generates a visual image brief using Gemini Flash (text-only, fast).
 * Uses curated prompt libraries as few-shot examples so the output
 * matches the expected style and specificity for each template type.
 *
 * Template types:
 *   "product-only"   → product placed in background, no person
 *   "scene-only"     → person/lifestyle scene, no product visible
 *   "person-product" → person actively holding/using the product
 *
 * Returns a single prompt string ready to be passed to Gemini image generation.
 */
export async function generateImageBriefGemini(args: {
  product: string;
  productCategory: string;
  tone: string;
  briefType: ImageBriefType;
  copyZone?: string;
  businessProfile?: {
    nombre?: string;
    clienteIdeal?: string;
  };
}): Promise<string> {
  const library = getLibrarySection(args.briefType, args.productCategory);

  const productZone = resolvePlacementZone(args.copyZone ?? "left");
  const copyZone = args.copyZone ?? "left";

  const brandContext = args.businessProfile?.nombre || args.businessProfile?.clienteIdeal
    ? `Brand: ${args.businessProfile.nombre || ""}. Ideal client: ${args.businessProfile.clienteIdeal || ""}.`
    : "";

  const prompt = `You are a visual prompt engineer specializing in advertising photography direction for Gemini AI image generation.

Your task: generate ONE highly specific visual prompt for a "${args.briefType}" advertising image EDITING operation.

CRITICAL CONTEXT — THIS IS AN EDIT, NOT A NEW GENERATION:
Gemini will receive an EXISTING advertising image and must ADD the subject/product to it.
The canvas has two zones:
- PRODUCT ZONE (${productZone} side): where the subject/product must be placed.
- COPY ZONE (${copyZone} side): contains pre-rendered advertising text, headlines, badges, and graphic elements that are ALREADY in the image. This area is LOCKED. NEVER describe it as "clean", "empty", "clear", or "untouched" — those words may cause the model to erase content. Instead always write: "DO NOT modify or touch the ${copyZone} side."

CONTEXT:
- Product: ${args.product}
- Category: ${args.productCategory}
- Advertising tone: ${args.tone}
${brandContext}

REFERENCE EXAMPLES — follow this style and level of specificity exactly:
${library}

Instructions:
1. Find the example that best matches the category and tone above
2. Adapt it to the actual product — keep the same photographic detail and structure
3. Place the subject/product on the ${productZone} side
4. End the brief with these exact rules (adapt side names to match):
   "${productZone} side only. DO NOT modify or touch the ${copyZone} side — it contains pre-rendered advertising copy that must remain exactly as-is.
   ${ABSOLUTE_RULES_TEXT_PRESERVATION}
   ${ABSOLUTE_RULES_PRODUCT}
   ${ABSOLUTE_RULES_BACKGROUND}"
5. Output ONLY the prompt text — no labels, no explanation, no markdown`;

  console.log(`[openrouter:generateImageBriefGemini] model=${OPENROUTER_TEXT_MODEL} briefType=${args.briefType} category=${args.productCategory}`);

  const text = await generateTextWithOpenRouter(
    [{ role: "user", content: prompt }],
    { callerName: "generateImageBriefGemini", maxTokens: 400 }
  );
  if (!text) throw new Error("generateImageBriefGemini: empty response from OpenRouter");
  return text;
}

/**
 * Expands a short sceneAction (from OpenAI) into a full cinematic prompt.
 *
 * OpenAI generates diverse short scene descriptions per variant (e.g.
 * "Man in gym, defeated, head down on bench"). This function takes that
 * seed and expands it into a detailed, photographic-quality prompt using
 * the scene-only library as style reference.
 *
 * Called once per variant — each gets its own expanded prompt.
 */
export async function expandSceneBrief(args: {
  sceneAction: string;
  product: string;
  productCategory: string;
  tone: string;
  copyZone?: string;
  personOnly?: boolean;
  backgroundPrompt?: string;
  businessProfile?: {
    nombre?: string;
    clienteIdeal?: string;
  };
}): Promise<string> {
  const library = getLibrarySection("scene-only", args.productCategory);

  const brandContext = args.businessProfile?.nombre || args.businessProfile?.clienteIdeal
    ? `Brand: ${args.businessProfile.nombre || ""}. Ideal client: ${args.businessProfile.clienteIdeal || ""}.`
    : "";

  // personOnly: the background is pre-generated separately. The expanded prompt must describe
  // ONLY the person (appearance, pose, expression, clothing) — NOT the environment/setting,
  // because Gemini will receive the pre-generated background as Image 1 and must composite
  // the person INTO it without altering the background.
  const personOnlyInstructions = args.personOnly
    ? `
CRITICAL — PERSON-ONLY COMPOSITE MODE:
A dark cinematic background has ALREADY been generated separately${args.backgroundPrompt ? ` ("${args.backgroundPrompt}")` : ""}.
Gemini will receive that background as an image and must ADD the person to it.
Therefore your prompt must describe ONLY THE PERSON — do NOT describe any environment, room,
setting, furniture, surfaces, or background elements. The background is already done.
Focus exclusively on: the person's appearance, clothing, pose, body language, expression,
and how lighting falls on them (matching a dark cinematic scene).
DO NOT mention kitchens, bathrooms, living rooms, counters, mirrors, gyms, or any setting.
The person should look like they BELONG in a dark, moody, cinematic environment.`
    : "";

  const environmentInstruction = args.personOnly
    ? `   - Do NOT describe any environment, room, setting, or background — the background is pre-generated
   - Describe lighting ON THE PERSON only (matching dark cinematic mood)`
    : `   - Environment details: textures, props, depth of field, atmosphere`;

  const backgroundCoherenceBlock = args.backgroundPrompt && !args.personOnly
    ? `\nBACKGROUND ALREADY DEFINED — the background image has been generated separately with this description:
"${args.backgroundPrompt}"

Your expanded sceneAction MUST be visually coherent with that background:
- Match the same light temperature and direction (warm/cool/neutral)
- Match the same color palette and atmospheric mood
- The person will be COMPOSITED onto this background — they must feel like they belong in that environment
- Do NOT describe a different room or setting that contradicts the background
- You CAN add person-specific details (clothing, expression, product interaction) but the environmental feel must align\n`
    : "";

  const prompt = `You are a visual prompt engineer specializing in cinematic advertising photography direction.

Your task: expand a SHORT scene description into a FULL, hyper-detailed visual prompt for Gemini AI image generation.
${personOnlyInstructions}${backgroundCoherenceBlock}
SHORT SCENE DESCRIPTION (from the creative director):
"${args.sceneAction}"

CONTEXT:
- Product category: ${args.productCategory}
- Advertising tone: ${args.tone}
- Product: ${args.product}
${brandContext}

REFERENCE EXAMPLES — match this level of cinematic detail and specificity:
${library}

Instructions:
1. Take the short scene description above and EXPAND it into a rich, cinematic visual prompt
2. Keep the EXACT scenario, setting, and emotion from the short description — do NOT change the concept
3. Add these details that the short description is missing:
   - Exact person description: age range, clothing, body type, hair
   - Precise body language and micro-expressions
   - Specific lighting setup: key light source, direction, color temperature, shadows
${environmentInstruction}
   - Camera/framing: lens feel, depth, composition
4. The person fills the ENTIRE canvas edge-to-edge (full-bleed cinematic portrait)
5. Face should be positioned in the CENTER or CENTER-LOWER area of the canvas (NOT in the top 25%)
6. ANATOMY RULE: The person must have EXACTLY two arms and two hands — correct human anatomy is mandatory. Never describe extra limbs.
7. End with: "4K photorealistic. No text, no logos, no products."
8. Output ONLY the prompt text — no labels, no explanation, no markdown
9. Max 80 words — be dense and specific, not verbose`;

  console.log(`[openrouter:expandSceneBrief] model=${OPENROUTER_TEXT_MODEL} category=${args.productCategory} scene="${args.sceneAction.slice(0, 60)}..."`);

  const text = await generateTextWithOpenRouter(
    [{ role: "user", content: prompt }],
    { callerName: "expandSceneBrief", maxTokens: 300 }
  );
  if (!text) throw new Error("expandSceneBrief: empty response from OpenRouter");
  return text;
}
