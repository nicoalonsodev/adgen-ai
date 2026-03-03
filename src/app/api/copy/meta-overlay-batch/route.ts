import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Modelo recomendado para copy estructurado
const MODEL = "gpt-4.1-mini";

type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

type Rules = {
  language?: "es" | "en"; // default: es
  uppercaseHeadline?: boolean; // default: true
  noEmojis?: boolean; // default: true
  noNewlines?: boolean; // default: true

  headlineMaxChars?: number; // default: 42
  subheadlineMaxChars?: number; // default: 64
  ctaMaxChars?: number; // default: 18
  disclaimerMaxChars?: number; // default: 90

  // extra blacklist (además de compliance.forbiddenClaims)
  forbiddenPhrases?: string[];

  // set de caracteres permitidos (para evitar unicode raro)
  allowedCharsRegex?: string; // default: "^[A-ZÁÉÍÓÚÜÑa-záéíóúüñ0-9 .,¡!¿?%()\\-+/]+$"
};

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function ratioHint(aspectRatio: AspectRatio) {
  switch (aspectRatio) {
    case "9:16":
      return "vertical 9:16 (Stories/Reels)";
    case "4:5":
      return "vertical 4:5 (Meta Feed)";
    case "1:1":
      return "square 1:1";
    case "16:9":
      return "horizontal 16:9";
    default:
      return "vertical 4:5";
  }
}

function normalizeSpaces(s: string) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function hasEmoji(s: string) {
  return /[\u{1F300}-\u{1FAFF}]/u.test(s);
}

function hasNewlines(s: string) {
  return /[\r\n]/.test(s);
}

function isUppercaseMostly(s: string) {
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (!letters) return true;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "").length;
  return upper / letters.length >= 0.85;
}

function validateTextField(
  label: string,
  value: string,
  maxChars: number,
  rules: Required<Rules>,
  forbiddenAll: string[]
) {
  const errors: string[] = [];
  const v = normalizeSpaces(value);

  if (!v) errors.push(`${label}: vacío`);
  if (v.length > maxChars) errors.push(`${label}: excede ${maxChars} caracteres (tiene ${v.length})`);

  if (rules.noNewlines && hasNewlines(value)) errors.push(`${label}: contiene saltos de línea`);
  if (rules.noEmojis && hasEmoji(v)) errors.push(`${label}: contiene emojis`);

  const allowed = new RegExp(rules.allowedCharsRegex);
  if (!allowed.test(v)) errors.push(`${label}: contiene caracteres no permitidos`);

  if (/\s{2,}/.test(v)) errors.push(`${label}: contiene múltiples espacios seguidos`);

  for (const phrase of forbiddenAll) {
    const p = String(phrase ?? "").trim();
    if (!p) continue;
    if (v.toLowerCase().includes(p.toLowerCase())) {
      errors.push(`${label}: contiene frase prohibida "${p}"`);
    }
  }

  return { value: v, errors };
}

function validateVariant(variant: any, rules: Required<Rules>, forbiddenAll: string[]) {
  const errs: string[] = [];

  const headlineCheck = validateTextField(
    "headline",
    String(variant?.headline ?? ""),
    rules.headlineMaxChars,
    rules,
    forbiddenAll
  );

  const subheadlineCheck = validateTextField(
    "subheadline",
    String(variant?.subheadline ?? ""),
    rules.subheadlineMaxChars,
    rules,
    forbiddenAll
  );

  const ctaCheck = validateTextField(
    "cta",
    String(variant?.cta ?? ""),
    rules.ctaMaxChars,
    rules,
    forbiddenAll
  );

  const disclaimerRaw = String(variant?.disclaimer ?? "");
  const disclaimerNorm = normalizeSpaces(disclaimerRaw);
  if (disclaimerNorm) {
    const discCheck = validateTextField(
      "disclaimer",
      disclaimerNorm,
      rules.disclaimerMaxChars,
      rules,
      forbiddenAll
    );
    errs.push(...discCheck.errors);
  }

  errs.push(...headlineCheck.errors, ...subheadlineCheck.errors, ...ctaCheck.errors);

  if (rules.uppercaseHeadline && !isUppercaseMostly(headlineCheck.value)) {
    errs.push(`headline: debería estar mayormente en MAYÚSCULAS (estilo creativo)`);
  }

  const normalized = {
    ...variant,
    headline: headlineCheck.value,
    subheadline: subheadlineCheck.value,
    cta: ctaCheck.value,
    disclaimer: disclaimerNorm || null,
  };

  return { ok: errs.length === 0, errors: errs, normalized };
}

function buildSystemInstruction(lang: "es" | "en") {
  if (lang === "en") {
    return `
You are a senior performance copywriter for Meta Ads.
Generate short overlay copy (the text will be rendered by code, not inside the image).

RULES:
- Do not invent business facts. Use the given profile.
- Output ONLY valid JSON that matches the schema.
- No emojis. No newlines.
- Avoid dangerous claims and absolute promises.
`.trim();
  }

  return `
Eres un redactor senior de performance para anuncios Meta.
Generas copy de overlay (el texto se renderiza por código, NO dentro de la imagen).

REGLAS:
- No inventes datos del negocio. Usa el perfil provisto.
- Devuelve SOLO JSON válido que cumpla el schema.
- Sin emojis. Sin saltos de línea.
- Evita claims peligrosos y promesas absolutas.
`.trim();
}

function buildUserInstruction(args: {
  profile: any;
  aspectRatio: AspectRatio;
  variants: number;
  angleIds?: string[];
  finalBrief?: string;
  rules: Required<Rules>;
}) {
  const { profile, aspectRatio, variants, angleIds, finalBrief, rules } = args;

  const businessName = profile?.identity?.name ?? "la marca";
  const offerName = profile?.offer?.name ?? "la oferta";
  const promo = profile?.offer?.promo ?? null;

  const audienceDesc = profile?.audience?.description ?? "";
  const pains = (profile?.audience?.pains ?? []).slice(0, 6);
  const desires = (profile?.audience?.desires ?? []).slice(0, 6);

  const tone = profile?.voice?.tone ?? "professional";
  const adjectives = (profile?.voice?.adjectives ?? []).slice(0, 6);

  const differentiators = (profile?.positioning?.differentiators ?? []).slice(0, 6);
  const forbiddenClaims = (profile?.compliance?.forbiddenClaims ?? []).slice(0, 10);

  const allAngles: any[] = Array.isArray(profile?.angles) ? profile.angles : [];
  const selectedAngles = angleIds?.length
    ? allAngles.filter((a) => angleIds.includes(String(a?.id ?? "")))
    : allAngles;

  const anglesForPrompt = selectedAngles.slice(0, Math.max(1, Math.min(variants, selectedAngles.length)));

  const anglesBlock = anglesForPrompt
    .map((a, idx) => {
      const id = String(a?.id ?? `angle_${idx + 1}`);
      const label = String(a?.label ?? id);
      const keyMessage = String(a?.keyMessage ?? "");
      const hooks = (a?.hooks ?? []).slice(0, 6).join(" | ");
      return `- angleId: ${id}\n  label: ${label}\n  keyMessage: ${keyMessage}\n  hooks: ${hooks}`;
    })
    .join("\n");

  return `
CONTEXTO:
Marca/Negocio: ${businessName}
Oferta: ${offerName}${promo ? ` (Promo: ${promo})` : ""}
Público: ${audienceDesc}
Dolores: ${pains.join(" | ")}
Deseos: ${desires.join(" | ")}
Diferenciales: ${differentiators.join(" | ")}
Tono: ${tone}
Adjetivos: ${adjectives.join(" | ")}
Formato: ${ratioHint(aspectRatio)}

ÁNGULOS DISPONIBLES (usar estos):
${anglesBlock}

OBJETIVO:
Generar ${variants} variantes de copy para OVERLAY (headline grande + subheadline + CTA).
Cada variante debe mapear a un angleId existente.

ESTILO (como creativos de alto performance):
- Headline MUY corto y potente (ideal 3–7 palabras).
- Subheadline aclara beneficio o mecanismo sin humo.
- CTA con verbo claro (ej: EMPEZÁ HOY / DESCARGÁ / MIRÁ CÓMO).

RESTRICCIONES DURAS:
- Idioma: ${rules.language}
- headline <= ${rules.headlineMaxChars} chars
- subheadline <= ${rules.subheadlineMaxChars} chars
- cta <= ${rules.ctaMaxChars} chars
- disclaimer <= ${rules.disclaimerMaxChars} chars (si se usa)
- Headline mayormente en MAYÚSCULAS: ${rules.uppercaseHeadline ? "SI" : "NO"}
- Sin emojis, sin saltos de línea
- No usar claims prohibidos: ${forbiddenClaims.join(" | ") || "garantizado | cura | resultados asegurados"}
- Blacklist extra: ${(rules.forbiddenPhrases?.length ? rules.forbiddenPhrases : ["(ninguna)"]).join(" | ")}
- Caracteres permitidos regex: ${rules.allowedCharsRegex}

${finalBrief ? `BRIEF FINAL DEL USUARIO:\n${finalBrief}\n` : ""}

Devuelve SOLO JSON válido según el schema.
`.trim();
}

/**
 * Schema de salida (Structured Outputs)
 * IMPORTANTE: required completo y additionalProperties=false (como tu ingest)
 */
const META_OVERLAY_COPY_SCHEMA = {
  name: "meta_overlay_copy_v1_0",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      version: { type: "string", enum: ["1.0"] },
      items: {
        type: "array",
        minItems: 1,
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            angleId: { type: "string" },
            angleLabel: { type: ["string", "null"] },

            headline: { type: "string" },
            subheadline: { type: "string" },
            cta: { type: "string" },

            disclaimer: { type: ["string", "null"] },

            // opcional, te sirve para analytics/UX
            tags: { type: ["array", "null"], items: { type: "string" } },
          },
          required: ["id", "angleId", "angleLabel", "headline", "subheadline", "cta", "disclaimer", "tags"],
        },
      },
      updatedAtISO: { type: "string" },
    },
    required: ["version", "items", "updatedAtISO"],
  },
};

async function generateBatch(args: {
  profile: any;
  aspectRatio: AspectRatio;
  variants: number;
  angleIds?: string[];
  finalBrief?: string;
  rules: Required<Rules>;
}) {
  const response = await client.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: buildSystemInstruction(args.rules.language) },
      {
        role: "user",
        content: buildUserInstruction(args),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: META_OVERLAY_COPY_SCHEMA.name,
        schema: META_OVERLAY_COPY_SCHEMA.schema,
      },
    },
  });

  const outputText = (response as any).output_text;
  if (!outputText) throw new Error("No output returned.");
  return JSON.parse(outputText);
}

/**
 * Repara UNA variante específica (JSON estricto)
 */
const META_OVERLAY_VARIANT_SCHEMA = {
  name: "meta_overlay_copy_variant_v1_0",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      angleId: { type: "string" },
      angleLabel: { type: ["string", "null"] },

      headline: { type: "string" },
      subheadline: { type: "string" },
      cta: { type: "string" },

      disclaimer: { type: ["string", "null"] },
      tags: { type: ["array", "null"], items: { type: "string" } },
    },
    required: ["id", "angleId", "angleLabel", "headline", "subheadline", "cta", "disclaimer", "tags"],
  },
};

function buildRepairPrompt(args: {
  badVariant: any;
  errors: string[];
  rules: Required<Rules>;
}) {
  const { badVariant, errors, rules } = args;

  return `
Corregí esta variante para cumplir reglas duras.
NO agregues campos nuevos. NO cambies angleId.
Corregí SOLO lo necesario.

Errores:
- ${errors.join("\n- ")}

Reglas:
- Idioma: ${rules.language}
- Sin emojis, sin saltos de línea
- Headline <= ${rules.headlineMaxChars}, Subheadline <= ${rules.subheadlineMaxChars}, CTA <= ${rules.ctaMaxChars}
- Headline mayormente en MAYÚSCULAS: ${rules.uppercaseHeadline ? "SI" : "NO"}
- Caracteres permitidos regex: ${rules.allowedCharsRegex}

Variante actual (JSON):
${JSON.stringify(badVariant, null, 2)}

Devuelve SOLO JSON válido.
`.trim();
}

async function repairOneVariant(badVariant: any, errors: string[], rules: Required<Rules>) {
  const response = await client.responses.create({
    model: MODEL,
    input: [
      {
        role: "system",
        content:
          rules.language === "en"
            ? "You fix ad overlay copy to comply with constraints. Output ONLY valid JSON."
            : "Reparás copy de overlay para anuncios cumpliendo restricciones. Devuelve SOLO JSON válido.",
      },
      { role: "user", content: buildRepairPrompt({ badVariant, errors, rules }) },
    ],
    text: {
      format: {
        type: "json_schema",
        name: META_OVERLAY_VARIANT_SCHEMA.name,
        schema: META_OVERLAY_VARIANT_SCHEMA.schema,
      },
    },
  });

  const outputText = (response as any).output_text;
  if (!outputText) throw new Error("No output returned.");
  return JSON.parse(outputText);
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Expected JSON body" }, { status: 400 });
    }

    const profile = body?.profile;
    if (!profile) {
      return NextResponse.json({ ok: false, error: "profile is required" }, { status: 400 });
    }

    const variants = clampInt(body?.variants ?? 12, 1, 30, 12);
    const aspectRatio = (body?.aspectRatio ?? "4:5") as AspectRatio;
    const finalBrief = typeof body?.finalBrief === "string" ? body.finalBrief : undefined;
    const angleIds = Array.isArray(body?.angleIds) ? body.angleIds.map(String) : undefined;

    // Defaults de reglas (duros)
    const rules: Required<Rules> = {
      language: (body?.rules?.language ?? "es") as "es" | "en",
      uppercaseHeadline: body?.rules?.uppercaseHeadline ?? true,
      noEmojis: body?.rules?.noEmojis ?? true,
      noNewlines: body?.rules?.noNewlines ?? true,

      headlineMaxChars: clampInt(body?.rules?.headlineMaxChars ?? 42, 20, 80, 42),
      subheadlineMaxChars: clampInt(body?.rules?.subheadlineMaxChars ?? 64, 30, 140, 64),
      ctaMaxChars: clampInt(body?.rules?.ctaMaxChars ?? 18, 8, 40, 18),
      disclaimerMaxChars: clampInt(body?.rules?.disclaimerMaxChars ?? 90, 40, 180, 90),

      forbiddenPhrases: Array.isArray(body?.rules?.forbiddenPhrases)
        ? body.rules.forbiddenPhrases.map((x: any) => String(x))
        : [],

      allowedCharsRegex:
        typeof body?.rules?.allowedCharsRegex === "string"
          ? body.rules.allowedCharsRegex
          : "^[A-ZÁÉÍÓÚÜÑa-záéíóúüñ0-9 .,¡!¿?%()\\-+/]+$",
    };

    const angles: any[] = Array.isArray(profile?.angles) ? profile.angles : [];
    if (!angles.length) {
      return NextResponse.json({ ok: false, error: "profile.angles is empty. Run ingest first." }, { status: 400 });
    }

    const forbiddenFromProfile = (profile?.compliance?.forbiddenClaims ?? []).map((x: any) => String(x));
    const forbiddenAll = [...forbiddenFromProfile, ...(rules.forbiddenPhrases ?? [])].filter(Boolean);

    // 1) Generación inicial
    let batch = await generateBatch({ profile, aspectRatio, variants, angleIds, finalBrief, rules });

    // 2) Validación + repair (hasta 4 rondas)
    const maxRounds = 4;
    for (let round = 0; round < maxRounds; round++) {
      const items: any[] = Array.isArray(batch?.items) ? batch.items : [];
      if (!items.length) break;

      let allOk = true;
      const nextItems: any[] = [];

      for (let i = 0; i < items.length; i++) {
        const v = items[i];
        const check = validateVariant(v, rules, forbiddenAll);

        if (check.ok) {
          nextItems.push(check.normalized);
          continue;
        }

        allOk = false;

        // Reparar esta variante
        try {
          const fixed = await repairOneVariant(v, check.errors, rules);
          const fixedCheck = validateVariant(fixed, rules, forbiddenAll);
          nextItems.push(fixedCheck.ok ? fixedCheck.normalized : check.normalized);
        } catch {
          nextItems.push(check.normalized); // fallback
        }
      }

      batch.items = nextItems;
      if (allOk) break;
    }

    // 3) Completar IDs determinísticamente si faltan
    const usableAngles = angleIds?.length
      ? angles.filter((a) => angleIds.includes(String(a?.id ?? "")))
      : angles;

    batch.items = (batch.items ?? []).map((v: any, idx: number) => {
      const fallbackAngle = usableAngles[idx % usableAngles.length];
      const angleId = String(v?.angleId ?? fallbackAngle?.id ?? `angle_${idx + 1}`);
      const angleLabel = v?.angleLabel ?? fallbackAngle?.label ?? null;
      const id = String(v?.id ?? `${angleId}_${idx + 1}`);
      return { ...v, id, angleId, angleLabel };
    });

    batch.version = "1.0";
    batch.updatedAtISO = new Date().toISOString();

    return NextResponse.json({ ok: true, ...batch }, { status: 200 });
  } catch (err: any) {
    console.error("meta-overlay-batch error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
