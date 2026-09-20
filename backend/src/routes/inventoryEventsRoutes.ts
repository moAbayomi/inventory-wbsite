import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import {getAllEvents, getEventById, getItemEvents } from "../controllers/inventoryEventsController.ts";

const router = Router();
router.get("/", authenticateToken, getAllEvents);
router.get("/items/:id/", authenticateToken, getItemEvents);
router.get("/:id", authenticateToken, getEventById);
export default router;
