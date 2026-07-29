import { z } from "zod";
import { ProductSchema } from "./product.js";

export const AddCartItemRequestSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100).default(1),
});

export const CartLineSchema = z.object({
  product: ProductSchema,
  quantity: z.number().int().positive(),
  lineTotalCents: z.number().int().nonnegative(),
});

export const CartSchema = z.object({
  userId: z.string().min(1),
  items: z.array(CartLineSchema),
  subtotalCents: z.number().int().nonnegative(),
});

export type AddCartItemRequest = z.infer<typeof AddCartItemRequestSchema>;
export type CartLine = z.infer<typeof CartLineSchema>;
export type Cart = z.infer<typeof CartSchema>;
