import type { AuthenticatedRequest } from "../middleware/auth.ts";
import type { Response, NextFunction } from "express";
import db from "../db/db.ts";
import { items } from "../db/schema.ts";
import { lt, sql } from "drizzle-orm";

export const currentInventory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await db
      .select({
        item_count: sql<number>`COUNT(*)::int`,
        total_retail_value: sql<string>`COALESCE(SUM(${items.selling_price} * ${items.current_stock}), 0)::text`,
        total_stock_value: sql<string>`COALESCE(SUM(${items.current_stock} * ${items.cost_price}), 0)::text`,
        out_of_stock_count: sql<number>`COUNT(*) FILTER (WHERE ${items.current_stock} = 0)::int`,
        potential_profit: sql<string>`COALESCE(SUM(${items.current_stock} * (${items.selling_price} - ${items.cost_price})), 0)::text`,
      })
      .from(items);

    const totals = result[0] ?? {
      item_count: 0,
      total_stock_value: "0.00",
      total_retail_value: "0.00",
      out_of_stock_count: 0,
      potential_profit: "0.00",
    };

    res.json({ totals });
  } catch (e) {
    next(e);
  }
};

export const currentLowStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lowStock = await db
      .select()
      .from(items)
      .where(lt(items.current_stock, items.low_stock_threshold));

    res.status(200).json({ items: lowStock, count: lowStock.length });
  } catch (e) {
    next(e);
  }
};
