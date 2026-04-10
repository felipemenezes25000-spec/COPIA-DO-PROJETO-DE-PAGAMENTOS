/**
 * Doctor Tabs Layout — apenas as 5 abas visíveis.
 *
 * Auth, permissões, tema e ErrorBoundary ficam um nível acima em
 * `app/(doctor)/_layout.tsx` (Stack), que também hospeda as telas
 * "detalhe" pushadas por cima das abas (review-queue, hub-*, patients,
 * ai-rejected, transcription-test).
 */

import React from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../lib/ui/useAppTheme';
import { haptics } from '../../../lib/haptics';
import { TabBarIcon } from '../../../components/ui/TabBarIcon';
import { useNotifications } from '../../../contexts/NotificationContext';
import { PulsingNotificationIcon } from '../../../components/PulsingNotificationIcon';

/** Design spec constants */
const ACTIVE_COLOR = '#0EA5E9';
const ICON_SIZE_ACTIVE = 24;
const ICON_SIZE_INACTIVE = 22;
const LABEL_FONT_SIZE = 11;

/** Responsive: detect tablets for slightly larger tab bar */
function isTablet(): boolean {
  const { width, height } = Dimensions.get('window');
  const minDim = Math.min(width, height);
  return minDim >= 600;
}

const TAB_BAR_BASE_HEIGHT = 56;
const TAB_BAR_TABLET_EXTRA = 8;
const TAB_BAR_PADDING_TOP = 8;

export default function DoctorTabsLayout() {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const hasUnread = unreadCount > 0;
  const { colors, scheme } = useAppTheme({ role: 'doctor' });
  const isDark = scheme === 'dark';

  const tablet = isTablet();
  const baseHeight = TAB_BAR_BASE_HEIGHT + (tablet ? TAB_BAR_TABLET_EXTRA : 0);
  const tabBarPaddingBottom = Math.max(10, insets.bottom + (Platform.OS === 'ios' ? 4 : 8));
  const tabBarHeight = Math.max(72, baseHeight + TAB_BAR_PADDING_TOP + insets.bottom);

  return (
    <Tabs
      screenListeners={{
        tabPress: () => haptics.selection(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: isDark ? colors.textSecondary : colors.textMuted,
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderTopColor: isDark ? colors.borderLight : '#F1F5F9',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: TAB_BAR_PADDING_TOP,
          ...Platform.select({
            ios: {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: isDark ? 0.2 : 0.06,
              shadowRadius: 12,
            },
            android: { elevation: 8 },
          }),
        },
        tabBarItemStyle: {
          paddingTop: 4,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: {
          fontSize: tablet ? LABEL_FONT_SIZE + 1 : LABEL_FONT_SIZE,
          fontWeight: '700',
          letterSpacing: 0.2,
          textAlign: 'center',
          marginTop: 2,
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.error,
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          height: 18,
          lineHeight: 18,
          borderRadius: 9,
          top: -2,
          right: -4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Painel',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'grid' : 'grid-outline'}
              color={color}
              focused={focused}
              activeColor={ACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          // Tab "Pedidos" oculta do tab bar (href: null) porque as informações
          // foram reorganizadas para os CategoryCards do painel em 2026-04-09.
          // O arquivo e a rota continuam vivos: o painel usa
          // `/(doctor)/(tabs)/requests?type=consultation` via CategoryCard de
          // Teleconsulta, e o resto do fluxo de batch sign continua acessível
          // via Modo Foco. Ao remover a entrada visual, reduzimos poluição
          // visual no tab bar sem quebrar navegação programática.
          href: null,
          title: 'Pedidos',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'document-text' : 'document-text-outline'}
              color={color}
              focused={focused}
              activeColor={ACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="consultations"
        options={{
          title: 'Consultas',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'videocam' : 'videocam-outline'}
              color={color}
              focused={focused}
              activeColor={ACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alertas',
          tabBarBadge: hasUnread ? unreadCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.alertasIconContainer}>
              <PulsingNotificationIcon
                color={focused ? ACTIVE_COLOR : color}
                size={focused ? ICON_SIZE_ACTIVE : ICON_SIZE_INACTIVE}
                hasUnread={hasUnread}
                focused={focused}
              />
              {hasUnread && <View style={styles.notificationDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'person' : 'person-outline'}
              color={color}
              focused={focused}
              activeColor={ACTIVE_COLOR}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  alertasIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    minHeight: 28,
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
