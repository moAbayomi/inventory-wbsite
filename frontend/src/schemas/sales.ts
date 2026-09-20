import { z } from "zod";

// No `.default()` anywhere in this one, on purpose — that's what forced
// items.ts to need two separate types (ItemFormValues vs ItemCreateData,
// see ItemForm.tsx). Every field here that needs a starting value gets it
// from useForm's `defaultValues` instead, so the schema's input and output
// shapes are identical and one type covers both useForm and the mutation.

export const paymentMethods = ["CASH", "TRANSFER", "POS", "CHEQUE", "USSD"] as const;

export const saleLineSchema = z.object({
  item_id: z.string().min(1),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
});

export const newSaleSchema = z.object({
  items: z.array(saleLineSchema).min(1, "Add at least one item"),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  payment: z.object({
    method: z.enum(paymentMethods),
    reference: z.string().optional(),
  }),
  note: z.string().optional(),
});

export type NewSaleData = z.infer<typeof newSaleSchema>;
