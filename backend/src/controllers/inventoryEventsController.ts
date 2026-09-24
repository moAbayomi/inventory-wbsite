import type { AuthenticatedRequest } from "../middleware/auth.ts";
import type { Response, NextFunction } from "express";
import { db } from "../db/db.ts";
import { inventoryEvents, items, users } from "../db/schema.ts";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { drawTable } from "../utils/pdfTable.ts";
import { LOGO_PATH } from "../utils/logoPath.ts";
import type { ItemIdParam } from "../schemas/item.schema.ts";
import type {
  InventoryEventIdParam,
  ListEventsQuery,
} from "../schemas/inventoryEvents.schema.ts";
import { notFound } from "../utils/httpError.ts";

export const getAllEvents = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { type, from, to, limit, page } =
      req.query as unknown as ListEventsQuery;

    const filters = [];
    if (type) filters.push(eq(inventoryEvents.type, type));
    if (from) filters.push(gte(inventoryEvents.created_at, new Date(from)));
    if (to) filters.push(lte(inventoryEvents.created_at, new Date(to)));
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const events = await db
      .select({
        id: inventoryEvents.id,
        type: inventoryEvents.type,
        quantity: inventoryEvents.quantity,
        prev_stock: inventoryEvents.prev_stock,
        new_stock: inventoryEvents.new_stock,
        note: inventoryEvents.note,
        created_at: inventoryEvents.created_at,
        item_id: inventoryEvents.item_id,
        item_name: items.name,
        item_sku: items.sku,
        user_name: users.name,
      })
      .from(inventoryEvents)
      .leftJoin(items, eq(items.id, inventoryEvents.item_id))
      .leftJoin(users, eq(users.id, inventoryEvents.user_id))
      .where(whereClause)
      .orderBy(desc(inventoryEvents.created_at))
      .limit(limit)
      .offset((page - 1) * limit);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryEvents)
      .where(whereClause);

    const count = countResult[0]?.count ?? 0;

    res.json({ events, count, page, limit });
  } catch (e) {
    next(e);
  }
};

export const exportEventsPdf = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { type, from, to } = req.query as unknown as ListEventsQuery;

    const filters = [];
    if (type) filters.push(eq(inventoryEvents.type, type));
    if (from) filters.push(gte(inventoryEvents.created_at, new Date(from)));
    if (to) filters.push(lte(inventoryEvents.created_at, new Date(to)));
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // No .limit()/.offset() -- a report export is "every event that matches
    // these filters", not one page of the activity feed.
    const events = await db
      .select({
        id: inventoryEvents.id,
        type: inventoryEvents.type,
        quantity: inventoryEvents.quantity,
        prev_stock: inventoryEvents.prev_stock,
        new_stock: inventoryEvents.new_stock,
        note: inventoryEvents.note,
        created_at: inventoryEvents.created_at,
        item_name: items.name,
        item_sku: items.sku,
        user_name: users.name,
      })
      .from(inventoryEvents)
      .leftJoin(items, eq(items.id, inventoryEvents.item_id))
      .leftJoin(users, eq(users.id, inventoryEvents.user_id))
      .where(whereClause)
      .orderBy(desc(inventoryEvents.created_at));

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const filename = `activity-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Centered logo above the store name -- matches the receipt's header so
    // every printed document (receipt, sales report, activity report)
    // reads as the same brand. Swallow a missing/corrupt logo file rather
    // than let the whole report fail to generate over a cosmetic asset.
    const logoSize = 48;
    try {
      doc.image(LOGO_PATH, doc.page.width / 2 - logoSize / 2, doc.y, {
        width: logoSize,
        height: logoSize,
      });
      doc.y += logoSize + 8;
    } catch {
      // no-op -- proceed without the logo
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#1C1C1A")
      .text("Abby's Robe", { align: "center" });
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#57534E")
      .text("Activity report", { align: "center" });
    doc.moveDown(0.5);

    const filterLines: string[] = [];
    if (type) filterLines.push(`Type: ${type}`);
    if (from) filterLines.push(`From ${new Date(from).toLocaleDateString()}`);
    if (to) filterLines.push(`To ${new Date(to).toLocaleDateString()}`);

    doc
      .fontSize(9)
      .fillColor("#78716C")
      .text(
        `Generated ${new Date().toLocaleString()}` +
          (filterLines.length ? ` \u00b7 ${filterLines.join(" \u00b7 ")}` : ""),
      );
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#1C1C1A")
      .text(`${events.length} event${events.length === 1 ? "" : "s"}`);
    doc.moveDown(0.8);

    const columns = [
      { header: "Date", width: 110 },
      { header: "Type", width: 75 },
      { header: "Item", width: 190 },
      { header: "Qty", width: 60, align: "right" as const },
      { header: "Stock (prev to new)", width: 130, align: "right" as const },
      { header: "By", width: 100 },
      { header: "Note", width: 180 },
    ];

    const rows = events.map((e) => {
      const qty = Number(e.quantity);
      return [
        new Date(e.created_at).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        e.type,
        `${e.item_name ?? "(deleted item)"}${e.item_sku ? ` (${e.item_sku})` : ""}`,
        `${qty > 0 ? "+" : ""}${qty.toLocaleString()}`,
        `${Number(e.prev_stock).toLocaleString()} \u2192 ${Number(e.new_stock).toLocaleString()}`,
        e.user_name ?? "\u2014",
        e.note ?? "\u2014",
      ];
    });

    drawTable(doc, columns, rows, doc.y);

    doc.end();
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
