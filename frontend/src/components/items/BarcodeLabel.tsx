import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import type { InventoryItem } from "../../types/api";

interface BarcodeLabelProps {
  item: InventoryItem;
}

// Code128, not the numeric-only UPC/EAN printed on retail packaging --
// Code128 encodes any string, so it can represent a SKU like "ANK-RBF-46"
// directly instead of needing a separate purely-numeric lookup code. This
// stays entirely client-side: the SKU is already loaded with the item, so
// turning it into a scannable pattern is pure rendering, no backend call.
export function BarcodeLabel({ item }: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !item.sku) return;
    JsBarcode(svgRef.current, item.sku, {
      format: "CODE128",
      width: 2,
      height: 60,
      fontSize: 14,
      margin: 8,
    });
  }, [item.sku]);

  if (!item.sku) {
    return (
      <p className="py-6 text-center text-sm text-[#1C1C1A]/45">
        This item has no SKU to print.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Only this block stays visible once the print stylesheet in
          index.css kicks in -- the modal chrome, the print button below,
          and the rest of the app all get hidden for the actual page. */}
      <div className="printable-label flex flex-col items-center gap-1 rounded-md border border-black/10 p-4">
        <p className="text-sm font-medium text-[#1C1C1A]">{item.name}</p>
        <svg ref={svgRef} />
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
      >
        <Printer size={16} />
        Print label
      </button>
    </div>
  );
}
