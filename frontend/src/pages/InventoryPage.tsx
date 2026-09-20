// InventoryPage.tsx
import { useState } from "react";
import { Plus, Ban } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useItems } from "../hooks/useItems";
import { ItemsTable } from "../components/items/ItemTable";
import { Modal } from "../components/Modal";
import { ItemForm } from "../components/form/ItemForm";
import { BarcodeLabel } from "../components/items/BarcodeLabel";
import { RoleGate } from "../components/RoleGate";
import type { InventoryItem } from "../types/api";

export default function InventoryPage() {
  const { data: items, isLoading, isError } = useItems();
  const [modalItem, setModalItem] = useState<InventoryItem | "new" | null>(null);
  const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);

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
    </div>
  );
}
