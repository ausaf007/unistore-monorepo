import express from "express";
import { type AppConfig, defaultConfig } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { cartRouter } from "./routes/cart.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { CartService } from "./services/cart.service.js";
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

  app.use("/api/products", productsRouter(store));
  app.use("/api/cart", cartRouter(cartService));

  void config; // consumed by checkout/admin routes in later phases

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
