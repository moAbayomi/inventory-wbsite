import { LoaderCircle } from "lucide-react";

interface SpinnerProps {
  size?: number;
  className?: string;
}

/** The bare spinning icon. Use PageSpinner or SectionSpinner below in
 * almost every case — this is exported mainly for a spinner that sits
 * inline next to text (e.g. inside a submit button). */
export function Spinner({ size = 18, className = "" }: SpinnerProps) {
  return (
    <LoaderCircle
      size={size}
      className={`animate-spin text-[#1C1C1A]/40 ${className}`}
    />
  );
}

/** Centered in the full viewport — for a route-level loading state,
 * before AppShell (sidebar/header) has anything to show around it. */
export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}

/** Centered within whatever section/page content already has layout
 * (inside AppShell) — for a single screen's data still loading. */
export function SectionSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Spinner size={24} />
    </div>
  );
}
