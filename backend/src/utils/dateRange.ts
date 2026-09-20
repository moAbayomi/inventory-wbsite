export type SalesRange = "today" | "week" | "month" | "year" | "all";

// The same "how far back does this range go" math getSalesSummary already
// needed -- pulled out so getSalesTimeseries doesn't reimplement it
// slightly differently and quietly drift out of sync with what the stat
// tiles show for the same range value.
export function resolveDateRange(range?: SalesRange): {
  startDate?: Date;
  endDate?: Date;
} {
  if (!range || range === "all") return {};

  const now = new Date();
  const start = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { startDate: start, endDate: now };
}
