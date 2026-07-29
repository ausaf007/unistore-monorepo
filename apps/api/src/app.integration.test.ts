import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Product } from "@uniblox/shared";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";
import { InMemoryStore } from "./store/store.js";

const catalog: Product[] = [
  { id: "p1", name: "Widget", description: "", priceCents: 1000 },
  { id: "p2", name: "Gadget", description: "", priceCents: 2500 },
];

// n=2 keeps the end-to-end flow short while exercising every rule.
const config: AppConfig = { discountN: 2, discountPercentOff: 10 };

describe("API integration (n=2, x=10)", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(new InMemoryStore(catalog), config);
  });

  it("runs the full store flow: browse → cart → orders → code → discounted checkout → stats", async () => {
    // Browse the catalog.
    const products = await request(app).get("/api/products").expect(200);
    expect(products.body).toHaveLength(2);

    // Admin cannot generate a code before any orders exist.
    await request(app).post("/api/admin/discount-codes").expect(409);

    // Order 1 (u1): 2× p1.
    await request(app)
      .post("/api/cart/items")
      .set("x-user-id", "u1")
      .send({ productId: "p1", quantity: 2 })
      .expect(200);
    const order1 = await request(app)
      .post("/api/checkout")
      .set("x-user-id", "u1")
      .send({})
      .expect(201);
    expect(order1.body.order.totalCents).toBe(2000);
    expect(order1.body.unlockedDiscountEligibility).toBe(false);

    // Order 2 (u2): 1× p2 — completes the first window (n=2).
    await request(app)
      .post("/api/cart/items")
      .set("x-user-id", "u2")
      .send({ productId: "p2" }) // quantity defaults to 1 via the shared schema
      .expect(200);
    const order2 = await request(app)
      .post("/api/checkout")
      .set("x-user-id", "u2")
      .send({})
      .expect(201);
    expect(order2.body.unlockedDiscountEligibility).toBe(true);

    // Admin generates the earned code; a second attempt is rejected.
    const generated = await request(app)
      .post("/api/admin/discount-codes")
      .expect(201);
    const code: string = generated.body.discountCode.code;
    expect(generated.body.discountCode.status).toBe("active");
    await request(app).post("/api/admin/discount-codes").expect(409);

    // Order 3 (u1): 1× p1 + 1× p2 = 3500, with the code → 350 off.
    await request(app)
      .post("/api/cart/items")
      .set("x-user-id", "u1")
      .send({ productId: "p1" });
    await request(app)
      .post("/api/cart/items")
      .set("x-user-id", "u1")
      .send({ productId: "p2" });
    const order3 = await request(app)
      .post("/api/checkout")
      .set("x-user-id", "u1")
      .send({ discountCode: code })
      .expect(201);
    expect(order3.body.order.discountCents).toBe(350);
    expect(order3.body.order.totalCents).toBe(3150);

    // The consumed code is rejected on reuse.
    await request(app)
      .post("/api/cart/items")
      .set("x-user-id", "u2")
      .send({ productId: "p1" });
    const reuse = await request(app)
      .post("/api/checkout")
      .set("x-user-id", "u2")
      .send({ discountCode: code })
      .expect(400);
    expect(reuse.body.error.code).toBe("INVALID_DISCOUNT_CODE");

    // Stats reflect everything: 3 orders, 5 items, one used code.
    const stats = await request(app).get("/api/admin/stats").expect(200);
    expect(stats.body).toMatchObject({
      itemsPurchasedCount: 5,
      totalRevenueCents: 2000 + 2500 + 3150,
      totalDiscountGivenCents: 350,
    });
    expect(stats.body.discountCodes).toHaveLength(1);
    expect(stats.body.discountCodes[0].status).toBe("used");
  });

  describe("error paths", () => {
    it("rejects cart requests without an x-user-id header", async () => {
      const res = await request(app)
        .post("/api/cart/items")
        .send({ productId: "p1" })
        .expect(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects an invalid body with field-level details", async () => {
      const res = await request(app)
        .post("/api/cart/items")
        .set("x-user-id", "u1")
        .send({ productId: "p1", quantity: -2 })
        .expect(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toHaveProperty("quantity");
    });

    it("rejects adding an unknown product", async () => {
      const res = await request(app)
        .post("/api/cart/items")
        .set("x-user-id", "u1")
        .send({ productId: "ghost" })
        .expect(400);
      expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
    });

    it("rejects checkout with an empty cart", async () => {
      const res = await request(app)
        .post("/api/checkout")
        .set("x-user-id", "u1")
        .send({})
        .expect(400);
      expect(res.body.error.code).toBe("EMPTY_CART");
    });

    it("rejects checkout with an unknown discount code", async () => {
      await request(app)
        .post("/api/cart/items")
        .set("x-user-id", "u1")
        .send({ productId: "p1" });
      const res = await request(app)
        .post("/api/checkout")
        .set("x-user-id", "u1")
        .send({ discountCode: "SAVE10-BOGUS2" })
        .expect(400);
      expect(res.body.error.code).toBe("INVALID_DISCOUNT_CODE");
    });
  });
});
