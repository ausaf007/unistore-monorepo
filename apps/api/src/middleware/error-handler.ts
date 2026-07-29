import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiError } from "@uniblox/shared";
import { AppError } from "../errors.js";

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiError = {
    error: { code: "NOT_FOUND", message: "Route not found" },
  };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express identifies error middleware by arity — the 4th param must exist.
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const body: ApiError = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten().fieldErrors,
      },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ApiError = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }

  console.error(err);
  const body: ApiError = {
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  };
  res.status(500).json(body);
}
