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
			// req.query is a GETTER in Express 5 -- every read re-parses req.url
			// from scratch and hands back a brand new object. That means
			// Object.assign(req.query, parsed) (the old approach here) mutated a
			// throwaway object: the very next read of req.query (in the next
			// middleware, or in the controller) called the getter again and got
			// a *fresh* unparsed object, silently discarding every coercion and
			// default the schema applied. Plain string fields (q, type, status)
			// looked fine by coincidence (raw === parsed for a string), but
			// numeric/date fields never actually became numbers/dates -- which
			// meant `.limit(limit)` in a controller was called with the STRING
			// "20" instead of the number 20, and Drizzle silently drops a
			// non-number limit instead of adding a LIMIT clause, so pagination
			// was returning every matching row uncapped instead of one page.
			//
			// Object.defineProperty replaces the getter with a plain, writable,
			// own property holding the parsed result, so every later read of
			// req.query in this request returns the exact same coerced object.
			Object.defineProperty(req, "query", {
				value: schema.parse(req.query),
				writable: true,
				configurable: true,
				enumerable: true,
			});
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
