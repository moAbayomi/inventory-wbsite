import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Ban } from "lucide-react";
import { toast } from "sonner";
import { SectionSpinner } from "../components/Spinner";
import { useCategory } from "../hooks/useCategory";
import { useItems, useDeleteItem } from "../hooks/useItems";
import { ItemsTable } from "../components/items/ItemTable";
import { Modal } from "../components/Modal";
import { ItemForm } from "../components/form/ItemForm";
import { BarcodeLabel } from "../components/items/BarcodeLabel";
import type { InventoryItem } from "../types/api";

// Reuses ItemsTable/ItemForm/Modal wholesale rather than building a second
// item table -- this screen is just Inventory pre-filtered to one category,
// so it gets the same search/sort/pagination and the same admin-only edit
// action for free. (It was previously missing the print-label and delete
// actions InventoryPage has -- not passing onPrintLabel meant ItemsTable
// silently rendered without that button; now it gets the same three
// actions InventoryPage does.)
export default function CategoryItemsPage() {
  const { id } = useParams<{ id: string }>();
  const { categories, isLoading: categoriesLoading, isError: categoriesError } = useCategory();
  const { data: items, isLoading: itemsLoading, isError: itemsError } = useItems();
  const deleteItem = useDeleteItem();
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null);
  const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const category = categories?.find((c) => c.id === id);
  const itemsInCategory = useMemo(
    () => (items ?? []).filter((item) => item.category_id === id),
    [items, id],
  );

  if (categoriesLoading || itemsLoading) return <SectionSpinner />;
  if (categoriesError || itemsError || !category) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-[#1C1C1A]/50">
        <Ban size={20} />
        <p className="text-sm">
          {category ? "Couldn't load these items. Try refreshing." : "Category not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/categories"
          className="flex items-center gap-1 text-xs font-medium text-[#1C1C1A]/50 hover:text-[#1C1C1A]"
        >
          <ArrowLeft size={12} />
          Categories
        </Link>
      </div>

      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
          {category.name}
        </h1>
        <p className="text-sm text-[#1C1C1A]/50">
          {itemsInCategory.length} item{itemsInCategory.length === 1 ? "" : "s"}
        </p>
      </div>

      {itemsInCategory.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-black/5 bg-white py-16 text-[#1C1C1A]/50">
          <p className="text-sm">Nothing in this category yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/5 bg-white">
          <ItemsTable
            data={itemsInCategory}
            onEdit={setModalItem}
            onPrintLabel={setLabelItem}
            onDelete={setDeletingItem}
          />
        </div>
      )}

      {modalItem && (
        <Modal onClose={() => setModalItem(null)} title={`Edit ${modalItem.name}`}>
          <ItemForm item={modalItem} onSuccess={() => setModalItem(null)} />
        </Modal>
      )}

      {labelItem && (
        <Modal onClose={() => setLabelItem(null)} title="Barcode label">
          <BarcodeLabel item={labelItem} />
        </Modal>
      )}

      {deletingItem && (
        <Modal onClose={() => setDeletingItem(null)}>
          <h2 className="text-lg font-semibold">Delete {deletingItem.name}?</h2>
          <p className="mt-1 text-sm text-[#1C1C1A]/60">
            This removes it from the catalogue entirely -- it won't be
            findable by search or scan anymore. Its past sales and stock
            history stay on record either way.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setDeletingItem(null)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                deleteItem.mutate(deletingItem.id, {
                  onSuccess: () => {
                    toast.success(`${deletingItem.name} deleted`);
                    setDeletingItem(null);
                  },
                  onError: (error) => {
                    toast.error(
                      error.response?.data?.error ?? "Couldn't delete this item",
                    );
                  },
                });
              }}
              disabled={deleteItem.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {deleteItem.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
