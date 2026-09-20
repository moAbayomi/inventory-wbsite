import { useForm, FormProvider, type FieldValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ZodSchema } from "zod/v3"
import type { ReactNode } from "react"

interface FormProps<T extends FieldValues> {
  schema: ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  defaultValues?: Partial<T>;
  children: ReactNode;
  className?: string
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
}: FormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
          {children}
        </form>
      </FormProvider>
    );
}
