// Superseded by the /:id/audit route now living directly under
// itemsRoutes.ts (mounted at /api/v1/items), so it reads as
// POST /api/v1/items/:id/audit instead of the more awkward
// /api/v1/audit/:id/audit this file used to produce once mounted.
// Kept as an empty router, still exported, so nothing importing this
// module's default export breaks; safe to delete entirely later.
import { Router } from "express";

const router = Router();
export default router;
