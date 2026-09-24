import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Modal } from "../Modal";
import { SearchSelect } from "../ui/SearchSelect";
import { TextField } from "./TextField";
import { SelectField } from "./SelectField";
import { useItems } from "../../hooks/useItems";
import { useAdjustStock } from "../../hooks/useItems";
import {
  stockAdjustmentSchema,
  stockMovementTypes,
  type StockAdjustmentData,
} from "../../schemas/stockAdjustment";
import type { InventoryItem } from "../../types/api";

const movementLabels: Record<(typeof stockMovementTypes)[number], string> = {
  RESTOCK: "Restock — a delivery came in",
  WASTE: "Waste — damaged or unsellable",
  ADJUSTMENT: "Adjustment — quick correction",
};

const defaultValues: StockAdjustmentData = {
  item_id: "",
  type: "RESTOCK",
  quantity: 1,
  note: "",
};

interface LogStockUpdateFormProps {
  onClose: () => void;
}

// The Dashboard's "Log stock update" button isn't scoped to any one item --
// unlike ItemForm's own stock field, this needs its own item picker up
// front. Reuses the same SearchSelect the checkout page uses (name/SKU
// search, scan-to-match on SKU) so a barcode scanner works here too.
export function LogStockUpdateForm({ onClose }: LogStockUpdateFormProps) {
  const { data: items } = useItems();
  const mutation = useAdjustStock();

  const form = useForm<StockAdjustmentData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues,
  });

  const selectedId = form.watch("item_id");
  const selectedItem = (items ?? []).find((i) => i.id === selectedId);

  const handleSelectItem = (item: InventoryItem) => {
    form.setValue("item_id", item.id, { shouldValidate: true });
  };

  const onSubmit = (data: StockAdjustmentData) => {
    mutation.mutate(
      {
        id: data.item_id,
        type: data.type,
        quantity: data.quantity,
        // Same "" vs undefined distinction as ItemForm's image_url --
        // an empty note field submits as "", not an absent key.
        note: data.note?.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${movementLabels[data.type].split(" —")[0]} logged`);
          onClose();
        },
        onError: (error) => {
          toast.error(error.response?.data?.error ?? "Couldn't log that stock update");
        },
      },
    );
  };

  return (
    <Modal onClose={onClose} title="Log stock update">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1C1C1A]/80">Item</label>
            <SearchSelect
              items={items ?? []}
              onSelect={handleSelectItem}
              getKey={(i) => i.id}
              getLabel={(i) => i.name}
              getSearchValue={(i) => `${i.name} ${i.sku ?? ""}`}
              getExactMatchValue={(i) => i.sku}
              getDetail={(i) => `${i.current_stock} ${i.unit} in stock`}
              placeholder="Search or scan an item…"
              autoFocus
            />
            {selectedItem && (
              <p className="text-xs text-[#1C1C1A]/50">
                {selectedItem.name} — currently {selectedItem.current_stock}{" "}
                {selectedItem.unit}
              </p>
            )}
            {form.formState.errors.item_id && (
              <p role="alert" className="text-sm text-red-600">
                {form.formState.errors.item_id.message}
              </p>
            )}
          </div>

          <SelectField
            name="type"
            label="Type"
            options={stockMovementTypes.map((t) => ({
              value: t,
              label: movementLabels[t],
            }))}
          />

          <TextField
            name="quantity"
            label="Quantity"
            type="number"
            step="0.01"
            min="0"
          />

          <TextField name="note" label="Note (optional)" placeholder="What happened?" />

          <button
            type="submit"
            disabled={mutation.isPending || !selectedItem}
            className="rounded-md bg-[#17171A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "Logging…" : "Log update"}
          </button>
        </form>
      </FormProvider>
    </Modal>
  );
}
