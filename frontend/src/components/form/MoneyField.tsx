import { useFormContext } from "react-hook-form";
import type { InputHTMLAttributes } from "react";
import { getFieldError } from "./getFieldError";

interface MoneyFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  name: string;
  label: string;
  currency?: string;
}

// A NumberField with a currency prefix and a decimal step, so prices always
// read as money instead of a bare quantity. Registered the same way as the
// other fields (react-hook-form's `register`, not `Controller`) to match
// TextField/NumberField/SelectField — one consistent pattern across the set.
export function MoneyField({ name, label, currency = "₦", ...rest }: MoneyFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = getFieldError(errors, name);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-[#1C1C1A]/80">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1C1C1A]/40">
          {currency}
        </span>
        <input
          id={name}
          type="number"
          step="0.01"
          min={0}
          inputMode="decimal"
          {...register(name, { valueAsNumber: true })}
          {...rest}
          aria-invalid={!!error}
          className="w-full rounded-md border border-black/10 py-2 pr-3 pl-8 text-sm outline-none focus:border-[#C9A24B]/60"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
}
