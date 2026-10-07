import { useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Ban, Barcode, Pencil, Image as ImageIcon } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { Modal } from "../components/Modal";
import { ItemForm } from "../components/form/ItemForm";
import { BarcodeLabel } from "../components/items/BarcodeLabel";
import { useItem, useItemEvents } from "../hooks/useItems";
import { useCategory } from "../hooks/useCategory";
import { useAuth } from "../hooks/useAuth";
import { typeBadgeClasses } from "../utils/eventStyles";

const naira = (v: string | number) => `₦${Number(v).toLocaleString()}`;

// How many recent stock movements to show here; the Activity page has the
// full history.
const HISTORY_LIMIT = 10;

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-[#1C1C1A]/45">{label}</dt>
      <dd className="text-sm text-[#1C1C1A]">{children}</dd>
    </div>
  );
}

// One product's own page -- opened by clicking its row in the items table.
// Everyone sees the photo, stock and selling price. Cost, margin, stock
// history and the edit/label buttons are admin only, matching what the
// table and dashboard already restrict.
export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data: item, isLoading, isError } = useItem(id);
  const { data: events } = useItemEvents(id, isAdmin);
  const { categories } = useCategory();
  const [editing, setEditing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  if (isLoading) return <SectionSpinner />;
  if (isError || !item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-[#1C1C1A]/50">
        <Ban size={20} />
        <p className="text-sm">Couldn't load this item. It may have been deleted.</p>
        <Link to="/inventory" className="text-sm underline">
          Back to inventory
        </Link>
      </div>
    );
  }

  const stock = Number(item.current_stock);
  const lowStock = stock <= Number(item.low_stock_threshold);
  const category = item.category_id
    ? (categories?.find((c) => c.id === item.category_id)?.name ??
      (categories ? "(deleted category)" : "…"))
    : "Uncategorized";
  const margin = Number(item.selling_price) - Number(item.cost_price);
  const isFabric = item.item_type === "FABRIC";

  const attributes: [string, string | null][] = isFabric
    ? [
        ["Design", item.design],
        ["Colour", item.color],
        ["Width", item.width_inches != null ? `${item.width_inches} in` : null],
        ["Dye lot", item.dye_lot],
      ]
    : [
        ["Size", item.size],
        ["Style code", item.style_code],
      ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/inventory"
          className="flex items-center gap-1 text-xs font-medium text-[#1C1C1A]/50 hover:text-[#1C1C1A]"
        >
          <ArrowLeft size={12} />
          Inventory
        </Link>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPrinting(true)}
              className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#1C1C1A] hover:bg-black/5"
            >
              <Barcode size={16} />
              Print labels
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 rounded-md bg-[#17171A] px-3 py-2 text-sm font-medium text-white hover:bg-[#17171A]/85"
            >
              <Pencil size={16} />
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="aspect-square w-full overflow-hidden rounded-lg border border-black/5 bg-white">
          {item.image_url && !photoFailed ? (
            <img
              src={item.image_url}
              alt={item.name}
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#1C1C1A]/25">
              <ImageIcon size={40} />
              <span className="text-xs">No photo</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 rounded-lg border border-black/5 bg-white p-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#1C1C1A]/45 uppercase">
              {isFabric ? "Fabric" : "Ready-made"} · {category}
            </p>
            <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
              {item.name}
            </h1>
            {item.sku && (
              <p className="mt-0.5 font-mono text-xs text-[#1C1C1A]/50">{item.sku}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-[#1C1C1A]/45">In stock</p>
              <p
                className={`text-2xl font-semibold ${lowStock ? "text-red-600" : "text-[#1C1C1A]"}`}
              >
                {stock.toLocaleString()}{" "}
                <span className="text-sm font-normal text-[#1C1C1A]/50">{item.unit}</span>
              </p>
              {lowStock && (
                <p className="text-xs text-red-600">
                  Low stock (alert at {Number(item.low_stock_threshold)})
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#1C1C1A]/45">Selling price</p>
              <p className="text-2xl font-semibold text-[#1C1C1A]">
                {naira(item.selling_price)}
                <span className="text-sm font-normal text-[#1C1C1A]/50"> / {item.unit}</span>
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-black/5 pt-4 sm:grid-cols-3">
            {attributes
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <Detail key={label} label={label}>
                  {v}
                </Detail>
              ))}
            {isAdmin && (
              <>
                <Detail label="Cost price">{naira(item.cost_price)}</Detail>
                <Detail label="Profit per unit">{naira(margin)}</Detail>
                <Detail label="Low stock alert at">
                  {Number(item.low_stock_threshold)} {item.unit}
                </Detail>
              </>
            )}
          </dl>

          {item.description && (
            <p className="border-t border-black/5 pt-4 text-sm text-[#1C1C1A]/70">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-black/5 bg-white">
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
            <h2 className="text-sm font-medium text-[#1C1C1A]">Recent stock history</h2>
            <Link to="/activity" className="text-xs text-[#1C1C1A]/50 hover:text-[#1C1C1A]">
              All activity →
            </Link>
          </div>
          {!events || events.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-[#1C1C1A]/40">
              No stock movements yet.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {events.slice(0, HISTORY_LIMIT).map((e) => {
                const qty = Number(e.quantity);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span
                      className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${typeBadgeClasses[e.type]}`}
                    >
                      {e.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[#1C1C1A]/80">
                        {e.note || "—"}
                      </p>
                      <p className="text-xs text-[#1C1C1A]/45">
                        {new Date(e.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {e.user?.name ? ` · ${e.user.name}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-medium ${qty < 0 ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {qty > 0 ? "+" : ""}
                      {qty.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(false)} title={`Edit ${item.name}`}>
          <ItemForm item={item} onSuccess={() => setEditing(false)} />
        </Modal>
      )}

      {printing && (
        <Modal onClose={() => setPrinting(false)} title="Barcode label">
          <BarcodeLabel item={item} />
        </Modal>
      )}
    </div>
  );
}
