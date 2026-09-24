import { Routes, Route } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryItemsPage from "./pages/CategoryItemsPage";
import SalesPage from "./pages/SalesPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import SaleDetailPage from "./pages/SaleDetailPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import UsersPage from "./pages/UsersPage";
import EventsPage from "./pages/EventsPage";
import AppShell from "./components/AppShell";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/:id" element={<CategoryItemsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UsersPage />} />
              {/* Spans every item and every user's actions (who sold/adjusted/
                  deleted what) -- same admin-only treatment as /users, not
                  something a STAFF account should be able to browse. */}
              <Route path="/activity" element={<EventsPage />} />
            </Route>
            {/* Checkout lives at /sales/new; /sales itself is the history
                list -- kept as separate routes/pages rather than one page
                switching on a query param so each has its own clean URL to
                link/bookmark. */}
            <Route path="/sales" element={<SalesHistoryPage />} />
            <Route path="/sales/new" element={<SalesPage />} />
            <Route path="/sales/:id" element={<SaleDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
export default App;
