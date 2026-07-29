import { Router } from "express";
import type { InMemoryStore } from "../store/store.js";

export function productsRouter(store: InMemoryStore): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json([...store.products.values()]);
  });

  return router;
}
