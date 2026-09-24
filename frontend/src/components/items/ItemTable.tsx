import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { InventoryItem } from "../../types/api";
import { createItemColumns } from "./columns";
import { useAuth } from "../../hooks/useAuth";

interface ItemsTableProps {
  data: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  // Both optional -- see the comment in columns.tsx. A page that doesn't
  // pass one just doesn't get that action's button in the row.
  onPrintLabel?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
}

export function ItemsTable({ data, onEdit, onPrintLabel, onDelete }: ItemsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const { isAdmin } = useAuth();

  // Rebuilt only when these change (i.e. basically never) — not on every
  // render — so react-table doesn't think it has a brand new set of
  // columns each time and throw away sorting/filter state.
  const columns = useMemo(
    () => createItemColumns(onEdit, onPrintLabel, isAdmin, onDelete),
    [onEdit, onPrintLabel, isAdmin, onDelete],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Global search */}
      <input
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Search items…"
        className="w-full max-w-sm rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-[#1C1C1A]/35 focus:border-[#C9A24B]/60"
      />

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAF9] text-left">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-black/5">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-xs font-medium text-[#1C1C1A]/60"
                  >
                    {h.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-[#1C1C1A]"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() && (
                          <ArrowUpDown
                            size={12}
                            className={
                              h.column.getIsSorted()
                                ? "text-[#C9A24B]"
                                : "opacity-40"
                            }
                          />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-4 py-12 text-center text-sm text-[#1C1C1A]/40"
                >
                  No items match.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-black/5 last:border-0 hover:bg-[#FAFAF9]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[#1C1C1A]/80">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 text-sm text-[#1C1C1A]/60">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()} · {table.getFilteredRowModel().rows.length}{" "}
          items
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-black/10 p-1.5 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-black/10 p-1.5 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
