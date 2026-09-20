import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import db from "../db/db.ts";
import { eq, sql } from "drizzle-orm";
import { inventoryEvents, items, categories } from "../db/schema.ts";
import { Decimal } from "decimal.js";
import type {
  ItemIdParam,
  ItemSkuParam,
  ItemSchema,
  UpdateItem,
  AdjustStockInput,
} from "../schemas/item.schema.ts";
import { buildSkuBase } from "../utils/sku.ts";
import {
  internal,
  notFound,
  unauthorized,
  badRequest,
} from "../utils/httpError.ts";

export const listItems = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const itemsAval = await db.select().from(items).orderBy(items.created_at);

    // An empty catalogue is a normal state (a brand new shop, or everything
    // filtered out) -- not an error. A 404 here used to make onboarding a
    // fresh store look broken.
    return res.status(200).json({ items: itemsAval, count: itemsAval.length });
  } catch (e) {
    next(e);
  }
};

export const newItem = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const itemData = req.body as ItemSchema;

    const userId = req.user?.sub as string;
    if (!userId) {
      throw unauthorized("User not authenticated");
    }

    const insertedItem = await db.transaction(async (tx) => {
      // A caller can still hand us one explicitly (an override, or a
      // barcode-scanner workflow later) -- we only generate when it's
      // missing.
      let sku = itemData.sku?.trim();

      if (!sku) {
        // Descriptive, like the seeded catalogue ("ANK-RBF-46",
        // "SHIRT-ANK-RBF-M") rather than a sequential "FAB-000123" -- a
        // shop worker glancing at a printed label can tell what it is
        // without looking it up. See utils/sku.ts for the shape.
        let categoryName: string | null = null;
        if (itemData.category_id) {
          const [cat] = await tx
            .select({ name: categories.name })
            .from(categories)
            .where(eq(categories.id, itemData.category_id))
            .limit(1);
          categoryName = cat?.name ?? null;
        }

        const base = buildSkuBase({
          item_type: itemData.item_type,
          name: itemData.name,
          color: itemData.color,
          width_inches: itemData.width_inches,
          dye_lot: itemData.dye_lot,
          style_code: itemData.style_code,
          size: itemData.size,
          categoryName,
        });

        // Locked on the specific candidate base, not the whole item_type,
        // so two unrelated inserts (different color/size) never wait on
        // each other -- only two requests racing to claim the exact same
        // base do. pg_advisory_xact_lock releases itself automatically on
        // commit or rollback.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`sku:${base}`}))`,
        );

        const existing = await tx
          .select({ sku: items.sku })
          .from(items)
          .where(
            sql`${items.sku} = ${base} or ${items.sku} like ${base + "-%"}`,
          );

        if (existing.length === 0) {
          sku = base;
        } else {
          // Base is taken (or a numbered variant of it already exists) --
          // find the next free "-2", "-3", ... suffix rather than
          // colliding with an existing SKU or reusing one.
          const taken = new Set(existing.map((r) => r.sku));
          let n = 2;
          let candidate = `${base}-${n}`;
          while (taken.has(candidate)) {
            n += 1;
            candidate = `${base}-${n}`;
          }
          sku = candidate;
        }
      }

      const [newItem] = await tx
        .insert(items)
        .values({
          ...itemData,
          sku,
          current_stock: new Decimal(itemData.current_stock).toFixed(2),
          low_stock_threshold: new Decimal(itemData.low_stock_threshold).toFixed(2),
          cost_price: new Decimal(itemData.cost_price).toFixed(2),
          selling_price: new Decimal(itemData.selling_price).toFixed(2),
        })
        .returning();
      if (!newItem) throw internal("New item couldnt be created");

      if (new Decimal(newItem.current_stock).gt(0)) {
        const event: typeof inventoryEvents.$inferInsert = {
          item_id: newItem.id,
          user_id: userId,
          type: "CREATE",
          quantity: newItem.current_stock,
          prev_stock: "0",
          new_stock: newItem.current_stock,
          note: `Initial stock of ${newItem.current_stock} ${newItem.unit}`,
        };
        await tx.insert(inventoryEvents).values(event);
      }
      return newItem;
    });

    return res.status(201).json({
      message: "Item created successfully",
      item: insertedItem,
    });
  } catch (e) {
    next(e);
  }
};

export const itemDetail = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as unknown as ItemIdParam;
    const [selectedItem] = await db
      .select()
      .from(items)
      .where(eq(items.id, id))
      .limit(1);

    if (!selectedItem) throw notFound("item not found");

    return res.status(200).json({ item: selectedItem });
  } catch (e) {
    next(e);
  }
};

export const itemDetailBySku = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sku } = req.params as unknown as ItemSkuParam;
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.sku, sku))
      .limit(1);
    if (!item) throw notFound("no item with that SKU");
    res.status(200).json({ item });
  } catch (e) {
    next(e);
  }
};

export const updateItem = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as unknown as ItemIdParam;
    const updatedBody = req.body as UpdateItem;
    const userId: string = req.user?.sub as string;
    if (!userId) throw unauthorized("user not authenticated");

    // updateItemSchema never includes current_stock -- stock only moves
    // through /adjust, /audit, or a sale, each of which writes an
    // inventory_events row. Convert any numeric fields that *are* present
    // to the string form the numeric columns expect.
    const setValues: Record<string, unknown> = { ...updatedBody };
    for (const key of ["low_stock_threshold", "cost_price", "selling_price"] as const) {
      if (updatedBody[key] !== undefined) {
        setValues[key] = new Decimal(updatedBody[key] as number).toFixed(2);
      }
    }

    const [updated] = await db
      .update(items)
      .set(setValues)
      .where(eq(items.id, id))
      .returning();

    if (!updated) throw notFound("item not found");

    res.json({ item: updated });
  } catch (e) {
    next(e);
  }
};

export const adjustItemStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as unknown as ItemIdParam;
    const { quantity, type, note } = req.body as AdjustStockInput;
    const userId = req.user?.sub as string;
    if (!userId) throw unauthorized("user not authenticated");

    const signedQuantity = type === "WASTE" ? -Math.abs(quantity) : quantity;

    const result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(items)
        .where(eq(items.id, id))
        .for("update")
        .limit(1);
      if (!current) throw notFound("item not found");

      const newStock = new Decimal(current.current_stock).plus(signedQuantity);
      if (newStock.lt(0)) throw badRequest("stock cannot go negative");

      const [updated] = await tx
        .update(items)
        .set({ current_stock: newStock.toFixed(2) })
        .where(eq(items.id, id))
        .returning();

      if (!updated) throw internal();

      await tx.insert(inventoryEvents).values({
        item_id: updated.id,
        user_id: userId,
        type,
        quantity: new Decimal(signedQuantity).toFixed(2),
        prev_stock: current.current_stock,
        new_stock: updated.current_stock,
        note: note ?? null,
      });

      return updated;
    });

    res.json({ item: result });
  } catch (e) {
    next(e);
  }
};

export const deleteItem = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as unknown as ItemIdParam;

    const userId = req.user?.sub;
    if (!userId) throw notFound("User not found");

    const deletedItem = await db.transaction(async (tx) => {
      const [currentItem] = await tx
        .select()
        .from(items)
        .where(eq(items.id, id))
        .limit(1);
      if (!currentItem) throw notFound("Item not found");

      const event: typeof inventoryEvents.$inferInsert = {
        item_id: currentItem.id,
        user_id: userId as string,
        type: "DELETE",
        quantity: new Decimal(currentItem.current_stock).negated().toFixed(2),
        prev_stock: currentItem.current_stock,
        new_stock: "0",
        note: `Deleted item (stock was ${currentItem.current_stock})`,
      };

      await tx.insert(inventoryEvents).values(event);

      const deleted = await tx
        .delete(items)
        .where(eq(items.id, id))
        .returning();

      return deleted;
    });

    if (!deletedItem) throw internal("item couldnt be deleted");

    return res
      .status(200)
      .json({ message: "item successfully deleted", item: deletedItem });
  } catch (e) {
    next(e);
  }
};
