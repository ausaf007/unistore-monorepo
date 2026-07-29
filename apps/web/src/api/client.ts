import type {
  AddCartItemRequest,
  ApiError,
  ApiErrorCode,
  Cart,
  CheckoutRequest,
  CheckoutResponse,
  GenerateDiscountCodeResponse,
  Product,
  Stats,
} from "@uniblox/shared";
import { getUserId } from "./user-id.js";

/** Carries the API's structured error envelope into the UI layer. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-user-id": getUserId(),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      response.status,
      body?.error.code ?? "INTERNAL_ERROR",
      body?.error.message ?? `Request failed with status ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

// One typed function per endpoint — request/response types come straight
// from @uniblox/shared, so the client cannot drift from the API.
export const api = {
  getProducts: () => apiFetch<Product[]>("/api/products"),

  getCart: () => apiFetch<Cart>("/api/cart"),

  addToCart: (body: AddCartItemRequest) =>
    apiFetch<Cart>("/api/cart/items", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  checkout: (body: CheckoutRequest) =>
    apiFetch<CheckoutResponse>("/api/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  generateDiscountCode: () =>
    apiFetch<GenerateDiscountCodeResponse>("/api/admin/discount-codes", {
      method: "POST",
    }),

  getStats: () => apiFetch<Stats>("/api/admin/stats"),
};

/** Formats integer cents for display, e.g. 1299 → "$12.99". */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
