import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
const LoginPage          = React.lazy(() => import('./pages/Login'));
const DashboardPage      = React.lazy(() => import('./pages/Dashboard'));
const CaseListPage       = React.lazy(() => import('./pages/CaseList'));
const CaseDetailPage     = React.lazy(() => import('./pages/CaseDetail'));
const CaseSubmissionPage = React.lazy(() => import('./pages/CaseSubmission'));
const AssignedCasesPage  = React.lazy(() => import('./pages/AssignedCases'));
const ReportsPage        = React.lazy(() => import('./pages/Reports'));
const FormulaPage        = React.lazy(() => import('./pages/FormulaManagement'));
const UsersPage          = React.lazy(() => import('./pages/UserManagement'));
const NotificationsPage  = React.lazy(() => import('./pages/Notifications'));
const ProfilePage        = React.lazy(() => import('./pages/Profile'));
const ForgotPassword     = React.lazy(() => import('./pages/ForgotPassword'));

// ── Route guards ───────────────────────────────────────────────────────────
function PrivateRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

// ── Layout wrapper ─────────────────────────────────────────────────────────
function AppLayout() {
  return (
    <Layout>
      <React.Suspense fallback={<div className="page-loader"><div className="spinner" /></div>}>
        <Outlet />
      </React.Suspense>
    </Layout>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <React.Suspense fallback={null}>
          <Routes>

            {/* Public */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
               <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            {/* Private — all wrapped in Layout */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"       element={<DashboardPage />} />
                <Route path="/cases"           element={<CaseListPage />} />
                <Route path="/cases/new"       element={<CaseSubmissionPage />} />
                <Route path="/cases/assigned"  element={<AssignedCasesPage />} />
                <Route path="/cases/:id"       element={<CaseDetailPage />} />
                <Route path="/reports"         element={<ReportsPage />} />
                <Route path="/formulas"        element={<FormulaPage />} />
                <Route path="/notifications"   element={<NotificationsPage />} />

                {/* User management list */}
                <Route path="/users"           element={<UsersPage />} />

                {/* Own profile — no userId param → shows current user */}
                <Route path="/profile"         element={<ProfilePage />} />

                {/* Another officer's profile — userId param → fetches that user */}
                <Route path="/users/:userId"   element={<ProfilePage />} />
                
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}