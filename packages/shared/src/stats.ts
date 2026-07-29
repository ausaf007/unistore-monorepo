import { z } from "zod";
import { DiscountCodeSchema } from "./discount.js";

export const StatsSchema = z.object({
  itemsPurchasedCount: z.number().int().nonnegative(),
  totalRevenueCents: z.number().int().nonnegative(),
  discountCodes: z.array(DiscountCodeSchema),
  totalDiscountGivenCents: z.number().int().nonnegative(),
});

export type Stats = z.infer<typeof StatsSchema>;
