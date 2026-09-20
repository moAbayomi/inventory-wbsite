import type { AuthenticatedRequest } from "../middleware/auth.ts";
import type { Response, NextFunction } from "express";
import { db } from "../db/db.ts";
import { inventoryEvents, items, users } from "../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import type { ItemIdParam } from "../schemas/item.schema.ts";
import type { InventoryEventIdParam } from "../schemas/inventoryEvents.schema.ts";
import { notFound } from "../utils/httpError.ts";

export const getAllEvents = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const events = await db
      .select({
        id: inventoryEvents.id,
        type: inventoryEvents.type,
        quantity: inventoryEvents.quantity,
        note: inventoryEvents.note,
        created_at: inventoryEvents.created_at,
        item_name: items.name,
        user_name: users.name,
      })
      .from(inventoryEvents)
      .leftJoin(items, eq(items.id, inventoryEvents.item_id))
      .leftJoin(users, eq(users.id, inventoryEvents.user_id))
      .orderBy(desc(inventoryEvents.created_at))
      .limit(limit);

    res.json({ events });
  } catch (e) {
    next(e);
  }
};

export const getItemEvents = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as unknown as ItemIdParam;

    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, id))
      .limit(1);

    if (!item) {
      throw notFound();
    }

    const events = await db
      .select({
        id: inventoryEvents.id,
        type: inventoryEvents.type,
        quantity: inventoryEvents.quantity,
        prev_stock: inventoryEvents.prev_stock,
        new_stock: inventoryEvents.new_stock,
        note: inventoryEvents.note,
        created_at: inventoryEvents.created_at,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(inventoryEvents)
      .leftJoin(users, eq(inventoryEvents.user_id, users.id))
      .where(eq(inventoryEvents.item_id, id))
      .orderBy(desc(inventoryEvents.created_at));

    if (events.length === 0) {
      return res.status(200).json({
        message: "No events found for this item",
        item: {
          id: item.id,
          name: item.name,
          current_stock: item.current_stock,
        },
        events: [],
        count: 0,
      });
    }

    return res.status(200).json({
      item: {
        id: item.id,
        name: item.name,
        current_stock: item.current_stock,
        unit: item.unit,
        sku: item.sku,
      },
      events,
      count: events.length,
    });
  } catch (e) {
    console.error("Failed to fetch item events:", e);
    next(e);
  }
};

export const getEventById = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params as InventoryEventIdParam;

    const [event] = await db
      .select()
      .from(inventoryEvents)
      .where(eq(inventoryEvents.id, id))
      .limit(1);

    if (!event) {
      throw notFound();
    }

    return res.status(200).json({ event });
  } catch (e) {
    console.error("Failed to fetch event:", e);
    next(e);
  }
};
