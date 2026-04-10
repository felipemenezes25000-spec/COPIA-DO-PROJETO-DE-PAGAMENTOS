/**
 * Tela bloqueante de permissões obrigatórias.
 *
 * Lista câmera, microfone e notificações com o status atual. O usuário só sai
 * desta tela quando as três estiverem `granted`. Se alguma virou `blocked`
 * (negada permanentemente), o CTA muda para "Abrir configurações" e abre o
 * painel do SO via Linking.openSettings(). Re-checa quando o app volta para
 * foreground (AppState "active").
 *
 * É chamada pelo splash (`app/index.tsx`) e pelo `useRequirePermissions` nos
 * layouts pós-login. A rota de destino chega via query param `next`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../lib/ui/useAppTheme';
import type { DesignColors } from '../lib/designSystem';
import { haptics } from '../lib/haptics';
import {
  REQUIRED_PERMISSIONS,
  checkAllRequired,
  requestPermission,
  type PermissionStatus,
  type PermissionStatusMap,
  type RequiredPermission,
} from '../lib/permissions';

interface PermissionMeta {
  key: RequiredPermission;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

const PERMISSIONS_META: PermissionMeta[] = [
  {
    key: 'camera',
    icon: 'videocam',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    title: 'C\u00e2mera',
    description: 'Necess\u00e1ria para videoconsultas com m\u00e9dicos.',
  },
  {
    key: 'microphone',
    icon: 'mic',
    iconBg: '#FCE7F3',
    iconColor: '#DB2777',
    title: 'Microfone',
    description:
      'Necess\u00e1rio para videoconsultas e grava\u00e7\u00e3o de anamnese.',
  },
  {
    key: 'notifications',
    icon: 'notifications',
    iconBg: '#D1FAE5',
    iconColor: '#059669',
    title: 'Notifica\u00e7\u00f5es',
    description:
      'Avisamos quando o m\u00e9dico est\u00e1 pronto e quando seus documentos chegam.',
  },
];

const FALLBACK_ROUTE = '/(auth)/login';

export default function PermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ next?: string }>();
  const nextRoute = useMemo(() => {
    const raw = Array.isArray(params.next) ? params.next[0] : params.next;
    return raw && raw.length > 0 ? raw : FALLBACK_ROUTE;
  }, [params.next]);

  const [statuses, setStatuses] = useState<PermissionStatusMap | null>(null);
  const [busy, setBusy] = useState(false);
  const navigated = useRef(false);

  const navigateNext = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace(nextRoute as any);
  }, [router, nextRoute]);

  const refresh = useCallback(async () => {
    const map = await checkAllRequired();
    setStatuses(map);
    const allOk = REQUIRED_PERMISSIONS.every((p) => map[p] === 'granted');
    if (allOk) navigateNext();
    return map;
  }, [navigateNext]);

  // Carga inicial + listener de AppState (volta de Configurações)
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const allBlocked = useMemo(() => {
    if (!statuses) return false;
    const missing = REQUIRED_PERMISSIONS.filter((p) => statuses[p] !== 'granted');
    return missing.length > 0 && missing.every((p) => statuses[p] === 'blocked');
  }, [statuses]);

  const handleRequest = useCallback(async () => {
    if (busy || !statuses) return;
    haptics.selection();

    if (allBlocked) {
      try {
        await Linking.openSettings();
      } catch {
        // ignorar — usuário vai abrir manualmente
      }
      return;
    }

    setBusy(true);
    try {
      const next = { ...statuses };
      for (const p of REQUIRED_PERMISSIONS) {
        if (next[p] !== 'granted') {
          // Sequencial — diálogos nativos não devem se sobrepor
          // eslint-disable-next-line no-await-in-loop
          next[p] = await requestPermission(p);
        }
      }
      setStatuses(next);
      const allOk = REQUIRED_PERMISSIONS.every((p) => next[p] === 'granted');
      if (allOk) navigateNext();
    } finally {
      setBusy(false);
    }
  }, [busy, statuses, allBlocked, navigateNext]);

  const ctaLabel = allBlocked ? 'Abrir configura\u00e7\u00f5es' : 'Conceder permiss\u00f5es';

  const renderRow = (meta: PermissionMeta) => {
    const status: PermissionStatus = statuses?.[meta.key] ?? 'undetermined';
    const granted = status === 'granted';
    const blocked = status === 'blocked';

    return (
      <View key={meta.key} style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: meta.iconBg }]}>
          <Ionicons name={meta.icon} size={24} color={meta.iconColor} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{meta.title}</Text>
          <Text style={styles.cardDescription}>{meta.description}</Text>
        </View>
        <View
          style={[
            styles.badge,
            granted
              ? styles.badgeGranted
              : blocked
                ? styles.badgeBlocked
                : styles.badgePending,
          ]}
        >
          {granted ? (
            <Ionicons name="checkmark" size={14} color="#15803D" />
          ) : blocked ? (
            <Ionicons name="close" size={14} color="#B91C1C" />
          ) : (
            <Ionicons name="ellipse-outline" size={14} color="#92400E" />
          )}
          <Text
            style={[
              styles.badgeText,
              granted
                ? styles.badgeTextGranted
                : blocked
                  ? styles.badgeTextBlocked
                  : styles.badgeTextPending,
            ]}
          >
            {granted ? 'OK' : blocked ? 'Bloqueada' : 'Pendente'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>QUASE LÁ</Text>
        <Text style={styles.title}>Permita o acesso para continuar</Text>
        <Text style={styles.subtitle}>
          O RenoveJá+ precisa dessas permissões para funcionar
          corretamente. Sem elas não conseguimos realizar videoconsultas
          nem te avisar quando seu atendimento estiver pronto.
        </Text>
      </View>

      <View style={styles.list}>{PERMISSIONS_META.map(renderRow)}</View>

      <View
        style={[
          styles.bottom,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        {allBlocked && (
          <Text style={styles.helperText}>
            Você negou alguma permissão. Abra as configurações
            do sistema, conceda os acessos e volte ao app.
          </Text>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            pressed && styles.ctaBtnPressed,
            busy && styles.ctaBtnDisabled,
          ]}
          onPress={handleRequest}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(_colors: DesignColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      paddingHorizontal: 24,
    },
    header: {
      marginBottom: 24,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 2,
      color: '#94A3B8',
      marginBottom: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#0F172A',
      letterSpacing: -0.4,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: '#64748B',
    },

    list: {
      gap: 12,
      marginBottom: 16,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 2,
    },
    cardDescription: {
      fontSize: 12,
      lineHeight: 17,
      color: '#64748B',
    },

    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeGranted: {
      backgroundColor: '#F0FDF4',
      borderColor: '#BBF7D0',
    },
    badgeBlocked: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
    },
    badgePending: {
      backgroundColor: '#FFFBEB',
      borderColor: '#FDE68A',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    badgeTextGranted: {
      color: '#15803D',
    },
    badgeTextBlocked: {
      color: '#B91C1C',
    },
    badgeTextPending: {
      color: '#92400E',
    },

    bottom: {
      marginTop: 'auto',
      gap: 12,
    },
    helperText: {
      fontSize: 13,
      lineHeight: 18,
      color: '#64748B',
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: '#0EA5E9',
      borderRadius: 14,
      paddingVertical: 16,
      width: '100%',
      minHeight: 56,
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 6,
    },
    ctaBtnPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    ctaBtnDisabled: {
      opacity: 0.6,
    },
    ctaText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  });
}
