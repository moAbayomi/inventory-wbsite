export function DashHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C9A24B]/15 text-sm font-semibold text-[#C9A24B]">
        S
        {/* 
        <img src="/logo.png" alt="Sweevo" className="absolute inset-0 h-full w-full rounded-full object-cover" /> */}
      </div>
      <div className="text-nowrap">
        <h1 className="text-[15px] font-semibold tracking-tight text-white">Sweevo</h1>
        <p className="text-xs text-white/50">Inventory Manager</p>
      </div>
    </div>
  );
}