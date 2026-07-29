import type { DiscountCode, Order, Product } from "@uniblox/shared";
import { seedProducts } from "./seed-products.js";

// Raw cart storage: product refs + quantities only. Prices are resolved from
// the catalog at read/checkout time so a cart never holds stale prices.
export interface CartItemRecord {
  productId: string;
  quantity: number;
}

/**
 * Single in-memory store behind all services (v1 runs without a database).
 * Holds state only — every business rule lives in the services layer.
 */
export class InMemoryStore {
  readonly products = new Map<string, Product>();
  private readonly carts = new Map<string, CartItemRecord[]>();
  readonly orders: Order[] = [];
  readonly discountCodes = new Map<string, DiscountCode>();

  constructor(products: Product[] = seedProducts) {
    for (const product of products) {
      this.products.set(product.id, product);
    }
  }

  getCart(userId: string): CartItemRecord[] {
    return this.carts.get(userId) ?? [];
  }

  setCart(userId: string, items: CartItemRecord[]): void {
    this.carts.set(userId, items);
  }

  clearCart(userId: string): void {
    this.carts.delete(userId);
  }

  /** Global 1-based order sequence — drives nth-order eligibility (rule R1). */
  get nextOrderNumber(): number {
    return this.orders.length + 1;
  }
}
