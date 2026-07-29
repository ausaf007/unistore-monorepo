import { Router } from "express";
import { CheckoutRequestSchema } from "@uniblox/shared";
import { requireUserId } from "../middleware/user-id.js";
import { validateBody } from "../middleware/validate.js";
import type { CheckoutService } from "../services/checkout.service.js";

export function checkoutRouter(checkoutService: CheckoutService): Router {
  const router = Router();
  router.use(requireUserId);

  router.post("/", validateBody(CheckoutRequestSchema), (req, res) => {
    const response = checkoutService.checkout(
      req.userId,
      req.body.discountCode,
    );
    res.status(201).json(response);
  });

  return router;
}
