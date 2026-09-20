import {z} from "zod"

export const auditItemSchema = z.object({
  counted_stock: z.number().min(0, "counted stock cannot be negative"),
  note: z.string().optional(),
});

export type AuditItemInput = z.infer<typeof auditItemSchema>;
