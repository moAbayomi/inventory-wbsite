import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { PageSpinner } from "./Spinner";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
