// Builds a short, readable SKU *base* like the ones in the seed data
// ("ANK-RBF-46", "SHIRT-ANK-RBF-M") instead of a sequential counter
// ("FAB-000123"). This won't byte-match a hand-picked seed SKU -- those
// were chosen by eye, and real fabric/color names don't abbreviate by any
// one consistent rule -- but it follows the same shape: a family code (what
// groups this item with others like it), then a color/style code, then
// whatever actually distinguishes one variant from another (width or
// size). Turning the base into a guaranteed-unique SKU (appending "-2",
// "-3", ...) is left to the caller, since that needs a DB round-trip this
// function deliberately doesn't do.

function abbreviate(text: string | null | undefined, maxLen: number): string {
  if (!text) return "";
  const words = text.toUpperCase().match(/[A-Z]+/g);
  if (!words || words.length === 0) return "";

  if (words.length > 1) {
    // Multi-word input ("Royal Blue") -> initials ("RB").
    return words
      .map((w) => w[0])
      .join("")
      .slice(0, maxLen);
  }

  const word = words[0]!;
  if (word.length <= maxLen) return word;

  // A single long word -> keep the first letter and drop vowels from the
  // rest, so "Ivory" reads as "IVRY" instead of just being chopped to "IVO".
  const consonantForm = word[0] + word.slice(1).replace(/[AEIOU]/g, "");
  return (consonantForm.length >= 3 ? consonantForm : word).slice(0, maxLen);
}

export interface SkuInput {
  item_type: "FABRIC" | "READY_MADE";
  name: string;
  // `| undefined` alongside `| null` on every optional field here, not just
  // one or the other -- tsconfig has exactOptionalPropertyTypes on, which
  // means an optional property's value type has to include every value
  // it's actually assigned. The caller (itemsController) hands these
  // straight from a zod-validated body where an omitted field types as
  // `| undefined` (never `null`), so `| null` alone doesn't cover what's
  // actually passed in, even though the property itself is optional.
  color?: string | null | undefined;
  width_inches?: number | null | undefined;
  dye_lot?: string | null | undefined;
  style_code?: string | null | undefined;
  size?: string | null | undefined;
  // The item's category name, if it has one -- preferred over the item's
  // own name for the family code so every item in e.g. "Lace" shares one
  // prefix, even though each item's own name differs.
  categoryName?: string | null | undefined;
}

export function buildSkuBase(input: SkuInput): string {
  const family = abbreviate(input.categoryName ?? input.name, 4) || "ITM";

  if (input.item_type === "READY_MADE") {
    // style_code is already meant to be a descriptive code the shop chose
    // (e.g. "SHIRT-ANK-RBF") -- reuse it as-is rather than re-deriving one,
    // exactly like the seed data's ready-made SKUs do.
    if (input.style_code?.trim()) {
      const base = input.style_code.trim().toUpperCase();
      return input.size ? `${base}-${input.size.toUpperCase()}` : base;
    }
    const colorPart = abbreviate(input.color, 3);
    return [family, colorPart, input.size?.toUpperCase()]
      .filter(Boolean)
      .join("-");
  }

  const colorPart = abbreviate(input.color, 3);
  const measurePart = input.width_inches
    ? String(input.width_inches)
    : (input.dye_lot?.trim() ?? "");
  return [family, colorPart, measurePart].filter(Boolean).join("-");
}
