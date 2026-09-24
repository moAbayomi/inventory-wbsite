import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { validateQuery } from "../middleware/validation.ts";
import { listEventsQuerySchema } from "../schemas/inventoryEvents.schema.ts";
import {getAllEvents, getEventById, getItemEvents, exportEventsPdf } from "../controllers/inventoryEventsController.ts";

const router = Router();
router.get("/", authenticateToken, validateQuery(listEventsQuerySchema), getAllEvents);

// Same filters as "/", but returns the whole matching set as a PDF instead
// of one paginated page of JSON -- must come before "/:id" so Express
// doesn't try to parse "export" as an event id.
router.get("/export/pdf", authenticateToken, validateQuery(listEventsQuerySchema), exportEventsPdf);

router.get("/items/:id/", authenticateToken, getItemEvents);
router.get("/:id", authenticateToken, getEventById);
export default router;
