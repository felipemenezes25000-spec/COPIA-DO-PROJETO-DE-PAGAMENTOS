import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import AdminFinanceiro from '@/pages/admin/AdminFinanceiro';

/**
 * DoctorSimulador — Wrapper that renders the financial simulator
 * inside the doctor portal layout.
 *
 * Reuses AdminFinanceiro internally but wraps it in DoctorLayout
 * so sidebar, breadcrumbs, and auth work correctly.
 */
export default function DoctorSimulador() {
  return <AdminFinanceiro />;
}
