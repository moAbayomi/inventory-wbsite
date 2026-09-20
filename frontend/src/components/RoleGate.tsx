import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

interface RoleGateProps {
  role: "ADMIN";
  children: ReactNode;
}

// Hides children from anyone who isn't the given role. This is a UI
// convenience only — it stops a STAFF account from SEEING a button, not
// from calling the API directly with a valid token. The real enforcement is
// the backend's `adminOnly` middleware (now on itemsRoutes/categoriesRoutes'
// write endpoints); this just keeps the screen honest about what a STAFF
// account can actually do, instead of showing a button that would 403.
export function RoleGate({ role, children }: RoleGateProps) {
  const { user } = useAuth();
  if (user?.role !== role) return null;
  return <>{children}</>;
}
