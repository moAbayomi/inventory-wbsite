import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Ban } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useSaleDetail } from "../hooks/useSales";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useSaleDetail(id);

  if (isLoading) return <SectionSpinner />;
  if (isError || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-[#1C1C1A]/50">
        <Ban size={20} />
        <p className="text-sm">Couldn't load this sale.</p>
      </div>
    );
  }

  const { sale, items, payments } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/sales"
          className="flex items-center gap-1 text-xs font-medium text-[#1C1C1A]/50 hover:text-[#1C1C1A]"
        >
          <ArrowLeft size={12} />
          Sales history
        </Link>
      </div>

      {/* Receipt card -- kept narrow and centered so it reads like an
          actual receipt rather than another wide dashboard table. */}
      <div className="mx-auto w-full max-w-md rounded-lg border border-black/5 bg-white p-6">
        <div className="mb-5 border-b border-dashed border-black/10 pb-5 text-center">
          <p className="font-display text-lg font-medium text-[#1C1C1A]">
            Sweevo
          </p>
          <p className="text-xs text-[#1C1C1A]/50">
            {new Date(sale.created_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[#1C1C1A]/50">Customer</span>
            <span className="text-[#1C1C1A]">
              {sale.customer_name ?? "Walk-in"}
            </span>
          </div>
          {sale.customer_phone && (
            <div className="flex justify-between">
              <span className="text-[#1C1C1A]/50">Phone</span>
              <span className="text-[#1C1C1A]">{sale.customer_phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#1C1C1A]/50">Status</span>
            <span className="text-[#1C1C1A]">{sale.payment_status}</span>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 border-t border-dashed border-black/10 pt-5">
          {items.map((line) => (
            <div key={line.id} className="flex justify-between text-sm">
              <div>
                <p className="text-[#1C1C1A]">{line.item_name ?? "Item"}</p>
                <p className="text-xs text-[#1C1C1A]/45">
                  {line.item_sku ? `${line.item_sku} · ` : ""}
                  {Number(line.quantity).toLocaleString()} ×{" "}
                  ₦{Number(line.price_per_unit).toLocaleString()}
                </p>
              </div>
              <span className="font-medium text-[#1C1C1A]">
                ₦{Number(line.subtotal).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 border-t border-dashed border-black/10 pt-5 text-sm">
          <div className="flex justify-between text-base font-semibold text-[#1C1C1A]">
            <span>Total</span>
            <span>₦{Number(sale.total_amount).toLocaleString()}</span>
          </div>
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex justify-between text-xs text-[#1C1C1A]/50"
            >
              <span>
                {p.method}
                {p.reference ? ` · ${p.reference}` : ""}
              </span>
              <span>₦{Number(p.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {sale.note && (
          <p className="mt-5 border-t border-dashed border-black/10 pt-4 text-xs text-[#1C1C1A]/50">
            {sale.note}
          </p>
        )}
      </div>
    </div>
  );
}
