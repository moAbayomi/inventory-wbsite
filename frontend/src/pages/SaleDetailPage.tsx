import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Ban, Printer } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useSaleDetail } from "../hooks/useSales";

const STORE_PHONE = "+2348037189544";
const STORE_ADDRESS =
  "NO 11 Obafemi Awolowo Way, opposite Living Proofs Supermarket, Ayetoro, Osogbo";

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
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/sales"
          className="flex items-center gap-1 text-xs font-medium text-[#1C1C1A]/50 hover:text-[#1C1C1A]"
        >
          <ArrowLeft size={12} />
          Sales history
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
        >
          <Printer size={16} />
          Print receipt
        </button>
      </div>

      {/* Only this card stays visible once the print stylesheet in
          index.css kicks in -- everything else on the page (nav, the print
          button itself) gets hidden. The "receipt" named page there sizes
          the print job to an 80mm thermal-printer slip instead of a full
          sheet, for shops printing off a small handheld/POS receipt
          printer -- browsers that don't support named pages just fall back
          to their default page size. */}
      <div className="printable-receipt mx-auto w-full max-w-md rounded-lg border border-black/5 bg-white p-6">
        <div className="mb-5 flex flex-col items-center gap-1.5 border-b border-dashed border-black/10 pb-5 text-center">
          <img
            src="/logo.jpg"
            alt="Abby's Robe"
            className="mb-1 h-14 w-14 rounded-full object-cover"
          />
          <p className="font-display text-lg font-medium text-[#1C1C1A]">
            Abby's Robe
          </p>
          <p className="max-w-[220px] text-[11px] leading-snug text-[#1C1C1A]/60">
            {STORE_ADDRESS}
          </p>
          <p className="text-[11px] text-[#1C1C1A]/60">{STORE_PHONE}</p>
          <p className="mt-1 text-xs text-[#1C1C1A]/50">
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

        <p className="mt-5 border-t border-dashed border-black/10 pt-4 text-center text-[10px] text-[#1C1C1A]/40">
          Thank you for shopping with us!
        </p>
      </div>
    </div>
  );
}
