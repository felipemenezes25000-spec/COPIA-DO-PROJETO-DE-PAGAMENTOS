import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../contexts/AuthContext';
import { useRequestsEvents } from '../../contexts/RequestsEventsContext';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import { getRequests, getActiveCertificate } from '../../lib/api';
import { RequestResponseDto } from '../../types/database';
import { cacheRequest } from '../doctor-request/[id]';

import { AppEmptyState } from '../../components/ui';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { FadeIn } from '../../components/ui/FadeIn';
import { QueueItem } from '../../components/doctor/QueueItem';

import {
  countPendentes,
  getPendingForPanel,
} from '../../lib/domain/getRequestUiState';
import { haptics } from '../../lib/haptics';
import { showToast } from '../../components/ui/Toast';
import { motionTokens } from '../../lib/ui/motion';

// ─── Saudação por turno ────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── Card de métrica animado ───────────────────────────────────
interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  bg: string;
  delay: number;
}

function MetricCard({ icon, value, label, color, bg, delay }: MetricCardProps) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [scale, opacity, delay]);

  return (
    <Animated.View style={[styles.metricCard, { opacity, transform: [{ scale }] }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────
export default function DoctorDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, gradients, shadows, scheme } = useAppTheme({ role: 'doctor' });
  const isDark = scheme === 'dark';

  const [queue, setQueue] = useState<RequestResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);

  const loadData = useCallback(async (withFeedback = false) => {
    try {
      const [cert, res] = await Promise.allSettled([
        getActiveCertificate(),
        getRequests({ page: 1, pageSize: 500 }),
      ]);
      setHasCertificate(cert.status === 'fulfilled' && !!cert.value);
      const items = res.status === 'fulfilled' ? (res.value?.items ?? []) : [];
      setQueue(items);
      if (withFeedback) showToast({ message: 'Painel atualizado', type: 'success' });
    } catch (e) {
      console.error(e);
      if (withFeedback) showToast({ message: 'Erro ao atualizar', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const { subscribe, isConnected } = useRequestsEvents();

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (!isConnected) {
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
      }
    }, [loadData, isConnected])
  );

  useEffect(() => {
    return subscribe(() => loadData());
  }, [subscribe, loadData]);

  const onRefresh = () => {
    haptics.light();
    setRefreshing(true);
    loadData(true);
  };

  const pendingList = useMemo(() => getPendingForPanel(queue, 10), [queue]);
  const pendentesCount = countPendentes(queue);
  const todayDone = useMemo(
    () => queue.filter((q) => q.status === 'approved' || q.status === 'signed' || q.status === 'delivered').length,
    [queue]
  );
  const prescriptionCount = useMemo(
    () => queue.filter((q) => q.requestType === 'prescription').length,
    [queue]
  );
  const consultationCount = useMemo(
    () => queue.filter((q) => q.requestType === 'consultation').length,
    [queue]
  );

  // Nome sanitizado
  const rawNames = (user?.name || '').trim().split(/\s+/).filter(Boolean);
  const titlePrefixes = ['dr', 'dr.', 'dra', 'dra.'];
  const firstPart = rawNames[0] ?? '';
  const isTitle = titlePrefixes.includes(firstPart.toLowerCase().replace(/\.$/, ''));
  const displayFirst = isTitle && rawNames.length > 1 ? rawNames[1] : firstPart || 'Médico';
  const greetingName = displayFirst.toLowerCase().startsWith('dr') ? displayFirst : `Dr(a). ${displayFirst}`;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <View
          style={[
            styles.headerSkeleton,
            { backgroundColor: colors.primary, paddingTop: insets.top + 20 },
          ]}
        />
        <View style={{ padding: 20 }}>
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.headerOverlayText}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <LinearGradient
          colors={gradients.doctorHeader as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 24 }]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={[styles.greeting, { color: colors.headerOverlayText }]}>
                {getGreeting()},
              </Text>
              <Text style={[styles.doctorName, { color: colors.headerOverlayText }]} numberOfLines={1}>
                {greetingName}
              </Text>
              <Text style={[styles.date, { color: colors.headerOverlayTextMuted }]}>
                {dateStr}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: colors.headerOverlaySurface, borderColor: colors.headerOverlayBorder }]}
              onPress={() => {
                haptics.selection();
                router.push('/(doctor)/profile');
              }}
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
            >
              <Text style={[styles.avatarInitials, { color: colors.headerOverlayText }]}>
                {(displayFirst[0] ?? user?.name?.[0] ?? 'M').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status online */}
          <View style={[styles.statusPill, { backgroundColor: colors.headerOverlaySurface, borderColor: colors.headerOverlayBorder }]}>
            <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, { color: colors.headerOverlayTextMuted }]}>
              Online · {pendentesCount > 0 ? `${pendentesCount} aguardando` : 'Fila limpa'}
            </Text>
          </View>
        </LinearGradient>

        {/* ── GRID DE MÉTRICAS ── */}
        <View style={[styles.metricsSection, { marginTop: -1 }]}>
          <View style={[styles.metricsGrid, { backgroundColor: colors.surface, ...shadows.card }]}>
            <MetricCard
              icon="time"
              value={pendentesCount}
              label="Pendentes"
              color={pendentesCount > 0 ? colors.warning : colors.textMuted}
              bg={pendentesCount > 0 ? colors.warningLight : colors.surfaceSecondary}
              delay={60}
            />
            <View style={[styles.metricDivider, { backgroundColor: colors.borderLight }]} />
            <MetricCard
              icon="checkmark-circle"
              value={todayDone}
              label="Atendidos"
              color={colors.success}
              bg={colors.successLight}
              delay={120}
            />
            <View style={[styles.metricDivider, { backgroundColor: colors.borderLight }]} />
            <MetricCard
              icon="document-text"
              value={prescriptionCount}
              label="Receitas"
              color={colors.info}
              bg={colors.infoLight}
              delay={180}
            />
            <View style={[styles.metricDivider, { backgroundColor: colors.borderLight }]} />
            <MetricCard
              icon="videocam"
              value={consultationCount}
              label="Consultas"
              color={colors.primary}
              bg={colors.primarySoft}
              delay={240}
            />
          </View>
        </View>

        <View style={styles.body}>
          {/* ── ALERTA: Certificado pendente ── */}
          {hasCertificate === false && (
            <FadeIn visible {...motionTokens.fade.doctorSection} delay={80} fill={false}>
              <TouchableOpacity
                style={[
                  styles.certAlert,
                  {
                    backgroundColor: isDark ? colors.warningLight : '#FFFBEB',
                    borderColor: colors.warning + '35',
                  },
                ]}
                onPress={() => {
                  haptics.selection();
                  router.push('/certificate/upload');
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Configurar certificado digital"
              >
                <View style={[styles.certIconWrap, { backgroundColor: colors.warning + '22' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.warning} />
                </View>
                <View style={styles.certText}>
                  <Text style={[styles.certTitle, { color: colors.warning }]}>
                    Certificado Digital pendente
                  </Text>
                  <Text style={[styles.certDesc, { color: colors.textSecondary }]}>
                    Configure para assinar receitas digitalmente.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.warning} />
              </TouchableOpacity>
            </FadeIn>
          )}

          {/* ── FILA ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Fila de Atendimento
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                router.push('/(doctor)/requests');
              }}
              accessibilityRole="button"
              accessibilityLabel="Ver todos os pedidos"
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {pendingList.length > 0 ? (
            <FadeIn visible {...motionTokens.fade.listDoctor} delay={40} fill={false}>
              <View>
                {pendingList.map((req, i) => (
                  <FadeIn
                    key={req.id}
                    visible
                    duration={200}
                    fromY={8}
                    delay={i * 40}
                    fill={false}
                  >
                    <QueueItem
                      request={req}
                      colors={colors}
                      onPress={() => {
                        haptics.selection();
                        cacheRequest(req);
                        router.push(`/doctor-request/${req.id}`);
                      }}
                    />
                  </FadeIn>
                ))}
              </View>
            </FadeIn>
          ) : (
            <AppEmptyState
              icon="checkmark-done-circle"
              title="Fila limpa!"
              subtitle="Nenhum paciente aguardando no momento."
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSkeleton: {
    height: 180,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.85,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 1,
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginLeft: 12,
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 7,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Métricas
  metricsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  metricDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 4,
  },

  body: {
    paddingHorizontal: 20,
  },

  // Alerta certificado
  certAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  certIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  certText: { flex: 1, minWidth: 0 },
  certTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  certDesc: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Seção
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
});
