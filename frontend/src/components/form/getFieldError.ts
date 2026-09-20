import type { FieldErrors, FieldError } from "react-hook-form";

// TextField / NumberField / SelectField / MoneyField all take a plain
// `name` string prop and need that field's error out of react-hook-form's
// `errors` object. For a flat name ("sku") that's just `errors.sku` — but
// `register` and `watch` also accept dotted paths for nested fields
// ("payment.method"), and `errors` mirrors that nesting as real nested
// objects (`errors.payment?.method`), NOT a flat key literally named
// "payment.method". `errors["payment.method"]` (bracket access with the
// dotted string) looks for a field named exactly that and never finds one —
// which is why a nested field's error silently never displayed. This walks
// the path a segment at a time instead of assuming it's flat.
export function getFieldError(
  errors: FieldErrors,
  name: string,
): FieldError | undefined {
  return name.split(".").reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
    errors,
  ) as FieldError | undefined;
}
