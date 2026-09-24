import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Ban, Receipt, X, FileDown, Loader2 } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useSalesList } from "../hooks/useSales";
import { exportSalesPdf } from "../api/sales";
import { downloadBlob } from "../utils/downloadBlob";

const PAGE_SIZE = 20;

const paymentBadgeClasses: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  UNPAID: "bg-red-50 text-red-700",
};

const statusOptions = ["PAID", "PARTIAL", "UNPAID"] as const;

interface Filters {
  q: string;
  from: string;
  to: string;
  status: "" | (typeof statusOptions)[number];
}

const emptyFilters: Filters = { q: "", from: "", to: "", status: "" };

export default function SalesHistoryPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  // What actually gets sent to the server -- the search box debounces into
  // this, everything else updates it immediately. Without the debounce,
  // every keystroke in the search box would fire its own request.
  const [appliedQ, setAppliedQ] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setAppliedQ(filters.q.trim()), 350);
    return () => clearTimeout(id);
  }, [filters.q]);

  const hasActiveFilters =
    filters.q || filters.from || filters.to || filters.status;

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedQ("");
    setPage(1);
  };

  // Same filters currently applied on screen -- so "export" always means
  // "the report for exactly what I'm looking at right now", not everything.
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await exportSalesPdf({
        from: filters.from || undefined,
        to: filters.to ? `${filters.to}T23:59:59.999` : undefined,
        status: filters.status || undefined,
        q: appliedQ || undefined,
      });
      downloadBlob(blob, `sales-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.error("Couldn't generate the PDF report. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading, isError } = useSalesList({
    page,
    limit: PAGE_SIZE,
    from: filters.from || undefined,
    // Date inputs give midnight for the picked day -- without pushing "to"
    // to the end of that day, a sale made at 3pm today would fall outside
    // an "up to today" filter that looks like it should include it.
    to: filters.to ? `${filters.to}T23:59:59.999` : undefined,
    status: filters.status || undefined,
    q: appliedQ || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
            Sales history
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">
            {data ? `${data.count} sales recorded` : "Every sale, in one place"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Link
            to="/sales/new"
            className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
          >
            <Plus size={16} />
            New sale
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-black/5 bg-white p-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-[#1C1C1A]/60">
            Customer name or phone
          </label>
          <input
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
            placeholder="Search…"
            className="w-full min-w-[10rem] rounded-md border border-black/10 px-3 py-2 text-sm outline-none placeholder:text-[#1C1C1A]/35 focus:border-[#C9A24B]/60"
          />
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
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#1C1C1A]/60">Status</label>
          <select
            value={filters.status}
            onChange={(e) =>
              updateFilter("status", e.target.value as Filters["status"])
            }
            className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#C9A24B]/60"
          >
            <option value="">All</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
          <p className="text-sm">Couldn't load sales history. Try refreshing.</p>
        </div>
      ) : data.sales.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-black/5 bg-white py-16 text-[#1C1C1A]/50">
          <Receipt size={20} />
          <p className="text-sm">
            {hasActiveFilters
              ? "No sales match these filters."
              : "No sales recorded yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF9] text-left">
              <tr className="border-b border-black/5">
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">
                  Date
                </th>
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">
                  Customer
                </th>
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">
                  Payment
                </th>
                <th className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#1C1C1A]/60">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-black/5 last:border-0 hover:bg-[#FAFAF9]"
                >
                  <td className="px-4 py-3 text-[#1C1C1A]/80">
                    <Link to={`/sales/${sale.id}`} className="hover:underline">
                      {new Date(sale.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#1C1C1A]/80">
                    {sale.customer_name ?? "Walk-in"}
                  </td>
                  <td className="px-4 py-3 text-[#1C1C1A]/80">
                    {sale.payment_method}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        paymentBadgeClasses[sale.payment_status] ??
                        "bg-black/5 text-[#1C1C1A]/60"
                      }`}
                    >
                      {sale.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#1C1C1A]">
                    ₦{Number(sale.total_amount).toLocaleString()}
                  </td>
                </tr>
              ))}
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
