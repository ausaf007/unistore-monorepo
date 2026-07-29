import type { Cart } from "@uniblox/shared";
import { AppError } from "../errors.js";
import type { InMemoryStore } from "../store/store.js";

export class CartService {
  constructor(private readonly store: InMemoryStore) {}

  /**
   * Adds a product to the user's cart; adding the same product again merges
   * into the existing line's quantity (no duplicate lines per product).
   */
  addItem(userId: string, productId: string, quantity: number): Cart {
    if (!this.store.products.has(productId)) {
      throw new AppError(
        400,
        "PRODUCT_NOT_FOUND",
        `Unknown product: ${productId}`,
      );
    }

    const items = this.store.getCart(userId).map((item) => ({ ...item }));
    const existing = items.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ productId, quantity });
    }
    this.store.setCart(userId, items);

    return this.getCart(userId);
  }

  /** Cart priced against the current catalog — carts never store prices. */
  getCart(userId: string): Cart {
    const items = this.store.getCart(userId).map(({ productId, quantity }) => {
      const product = this.store.products.get(productId);
      if (!product) {
        // Unreachable while the catalog is static; guards a future where
        // products can be removed while sitting in someone's cart.
        throw new AppError(
          500,
          "INTERNAL_ERROR",
          `Cart references missing product: ${productId}`,
        );
      }
      return {
        product,
        quantity,
        lineTotalCents: product.priceCents * quantity,
      };
    });

    return {
      userId,
      items,
      subtotalCents: items.reduce((sum, line) => sum + line.lineTotalCents, 0),
    };
  }
}
