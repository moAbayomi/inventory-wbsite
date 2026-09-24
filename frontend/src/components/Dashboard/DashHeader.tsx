export function DashHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
      <img
        src="/logo.jpg"
        alt="Abby's Robe"
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
      <div className="text-nowrap">
        <h1 className="text-[15px] font-semibold tracking-tight text-white">Abby's Robe</h1>
        <p className="text-xs text-white/50">Inventory Manager</p>
      </div>
    </div>
  );
}