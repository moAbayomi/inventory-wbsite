import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, type UserEditData } from "../../schemas/user";
import { TextField } from "../form/TextField";
import { SelectField } from "../form/SelectField";
import type { User } from "../../types/api";

interface UserFormProps {
  user: User;
  onSubmit: (data: UserEditData) => void;
  isPending: boolean;
}

export function UserForm({ user, onSubmit, isPending }: UserFormProps) {
  const form = useForm<UserEditData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      role: user.role,
    },
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <TextField name="name" label="Name" />
        <SelectField
          name="role"
          label="Role"
          options={[
            { value: "ADMIN", label: "Admin" },
            { value: "STAFF", label: "Staff" },
          ]}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#17171A] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </FormProvider>
  );
}
