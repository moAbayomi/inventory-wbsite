import { z } from "zod";

const userBodySchema = z.object({
  name: z.string().min(5, "name has to be at least 5 characters"),
  role: z.enum(["ADMIN", "STAFF"]),
  is_active: z.boolean(),
})
export const updateUserSchema = userBodySchema.partial().refine(data => Object.keys(data).length > 0, {
  message: "At least one field (name or role)  must be provided for update",
  path: ["_global"]
});

export type UserEditData = z.infer<typeof updateUserSchema>