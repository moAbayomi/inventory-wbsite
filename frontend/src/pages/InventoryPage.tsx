// InventoryPage.tsx
import { useState } from "react";
import { Plus, Ban } from "lucide-react";
import { toast } from "sonner";
import { SectionSpinner } from "../components/Spinner";
import { useItems, useDeleteItem } from "../hooks/useItems";
import { ItemsTable } from "../components/items/ItemTable";
import { Modal } from "../components/Modal";
import { ItemForm } from "../components/form/ItemForm";
import { BarcodeLabel } from "../components/items/BarcodeLabel";
import { RoleGate } from "../components/RoleGate";
import type { InventoryItem } from "../types/api";

export default function InventoryPage() {
  const { data: items, isLoading, isError } = useItems();
  const deleteItem = useDeleteItem();
  const [modalItem, setModalItem] = useState<InventoryItem | "new" | null>(null);
  const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  if (isLoading) return <SectionSpinner />;
  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-[#1C1C1A]/50">
        <Ban size={20} />
        <p className="text-sm">Couldn't load the dashboard. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
            Inventory
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">
            {items?.length ?? 0} items tracked
          </p>
        </div>
        <RoleGate role="ADMIN">
          <button
            onClick={() => setModalItem("new")}
            className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
          >
            <Plus size={16} />
            Add item
          </button>
        </RoleGate>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/5 bg-white">
        <ItemsTable
          data={items ?? []}
          onEdit={setModalItem}
          onPrintLabel={setLabelItem}
          onDelete={setDeletingItem}
        />
      </div>

      {modalItem && (
        <Modal
          onClose={() => setModalItem(null)}
          title={modalItem === "new" ? "Add item" : `Edit ${modalItem.name}`}
        >
          <ItemForm
            item={modalItem === "new" ? undefined : modalItem}
            onSuccess={() => setModalItem(null)}
          />
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
