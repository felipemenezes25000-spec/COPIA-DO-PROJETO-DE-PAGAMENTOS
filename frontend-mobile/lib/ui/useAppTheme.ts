import { useMemo } from 'react';
import { usePathname } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import {
  colors as patientColors,
  spacing as patientSpacing,
  borderRadius as patientRadius,
  shadows as patientShadows,
  typography as patientTypography,
} from '../theme';
import {
  colors as doctorColors,
  spacing as doctorSpacing,
  borderRadius as doctorRadius,
  shadows as doctorShadows,
  typography as doctorTypography,
} from '../themeDoctor';

export type AppThemeRole = 'patient' | 'doctor';

interface UseAppThemeOptions {
  role?: AppThemeRole;
}

function resolveRole(pathname: string, userRole?: string | null, forcedRole?: AppThemeRole): AppThemeRole {
  if (forcedRole) return forcedRole;
  if (userRole === 'doctor') return 'doctor';
  if (userRole === 'patient') return 'patient';
  if (pathname.startsWith('/(doctor)') || pathname.startsWith('/doctor-')) return 'doctor';
  return 'patient';
}

export function useAppTheme(options?: UseAppThemeOptions) {
  const pathname = usePathname();
  const { user } = useAuth();

  const role = resolveRole(pathname ?? '', user?.role, options?.role);

  return useMemo(() => {
    if (role === 'doctor') {
      return {
        role,
        colors: doctorColors,
        spacing: doctorSpacing,
        radius: doctorRadius,
        shadows: doctorShadows,
        typography: {
          ...patientTypography,
          fontFamily: doctorTypography.fontFamily,
        },
      };
    }

    return {
      role,
      colors: patientColors,
      spacing: patientSpacing,
      radius: patientRadius,
      shadows: patientShadows,
      typography: patientTypography,
    };
  }, [role]);
}

