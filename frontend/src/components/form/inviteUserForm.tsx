import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteSchema, type InviteFormData } from "../../schemas/invites";
import { TextField } from "../form/TextField";
import { SelectField } from "../form/SelectField";
import { useInvite } from "../../hooks/useInvite";

export function InviteUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { createInvite } = useInvite();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "STAFF" },
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          createInvite.mutate(data, { onSuccess })
        )}
        className="flex flex-col gap-4"
      >
        <TextField name="email" label="Email" type="email" />
        <SelectField
          name="role"
          label="Role"
          options={[
            { value: "STAFF", label: "Staff" },
            { value: "ADMIN", label: "Admin" },
          ]}
        />
        {createInvite.isError && (
          <p className="text-sm text-red-600">
            {createInvite.error?.response?.data?.error ?? "Failed to send invite"}
          </p>
        )}
        <button
          type="submit"
          disabled={createInvite.isPending}
          className="rounded-md bg-[#17171A] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {createInvite.isPending ? "Sending…" : "Send invite"}
        </button>
      </form>
    </FormProvider>
  );
}