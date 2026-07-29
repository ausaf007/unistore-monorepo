import { z } from "zod";

// Uniform error envelope returned by every non-2xx API response.
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "VALIDATION_ERROR",
      "PRODUCT_NOT_FOUND",
      "EMPTY_CART",
      "INVALID_DISCOUNT_CODE",
      "DISCOUNT_NOT_ELIGIBLE",
      "NOT_FOUND",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorCode = ApiError["error"]["code"];
