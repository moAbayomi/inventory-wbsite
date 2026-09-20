import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { currentInventory, currentLowStock } from "../controllers/inventoryController.ts";

const router = Router();

// Aggregated stock value / count across the whole catalogue -- powers the
// dashboard's summary tiles.
router.get("/current", authenticateToken, currentInventory);

// Items whose current_stock has dropped below their own
// low_stock_threshold -- powers the dashboard's "needs restocking" list.
router.get("/low-stock", authenticateToken, currentLowStock);

export default router;
