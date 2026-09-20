import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";

// IMPORTANT: each of these assigns the *parsed* value back onto the request.
// zod's result is not just validation — it's also where defaults, coercions
// (z.coerce.number(), z.coerce.date()) and .transform() actually happen.
// Calling schema.parse() and discarding the result (as this file used to)
// validates the shape but silently throws away every default/coercion, so
// e.g. a query schema's `limit: z.coerce.number().default(20)` never
// actually reaches the controller as a number with a default — the
// controller still sees whatever raw strings/undefined came in on
// req.query. Assigning back is what makes those declarations do anything.
export const validateBody = (schema: ZodSchema) => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			req.body = schema.parse(req.body);
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				return res.status(400).json({
					error: "Validation failed",
					details: error.issues.map((err) => ({
						field: err.path.join("."),
						message: err.message,
					})),
				});
			}
			next(error);
		}
	};
};

export const validateParams = (schema: ZodSchema) => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			Object.assign(req.params, schema.parse(req.params));
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				return res.status(400).json({
					error: "Invalid parameters",
					details: error.issues.map((err) => ({
						field: err.path.join("."),
						message: err.message,
					})),
				});
			}
			next(error);
		}
	};
};

export const validateQuery = (schema: ZodSchema) => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			// req.query is a getter-backed object in Express 5 — reassigning it
			// outright can throw, so merge the parsed (coerced/defaulted) values
			// into the existing object instead of replacing it.
			Object.assign(req.query, schema.parse(req.query));
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				return res.status(400).json({
					error: "Invalid query parameters",
					details: error.issues.map((err) => ({
						field: err.path.join("."),
						message: err.message,
					})),
				});
			}
			next(error);
		}
	};
};
