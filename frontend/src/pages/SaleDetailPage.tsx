import { useParams, Link } from "react-router-dom";
import { useRef, useState } from "react";
import { ArrowLeft, Ban, Printer, Share2, Loader2 } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useSaleDetail } from "../hooks/useSales";
import { jsPDF } from "jspdf";
import { toCanvas } from "html-to-image";

const STORE_PHONE = "+2348037189544";
const STORE_ADDRESS =
  "NO 11 Obafemi Awolowo Way, opposite Living Proofs Supermarket, Ayetoro, Osogbo";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useSaleDetail(id);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

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

  function formatNigerianNumber(phone: string) {
    let p = phone.replace(/\D/g, "");
    if (p.startsWith("0")) p = "234" + p.slice(1);
    return p;
  }

  async function buildReceiptPdf(): Promise<Blob> {
    const node = receiptRef.current!;
    await document.fonts.ready; // make sure Manrope/Fraunces are loaded

    const canvas = await toCanvas(node, {
      pixelRatio: 3, // sharp text
      backgroundColor: "#ffffff",
      style: { border: "none", borderRadius: "0", margin: "0" },
    });

    const W = 80; // mm, matches your thermal slip width
    const H = (canvas.height / canvas.width) * W;
    const doc = new jsPDF({ unit: "mm", format: [W, H] });
    doc.addImage(
      canvas.toDataURL("image/jpeg", 0.85),
      "JPEG",
      0,
      0,
      W,
      H,
      undefined,
      "FAST",
    );
    return doc.output("blob");
  }

  async function sendReceiptPdf() {
    if (sharing) return; // ignore double taps
    setSharing(true);
    try {
      const blob = await buildReceiptPdf();
      const file = new File([blob], `receipt-${sale.id}.pdf`, {
        type: "application/pdf",
      });

      if (navigator.canShare?.({ files: [file] })) {
        // Files only: no text/title/url, to avoid duplicates in WhatsApp
        await navigator.share({ files: [file] });
        return;
      }

      // Fallback: download the PDF, then open the customer's chat
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      if (sale.customer_phone) {
        window.open(
          `https://wa.me/${formatNigerianNumber(sale.customer_phone)}`,
          "_blank",
        );
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error(err);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/sales"
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-[#1C1C1A]/50 transition-colors hover:text-[#1C1C1A]"
        >
          <ArrowLeft size={14} />
          Sales history
        </Link>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-[#17171A] transition-colors hover:bg-black/[0.03] active:scale-[0.98]"
          >
            <Printer size={16} />
            Print
          </button>

          <button
            type="button"
            onClick={sendReceiptPdf}
            disabled={sharing}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#17171A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
            {sharing ? "Preparing..." : "Share"}
          </button>
        </div>
      </div>

      <div
        ref={receiptRef}
        className="printable-receipt mx-auto w-full max-w-md rounded-lg border border-black/5 bg-white p-6"
      >
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
              {sale.customer_name || "Walk-in"}
            </span>
          </div>
          {sale.customer_phone && (
            <div className="flex justify-between">
              <span className="text-[#1C1C1A]/50">Phone</span>
              <span className="text-[#1C1C1A]">{sale.customer_phone}</span>
            </div>
          )}
          {sale.sold_by_name && (
            <div className="flex justify-between">
              <span className="text-[#1C1C1A]/50">Served by</span>
              <span className="text-[#1C1C1A]">{sale.sold_by_name}</span>
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
                  {Number(line.quantity).toLocaleString()} × ₦
                  {Number(line.price_per_unit).toLocaleString()}
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
