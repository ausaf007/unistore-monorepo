import { beforeEach, describe, expect, it } from "vitest";
import type { Order, Product } from "@uniblox/shared";
import type { AppConfig } from "../config.js";
import { AppError } from "../errors.js";
import { InMemoryStore } from "../store/store.js";
import { DiscountService } from "./discount.service.js";

const catalog: Product[] = [
  { id: "p1", name: "Widget", description: "", priceCents: 1000 },
];

const config: AppConfig = { discountN: 3, discountPercentOff: 10 };

// Pushes minimal valid orders straight into the store — discount eligibility
// only depends on order COUNT, so tests stay independent of CheckoutService.
function pushOrders(store: InMemoryStore, count: number): void {
  for (let i = 0; i < count; i++) {
    const orderNumber = store.nextOrderNumber;
    const order: Order = {
      id: `ord-${orderNumber}`,
      orderNumber,
      userId: "u1",
      items: [
        { product: catalog[0]!, quantity: 1, lineTotalCents: 1000 },
      ],
      subtotalCents: 1000,
      discountCents: 0,
      totalCents: 1000,
      discountCode: null,
      createdAt: new Date().toISOString(),
    };
    store.orders.push(order);
  }
}

function expectAppError(fn: () => unknown, code: string, status: number) {
  try {
    fn();
    expect.unreachable("expected an AppError to be thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(code);
    expect((err as AppError).status).toBe(status);
  }
}

describe("DiscountService (n=3, x=10)", () => {
  let store: InMemoryStore;
  let service: DiscountService;

  beforeEach(() => {
    store = new InMemoryStore(catalog);
    service = new DiscountService(store, config);
  });

  describe("eligibility windows", () => {
    it("is not eligible with zero orders", () => {
      expect(service.isEligible()).toBe(false);
      expectAppError(() => service.generateCode(), "DISCOUNT_NOT_ELIGIBLE", 409);
    });

    it("is not eligible at n-1 orders, eligible at exactly n", () => {
      pushOrders(store, 2);
      expect(service.isEligible()).toBe(false);
      pushOrders(store, 1);
      expect(service.isEligible()).toBe(true);
    });

    it("allows exactly one code per window (n+1 orders is still one window)", () => {
      pushOrders(store, 4);
      service.generateCode();
      expect(service.isEligible()).toBe(false);
      expectAppError(() => service.generateCode(), "DISCOUNT_NOT_ELIGIBLE", 409);
    });

    it("queues windows if the admin generates late (2n orders → two codes)", () => {
      pushOrders(store, 6);
      const first = service.generateCode();
      const second = service.generateCode();
      expect(first.eligibleAtOrderNumber).toBe(3);
      expect(second.eligibleAtOrderNumber).toBe(6);
      expectAppError(() => service.generateCode(), "DISCOUNT_NOT_ELIGIBLE", 409);
    });
  });

  describe("code generation", () => {
    it("generates an active code carrying the configured percentage", () => {
      pushOrders(store, 3);
      const code = service.generateCode();
      expect(code.status).toBe("active");
      expect(code.percentOff).toBe(10);
      expect(code.usedOnOrderId).toBeNull();
      expect(code.code).toMatch(/^SAVE10-[A-Z2-9]{6}$/);
      expect(store.discountCodes.get(code.code)).toEqual(code);
    });

    it("generates distinct codes across windows", () => {
      pushOrders(store, 9);
      const codes = [
        service.generateCode().code,
        service.generateCode().code,
        service.generateCode().code,
      ];
      expect(new Set(codes).size).toBe(3);
    });
  });

  describe("validation and consumption", () => {
    it("rejects unknown codes", () => {
      expectAppError(
        () => service.validateActive("SAVE10-XXXXXX"),
        "INVALID_DISCOUNT_CODE",
        400,
      );
    });

    it("returns active codes and rejects them once used", () => {
      pushOrders(store, 3);
      const { code } = service.generateCode();
      expect(service.validateActive(code).code).toBe(code);

      service.markUsed(code, "ord-99");
      const stored = store.discountCodes.get(code);
      expect(stored?.status).toBe("used");
      expect(stored?.usedOnOrderId).toBe("ord-99");
      expectAppError(
        () => service.validateActive(code),
        "INVALID_DISCOUNT_CODE",
        400,
      );
    });
  });
});
