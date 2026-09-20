import type { AuthenticatedRequest } from "../middleware/auth.ts";
import type { Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import db from "../db/db.ts";
import { inventoryEvents, items } from "../db/schema.ts";
import type { AuditItemInput } from "../schemas/audit.schema.ts";
import type { ItemIdParam } from "../schemas/item.schema.ts";
import { unauthorized, notFound, internal } from "../utils/httpError.ts";
import { Decimal } from "decimal.js";

export const auditItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as unknown as ItemIdParam;
    const { counted_stock, note } = req.body as AuditItemInput;
    const userId = req.user?.sub as string;
    if (!userId) throw unauthorized("user not authenticated");

    const updated = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(items)
        .where(eq(items.id, id))
        .for("update")
        .limit(1);
      if (!current) throw notFound("item not found");

      const delta = new Decimal(counted_stock).minus(current.current_stock);

      // Count matches system — nothing to record.
      if (delta.isZero()) return current;

      const [result] = await tx
        .update(items)
        .set({ current_stock: new Decimal(counted_stock).toFixed(2) })
        .where(eq(items.id, id))
        .returning();
      if (!result) throw internal("failed to update stock");

      await tx.insert(inventoryEvents).values({
        item_id: result.id,
        user_id: userId,
        type: "AUDIT",
        quantity: delta.toFixed(2),
        prev_stock: current.current_stock,
        new_stock: result.current_stock,
        note:
          note ??
          `Audit: counted ${counted_stock}, system had ${current.current_stock}`,
      });

      return result;
    });

    res.status(200).json({ item: updated });
  } catch (e) {
    next(e);
  }
};
