import { Router } from "express";
import type { GenerateDiscountCodeResponse } from "@uniblox/shared";
import type { DiscountService } from "../services/discount.service.js";
import type { StatsService } from "../services/stats.service.js";

// Admin endpoints are namespaced but unauthenticated — auth is explicitly
// out of scope for v1 (v1-build-plan.md §1).
export function adminRouter(
  discountService: DiscountService,
  statsService: StatsService,
): Router {
  const router = Router();

  router.post("/discount-codes", (_req, res) => {
    const body: GenerateDiscountCodeResponse = {
      discountCode: discountService.generateCode(),
    };
    res.status(201).json(body);
  });

  router.get("/stats", (_req, res) => {
    res.json(statsService.getStats());
  });

  return router;
}
