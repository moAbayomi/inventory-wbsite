import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

// Sits at the bottom of the sidebar, below the nav links -- the standard
// spot for "who's logged in / log out" in most dashboard shells. Was an
// empty, unused file until now; logout itself was already fully built in
// useAuth() (it clears the server session and the local query cache), it
// just had no button anywhere calling it.
export function DashFooter() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/80">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-white/40">
          {user.role === "ADMIN" ? "Admin" : "Staff"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        aria-label="Log out"
        title="Log out"
        className="shrink-0 rounded-md p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
