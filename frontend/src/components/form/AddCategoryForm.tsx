import { Form } from "./Form";
import { TextField } from "./TextField";
import { categorySchema } from "../../schemas/category";
import { useCategory } from "../../hooks/useCategory";

interface AddCategoryFormProps {
  onSuccess: () => void;
}

export function AddCategoryForm({ onSuccess }: AddCategoryFormProps) {
  const { createCategory } = useCategory();

  return (
    <Form
      schema={categorySchema}
      onSubmit={(data) => {
        createCategory.mutate(data, {
          onSuccess: () => onSuccess(),
        });
      }}
      className="flex flex-col gap-4"
    >
      <TextField name="name" label="Name" placeholder="Ankara" />
      <TextField
        name="description"
        label="Description"
        placeholder="Optional"
      />
      <button
        type="submit"
        disabled={createCategory.isPending}
        className="rounded-md bg-[#17171A] px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {createCategory.isPending ? "Saving…" : "Save"}
      </button>
    </Form>
  );
}
