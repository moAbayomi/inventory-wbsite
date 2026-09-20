import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.email("invalid email format"),
  role: z.enum(["ADMIN", "STAFF"]),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1, "invite token is required"),
    name: z.string().min(1, "name is required"),
    password: z.string().min(8, "password should be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "password should be at least 8 characters"),
  })
  .refine((data) => data.password == data.confirmPassword, {
    message: "passwords do not match",
    path: ["confirmPassword"],
  });
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
