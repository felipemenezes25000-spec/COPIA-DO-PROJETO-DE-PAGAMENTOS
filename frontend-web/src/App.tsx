import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from '@/pages/Index';
import Verify from '@/pages/Verify';
import RecuperarSenha from '@/pages/RecuperarSenha';
import Cookies from '@/pages/Cookies';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminMedicos from '@/pages/admin/AdminMedicos';
import AdminConfiguracoes from '@/pages/admin/AdminConfiguracoes';
import AdminNotFound from '@/pages/admin/AdminNotFound';
import { AdminSubdomainRedirect } from '@/components/AdminSubdomainRedirect';
import { isAuthenticated } from '@/services/adminApi';
import { Loader2 } from 'lucide-react';

const DoctorApp = lazy(() => import('@/DoctorApp'));

function isDoctorPortal(): boolean {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true; // dev local
  return host === 'medico.renovejasaude.com.br' || host.startsWith('medico.');
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

function FallbackLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  if (isDoctorPortal()) {
    return (
      <Suspense fallback={<FallbackLoader />}>
        <DoctorApp />
      </Suspense>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <AdminSubdomainRedirect />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/verify/:id" element={<Verify />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/cookies" element={<Cookies />} />

        {/* Admin — renovejasaude.com.br/admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/medicos"
          element={
            <AdminProtectedRoute>
              <AdminMedicos />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/configuracoes"
          element={
            <AdminProtectedRoute>
              <AdminConfiguracoes />
            </AdminProtectedRoute>
          }
        />
        <Route path="/admin/*" element={<AdminNotFound />} />
      </Routes>
    </>
  );
}
