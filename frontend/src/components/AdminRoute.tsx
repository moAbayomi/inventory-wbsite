import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PageSpinner } from './Spinner';

// Was importing from '../context/AuthContext', a module that no longer
// exists on disk — this component would have thrown a build error the
// moment anything actually rendered it, which is presumably why it wasn't
// wired into App.tsx's routes at all. Pointed at the real useAuth hook
// (same one everything else in the app uses) and added the isLoading guard
// ProtectedRoute already has, for the same reason: without it, a page
// reload briefly reads `user` as null before the /auth/me query resolves,
// and an admin would get bounced to "/" for a flash before landing back.
export function AdminRoute() {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
