import type { Response, NextFunction } from "express";
import { gte, lte, and, desc, sql, ilike, or } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { drawTable } from "../utils/pdfTable.ts";
import { LOGO_PATH } from "../utils/logoPath.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import type {
  SaleSchema,
  SaleIdSchema,
  ListSalesQuerySchema,
  SalesSummaryQuerySchema,
  SalesTimeseriesQuerySchema,
} from "../schemas/sales.schema.ts";
import { resolveDateRange } from "../utils/dateRange.ts";
import db from "../db/db.ts";
import {
  sales,
  items,
  salesItems,
  inventoryEvents,
  payments,
} from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { Decimal } from "decimal.js";
import {
  unauthorized,
  internal,
  notFound,
  badRequest,
} from "../utils/httpError.ts";

export const newSale = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const salesData = req.body as SaleSchema;
    const userId = req.user?.sub as string;

    if (!userId) throw unauthorized("user not authenticated!");

    const result = await db.transaction(async (tx) => {
      let totalAmount = new Decimal(0);
      let totalProfit = new Decimal(0);
      const resolved = [];

      for (const line of salesData.items) {
        // Lock the row for the life of the transaction so two sales of the
        // same item can't both read the same current_stock, both pass the
        // "enough stock?" check, and both commit -- the classic
        // check-then-act race on a shared counter. The second transaction
        // now blocks here until the first commits or rolls back, then sees
        // the updated stock.
        const [item] = await tx
          .select()
          .from(items)
          .where(eq(items.id, line.item_id))
          .for("update")
          .limit(1);
        if (!item) throw notFound(`item ${line.item_id} not found`);

        if (new Decimal(item.current_stock).lt(line.quantity))
          throw badRequest(`not enough stock for ${item.name}`);

        const lineTotal = new Decimal(item.selling_price).times(line.quantity);
        const lineProfit = new Decimal(item.selling_price)
          .minus(item.cost_price)
          .times(line.quantity);

        totalAmount = totalAmount.plus(lineTotal);
        totalProfit = totalProfit.plus(lineProfit);
        resolved.push({ item, quantity: line.quantity, lineTotal, lineProfit });
      }

      const [sale] = await tx
        .insert(sales)
        .values({
          user_id: userId,
          total_amount: totalAmount.toFixed(2),
          total_profit: totalProfit.toFixed(2),
          customer_name: salesData.customer_name ?? null,
          customer_phone: salesData.customer_phone ?? null,
          payment_method: salesData.payment.method,
          payment_status: "PAID",
          note: salesData.note ?? null,
        })
        .returning();

      if (!sale) throw internal("sale couldnt be recorded");

      for (const r of resolved) {
        await tx.insert(salesItems).values({
          sale_id: sale.id,
          item_id: r.item.id,
          quantity: new Decimal(r.quantity).toFixed(2),
          price_per_unit: r.item.selling_price,
          cost_per_unit: r.item.cost_price,
          subtotal: r.lineTotal.toFixed(2),
          profit: r.lineProfit.toFixed(2),
        });

        const newStock = new Decimal(r.item.current_stock).minus(r.quantity);

        await tx.insert(inventoryEvents).values({
          item_id: r.item.id,
          user_id: userId,
          type: "SALE",
          quantity: new Decimal(r.quantity).negated().toFixed(2),
          prev_stock: r.item.current_stock,
          new_stock: newStock.toFixed(2),
          note: `Sold to ${salesData.customer_name ?? "walk-in"}`,
        });

        await tx
          .update(items)
          .set({ current_stock: newStock.toFixed(2) })
          .where(eq(items.id, r.item.id));
      }

      await tx.insert(payments).values({
        sale_id: sale.id,
        amount: totalAmount.toFixed(2),
        method: salesData.payment.method,
        status: "CONFIRMED",
        received_by: userId,
        reference: salesData.payment.reference ?? null,
      });

      return sale;
    });
    res.status(201).json({ sale: result });
  } catch (e) {
    next(e);
  }
};

export const getAllSales = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { from, to, status, user_id, q, limit, page } =
      req.query as unknown as ListSalesQuerySchema;
    const filters = [];

    if (from) filters.push(gte(sales.created_at, new Date(from)));
    if (to) filters.push(lte(sales.created_at, new Date(to)));
    if (status) filters.push(eq(sales.payment_status, status));
    if (user_id) filters.push(eq(sales.user_id, user_id));
    if (q) {
      filters.push(
        or(
          ilike(sales.customer_name, `%${q}%`),
          ilike(sales.customer_phone, `%${q}%`),
        ),
      );
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const saleRows = await db
      .select()
      .from(sales)
      .where(whereClause)
      .orderBy(desc(sales.created_at))
      .limit(limit)
      .offset((page - 1) * limit);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sales)
      .where(whereClause);

    const count = countResult[0]?.count ?? 0;

    res.json({
      sales: saleRows,
      count,
      page,
      limit,
    });
  } catch (e) {
    next(e);
  }
};

export const exportSalesPdf = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { from, to, status, user_id, q } =
      req.query as unknown as ListSalesQuerySchema;
    const filters = [];

    if (from) filters.push(gte(sales.created_at, new Date(from)));
    if (to) filters.push(lte(sales.created_at, new Date(to)));
    if (status) filters.push(eq(sales.payment_status, status));
    if (user_id) filters.push(eq(sales.user_id, user_id));
    if (q) {
      filters.push(
        or(
          ilike(sales.customer_name, `%${q}%`),
          ilike(sales.customer_phone, `%${q}%`),
        ),
      );
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // No .limit()/.offset() -- unlike getAllSales, a report export means
    // "every sale that matches these filters", not one page of them.
    const saleRows = await db
      .select()
      .from(sales)
      .where(whereClause)
      .orderBy(desc(sales.created_at));

    const totalAmount = saleRows.reduce(
      (sum, s) => sum.plus(s.total_amount),
      new Decimal(0),
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filename = `sales-report-${new Date().toISOString().slice(0, 10)}.pdf`;
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
      .text("Sales history report", { align: "center" });
    doc.moveDown(0.5);

    const filterLines: string[] = [];
    if (from) filterLines.push(`From ${new Date(from).toLocaleDateString()}`);
    if (to) filterLines.push(`To ${new Date(to).toLocaleDateString()}`);
    if (status) filterLines.push(`Status: ${status}`);
    if (q) filterLines.push(`Search: "${q}"`);

    doc
      .fontSize(9)
      .fillColor("#78716C")
      .text(
        `Generated ${new Date().toLocaleString()}` +
          (filterLines.length ? ` · ${filterLines.join(" · ")}` : ""),
      );
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#1C1C1A")
      .text(
        `${saleRows.length} sale${saleRows.length === 1 ? "" : "s"} · Total: NGN ${totalAmount.toFixed(2)}`,
      );
    doc.moveDown(0.8);

    const columns = [
      { header: "Date", width: 95 },
      { header: "Customer", width: 125 },
      { header: "Phone", width: 90 },
      { header: "Payment", width: 70 },
      { header: "Status", width: 60 },
      { header: "Total (NGN)", width: 75, align: "right" as const },
    ];

    const rows = saleRows.map((s) => [
      new Date(s.created_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      s.customer_name ?? "Walk-in",
      s.customer_phone ?? "—",
      s.payment_method,
      s.payment_status,
      Number(s.total_amount).toLocaleString(),
    ]);

    drawTable(doc, columns, rows, doc.y);

    doc.end();
  } catch (e) {
    next(e);
  }
};

export const getSalesDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as unknown as SaleIdSchema;

    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, id))
      .limit(1);
    if (!sale) throw notFound("sale not found");

    const lineItems = await db
      .select({
        id: salesItems.id,
        item_id: salesItems.item_id,
        item_name: items.name,
        item_sku: items.sku,
        quantity: salesItems.quantity,
        price_per_unit: salesItems.price_per_unit,
        cost_per_unit: salesItems.cost_per_unit,
        subtotal: salesItems.subtotal,
        profit: salesItems.profit,
      })
      .from(salesItems)
      .leftJoin(items, eq(salesItems.item_id, items.id))
      .where(eq(salesItems.sale_id, id));

    const paymentRows = await db
      .select()
      .from(payments)
      .where(eq(payments.sale_id, id));

    res.json({ sale, items: lineItems, payments: paymentRows });
  } catch (e) {
    next(e);
  }
};

export const getSalesSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { from, to, range } = req.query as unknown as SalesSummaryQuerySchema;
    let startDate: Date | undefined = from;
    let endDate: Date | undefined = to;

    if (range && range !== "all") {
      const resolved = resolveDateRange(range);
      startDate = resolved.startDate;
      endDate = resolved.endDate;
    }

    const filters = [];

    if (startDate) filters.push(gte(sales.created_at, startDate));
    if (endDate) filters.push(lte(sales.created_at, endDate));
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const totalResult = await db
      .select({
        total_revenue: sql<string>`COALESCE(SUM(${sales.total_amount}), 0)::text`,
        total_profit: sql<string>`COALESCE(SUM(${sales.total_profit}), 0)::text`,
        sale_count: sql<number>`COUNT(*)::int`,
      })
      .from(sales)
      .where(whereClause);

    const totals = totalResult[0] ?? {
      total_revenue: "0",
      total_profit: "0",
      sale_count: 0,
    };

    const averageSale =
      totals.sale_count > 0
        ? (Number(totals.total_revenue) / totals.sale_count).toFixed(2)
        : "0.00";

    const paymentFilters = [];
    if (startDate) paymentFilters.push(gte(sales.created_at, startDate));
    if (endDate) paymentFilters.push(lte(sales.created_at, endDate));
    const paymentWhereClause =
      paymentFilters.length > 0 ? and(...paymentFilters) : undefined;

    const byMethod = await db
      .select({
        method: payments.method,
        total: sql<string>`SUM(${payments.amount})::text`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(payments)
      .innerJoin(sales, eq(payments.sale_id, sales.id))
      .where(paymentWhereClause)
      .groupBy(payments.method);

    res.json({
      range: {
        from: startDate ?? null,
        to: endDate ?? null,
      },
      totals: {
        revenue: totals.total_revenue,
        profit: totals.total_profit,
        sale_count: totals.sale_count,
        average_sale: averageSale,
      },
      by_payment_method: byMethod,
    });
  } catch (e) {
    next(e);
  }
};

// Bucketed for the dashboard's revenue/profit line chart. "today" buckets by
// hour (24 points, most of them empty overnight); "week"/"month" bucket by
// day. generate_series + LEFT JOIN zero-fills every bucket in range --
// without it, a quiet hour/day with no sales would just be missing from the
// result instead of showing up as a dip to zero, which would make the chart
// silently skip gaps on its x-axis instead of showing them.
export const getSalesTimeseries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { range } = req.query as unknown as SalesTimeseriesQuerySchema;
    const { startDate, endDate } = resolveDateRange(range);
    const bucket: "hour" | "day" = range === "today" ? "hour" : "day";
    const bucketUnit = bucket === "hour" ? "1 hour" : "1 day";
    const truncUnit = bucket === "hour" ? "hour" : "day";

    const from = startDate ?? new Date(0);
    const to = endDate ?? new Date();

    const result = await db.execute(sql`
      SELECT
        bucket_start AS date,
        COALESCE(SUM(${sales.total_amount}), 0)::text AS revenue,
        COALESCE(SUM(${sales.total_profit}), 0)::text AS profit,
        COUNT(${sales.id})::int AS sale_count
      FROM generate_series(
        date_trunc(${truncUnit}, ${from.toISOString()}::timestamptz),
        date_trunc(${truncUnit}, ${to.toISOString()}::timestamptz),
        ${bucketUnit}::interval
      ) AS bucket_start
      LEFT JOIN ${sales}
        ON date_trunc(${truncUnit}, ${sales.created_at}) = bucket_start
        AND ${sales.created_at} >= ${from.toISOString()}::timestamptz
        AND ${sales.created_at} <= ${to.toISOString()}::timestamptz
      GROUP BY bucket_start
      ORDER BY bucket_start ASC
    `);

    // node-postgres driver: db.execute() returns a QueryResult-shaped object
    // (.rows), not the rows array directly.
    const rows = (result as unknown as { rows: Record<string, unknown>[] })
      .rows;

    const points = rows.map((r) => ({
      date: new Date(r.date as string).toISOString(),
      revenue: r.revenue as string,
      profit: r.profit as string,
      sale_count: r.sale_count as number,
    }));

    res.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      bucket,
      points,
    });
  } catch (e) {
    next(e);
  }
};
