import { beforeEach, describe, expect, it } from "vitest";
import type { Product } from "@uniblox/shared";
import type { AppConfig } from "../config.js";
import { InMemoryStore } from "../store/store.js";
import { CartService } from "./cart.service.js";
import { CheckoutService } from "./checkout.service.js";
import { DiscountService } from "./discount.service.js";
import { StatsService } from "./stats.service.js";

const catalog: Product[] = [
  { id: "p1", name: "Widget", description: "", priceCents: 1000 },
  { id: "p2", name: "Gadget", description: "", priceCents: 2000 },
];

const config: AppConfig = { discountN: 2, discountPercentOff: 10 };

describe("StatsService (n=2, x=10)", () => {
  let store: InMemoryStore;
  let carts: CartService;
  let discounts: DiscountService;
  let checkout: CheckoutService;
  let service: StatsService;

  beforeEach(() => {
    store = new InMemoryStore(catalog);
    carts = new CartService(store);
    discounts = new DiscountService(store, config);
    checkout = new CheckoutService(store, carts, discounts, config);
    service = new StatsService(store);
  });

  it("returns all-zero stats for a fresh store", () => {
    expect(service.getStats()).toEqual({
      itemsPurchasedCount: 0,
      totalRevenueCents: 0,
      discountCodes: [],
      totalDiscountGivenCents: 0,
    });
  });

  it("aggregates a scripted sequence of orders with and without discounts", () => {
    // Order 1: 2× p1 (2000), no discount.
    carts.addItem("u1", "p1", 2);
    checkout.checkout("u1");
    // Order 2: 1× p2 (2000), no discount → completes window 1 (n=2).
    carts.addItem("u2", "p2", 1);
    checkout.checkout("u2");

    const { code } = discounts.generateCode();

    // Order 3: 1× p1 + 1× p2 (3000), 10% off → 300 discount, 2700 paid.
    carts.addItem("u1", "p1", 1);
    carts.addItem("u1", "p2", 1);
    checkout.checkout("u1", code);

    const stats = service.getStats();
    expect(stats.itemsPurchasedCount).toBe(5); // 2 + 1 + 2
    expect(stats.totalRevenueCents).toBe(2000 + 2000 + 2700);
    expect(stats.totalDiscountGivenCents).toBe(300);
    expect(stats.discountCodes).toHaveLength(1);
    expect(stats.discountCodes[0]).toMatchObject({
      code,
      status: "used",
      usedOnOrderId: "ord-3",
    });
  });

  it("lists generated-but-unused codes with zero discount given", () => {
    carts.addItem("u1", "p1", 1);
    checkout.checkout("u1");
    carts.addItem("u1", "p1", 1);
    checkout.checkout("u1");
    discounts.generateCode();

    const stats = service.getStats();
    expect(stats.discountCodes[0]?.status).toBe("active");
    expect(stats.totalDiscountGivenCents).toBe(0);
    expect(stats.totalRevenueCents).toBe(2000);
  });
});
