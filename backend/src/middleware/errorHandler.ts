import type {  Request, Response, NextFunction } from "express"
import { HttpError } from "../utils/httpError.ts"
import { ZodError } from "zod/v3";


export default function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({error: err.message, details: err.details ?? null})
  }

  if (err?.name == "ZodError") {
    return res.status(400).json({error: "Validation failed", details: err.format?.() ?? err})
  }

  return res.status(500).json({error: "Internal Server Error"})
}
