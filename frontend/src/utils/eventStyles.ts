import type { EventType } from "../types/api";

// Badge colours for stock movement types -- shared by the Activity page
// and the stock history on an item's own page.
export const typeBadgeClasses: Record<EventType, string> = {
  SALE: "bg-black/5 text-[#1C1C1A]/60",
  RESTOCK: "bg-emerald-50 text-emerald-700",
  WASTE: "bg-red-50 text-red-700",
  ADJUSTMENT: "bg-amber-50 text-amber-700",
  AUDIT: "bg-violet-50 text-violet-700",
  CREATE: "bg-sky-50 text-sky-700",
  DELETE: "bg-[#1C1C1A]/10 text-[#1C1C1A]/70",
};
