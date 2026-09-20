// CategoriesPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Ban } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useCategory } from "../hooks/useCategory";
import { useItems } from "../hooks/useItems";
import { Modal } from "../components/Modal";
import { AddCategoryForm } from "../components/form/AddCategoryForm";
import { RoleGate } from "../components/RoleGate";

export default function CategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();
  const { categories, count, isLoading, isError } = useCategory();
  const { data: items } = useItems();

  // How many items actually sit in each category -- the card used to show
  // the total category *count* here (a copy-paste leftover), which meant
  // every card claimed the same number regardless of what was in it.
  const itemCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items ?? []) {
      if (!item.category_id) continue;
      counts.set(item.category_id, (counts.get(item.category_id) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  if (isLoading) return <SectionSpinner />;
  if (isError || !count || !categories) {
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
            Categories
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">{count} categories</p>
        </div>
        <RoleGate role="ADMIN">
          <button
            className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus size={16} />
            Add category
          </button>
        </RoleGate>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/categories/${cat.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate(`/categories/${cat.id}`);
              }
            }}
            className="group flex cursor-pointer items-center justify-between rounded-lg border border-black/5 bg-white px-5 py-4 transition-colors hover:border-black/10 hover:bg-[#FAFAF9]"
          >
            <div>
              <p className="text-sm font-medium text-[#1C1C1A]">{cat.name}</p>
              <p className="text-xs text-[#1C1C1A]/45">
                {itemCountByCategory.get(cat.id) ?? 0} items
              </p>
            </div>
            {/* stopPropagation so clicking an action doesn't also navigate
                into the category -- the card itself is the "view items"
                click target, these are separate actions on top of it. */}
            <RoleGate role="ADMIN">
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  aria-label={`Edit ${cat.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-[#1C1C1A]"
                >
                  <Pencil size={14} />
                </button>
                <button
                  aria-label={`Delete ${cat.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </RoleGate>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <Modal onClose={() => setIsFormOpen(false)} title="Add category">
          <AddCategoryForm onSuccess={() => setIsFormOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
