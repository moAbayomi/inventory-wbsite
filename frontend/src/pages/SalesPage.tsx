import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SaleForm } from "../components/form/SaleForm";

export default function SalesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
            New sale
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">
            Search or scan to add items, then take payment.
          </p>
        </div>
        <Link
          to="/sales"
          className="flex items-center gap-1 text-xs font-medium text-[#1C1C1A]/50 hover:text-[#1C1C1A]"
        >
          View sales history
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="max-w-xl">
        <SaleForm />
      </div>
    </div>
  );
}
