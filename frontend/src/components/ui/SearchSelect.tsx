import { useState, useMemo, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { ScanLine } from "lucide-react";

interface SearchSelectProps<T> {
  items: T[];
  onSelect: (item: T) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getDetail?: (item: T) => string;
  // What typing matches against — defaults to getLabel (name only). Pass
  // something wider (e.g. `${item.name} ${item.sku}`) so a USB/Bluetooth
  // barcode scanner "just works": it types the SKU into whatever input has
  // focus followed by Enter, and since the whole catalogue is already in
  // this list, matching on SKU here is the same result as a dedicated
  // scan-lookup endpoint, with one less network round trip.
  getSearchValue?: (item: T) => string;
  // The value a scan must match *exactly* (case-insensitive) to add the
  // item the moment Enter arrives -- typically the item's SKU. A scanner
  // types the code then sends Enter itself, so without this the cashier
  // would still have to look at the dropdown and click the one result by
  // hand every single scan. Falls back to auto-selecting on Enter when
  // there's exactly one fuzzy match, even without this prop.
  getExactMatchValue?: (item: T) => string | null | undefined;
  placeholder?: string;
  // There's no separate "scan" field anywhere -- this input *is* the scan
  // target, and that's easy to miss since nothing about an unfocused text
  // box says so. Pass true on a screen where scanning immediately on
  // arrival is the point (checkout), so the cursor is already sitting here
  // and a scan works without clicking anything first.
  autoFocus?: boolean;
}

export function SearchSelect<T>({
  items,
  onSelect,
  getKey,
  getLabel,
  getDetail,
  getSearchValue,
  getExactMatchValue,
  placeholder = "Search…",
  autoFocus = false,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const matchValue = getSearchValue ?? getLabel;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items
      .filter((item) => matchValue(item).toLowerCase().includes(q))
      .slice(0, 10);
  }, [items, query, matchValue]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    onSelect(item);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = query.trim().toLowerCase();
    if (!q) return;

    const exact = getExactMatchValue
      ? items.find((item) => getExactMatchValue(item)?.toLowerCase() === q)
      : undefined;
    if (exact) {
      e.preventDefault();
      handleSelect(exact);
      return;
    }

    // No exact-match field configured (or nothing matched it) -- Enter on
    // a single remaining fuzzy match is still an unambiguous "yes, that
    // one", so accept it rather than making the cashier reach for the
    // mouse for a result that's already the only one on screen.
    if (filtered.length === 1) {
      e.preventDefault();
      handleSelect(filtered[0]!);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Visual cue that this box, specifically, is what a scan types
          into -- there's no separate scan field anywhere else on the
          page. */}
      <ScanLine
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#1C1C1A]/30"
      />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-md border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#C9A24B]/60"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-black/10 bg-white shadow-lg">
          {filtered.map((item) => (
            <li key={getKey(item)}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#FAFAF9]"
              >
                <span>{getLabel(item)}</span>
                {getDetail && (
                  <span className="text-xs text-[#1C1C1A]/50">{getDetail(item)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}