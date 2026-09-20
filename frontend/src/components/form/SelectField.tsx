import { useFormContext } from "react-hook-form";
import type { SelectHTMLAttributes } from "react";
import { getFieldError } from "./getFieldError";

interface Option { value: string; label: string }

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label: string;
  options: Option[];
}

export function SelectField({ name, label, options, ...rest }: SelectFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = getFieldError(errors, name);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-[#1C1C1A]/80">
        {label}
      </label>
      <select
        id={name}
        {...register(name)}
        {...rest}
        aria-invalid={!!error}
        className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#C9A24B]/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
    </div>
  );
}