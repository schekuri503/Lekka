// ============================================================================
// App — top-level routes
// ----------------------------------------------------------------------------
// Public route: /login. Everything else lives under <AppLayout /> behind an
// auth gate that redirects to /login when there is no session.
// ============================================================================
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth, useAuthListener } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Customers } from '@/pages/Customers';
import { CustomerDetail } from '@/pages/CustomerDetail';
import { NewAccount } from '@/pages/NewAccount';
import { Dues } from '@/pages/Dues';
import { Reminders } from '@/pages/Reminders';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  // Keep auth state synced for the whole tree.
  useAuthListener();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="accounts/new" element={<NewAccount />} />
        <Route path="dues" element={<Dues />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
