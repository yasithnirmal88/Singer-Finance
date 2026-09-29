import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { DataProvider } from './contexts/DataProvider';
import { useAuth } from './contexts/useAuth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import NewSalePage from './components/NewSale/NewSalePage';
import CustomersPage from './components/Customers/CustomersPage';
import ItemsPage from './components/Items/ItemsPage';
import SalesHistoryPage from './components/SalesHistory/SalesHistoryPage';
import DataManagement from './components/DataManagement/DataManagement';
import { Spin } from 'antd';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spin size="large" tip="Loading session..." />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spin size="large" tip="Loading session..." />
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/" replace />;
};

/**
 * Every screen is a real URL, nested under the authenticated shell, so the
 * browser's back button, a reload and a shared link all land on the same page.
 * The shell itself lives at pages/Dashboard.tsx and renders the active screen.
 */
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      >
        <Route index element={<NewSalePage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="history" element={<SalesHistoryPage />} />
        <Route path="data" element={<DataManagement />} />
      </Route>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      {/* One subscription per collection for the whole app, rather than one per
          mounted screen. */}
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
