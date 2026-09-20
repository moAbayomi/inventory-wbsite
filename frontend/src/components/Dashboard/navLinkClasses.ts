export function navLinkClasses(isActive: boolean) {
  return `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/10 text-white'
      : 'text-white/55 hover:bg-white/5 hover:text-white'
  }`;
}