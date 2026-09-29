import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

interface ItemThumbnailProps {
  url: string | null | undefined;
  alt: string;
  size?: number;
}

// Square photo of an item, or a plain placeholder when it has no photo (or
// the link is broken) -- so rows line up the same with or without one.
export function ItemThumbnail({ url, alt, size = 36 }: ItemThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (!url || failed) {
    return (
      <div
        style={style}
        className="flex shrink-0 items-center justify-center rounded-md bg-[#1C1C1A]/5 text-[#1C1C1A]/25"
      >
        <ImageIcon size={Math.round(size * 0.45)} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md bg-[#1C1C1A]/5 object-cover"
    />
  );
}
