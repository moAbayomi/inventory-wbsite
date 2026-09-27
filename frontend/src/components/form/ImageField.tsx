import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { isAxiosError } from "axios";
import { ImagePlus, X } from "lucide-react";
import { Spinner } from "../Spinner";
import { uploadItemImage } from "../../api/items";
import { resizeImage } from "../../utils/resizeImage";

interface ImageFieldProps {
  name: string;
  label: string;
  // Lets the parent form hold its submit button while a photo is still
  // uploading, so an item can't be saved with the old (or no) photo.
  onUploadingChange?: (uploading: boolean) => void;
}

export function ImageField({ name, label, onUploadingChange }: ImageFieldProps) {
  const { watch, setValue } = useFormContext();
  const url: string | undefined = watch(name) || undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const resized = await resizeImage(file);
      const publicUrl = await uploadItemImage(resized);
      setValue(name, publicUrl, { shouldDirty: true, shouldValidate: true });
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 503) {
        setError("Photo uploads aren't set up yet.");
      } else if (isAxiosError(e) && e.response?.data?.error) {
        setError(e.response.data.error);
      } else {
        setError("Couldn't upload that photo. Try again.");
      }
    } finally {
      setUploading(false);
      // Clear the input so picking the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[#1C1C1A]/80">{label}</span>

      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-black/10 bg-[#FAFAF9]">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={20} className="text-[#1C1C1A]/25" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Spinner size={18} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-black/10 px-3 py-1.5 text-sm text-[#1C1C1A] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading…" : url ? "Change photo" : "Add photo"}
          </button>
          {url && !uploading && (
            <button
              type="button"
              onClick={() => setValue(name, "", { shouldDirty: true })}
              className="flex items-center gap-1 text-xs text-[#1C1C1A]/50 hover:text-red-600"
            >
              <X size={12} />
              Remove photo
            </button>
          )}
        </div>
      </div>

      {/* No `capture` attribute on purpose: on a phone, accept="image/*"
          already offers both "Take photo" and "Choose from library". */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
