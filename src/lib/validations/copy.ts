import { z } from "zod";

export const copyGenerationSchema = z
  .object({
    business: z.string().min(2),
    offer: z.string().min(5),
    avatar: z.string().min(5),
    objective: z.enum([
      "awareness",
      "leads",
      "sales",
      "traffic",
      "retention",
    ]),
    benefits: z.array(z.string()).min(1),
    pains: z.array(z.string()).min(1),
    objections: z.array(z.string()).default([]),
    brandTone: z.enum([
      "formal",
      "informal",
      "humorous",
      "serious",
      "direct",
      "friendly",
      "premium",
      "custom",
    ]),
    brandToneCustom: z.string().optional(),
    language: z.enum(["es", "en"]).default("es"),
    platform: z
      .enum(["meta", "google", "tiktok", "linkedin", "other"])
      .default("meta"),
    variants: z.number().min(1).max(50).default(10),
  })
  .refine(
    (data) =>
      data.brandTone !== "custom" ||
      Boolean(data.brandToneCustom?.length),
    {
      message: "brandToneCustom is required when brandTone is 'custom'",
      path: ["brandToneCustom"],
    }
  );

export type CopyGenerationValidatedInput = z.infer<
  typeof copyGenerationSchema
>;
