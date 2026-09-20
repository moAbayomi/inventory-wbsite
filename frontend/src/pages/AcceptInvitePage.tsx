import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { TextField } from "../components/form/TextField";
import { acceptInvite } from "../api/invites";
import type { User } from "../types/api";

const acceptSchema = z
  .object({
    name: z.string().min(1, "Required"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type AcceptFormData = z.infer<typeof acceptSchema>;

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const form = useForm<AcceptFormData>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { name: "", password: "", confirm: "" },
  });

  // Same two things as useInvite.ts: the explicit AxiosError generic (so
  // `mutation.error?.response` compiles instead of erroring against plain
  // `Error`), and actually forwarding confirmPassword -- the backend's
  // acceptInviteSchema requires it and re-checks password === confirmPassword
  // itself; dropping it here meant every real submission would 400 even
  // though the client-side check above looked like it passed.
  const mutation = useMutation<User, AxiosError<{ error?: string }>, AcceptFormData>({
    mutationFn: (data: AcceptFormData) =>
      acceptInvite({
        token: token!,
        name: data.name,
        password: data.password,
        confirmPassword: data.confirm,
      }),
    onSuccess: () => navigate("/login"),
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#1C1C1A]/60">
          Invalid invite link. Ask the admin to resend.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1A]">
            Set up your account
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">
            You've been invited to Sweevo
          </p>
        </div>

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="flex flex-col gap-4 rounded-lg border border-black/5 bg-white p-6"
          >
            <TextField name="name" label="Your name" />
            <TextField name="password" type="password" label="Password" />
            <TextField name="confirm" type="password" label="Confirm password" />

            {mutation.isError && (
              <p className="text-sm text-red-600">
                {mutation.error?.response?.data?.error ??
                  "Couldn't create account. Try again."}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-[#17171A] px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {mutation.isPending ? "Creating…" : "Create account"}
            </button>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}