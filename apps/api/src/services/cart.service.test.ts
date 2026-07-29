import { beforeEach, describe, expect, it } from "vitest";
import type { Product } from "@uniblox/shared";
import { AppError } from "../errors.js";
import { InMemoryStore } from "../store/store.js";
import { CartService } from "./cart.service.js";

const catalog: Product[] = [
  { id: "p1", name: "Widget", description: "", priceCents: 1000 },
  { id: "p2", name: "Gadget", description: "", priceCents: 2550 },
];

describe("CartService", () => {
  let store: InMemoryStore;
  let service: CartService;

  beforeEach(() => {
    store = new InMemoryStore(catalog);
    service = new CartService(store);
  });

  it("returns an empty cart for a user with no items", () => {
    const cart = service.getCart("u1");
    expect(cart).toEqual({ userId: "u1", items: [], subtotalCents: 0 });
  });

  it("adds a new item as its own line", () => {
    const cart = service.addItem("u1", "p1", 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      product: { id: "p1" },
      quantity: 2,
      lineTotalCents: 2000,
    });
    expect(cart.subtotalCents).toBe(2000);
  });

  it("merges quantity when the same product is added again", () => {
    service.addItem("u1", "p1", 1);
    const cart = service.addItem("u1", "p1", 3);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.quantity).toBe(4);
    expect(cart.subtotalCents).toBe(4000);
  });

  it("sums the subtotal across multiple lines", () => {
    service.addItem("u1", "p1", 1);
    const cart = service.addItem("u1", "p2", 2);
    expect(cart.items).toHaveLength(2);
    expect(cart.subtotalCents).toBe(1000 + 2 * 2550);
  });

  it("rejects unknown products", () => {
    expect(() => service.addItem("u1", "nope", 1)).toThrowError(AppError);
    try {
      service.addItem("u1", "nope", 1);
    } catch (err) {
      expect((err as AppError).code).toBe("PRODUCT_NOT_FOUND");
      expect((err as AppError).status).toBe(400);
    }
    expect(service.getCart("u1").items).toHaveLength(0);
  });

  it("keeps carts isolated between users", () => {
    service.addItem("u1", "p1", 1);
    service.addItem("u2", "p2", 5);
    expect(service.getCart("u1").items[0]?.product.id).toBe("p1");
    expect(service.getCart("u2").items[0]?.product.id).toBe("p2");
    expect(service.getCart("u1").items).toHaveLength(1);
  });
});
