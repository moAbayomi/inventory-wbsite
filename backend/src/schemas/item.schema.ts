import { z } from "zod";

// Shared fields for both fabric (sold by the yard/metre off a roll) and
// ready-made garments (sold as a whole piece, described by size).
// Numeric fields are validated as plain numbers; controllers convert to the
// string form decimal.js/Postgres numeric columns expect right at the DB
// call, the same way adjustItemStock/newSale/auditItem already do. Keeping
// that conversion in one place (the controller) instead of a schema
// .transform() is what used to produce the literal string "undefined" for
// any field the caller omitted on a partial update.
const itemCoreFields = {
  name: z.string().min(2, "item name must be at least two characters"),
  item_type: z.enum(["FABRIC", "READY_MADE"]).default("FABRIC"),
  // Optional here on purpose: newItem now generates one ("FAB-000123" /
  sku: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string("sku cant be blank").optional(),
  ),
  unit: z.string().default("yard"),
  description: z.string().optional(),
  low_stock_threshold: z.number().min(0).default(5),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  currency: z.string().default("NGN"),
  category_id: z.uuid().optional(),
  // preprocess, not just .optional() -- a blank "Image URL" field on the
  // frontend form submits as "" (react-hook-form/HTML inputs don't have an
  // "unset" state), and "" isn't a valid URL, so .optional() alone still
  // rejected it: .optional() only ever forgives an *absent* key, never a
  // present-but-empty one. Treating "" the same as "not sent" here is what
  // was missing.
  image_url: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url("image_url must be a valid URL").optional(),
  ),
  // Fabric-specific — leave unset for a READY_MADE item.
  design: z.string().optional(),
  color: z.string().optional(),
  width_inches: z.number().int().positive().optional(),
  dye_lot: z.string().optional(),
  // Ready-made-specific — leave unset for a FABRIC item.
  size: z.string().optional(),
  // Groups sizes/lots of the same garment or design together for the
  // frontend (e.g. "SHIRT-ANKARA-BLUE" across sizes S/M/L).
  style_code: z.string().optional(),
};

export const newItemInputSchema = z.object({
  ...itemCoreFields,
  current_stock: z.number().min(0).default(0),
  note: z.string().optional(),
});

export type ItemSchema = z.infer<typeof newItemInputSchema>;

export const itemIdParamSchema = z.object({
  id: z.uuid(),
});

export type ItemIdParam = z.infer<typeof itemIdParamSchema>;

export const itemSkuParamSchema = z.object({
  sku: z.string().min(1),
});

export type ItemSkuParam = z.infer<typeof itemSkuParamSchema>;

// Deliberately does NOT include current_stock. Stock may only move through
// /items/:id/adjust, /items/:id/audit, or a sale — every one of those writes

export const updateItemSchema = z
  .object(itemCoreFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
    path: ["_global"],
  });

export type UpdateItem = z.infer<typeof updateItemSchema>;

export const adjustStockInput = z.object({
  quantity: z.number().positive(),
  type: z.enum(["RESTOCK", "WASTE", "ADJUSTMENT"]),
  note: z.string().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockInput>;
