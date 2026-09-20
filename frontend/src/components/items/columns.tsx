import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Barcode } from "lucide-react";
import type { InventoryItem } from "../../types/api";

// A function instead of a plain array because the actions column needs to
// call back into the page (open the edit modal, or the barcode-label
// modal, with this row's item) — there's no other way to hand a table
// cell an onClick without it.
//
// `isAdmin` only gates the edit button. Editing an item's price/details is
// an admin-only action (backend-enforced via adminOnly on PATCH /items/:id)
// — a STAFF account would just get a 403 if it clicked through. Printing a
// barcode label isn't a write at all, so every role gets that one.
export function createItemColumns(
  onEdit: (item: InventoryItem) => void,
  onPrintLabel: (item: InventoryItem) => void,
  isAdmin: boolean,
): ColumnDef<InventoryItem>[] {
  const columns: ColumnDef<InventoryItem>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "sku", header: "SKU" },
    {
      accessorKey: "current_stock",
      header: "Stock",
      cell: ({ getValue, row }) => {
        const v = Number(getValue());
        const low = Number(row.original.low_stock_threshold ?? 0);
        return (
          <span className={v <= low ? "font-medium text-red-600" : ""}>
            {v}
          </span>
        );
      },
    },
    {
      accessorKey: "selling_price",
      header: "Price",
      cell: ({ getValue }) => `₦${Number(getValue()).toLocaleString()}`,
    },
    { accessorKey: "item_type", header: "Type" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Print barcode label for ${row.original.name}`}
            onClick={() => onPrintLabel(row.original)}
            className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-[#1C1C1A]"
          >
            <Barcode size={14} />
          </button>
          {isAdmin && (
            <button
              type="button"
              aria-label={`Edit ${row.original.name}`}
              onClick={() => onEdit(row.original)}
              className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-[#1C1C1A]"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return columns;
}
