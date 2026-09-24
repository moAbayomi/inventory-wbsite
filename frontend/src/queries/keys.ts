export const inventoryKeys = {
  current: ["inventory", "current"] as const,
  lowStock: ["inventory", "lowStock"] as const,
};

export const authKeys = {
  me: ["auth", "me"] as const,
};

export const userKeys = {
  all: ["users"] as const,
  list: ["users", "list"] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
  list: ["categories", "list"] as const,
};

export const activityKeys = {
  recent: ["activity", "recent"] as const,
};

export const itemKeys = {
  all: ["items"] as const,
  list: ["items", "list"] as const,
};

export const salesKeys = {
  // A function, not a fixed tuple -- the stat tile and the dashboard chart
  // can each be looking at a different range at once, so each range needs
  // its own cache entry. `summaryAll`/`timeseriesAll` below are the
  // shorter prefixes used to invalidate every range variant at once
  // without needing to know which one is currently selected.
  summary: (range: string = "today") => ["sales", "summary", range] as const,
  summaryAll: ["sales", "summary"] as const,
  timeseries: (range: string = "week") =>
    ["sales", "timeseries", range] as const,
  timeseriesAll: ["sales", "timeseries"] as const,
  // A function, not a fixed tuple, because the history list is paginated/
  // filtered -- each distinct set of params needs its own cache entry so
  // switching pages doesn't show stale results under the same key.
  // `object`, not `Record<string, unknown>` -- the caller passes a named
  // interface (ListSalesParams) with no index signature of its own, and
  // that doesn't satisfy Record<string, unknown>'s implicit one. `object`
  // has no such requirement. (This keeps reverting somehow -- if you're
  // reading this after re-adding the Record version, that's why it breaks.)
  list: (params: object = {}) => ["sales", "list", params] as const,
  detail: (id: string) => ["sales", "detail", id] as const,
};

export const inviteKeys = {
  all: ["invites"] as const,
  list: ["invites", "list"] as const,
};

export const eventKeys = {
  // A function, not a fixed tuple, same reasoning as salesKeys.list -- the
  // activity page's filters (type/date range/page) each need their own
  // cache entry.
  list: (params: object = {}) => ["events", "list", params] as const,
};