import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import { haptics } from '../../lib/haptics';
import { TabBarIcon } from '../../components/ui/TabBarIcon';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

const TAB_BAR_BASE_HEIGHT = 56;
const TAB_BAR_PADDING_TOP = 8;

/**
 * Layout de abas do módulo SUS/APS.
 * Acesso exclusivo para profissionais de UBS (role: sus ou admin).
 */
export default function SusLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === 'dark';

  const tabBarHeight = Math.max(72, TAB_BAR_BASE_HEIGHT + TAB_BAR_PADDING_TOP + insets.bottom);
  const tabBarPaddingBottom = Math.max(10, insets.bottom + (Platform.OS === 'ios' ? 4 : 8));

  // SUS module color — verde SUS
  const SUS_PRIMARY = '#16A34A';
  const SUS_PRIMARY_LIGHT = '#22C55E';

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [loading, user, router]);

  return (
    <ErrorBoundary>
      <Tabs
        screenListeners={{
          tabPress: () => haptics.selection(),
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: SUS_PRIMARY,
          tabBarInactiveTintColor: isDark ? colors.textSecondary : colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
            borderTopWidth: isDark ? 0.5 : 1,
            height: tabBarHeight,
            paddingBottom: tabBarPaddingBottom,
            paddingTop: TAB_BAR_PADDING_TOP,
            ...Platform.select({
              ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
              },
              android: { elevation: 10 },
            }),
          },
          tabBarItemStyle: {
            paddingTop: 6,
            alignItems: 'center',
            justifyContent: 'center',
          },
          tabBarIconStyle: { marginBottom: 2 },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.2,
            textAlign: 'center',
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Painel',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'grid' : 'grid-outline'} color={color} focused={focused} activeColor={SUS_PRIMARY} />
            ),
          }}
        />
        <Tabs.Screen
          name="cidadaos"
          options={{
            title: 'Cidadãos',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'people' : 'people-outline'} color={color} focused={focused} activeColor={SUS_PRIMARY} />
            ),
          }}
        />
        <Tabs.Screen
          name="agenda"
          options={{
            title: 'Agenda',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'calendar' : 'calendar-outline'} color={color} focused={focused} activeColor={SUS_PRIMARY} />
            ),
          }}
        />
        <Tabs.Screen
          name="atendimento"
          options={{
            title: 'Atendimento',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'medkit' : 'medkit-outline'} color={color} focused={focused} activeColor={SUS_PRIMARY} />
            ),
          }}
        />
        <Tabs.Screen
          name="relatorios"
          options={{
            title: 'Relatórios',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} color={color} focused={focused} activeColor={SUS_PRIMARY} />
            ),
          }}
        />
        <Tabs.Screen
          name="exportacao"
          options={{
            title: 'e-SUS',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'cloud-upload' : 'cloud-upload-outline'} color={color} focused={focused} activeColor={SUS_PRIMARY} />
            ),
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
