import { z } from "zod";

// Codes are store-wide and single-use: any customer may redeem an active
// code, and redemption consumes it (rules R4/R5 in v1-build-plan.md).
export const DiscountCodeSchema = z.object({
  code: z.string().min(1),
  percentOff: z.number().int().min(1).max(100),
  status: z.enum(["active", "used"]),
  // The nth order that unlocked this code's eligibility window.
  eligibleAtOrderNumber: z.number().int().positive(),
  usedOnOrderId: z.string().nullable(),
});

export const GenerateDiscountCodeResponseSchema = z.object({
  discountCode: DiscountCodeSchema,
});

export type DiscountCode = z.infer<typeof DiscountCodeSchema>;
export type GenerateDiscountCodeResponse = z.infer<
  typeof GenerateDiscountCodeResponseSchema
>;
