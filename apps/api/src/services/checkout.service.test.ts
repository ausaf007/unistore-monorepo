import { beforeEach, describe, expect, it } from "vitest";
import type { Product } from "@uniblox/shared";
import type { AppConfig } from "../config.js";
import { AppError } from "../errors.js";
import { InMemoryStore } from "../store/store.js";
import { CartService } from "./cart.service.js";
import { CheckoutService } from "./checkout.service.js";
import { DiscountService } from "./discount.service.js";

const catalog: Product[] = [
  { id: "p1", name: "Widget", description: "", priceCents: 1000 },
  // 555 → 10% is 55.5 cents: exercises rounding on the discount (rule R6).
  { id: "p2", name: "Oddly Priced", description: "", priceCents: 555 },
];

const config: AppConfig = { discountN: 3, discountPercentOff: 10 };

describe("CheckoutService (n=3, x=10)", () => {
  let store: InMemoryStore;
  let carts: CartService;
  let discounts: DiscountService;
  let service: CheckoutService;

  beforeEach(() => {
    store = new InMemoryStore(catalog);
    carts = new CartService(store);
    discounts = new DiscountService(store, config);
    service = new CheckoutService(store, carts, discounts, config);
  });

  function checkoutOrders(count: number): void {
    for (let i = 0; i < count; i++) {
      carts.addItem("filler", "p1", 1);
      service.checkout("filler");
    }
  }

  it("rejects an empty cart without creating an order", () => {
    expect(() => service.checkout("u1")).toThrowError(AppError);
    expect(store.orders).toHaveLength(0);
  });

  it("places an order without a discount and clears the cart", () => {
    carts.addItem("u1", "p1", 2);
    const { order } = service.checkout("u1");

    expect(order.orderNumber).toBe(1);
    expect(order.subtotalCents).toBe(2000);
    expect(order.discountCents).toBe(0);
    expect(order.totalCents).toBe(2000);
    expect(order.discountCode).toBeNull();
    expect(store.orders).toHaveLength(1);
    expect(carts.getCart("u1").items).toHaveLength(0);
  });

  it("increments the global order number across users", () => {
    carts.addItem("u1", "p1", 1);
    carts.addItem("u2", "p1", 1);
    expect(service.checkout("u1").order.orderNumber).toBe(1);
    expect(service.checkout("u2").order.orderNumber).toBe(2);
  });

  it("applies a valid discount code and consumes it", () => {
    checkoutOrders(3);
    const { code } = discounts.generateCode();

    carts.addItem("u1", "p1", 3); // subtotal 3000
    const { order } = service.checkout("u1", code);

    expect(order.discountCents).toBe(300);
    expect(order.totalCents).toBe(2700);
    expect(order.discountCode).toBe(code);

    const stored = store.discountCodes.get(code);
    expect(stored?.status).toBe("used");
    expect(stored?.usedOnOrderId).toBe(order.id);
  });

  it("rounds the discount to the nearest cent", () => {
    checkoutOrders(3);
    const { code } = discounts.generateCode();

    carts.addItem("u1", "p2", 1); // subtotal 555 → 10% = 55.5 → 56
    const { order } = service.checkout("u1", code);

    expect(order.discountCents).toBe(56);
    expect(order.totalCents).toBe(499);
  });

  it("rejects a used code and leaves cart and order log untouched", () => {
    checkoutOrders(3);
    const { code } = discounts.generateCode();
    carts.addItem("u1", "p1", 1);
    service.checkout("u1", code); // consumes the code (order #4)

    carts.addItem("u2", "p1", 2);
    expect(() => service.checkout("u2", code)).toThrowError(AppError);
    expect(store.orders).toHaveLength(4);
    expect(carts.getCart("u2").items).toHaveLength(1);
  });

  it("rejects an unknown code without placing the order", () => {
    carts.addItem("u1", "p1", 1);
    try {
      service.checkout("u1", "SAVE10-NOPE22");
      expect.unreachable("expected checkout to throw");
    } catch (err) {
      expect((err as AppError).code).toBe("INVALID_DISCOUNT_CODE");
    }
    expect(store.orders).toHaveLength(0);
    expect(carts.getCart("u1").items).toHaveLength(1);
  });

  it("flags discount eligibility exactly on every nth order", () => {
    const flags: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      carts.addItem("u1", "p1", 1);
      flags.push(service.checkout("u1").unlockedDiscountEligibility);
    }
    // Orders 1..7 with n=3 → eligibility unlocked on orders 3 and 6.
    expect(flags).toEqual([false, false, true, false, false, true, false]);
  });
});
