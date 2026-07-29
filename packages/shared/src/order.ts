import { z } from "zod";
import { CartLineSchema } from "./cart.js";

export const CheckoutRequestSchema = z.object({
  discountCode: z.string().min(1).optional(),
});

export const OrderSchema = z.object({
  id: z.string().min(1),
  // Global 1-based sequence across the store; drives nth-order eligibility (rule R1).
  orderNumber: z.number().int().positive(),
  userId: z.string().min(1),
  items: z.array(CartLineSchema).nonempty(),
  subtotalCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  discountCode: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const CheckoutResponseSchema = z.object({
  order: OrderSchema,
  // True when this order completed an eligibility window — lets the UI
  // surface "a discount code can now be generated".
  unlockedDiscountEligibility: z.boolean(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
