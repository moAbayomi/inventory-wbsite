import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import {
  listItems,
  newItem,
  itemDetail,
  itemDetailBySku,
  deleteItem,
  updateItem,
  adjustItemStock,
} from "../controllers/itemsController.ts";
import { auditItem } from "../controllers/auditController.ts";
import { validateBody, validateParams } from "../middleware/validation.ts";
import {
  itemIdParamSchema,
  itemSkuParamSchema,
  newItemInputSchema,
  updateItemSchema,
  adjustStockInput,
} from "../schemas/item.schema.ts";
import { auditItemSchema } from "../schemas/audit.schema.ts";

const router = Router();

router.get("/", authenticateToken, listItems);
router.post("/", authenticateToken, validateBody(newItemInputSchema), newItem);

// Kept ahead of "/:id" -- both are GETs but this one has two segments
// ("sku", then the value) so it can never actually collide with "/:id",
// this ordering is just for readability. Exists for barcode/SKU-scan style
// lookups from the frontend.
router.get("/sku/:sku", authenticateToken, validateParams(itemSkuParamSchema), itemDetailBySku);

router.get("/:id", authenticateToken, validateParams(itemIdParamSchema), itemDetail);
router.patch(
  "/:id",
  authenticateToken,
  validateParams(itemIdParamSchema),
  validateBody(updateItemSchema),
  updateItem,
);
router.delete("/:id", authenticateToken, validateParams(itemIdParamSchema), deleteItem);

// Manual stock movements that aren't a sale -- a delivery came in
// (RESTOCK), some fabric was damaged (WASTE), or a quick correction
// (ADJUSTMENT). Every one of these writes an inventory_events row.
router.post(
  "/:id/adjust",
  authenticateToken,
  validateParams(itemIdParamSchema),
  validateBody(adjustStockInput),
  adjustItemStock,
);

// Physical stock count reconciliation: "I counted X on the shelf" rather
// than "add/remove Y" -- the delta against the system's current_stock is
// computed and logged for you.
router.post(
  "/:id/audit",
  authenticateToken,
  validateParams(itemIdParamSchema),
  validateBody(auditItemSchema),
  auditItem,
);

export default router;
