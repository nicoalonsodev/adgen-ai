import { z } from "zod";

export const imageGenerateSchema = z.object({
  prompt: z.string().min(5, "prompt demasiado corto"),
  aspectRatio: z
    .enum(["1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"])
    .default("1:1"),
});

export type ImageGenerateValidatedInput = z.infer<typeof imageGenerateSchema>;
