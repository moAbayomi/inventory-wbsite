import type { Request, Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "./auth.ts"


export function selfOrAdmin (req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
    const user = req.user;

    const user_id = req.params.id
    if (!user) return res.status(401).json({ error: "unauthorized" })

    if (user.sub == user_id || user.role == "ADMIN") {
      return next()
    }

    return res.status(403).json({error: "forbidden"})
    } catch (e) {
      console.error(e)
    }

  }
