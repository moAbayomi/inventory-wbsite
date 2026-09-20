import { z } from "zod";

export const newSaleSchema = z.object({
  items: z
    .array(
      z.object({
        item_id: z.uuid(),
        quantity: z.number().positive(),
      }),
    )
    .min(1, "At least one item is required"),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  payment: z.object({
    method: z.enum(["CASH", "TRANSFER", "POS", "CHEQUE", "USSD"]).default("CASH"),
    reference: z.string().optional(),
  }),
  note: z.string().optional(),
});

export type SaleSchema = z.infer<typeof newSaleSchema>;

export const saleIdSchema = z.object({
  id: z.uuid(),
});

export type SaleIdSchema = z.infer<typeof saleIdSchema>;

export const listSalesQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(["PAID", "PARTIAL", "UNPAID"]).optional(),
  user_id: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

export type ListSalesQuerySchema = z.infer<typeof listSalesQuerySchema>;

export const salesSummaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  range: z.enum(["today", "week", "month", "year", "all"]).optional(),
});

export type SalesSummaryQuerySchema = z.infer<typeof salesSummaryQuerySchema>;

export const salesTimeseriesQuerySchema = z.object({
  range: z.enum(["today", "week", "month"]).default("week"),
});

export type SalesTimeseriesQuerySchema = z.infer<
  typeof salesTimeseriesQuerySchema
>;
