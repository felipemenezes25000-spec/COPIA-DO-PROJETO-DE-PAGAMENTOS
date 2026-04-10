import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface UseRequireAuthOptions {
  /** Se true, redireciona para complete-profile/complete-doctor quando perfil está incompleto. */
  requireProfileComplete?: boolean;
}

/**
 * Hook que redireciona para login se o usuário não estiver autenticado.
 * Retorna `{ user, loading }` — renderize null/loading enquanto `loading` ou `!user`.
 *
 * @param requiredRole — se informado, redireciona se o role não bater.
 * @param options.requireProfileComplete — se true, bloqueia perfis incompletos.
 */
export function useRequireAuth(requiredRole?: 'doctor' | 'patient', options?: UseRequireAuthOptions) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (requiredRole && user.role !== requiredRole) {
      router.replace('/');
      return;
    }
    if (options?.requireProfileComplete && !user.profileComplete) {
      const target = user.role === 'doctor' ? '/(auth)/complete-doctor' : '/(auth)/complete-profile';
      router.replace(target as any);
    }
  }, [loading, user, requiredRole, options?.requireProfileComplete, router]);

  const ready = !loading && !!user
    && (!requiredRole || user.role === requiredRole)
    && (!options?.requireProfileComplete || user.profileComplete);

  return { user, loading, ready };
}
