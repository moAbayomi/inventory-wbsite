import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Dashboard from './Dashboard/Dashboard';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen bg-[#FAFAF9] text-[#1C1C1A]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-white/10 bg-[#17171A] transition-transform duration-300 ease-out md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C9A24B]/15 text-sm font-semibold text-[#C9A24B]">
              S
            </div>
            <span className="font-display text-base font-medium tracking-tight text-white">
              Sweevo
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <Dashboard />
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-black/5 bg-[#FAFAF9]/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-[#1C1C1A]/70 transition-colors hover:bg-black/5 hover:text-[#1C1C1A]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-display text-sm font-medium tracking-tight">Sweevo</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
