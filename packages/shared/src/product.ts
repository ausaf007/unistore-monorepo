import { z } from "zod";

// All monetary values across the app are integer cents (see DECISIONS.md).
export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  priceCents: z.number().int().nonnegative(),
});

export type Product = z.infer<typeof ProductSchema>;
