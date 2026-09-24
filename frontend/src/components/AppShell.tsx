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
        {/* DashHeader (rendered inside <Dashboard /> just below) is
            already the sidebar's logo/name block, for both the mobile
            drawer and the always-visible desktop sidebar -- this row used
            to duplicate that same logo + "Abby's Robe" here too, which is
            harmless with a plain letter circle but reads as an obvious
            mistake once it's a real photo logo rendered twice. Now this
            row exists purely to host the mobile "close drawer" button,
            and is hidden entirely on desktop where there's nothing else
            in it. */}
        <div className="flex items-center justify-end px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
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
          <img
            src="/logo.jpg"
            alt="Abby's Robe"
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
          <span className="font-display text-sm font-medium tracking-tight">Abby's Robe</span>
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
