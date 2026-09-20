import { z } from "zod";

const baseItem = z.object({
  name: z.string().min(1, "Required"),
  item_type: z.enum(["FABRIC", "READY_MADE"]),
  // Optional now that the backend generates one ("FAB-000123" /
  // "RM-000123") whenever this is left blank — see ItemForm's SKU field.
  sku: z.string().optional(),
  // A native <select> can only ever send a string, and "no category picked"
  // has to be SOME string — so it sends "". `.optional()` alone only lets
  // a field be `undefined`, not `""`, so without the `.or(z.literal(""))`
  // escape hatch, picking "Uncategorized" would fail the .uuid() check.
  category_id: z.string().uuid().optional().or(z.literal("")),
  unit: z.string().default("yard"),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),

  // fabric only
  design: z.string().optional(),
  color: z.string().optional(),
  width_inches: z.coerce.number().optional(),
  dye_lot: z.string().optional(),

  // ready-made only
  size: z.string().optional(),
  style_code: z.string().optional(),
});

export const itemCreateSchema = baseItem.extend({
  current_stock: z.coerce.number().min(0).default(0),
  low_stock_threshold: z.coerce.number().min(0).default(5),
});

export const itemEditSchema = itemCreateSchema.omit({
  current_stock: true,
  low_stock_threshold: true,
});

export type ItemCreateData = z.infer<typeof itemCreateSchema>;
export type ItemEditData = z.infer<typeof itemEditSchema>;

// The shape of the form WHILE you're typing into it — before zod's
// `.default()`s (unit, current_stock, low_stock_threshold) have filled
// anything in. This is deliberately different from ItemCreateData above,
// which is the shape AFTER a successful validation (defaults applied,
// everything required that zod guarantees will be there). useForm should be
// typed with this one, not ItemCreateData — see the comment in ItemForm.tsx
// for what goes wrong if you mix the two up.
export type ItemFormValues = z.input<typeof itemCreateSchema>;
