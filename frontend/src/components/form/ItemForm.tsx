import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  itemCreateSchema,
  type ItemCreateData,
  type ItemFormValues,
} from "../../schemas/items";
import { createItem, editItem } from "../../api/items";
import { itemKeys } from "../../queries/keys";
import { useCategory } from "../../hooks/useCategory";
import { TextField } from "./TextField";
import { NumberField } from "./NumberField";
import { MoneyField } from "./MoneyField";
import { SelectField } from "./SelectField";
import { ImageField } from "./ImageField";
import type { InventoryItem } from "../../types/api";

interface ItemFormProps {
  item?: InventoryItem; // present when editing, absent when creating
  onSuccess: () => void;
}

export function ItemForm({ item, onSuccess }: ItemFormProps) {
  const isEdit = !!item;
  const queryClient = useQueryClient();
  const { categories } = useCategory();
  const [imageUploading, setImageUploading] = useState(false);

  // Always resolve against the full (create) schema. Its extra two fields
  // (current_stock / low_stock_threshold) both have zod `.default()`s, so
  // validation still passes when they're absent from the form. What
  // actually keeps edits from touching stock is the mutation below, which
  // strips those two fields before calling the edit endpoint.
  //
  // Typed with ItemFormValues (z.input), NOT ItemCreateData (z.infer /
  // z.output) — that mismatch was the squiggly. z.output is the shape AFTER
  // defaults are filled in (unit/current_stock/low_stock_threshold all
  // required, since a default guarantees they'll have a value); z.input is
  // the shape BEFORE that, where those same fields are optional (you might
  // not have typed anything into "Opening stock" yet). zodResolver infers
  // its own generic from the schema's input side, so pairing it with
  // useForm<ItemCreateData> (output) asked TS to prove a function that
  // accepts "maybe optional" also accepts "definitely required" — which is
  // backwards, and is exactly the "Resolver<...> is not assignable to
  // Resolver<...>" error. Matching useForm to the input side removes the
  // mismatch entirely.
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemCreateSchema),
    defaultValues: item
      ? {
          name: item.name,
          item_type: item.item_type,
          sku: item.sku ?? "",
          unit: item.unit ?? "yard",
          cost_price: Number(item.cost_price),
          selling_price: Number(item.selling_price),
          category_id: item.category_id ?? "",
          description: item.description ?? undefined,
          image_url: item.image_url ?? undefined,
          design: item.design ?? undefined,
          color: item.color ?? undefined,
          width_inches: item.width_inches != null ? Number(item.width_inches) : undefined,
          dye_lot: item.dye_lot ?? undefined,
          size: item.size ?? undefined,
          style_code: item.style_code ?? undefined,
        }
      : {
          item_type: "FABRIC",
          unit: "yard",
          sku: "",
          name: "",
          category_id: "",
          cost_price: 0,
          selling_price: 0,
        },
  });

  const itemType = form.watch("item_type");

  // The item's category has to exist as an <option> for the dropdown to
  // show it. The categories list loads separately (and can be slower than
  // the form opening, especially on mobile data); until it arrives, or if
  // the category has since been deleted (the list only has active ones),
  // the browser would fall back to showing "Uncategorized" even though the
  // item still has its category. Keep a placeholder option for it instead.
  const savedCategoryId = item?.category_id ?? "";
  const categoryOptions = [
    { value: "", label: "Uncategorized" },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  if (savedCategoryId && !categoryOptions.some((o) => o.value === savedCategoryId)) {
    categoryOptions.push({
      value: savedCategoryId,
      label: categories ? "(deleted category)" : "Loading…",
    });
  }

  // Once the real options render, point the <select> back at the value the
  // form holds -- adding <option>s doesn't change which one is selected.
  useEffect(() => {
    if (!categories) return;
    form.setValue("category_id", form.getValues("category_id"));
  }, [categories, form]);

  // A ready-made garment is sold by the piece, not the yard. Switching type
  // moves the unit along with it -- but only off the other type's units,
  // so a unit someone picked on purpose is left alone.
  useEffect(() => {
    const sub = form.watch((values, { name }) => {
      if (name !== "item_type") return;
      const unit = values.unit ?? "yard";
      if (values.item_type === "READY_MADE" && (unit === "yard" || unit === "meter")) {
        form.setValue("unit", "piece");
      } else if (values.item_type === "FABRIC" && (unit === "piece" || unit === "set")) {
        form.setValue("unit", "yard");
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  const mutation = useMutation<InventoryItem, AxiosError<{ error?: string }>, ItemCreateData>({
    mutationFn: (data) => {
      // A native <select> can't send `undefined`, so "Uncategorized" comes
      // back as "" — turn that into `undefined` before it goes anywhere near
      // the API (the backend's own category_id is nullable/uuid, not "").
      // Same deal for no photo: "" means "none", so don't send it on create.
      const payload = {
        ...data,
        category_id: data.category_id || undefined,
        image_url: data.image_url || undefined,
      };

      // Fields for the *other* type stay in the form's values when their
      // inputs are hidden (e.g. a colour typed before switching to
      // Ready-made). Don't save attributes you can no longer see.
      if (!isEdit) {
        if (data.item_type === "READY_MADE") {
          delete payload.design;
          delete payload.color;
          delete payload.width_inches;
          delete payload.dye_lot;
        } else {
          delete payload.size;
          delete payload.style_code;
        }
      }

      if (isEdit) {
        // Day 2's own acceptance line for this task: "editing an existing
        // item never shows or sends a stock field." These two are only in
        // ItemCreateData for the create form's benefit — drop them here.
        const { current_stock, low_stock_threshold, ...editData } = payload;
        // On an edit, a missing image_url means "leave the photo alone", so
        // "Remove photo" has to send an explicit null to actually clear it.
        return editItem(item!.id, {
          ...editData,
          image_url: data.image_url || null,
        });
      }
      return createItem(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.list });
      onSuccess();
    },
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          // By the time this callback runs, the zodResolver has already
          // validated `data` against itemCreateSchema and its defaults have
          // been filled in — so this cast isn't papering over anything, it's
          // just telling TS what's already true at runtime: this is now
          // ItemCreateData (output), not the looser ItemFormValues (input)
          // the form was typed with while you were still typing into it.
          mutation.mutate(data as ItemCreateData),
          // Validation failed. Errors show under their fields, but say so
          // up front too, so a failed save is never silent.
          () => toast.error("Some fields need fixing before this can be saved"),
        )}
        className="flex flex-col gap-4"
      >
        <ImageField
          name="image_url"
          label="Photo"
          onUploadingChange={setImageUploading}
        />

        <SelectField
          name="item_type"
          label="Type"
          options={[
            { value: "FABRIC", label: "Fabric" },
            { value: "READY_MADE", label: "Ready-made" },
          ]}
        />

        <TextField name="name" label="Name" />
        <TextField
          name="sku"
          label="SKU"
          placeholder={isEdit ? undefined : "Leave blank to auto-generate"}
        />

        <SelectField
          name="category_id"
          label="Category"
          options={categoryOptions}
        />

        <SelectField
          name="unit"
          label="Unit"
          options={[
            { value: "yard", label: "Yard" },
            { value: "meter", label: "Meter" },
            { value: "piece", label: "Piece" },
            { value: "set", label: "Set" },
          ]}
        />

        {itemType === "FABRIC" && (
          <>
            <TextField name="design" label="Design" />
            <TextField name="color" label="Color" />
            <NumberField name="width_inches" label="Width (in)" />
            <TextField name="dye_lot" label="Dye lot" />
          </>
        )}

        {itemType === "READY_MADE" && (
          <>
            <TextField name="size" label="Size" />
            <TextField name="style_code" label="Style code" />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <MoneyField name="cost_price" label="Cost price" />
          <MoneyField name="selling_price" label="Selling price" />
        </div>

        <TextField name="description" label="Description" />

        {!isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <NumberField name="current_stock" label="Opening stock" />
            <NumberField name="low_stock_threshold" label="Low stock threshold" />
          </div>
        )}

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {mutation.error?.response?.data?.error ?? "Failed to save"}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || imageUploading}
          className="mt-1 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Create item"}
        </button>
      </form>
    </FormProvider>
  );
}
