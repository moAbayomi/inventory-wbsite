import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Barcode, Trash2 } from "lucide-react";
import type { InventoryItem } from "../../types/api";
import { Link } from "react-router-dom";
import { ItemThumbnail } from "./ItemThumbnail";

// A function instead of a plain array because the actions column needs to
// call back into the page (open the edit modal, or the barcode-label
// modal, with this row's item) — there's no other way to hand a table
// cell an onClick without it.
//
// `isAdmin` gates every action button: edit and delete (backend-enforced via
// adminOnly on PATCH/DELETE /items/:id, so a STAFF account would just get a
// 403), and printing labels, which is part of receiving stock -- the
// owner's job, not the cashier's.
//
// onPrintLabel/onDelete are optional -- CategoryItemsPage originally called
// this table without a print handler at all (a pre-existing gap, not
// something this change caused), so both actions only render when the page
// using this table actually wired one up, instead of assuming every caller
// has all three.
export function createItemColumns(
  onEdit: (item: InventoryItem) => void,
  onPrintLabel?: (item: InventoryItem) => void,
  isAdmin?: boolean,
  onDelete?: (item: InventoryItem) => void,
): ColumnDef<InventoryItem>[] {
  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Product name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <ItemThumbnail url={row.original.image_url} alt={row.original.name} />
          {/* A real link too, so the page can be opened in a new tab and
              reached with the keyboard -- not just by clicking the row. */}
          <Link
            to={`/inventory/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
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
        // Stop clicks here reaching the row, which would open the item page.
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Admin only, like edit/delete -- printing labels is part of
              receiving stock, which is the owner's job. */}
          {isAdmin && onPrintLabel && (
            <button
              type="button"
              aria-label={`Print barcode label for ${row.original.name}`}
              onClick={() => onPrintLabel(row.original)}
              className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-[#1C1C1A]"
            >
              <Barcode size={14} />
            </button>
          )}
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
          {isAdmin && onDelete && (
            <button
              type="button"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => onDelete(row.original)}
              className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return columns;
}
