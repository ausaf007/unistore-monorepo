import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";

/**
 * Parses req.body against a shared schema and replaces it with the typed,
 * defaults-applied result. A ZodError propagates to the error handler as 400.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body ?? {}) as z.infer<T>;
    next();
  };
}
