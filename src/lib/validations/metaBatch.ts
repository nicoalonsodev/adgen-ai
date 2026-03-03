import { z } from "zod";

export const metaBatchSchema = z.object({
  product: z.string().min(2),
  offer: z.string().min(2),
  audience: z.string().min(2),
  brandStyle: z.string().optional(),
  basePrompt: z.string().optional(),
  aspectRatio: z
    .enum(["1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"])
    .default("4:5"),
  variants: z.number().min(1).max(30).optional(), // si no viene: todos
});

export type MetaBatchValidatedInput = z.infer<typeof metaBatchSchema>;
