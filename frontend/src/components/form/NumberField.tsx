import { useFormContext } from "react-hook-form";
import type { InputHTMLAttributes } from "react";
import { getFieldError } from "./getFieldError";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
}

// Not `valueAsNumber: true` -- that turns an empty box into NaN, and NaN
// fails zod's number check even on an optional field (.optional() only
// forgives undefined). Worse, a field that's hidden -- "Width (in)" once
// the type is switched to Ready-made -- keeps that NaN in the form values,
// so the whole form refused to submit with the error on a field you
// couldn't see. Empty now means "not set" (undefined), which .optional()
// and .default() both handle.
export const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : Number(v);

export function NumberField({ name, label, ...rest }: TextFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = getFieldError(errors, name);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-[#1C1C1A]/80">
        {label}
      </label>
      <input
        id={name}
        type="number"
        {...register(name, { setValueAs: emptyToUndefined })}
        {...rest}
        aria-invalid={!!error}
        className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#C9A24B]/60"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
    </div>
  );
}