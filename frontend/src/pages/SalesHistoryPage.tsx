import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight, Ban, Receipt } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useSalesList } from "../hooks/useSales";

const PAGE_SIZE = 20;

const paymentBadgeClasses: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  UNPAID: "bg-red-50 text-red-700",
};

export default function SalesHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useSalesList({
    page,
    limit: PAGE_SIZE,
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
        <Link
          to="/sales/new"
          className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
        >
          <Plus size={16} />
          New sale
        </Link>
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
          <p className="text-sm">No sales recorded yet.</p>
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
