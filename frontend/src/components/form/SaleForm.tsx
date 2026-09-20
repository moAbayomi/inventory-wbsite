import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { SearchSelect } from "../ui/SearchSelect";
import { TextField } from "./TextField";
import { SelectField } from "./SelectField";
import { useItems } from "../../hooks/useItems";
import { useCreateSale } from "../../hooks/useSales";
import { newSaleSchema, paymentMethods, type NewSaleData } from "../../schemas/sales";
import type { InventoryItem } from "../../types/api";

// No z.input/z.output split needed here — see the comment at the top of
// schemas/sales.ts for why. useForm and the mutation both use NewSaleData.
const defaultValues: NewSaleData = {
  items: [],
  customer_name: "",
  payment: { method: "CASH", reference: "" },
};

// A short code the cashier reads out for the customer to include in their
// transfer's narration -- the reverse of the old flow, where the cashier
// copied a number *out of* the customer's bank app. Not enforced unique in
// the database (nothing here depends on that), so a plain random code is
// enough for now; a real Paystack reference takes over this exact field
// once that's wired up, matched automatically off its webhook instead of
// typed by anyone.
function generateReference(): string {
  return `TRX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function SaleForm() {
  const { data: items } = useItems();
  const mutation = useCreateSale();
  const navigate = useNavigate();

  const form = useForm<NewSaleData>({
    resolver: zodResolver(newSaleSchema),
    defaultValues,
  });

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const itemsById = useMemo(
    () => new Map((items ?? []).map((i) => [i.id, i])),
    [items],
  );

  const cart = form.watch("items");
  const paymentMethod = form.watch("payment.method");

  // The array-level "at least one item" error (from .min(1) on the whole
  // `items` array) doesn't fit react-hook-form's normal per-field FieldError
  // type, so TS won't let you read `.message` off it directly — this cast
  // is just naming what it actually is at runtime.
  const itemsError = form.formState.errors.items as { message?: string } | undefined;

  // A line is "over" when it asks for more than the item's current_stock.
  // Each item can only appear once in the cart (see handleSelectItem below),
  // so — unlike a bill with repeated lines — there's no need to sum
  // quantities across lines for the same item before comparing.
  const overStockIndex = cart.findIndex((row) => {
    const item = itemsById.get(row.item_id);
    return item ? row.quantity > Number(item.current_stock) : false;
  });

  const total = cart.reduce((sum, row) => {
    const item = itemsById.get(row.item_id);
    return sum + Number(item?.selling_price ?? 0) * (row.quantity || 0);
  }, 0);

  const profit = cart.reduce((sum, row) => {
    const item = itemsById.get(row.item_id);
    if (!item) return sum;
    return (
      sum + (Number(item.selling_price) - Number(item.cost_price)) * (row.quantity || 0)
    );
  }, 0);

  // Selecting an item already in the cart bumps its quantity by one instead
  // of adding a second line for the same item — the way a real cash
  // register handles "scan the same barcode again".
  const handleSelectItem = (item: InventoryItem) => {
    const existingIndex = fields.findIndex((f) => f.item_id === item.id);
    if (existingIndex >= 0) {
      const current = cart[existingIndex];
      update(existingIndex, { ...current, quantity: current.quantity + 1 });
    } else {
      append({ item_id: item.id, quantity: 1 });
    }
  };

  const onSubmit = (data: NewSaleData) => {
    mutation.mutate(data, {
      // Land on the receipt for the sale that just happened, rather than
      // resetting and staying on the checkout form — the cashier usually
      // wants to confirm what was just recorded (or hand the screen to the
      // customer) right after completing a sale.
      onSuccess: (sale) => {
        toast.success("Sale recorded");
        form.reset(defaultValues);
        navigate(`/sales/${sale.id}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error ?? "Couldn't record the sale");
      },
    });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-lg border border-black/5 bg-white p-5">
          <SearchSelect
            items={items ?? []}
            onSelect={handleSelectItem}
            getKey={(i) => i.id}
            getLabel={(i) => i.name}
            getSearchValue={(i) => `${i.name} ${i.sku ?? ""}`}
            getExactMatchValue={(i) => i.sku}
            getDetail={(i) => `₦${Number(i.selling_price).toLocaleString()}`}
            placeholder="Search or scan an item…"
            autoFocus
          />

          {itemsError?.message && (
            <p role="alert" className="text-sm text-red-600">
              {itemsError.message}
            </p>
          )}

          {fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#1C1C1A]/40">
              No items added yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-black/5">
              {fields.map((field, index) => {
                const item = itemsById.get(field.item_id);
                if (!item) return null;
                const isOver = index === overStockIndex;
                return (
                  <div key={field.id} className="flex flex-col gap-1 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#1C1C1A]">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#1C1C1A]/45">
                          ₦{Number(item.selling_price).toLocaleString()} / {item.unit}
                        </p>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        aria-invalid={isOver}
                        {...form.register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className={`w-20 rounded-md border px-2 py-1.5 text-sm outline-none focus:border-[#C9A24B]/60 ${
                          isOver ? "border-red-400" : "border-black/10"
                        }`}
                      />
                      <span className="w-24 shrink-0 text-right text-sm text-[#1C1C1A]/80">
                        ₦
                        {(Number(item.selling_price) * (cart[index]?.quantity || 0)).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => remove(index)}
                        className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                    {isOver && (
                      <p className="text-xs text-red-600">
                        Only {item.current_stock} {item.unit} left
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {fields.length > 0 && (
            <div className="flex items-center justify-between border-t border-black/5 pt-3 text-sm">
              <span className="text-[#1C1C1A]/50">
                Profit ₦{profit.toLocaleString()}
              </span>
              <span className="font-semibold text-[#1C1C1A]">
                Total ₦{total.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-black/5 bg-white p-5">
          <div className="grid grid-cols-2 gap-4">
            <TextField name="customer_name" label="Customer name (optional)" />
            <SelectField
              name="payment.method"
              label="Payment method"
              options={paymentMethods.map((m) => ({ value: m, label: m }))}
            />
          </div>

          {(paymentMethod === "TRANSFER" || paymentMethod === "POS") && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    name="payment.reference"
                    label="Reference (optional)"
                    placeholder="Paste the bank's reference, or generate one"
                  />
                </div>
                {/* Nothing here auto-fills -- this field behaves exactly
                    like it did before unless you click this. */}
                <button
                  type="button"
                  onClick={() =>
                    form.setValue("payment.reference", generateReference())
                  }
                  className="flex items-center gap-1.5 rounded-md border border-black/10 px-3 py-2 text-sm text-[#1C1C1A]/70 transition-colors hover:border-black/20 hover:text-[#1C1C1A]"
                >
                  <RefreshCw size={14} />
                  Generate
                </button>
              </div>
              <p className="text-xs text-[#1C1C1A]/45">
                Still optional, same as before. If you already have the
                customer's bank reference, paste that. "Generate" is only
                useful if you want to read a code to the customer *before*
                they transfer, so there's nothing to copy out of their bank
                app afterward.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || fields.length === 0 || overStockIndex !== -1}
          className="rounded-md bg-[#17171A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mutation.isPending ? "Completing sale…" : `Complete sale — ₦${total.toLocaleString()}`}
        </button>
      </form>
    </FormProvider>
  );
}
