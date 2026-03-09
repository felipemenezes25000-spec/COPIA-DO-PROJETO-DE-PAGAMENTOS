import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  getToken,
  getStoredUser,
  getMe,
  getDoctorProfile,
  logoutDoctor,
  type DoctorUser,
  type DoctorProfile,
} from '@/services/doctorApi';

interface DoctorAuthState {
  user: DoctorUser | null;
  doctorProfile: DoctorProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => void;
}

const DoctorAuthContext = createContext<DoctorAuthState | null>(null);

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DoctorUser | null>(getStoredUser);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const refreshUser = useCallback(async () => {
    try {
      const [me, profile] = await Promise.all([getMe(), getDoctorProfile()]);
      setUser(me);
      setDoctorProfile(profile);
    } catch {
      setUser(null);
      setDoctorProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const signOut = useCallback(() => {
    logoutDoctor();
  }, []);

  return (
    <DoctorAuthContext.Provider
      value={{
        user,
        doctorProfile,
        loading,
        isAuthenticated: !!user && !!getToken(),
        refreshUser,
        signOut,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth() {
  const ctx = useContext(DoctorAuthContext);
  if (!ctx) throw new Error('useDoctorAuth must be inside DoctorAuthProvider');
  return ctx;
}
