import { z } from "zod";

export const createShowInputSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  posterUrl: z.string().min(1),
  presetId: z.enum(["small", "medium", "large"]),
  sessions: z.array(z.string().min(1)).min(1).max(10),
});

export type CreateShowInput = z.infer<typeof createShowInputSchema>;
