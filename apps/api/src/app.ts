import express from "express";
import { type AppConfig, defaultConfig } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { adminRouter } from "./routes/admin.routes.js";
import { cartRouter } from "./routes/cart.routes.js";
import { checkoutRouter } from "./routes/checkout.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { CartService } from "./services/cart.service.js";
import { CheckoutService } from "./services/checkout.service.js";
import { DiscountService } from "./services/discount.service.js";
import { StatsService } from "./services/stats.service.js";
import { InMemoryStore } from "./store/store.js";

/**
 * App factory: store and config are injectable so tests run against a fresh,
 * isolated instance with fast discount settings (e.g. n=2).
 */
export function createApp(
  store: InMemoryStore = new InMemoryStore(),
  config: AppConfig = defaultConfig,
): express.Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const cartService = new CartService(store);
  const discountService = new DiscountService(store, config);
  const checkoutService = new CheckoutService(
    store,
    cartService,
    discountService,
    config,
  );

  const statsService = new StatsService(store);

  app.use("/api/products", productsRouter(store));
  app.use("/api/cart", cartRouter(cartService));
  app.use("/api/checkout", checkoutRouter(checkoutService));
  app.use("/api/admin", adminRouter(discountService, statsService));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
