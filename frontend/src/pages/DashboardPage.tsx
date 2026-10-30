import { useState } from "react";
import { useDashboard } from "../hooks/useDashboard";
import { SectionSpinner } from "../components/Spinner";
// Capital "Dashboard" -- matches the folder's actual on-disk name (it
// already held Dashboard.tsx, DashHeader.tsx, etc.). macOS's filesystem is
// case-insensitive, so a lowercase "dashboard" import resolves fine here
// but silently 404s on a case-sensitive Linux build/host -- worth catching
// before deploying anywhere other than this machine.
import { RevenueChart } from "../components/Dashboard/RevenueChart";
import { LogStockUpdateForm } from "../components/form/LogStockUpdateForm";
import { RoleGate } from "../components/RoleGate";
import type { SalesRange } from "../api/sales";
import type {
  InventoryTotals,
  LowStockResponse,
  SalesSummary,
  SalesTimeseries,
} from "../types/api";
import { AlertTriangle, Package, BadgeDollarSign, Plus, ArrowRight } from "lucide-react";

// A brand new database is not an error: every endpoint answers 200 with
// zeroed totals and empty lists. Those payloads render fine (the tiles show
// 0/₦0 and the chart shows its empty state), so the only reason to show the
// whole-page failure notice is a request that actually failed. These
// placeholders stand in for the brief window before the first response
// lands, so a slow endpoint can't blank the dashboard either.
const EMPTY_TOTALS: InventoryTotals = {
  item_count: 0,
  total_stock_value: "0",
  total_retail_value: "0",
  out_of_stock_count: 0,
  potential_profit: "0",
};

const EMPTY_LOW_STOCK: LowStockResponse = { items: [], count: 0 };

const EMPTY_SALES_SUMMARY: SalesSummary = {
  range: { from: null, to: null },
  totals: { revenue: "0", profit: "0", sale_count: 0, average_sale: "0.00" },
  by_payment_method: [],
};

const RANGE_OPTIONS: { value: SalesRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const RANGE_TILE_LABEL: Record<SalesRange, string> = {
  today: "Sales today",
  week: "Sales this week",
  month: "Sales this month",
};

export default function DashboardPage() {
  // One control drives both the "Sales" tile and the chart below it, so
  // they can't disagree about which window "Week" means.
  const [range, setRange] = useState<SalesRange>("today");
  const [showStockModal, setShowStockModal] = useState(false);
  const { totals, lowStock, salesSummary, timeseries, isLoading, isError } =
    useDashboard(range);

  // Bucket has to follow the selected range even before the first response,
  // or the chart's x-axis labels would be wrong for the empty state.
  const emptyTimeseries: SalesTimeseries = {
    range: { from: "", to: "" },
    bucket: range === "today" ? "hour" : "day",
    points: [],
  };

  if (isLoading) return <SectionSpinner />;

  const inventory = totals ?? EMPTY_TOTALS;
  const restocking = lowStock ?? EMPTY_LOW_STOCK;
  const summary = salesSummary ?? EMPTY_SALES_SUMMARY;
  const series = timeseries ?? emptyTimeseries;

  const stats = [
    { label: "Items tracked", value: inventory.item_count, icon: Package },
    {
      label: "Needs restocking",
      value: restocking.count,
      icon: AlertTriangle,
    },
    {
      label: RANGE_TILE_LABEL[range],
      value: `₦${Number(summary.totals.revenue).toLocaleString()}`,
      icon: BadgeDollarSign,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {isError && (
        <p className="rounded-md border border-[#C9A24B]/30 bg-[#C9A24B]/10 px-4 py-2 text-xs text-[#1C1C1A]/70">
          Some figures couldn't be loaded — showing what's available. Refresh
          to try again.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
            Dashboard
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {/* Admin only -- the backend rejects a staff account's stock
            update anyway (adminOnly on /items/:id/adjust). */}
        <RoleGate role="ADMIN">
          <button
            onClick={() => setShowStockModal(true)}
            className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
          >
            <Plus size={16} />
            Log stock update
          </button>
        </RoleGate>
      </div>

      {showStockModal && (
        <LogStockUpdateForm onClose={() => setShowStockModal(false)} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-lg border border-black/5 bg-white px-5 py-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A24B]/10 text-[#C9A24B]">
              <Icon size={16} />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1C1C1A]">{value}</p>
              <p className="text-xs text-[#1C1C1A]/50">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-black/5 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-[#1C1C1A]">Revenue</h2>
          <div className="flex items-center gap-1 rounded-md border border-black/10 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === opt.value
                    ? "bg-[#17171A] text-white"
                    : "text-[#1C1C1A]/60 hover:text-[#1C1C1A]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-4">
          <RevenueChart points={series.points} bucket={series.bucket} />
        </div>
      </section>

      <section className="rounded-lg border border-black/5 bg-white">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-[#1C1C1A]">
            Needs restocking
          </h2>
          <a
            href="/inventory"
            className="flex items-center gap-1 text-xs font-medium text-[#1C1C1A]/50 hover:text-[#1C1C1A]"
          >
            View inventory
            <ArrowRight size={12} />
          </a>
        </div>
        {restocking.items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#1C1C1A]/45">
            Nothing below its threshold right now.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {restocking.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#1C1C1A]">
                    {item.name}
                  </p>
                  <p className="text-xs text-[#1C1C1A]/45">
                    {item.current_stock} {item.unit} left ·{" "}
                    {item.low_stock_threshold} {item.unit} threshold
                  </p>
                </div>
                <button className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-[#1C1C1A]/70 transition-colors hover:border-black/20 hover:text-[#1C1C1A]">
                  Mark reordered
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
