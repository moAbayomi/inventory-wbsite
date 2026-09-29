import { useMemo, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import type { InventoryItem } from "../../types/api";

interface BarcodeLabelProps {
  item: InventoryItem;
}

// Enough for any realistic restock; stops a typo like 5000 from building a
// print job big enough to freeze the browser.
const MAX_COPIES = 300;

// Code128, not the numeric-only UPC/EAN printed on retail packaging --
// Code128 encodes any string, so it can represent a SKU like "ANK-RBF-46"
// directly instead of needing a separate purely-numeric lookup code. This
// stays entirely client-side: the SKU is already loaded with the item, so
// turning it into a scannable pattern is pure rendering, no backend call.
function barcodeDataUrl(sku: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, sku, {
    format: "CODE128",
    width: 2,
    height: 60,
    fontSize: 14,
    margin: 8,
  });
  // Rendered once and reused as an <img> for every copy, rather than
  // running JsBarcode again for each of (possibly) hundreds of labels.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(svg),
  )}`;
}

export function BarcodeLabel({ item }: BarcodeLabelProps) {
  // One label per unit in stock. Fabric stock can be fractional (12.5
  // yards) -- round up so the last partial yard still gets a label.
  const inStock = Math.max(0, Math.ceil(Number(item.current_stock) || 0));
  const [copies, setCopies] = useState(Math.max(1, Math.min(inStock, MAX_COPIES)));
  const [printCount, setPrintCount] = useState(1);

  const src = useMemo(() => (item.sku ? barcodeDataUrl(item.sku) : null), [item.sku]);

  if (!item.sku || !src) {
    return (
      <p className="py-6 text-center text-sm text-[#1C1C1A]/45">
        This item has no SKU to print.
      </p>
    );
  }

  // flushSync so the sheet below has the right number of labels in the DOM
  // before the print dialog snapshots the page.
  const print = (count: number) => {
    flushSync(() => setPrintCount(count));
    window.print();
  };

  const validCopies = Number.isInteger(copies) && copies >= 1 && copies <= MAX_COPIES;

  const label = (key?: number) => (
    <div
      key={key}
      className="flex flex-col items-center gap-1 rounded-md border border-black/10 p-3 break-inside-avoid print:rounded-none print:border-dashed"
    >
      <p className="max-w-[220px] truncate text-sm font-medium text-[#1C1C1A]">
        {item.name}
      </p>
      <img src={src} alt={`Barcode ${item.sku}`} className="h-[88px]" />
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5">
      {/* On screen: a single preview. */}
      <div className="print:hidden">{label()}</div>

      {/* The actual print job: `printCount` copies, laid out left to right
          so a full sheet of stickers fills up. Portalled straight into
          <body> rather than left inside the modal -- a fixed-position modal
          only ever prints as one page, which would cut a long run of labels
          off. index.css hides the rest of the app while this is printing. */}
      {createPortal(
        <div className="printable-label hidden flex-wrap content-start gap-2 print:flex">
          {Array.from({ length: printCount }, (_, i) => label(i))}
        </div>,
        document.body,
      )}

      <div className="flex w-full flex-col gap-3 print:hidden">
        <button
          type="button"
          onClick={() => print(1)}
          className="flex items-center justify-center gap-2 rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-[#1C1C1A] transition-colors hover:bg-black/5"
        >
          <Printer size={16} />
          Print one label
        </button>

        <div className="flex flex-col gap-1.5 rounded-md border border-black/5 bg-[#FAFAF9] p-3">
          <label htmlFor="label-copies" className="text-sm font-medium text-[#1C1C1A]/80">
            Labels to print
          </label>
          <p className="text-xs text-[#1C1C1A]/50">
            {inStock > 0
              ? `Starts at one per ${item.unit} in stock (${inStock}). Change it if you need more or fewer.`
              : "Nothing in stock right now, so enter how many you need."}
          </p>
          <div className="flex gap-2">
            <input
              id="label-copies"
              type="number"
              min={1}
              max={MAX_COPIES}
              step={1}
              value={Number.isNaN(copies) ? "" : copies}
              onChange={(e) => setCopies(e.target.valueAsNumber)}
              className="w-24 rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A24B]/60"
            />
            <button
              type="button"
              disabled={!validCopies}
              onClick={() => print(copies)}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Printer size={16} />
              {validCopies ? `Print ${copies} label${copies === 1 ? "" : "s"}` : "Print labels"}
            </button>
          </div>
          {!validCopies && (
            <p role="alert" className="text-xs text-red-600">
              Enter a whole number from 1 to {MAX_COPIES}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
