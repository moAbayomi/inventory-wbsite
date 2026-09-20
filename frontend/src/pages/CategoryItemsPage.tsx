import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Ban } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useCategory } from "../hooks/useCategory";
import { useItems } from "../hooks/useItems";
import { ItemsTable } from "../components/items/ItemTable";
import { Modal } from "../components/Modal";
import { ItemForm } from "../components/form/ItemForm";
import type { InventoryItem } from "../types/api";

// Reuses ItemsTable/ItemForm/Modal wholesale rather than building a second
// item table -- this screen is just Inventory pre-filtered to one category,
// so it gets the same search/sort/pagination and the same admin-only edit
// action for free.
export default function CategoryItemsPage() {
  const { id } = useParams<{ id: string }>();
  const { categories, isLoading: categoriesLoading, isError: categoriesError } = useCategory();
  const { data: items, isLoading: itemsLoading, isError: itemsError } = useItems();
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null);

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
          <ItemsTable data={itemsInCategory} onEdit={setModalItem} />
        </div>
      )}

      {modalItem && (
        <Modal onClose={() => setModalItem(null)} title={`Edit ${modalItem.name}`}>
          <ItemForm item={modalItem} onSuccess={() => setModalItem(null)} />
        </Modal>
      )}
    </div>
  );
}
