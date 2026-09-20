import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.ts";

export async function adminOnly(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) {
	const user = req.user;

	if (!user) return res.status(401).json({ error: "user invalid" });
	if (user.role !== "ADMIN") {
		return res.status(403).json({ error: "forbidden" });
	}
	next();
}
