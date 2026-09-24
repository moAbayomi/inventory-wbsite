import { z } from "zod";

// Mirrors backend/src/schemas/item.schema.ts's adjustStockInput -- these
// three types are the only manual stock movements that aren't a sale: a
// delivery came in (RESTOCK), some fabric was damaged (WASTE), or a quick
// correction (ADJUSTMENT). Physical stock counts ("I counted X on the
// shelf") are a separate endpoint (POST /items/:id/audit, see
// auditController.ts) with no frontend UI yet -- this form doesn't touch it.
export const stockMovementTypes = ["RESTOCK", "WASTE", "ADJUSTMENT"] as const;

export const stockAdjustmentSchema = z.object({
  item_id: z.string().min(1, "Pick an item"),
  type: z.enum(stockMovementTypes),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  note: z.string().optional(),
});

export type StockAdjustmentData = z.infer<typeof stockAdjustmentSchema>;
