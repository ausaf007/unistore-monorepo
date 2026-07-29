import type { CheckoutResponse, DiscountCode, Order } from "@uniblox/shared";
import type { AppConfig } from "../config.js";
import { AppError } from "../errors.js";
import type { InMemoryStore } from "../store/store.js";
import type { CartService } from "./cart.service.js";
import type { DiscountService } from "./discount.service.js";

export class CheckoutService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly cartService: CartService,
    private readonly discountService: DiscountService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Places an order from the user's cart. The discount code (if given) is
   * validated BEFORE any state changes — an invalid code rejects the whole
   * checkout and leaves the cart and order log untouched.
   */
  checkout(userId: string, code?: string): CheckoutResponse {
    const cart = this.cartService.getCart(userId);
    const [firstItem, ...restItems] = cart.items;
    if (!firstItem) {
      throw new AppError(400, "EMPTY_CART", "Cannot checkout an empty cart.");
    }

    let discount: DiscountCode | null = null;
    if (code !== undefined) {
      discount = this.discountService.validateActive(code);
    }

    // Integer-cents math (rule R6); Math.round on the single percentage
    // application keeps the total exact to the cent.
    const discountCents = discount
      ? Math.round((cart.subtotalCents * discount.percentOff) / 100)
      : 0;

    const orderNumber = this.store.nextOrderNumber;
    const order: Order = {
      id: `ord-${orderNumber}`,
      orderNumber,
      userId,
      items: [firstItem, ...restItems],
      subtotalCents: cart.subtotalCents,
      discountCents,
      totalCents: cart.subtotalCents - discountCents,
      discountCode: discount?.code ?? null,
      createdAt: new Date().toISOString(),
    };

    this.store.orders.push(order);
    if (discount) {
      this.discountService.markUsed(discount.code, order.id);
    }
    this.store.clearCart(userId);

    return {
      order,
      // This order completed a window iff it is a multiple of n (rule R3).
      unlockedDiscountEligibility: orderNumber % this.config.discountN === 0,
    };
  }
}
