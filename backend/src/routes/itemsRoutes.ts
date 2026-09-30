import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { adminOnly } from "../middleware/adminOnly.ts";
import {
  listItems,
  newItem,
  itemDetail,
  itemDetailBySku,
  deleteItem,
  updateItem,
  adjustItemStock,
  imageUploadUrl,
} from "../controllers/itemsController.ts";
import { auditItem } from "../controllers/auditController.ts";
import { validateBody, validateParams } from "../middleware/validation.ts";
import {
  itemIdParamSchema,
  itemSkuParamSchema,
  newItemInputSchema,
  updateItemSchema,
  adjustStockInput,
  imageUploadUrlSchema,
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

// Hands back a short-lived signed URL the browser PUTs a photo to directly
// (see services/storage.ts), plus the public URL to save as image_url.
router.post(
  "/images/upload-url",
  authenticateToken,
  validateBody(imageUploadUrlSchema),
  imageUploadUrl,
);

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
  // Admin only: staff record stock leaving through sales, but restocks,
  // waste and corrections are the owner's call.
  adminOnly,
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
