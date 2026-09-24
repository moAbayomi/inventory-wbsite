import { z } from "zod";
export { insertUserSchema } from "../db/schema.ts";


export const listQuerySchema = z.object({
	page: z.preprocess(
		(v) => parseInt(String(v ?? "1"), 10),
		z.number().int().positive(),
	),
	pageSize: z.preprocess(
		(v) => parseInt(String(v ?? "25"), 10),
		z.number().int().positive().max(100),
	),
});
export type ListQuery = z.infer<typeof listQuerySchema>;


export const userIdParamSchema = z.object({
	id: z.uuid(),
});
export type IdParam = z.infer<typeof userIdParamSchema>;

export const userBodySchema = z.object({
  name: z.string().min(5, "name has to be at least 5 characters"),
  role: z.enum(["ADMIN", "STAFF"]),
  is_active: z.boolean(),
})
export const updateUserSchema = userBodySchema.partial().refine(data => Object.keys(data).length > 0, {
  message: "At least one field (name or role)  must be provided for update",
  path: ["_global"]
});

export type UserBody = z.infer<typeof userBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
