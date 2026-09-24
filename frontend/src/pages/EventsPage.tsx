import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Ban, History, X, FileDown, Loader2 } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useEvents } from "../hooks/useEvents";
import { exportEventsPdf } from "../api/events";
import { downloadBlob } from "../utils/downloadBlob";
import type { EventType } from "../types/api";

const PAGE_SIZE = 25;

const eventTypeOptions: EventType[] = [
  "SALE",
  "RESTOCK",
  "WASTE",
  "ADJUSTMENT",
  "AUDIT",
  "CREATE",
  "DELETE",
];

// Every one of these is the same inventory_events table -- a sale's stock
// deduction, a manual restock, a physical count reconciliation, an item
// being created or removed all write one of these rows. This page is the
// one place that shows all of them together, across every item.
const typeBadgeClasses: Record<EventType, string> = {
  SALE: "bg-black/5 text-[#1C1C1A]/60",
  RESTOCK: "bg-emerald-50 text-emerald-700",
  WASTE: "bg-red-50 text-red-700",
  ADJUSTMENT: "bg-amber-50 text-amber-700",
  AUDIT: "bg-violet-50 text-violet-700",
  CREATE: "bg-sky-50 text-sky-700",
  DELETE: "bg-[#1C1C1A]/10 text-[#1C1C1A]/70",
};

interface Filters {
  type: "" | EventType;
  from: string;
  to: string;
}

const emptyFilters: Filters = { type: "", from: "", to: "" };

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const hasActiveFilters = filters.type || filters.from || filters.to;

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const [isExporting, setIsExporting] = useState(false);

  // Same filters currently applied on screen -- so "export" always means
  // "the report for exactly what I'm looking at right now", not everything.
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await exportEventsPdf({
        type: filters.type || undefined,
        from: filters.from || undefined,
        to: filters.to ? `${filters.to}T23:59:59.999` : undefined,
      });
      downloadBlob(blob, `activity-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.error("Couldn't generate the PDF report. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading, isError } = useEvents({
    page,
    limit: PAGE_SIZE,
    type: filters.type || undefined,
    from: filters.from || undefined,
    // Same end-of-day nudge as the sales history filters -- otherwise a
    // "to today" filter would exclude everything logged after midnight.
    to: filters.to ? `${filters.to}T23:59:59.999` : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
            Activity
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">
            {data ? `${data.count} events recorded` : "Every stock movement, in one place"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-[#1C1C1A] transition-colors hover:border-black/20 disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileDown size={16} />
          )}
          Export PDF
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-black/5 bg-white p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#1C1C1A]/60">Type</label>
          <select
            value={filters.type}
            onChange={(e) => updateFilter("type", e.target.value as Filters["type"])}
            className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#C9A24B]/60"
          >
            <option value="">All types</option>
            {eventTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#1C1C1A]/60">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#C9A24B]/60"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#1C1C1A]/60">To</label>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#C9A24B]/60"
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-2 text-sm text-[#1C1C1A]/60 transition-colors hover:border-black/20 hover:text-[#1C1C1A]"
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <SectionSpinner />
      ) : isError || !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-[#1C1C1A]/50">
          <Ban size={20} />
          <p className="text-sm">Couldn't load the activity log. Try refreshing.</p>
        </div>
      ) : data.events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-black/5 bg-white py-16 text-[#1C1C1A]/50">
          <History size={20} />
          <p className="text-sm">
            {hasActiveFilters ? "No events match these filters." : "Nothing logged yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF9] text-left">
              <tr className="border-b border-black/5">
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#1C1C1A]/60">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#1C1C1A]/60">
                  Stock
                </th>
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">By</th>
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">Note</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => {
                const qty = Number(event.quantity);
                return (
                  <tr
                    key={event.id}
                    className="border-b border-black/5 last:border-0 hover:bg-[#FAFAF9]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[#1C1C1A]/80">
                      {new Date(event.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClasses[event.type]}`}
                      >
                        {event.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#1C1C1A]/80">
                      {event.item_name ?? "(deleted item)"}
                      {event.item_sku && (
                        <span className="ml-1.5 text-xs text-[#1C1C1A]/40">
                          {event.item_sku}
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        qty > 0 ? "text-emerald-700" : qty < 0 ? "text-red-600" : "text-[#1C1C1A]/60"
                      }`}
                    >
                      {qty > 0 ? "+" : ""}
                      {qty.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[#1C1C1A]/60">
                      {Number(event.prev_stock).toLocaleString()} → {Number(event.new_stock).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[#1C1C1A]/60">{event.user_name ?? "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-[#1C1C1A]/50" title={event.note ?? ""}>
                      {event.note ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-[#1C1C1A]/60">
          <span>
            Page {data.page} of {Math.ceil(data.count / data.limit)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-black/10 p-1.5 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * PAGE_SIZE >= data.count}
              className="rounded-md border border-black/10 p-1.5 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
