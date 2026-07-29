import { Router } from "express";
import { AddCartItemRequestSchema } from "@uniblox/shared";
import { requireUserId } from "../middleware/user-id.js";
import { validateBody } from "../middleware/validate.js";
import type { CartService } from "../services/cart.service.js";

export function cartRouter(cartService: CartService): Router {
  const router = Router();
  router.use(requireUserId);

  router.get("/", (req, res) => {
    res.json(cartService.getCart(req.userId));
  });

  router.post("/items", validateBody(AddCartItemRequestSchema), (req, res) => {
    const { productId, quantity } = req.body;
    res.json(cartService.addItem(req.userId, productId, quantity));
  });

  return router;
}
