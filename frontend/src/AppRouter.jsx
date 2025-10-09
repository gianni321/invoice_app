import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Page Components
import { EntriesPage } from './pages/EntriesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { AdminPage } from './pages/AdminPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { Layout } from './components/Layout';

// Auth Context
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/entries" replace />;
  return children;
}

function RoleBasedRedirect() {
  const { isLoggedIn, isAdmin } = useAuth();
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return <Navigate to="/entries" replace />;
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        <Route 
          path="/entries" 
          element={
            <ProtectedRoute>
              <Layout>
                <EntriesPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/invoices" 
          element={
            <ProtectedRoute>
              <Layout>
                <InvoicesPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <AdminRoute>
              <Layout>
                <AnalyticsPage />
              </Layout>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <Layout>
                <AdminPage />
              </Layout>
            </AdminRoute>
          } 
        />
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;