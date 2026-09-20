import z from "zod";

// No `.default()` on role, deliberately -- the same z.input/z.output split
// that broke ItemForm's resolver twice (see schemas/items.ts) happens the
// instant a schema used with useForm<z.infer<...>> has any `.default()`
// field: the resolver infers off the input side (role optional), useForm
// is typed off the output side (role required), and TS refuses the
// mismatched Resolver<...>. Keeping role required here and setting the
// pre-selected value via useForm's `defaultValues` instead sidesteps the
// whole problem.
export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "STAFF"]),
});

export type InviteFormData = z.infer<typeof inviteSchema>;
