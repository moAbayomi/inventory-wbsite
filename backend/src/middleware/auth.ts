import type { Request, Response, NextFunction } from "express";
import { verifyToken, type PastryTokenJWTPayload } from "../utils/utils.ts";

export interface AuthenticatedRequest extends Request {
	user?: PastryTokenJWTPayload;
}

export async function authenticateToken(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) {
  try {
    const authHeader = req.headers["authorization"];
		const token = authHeader?.split(" ")[1];
		if (!token) return res.status(401).json({ error: "bad request" });

    const payload = await verifyToken(token);
    req.user = payload;
		next();
  } catch (e) {
		return res.status(403).json({ error: "forbidden" });
	}
}

export function reqiureRole(...roles: string[]) {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		const user = req.user;
		if (!user) return res.status(401).json({ error: "unauthorized" });
		if (!roles.includes(user.role))
			return res.status(403).json({ error: "Forbidden" });
		next();
	};
}
