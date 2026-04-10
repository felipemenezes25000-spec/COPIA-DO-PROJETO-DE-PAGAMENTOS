import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import HomePage from './pages/HomePage';
import CadastroPage from './pages/CadastroPage';
import SuccessPage from './pages/SuccessPage';
import PrivacidadePage from './pages/PrivacidadePage';
import TermosPage from './pages/TermosPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCandidatesPage from './pages/admin/AdminCandidatesPage';
import AdminCandidateDetailPage from './pages/admin/AdminCandidateDetailPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminErrorBoundary from './components/admin/AdminErrorBoundary';
import { AdminAuthProvider } from './contexts/AdminAuthContext';

// Monitor de Produtividade (lazy — pesado, só carrega quando o admin clica na aba).
// Spec: docs/superpowers/specs/2026-04-09-monitor-produtividade-medica-design.md
const AdminProductivityPage = lazy(() => import('./pages/admin/AdminProductivityPage'));
const AdminDoctorProductivityPage = lazy(
  () => import('./pages/admin/AdminDoctorProductivityPage'),
);
const AdminLiveQueuePage = lazy(() => import('./pages/admin/AdminLiveQueuePage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminPricingPage = lazy(() => import('./pages/admin/AdminPricingPage'));

function LazyFallback() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-label="Carregando">
      <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-primary-500 animate-spin" />
    </div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    // Single AdminAuthProvider wrapping ALL routes — prevents the duplicate
    // provider race that caused login state to flicker between /admin/login
    // and protected pages. BrowserRouter is the outer wrapper in main.tsx,
    // so useNavigate inside the provider works for both public and admin trees.
    <AdminAuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/sucesso" element={<SuccessPage />} />
          <Route path="/privacidade" element={<PrivacidadePage />} />
          <Route path="/termos" element={<TermosPage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            element={
              <AdminErrorBoundary>
                <AdminLayout />
              </AdminErrorBoundary>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/candidatos" element={<AdminCandidatesPage />} />
            <Route path="/admin/candidatos/:id" element={<AdminCandidateDetailPage />} />
            <Route
              path="/admin/produtividade"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <AdminProductivityPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/produtividade/:doctorProfileId"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <AdminDoctorProductivityPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/fila"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <AdminLiveQueuePage />
                </Suspense>
              }
            />
            <Route
              path="/admin/relatorios"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <AdminReportsPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/precificacao"
              element={
                <Suspense fallback={<LazyFallback />}>
                  <AdminPricingPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </AnimatePresence>
    </AdminAuthProvider>
  );
}
