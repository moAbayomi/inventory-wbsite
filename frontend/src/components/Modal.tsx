import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ onClose, title, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-[#1C1C1A]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-[#1C1C1A]/40 hover:bg-black/5 hover:text-[#1C1C1A]"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="max-h-[75vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
