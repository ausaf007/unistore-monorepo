import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors.js";

// Auth is out of scope (v1-build-plan.md §1): customers self-identify with an
// x-user-id header, which the frontend generates and persists per browser.
export function requireUserId(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const userId = req.header("x-user-id");
  if (!userId || userId.trim() === "") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Missing required x-user-id header",
    );
  }
  req.userId = userId;
  next();
}

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}
