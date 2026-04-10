import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { useAuth } from '../../../contexts/AuthContext';
import { useRequestsEvents } from '../../../contexts/RequestsEventsContext';
import { getActiveCertificate } from '../../../lib/api';
import { useDoctorRequestsQuery, useInvalidateDoctorRequests } from '../../../lib/hooks/useDoctorRequestsQuery';
import { haptics } from '../../../lib/haptics';
import { showToast } from '../../../components/ui/Toast';
import { getGreeting } from '../../../lib/utils/format';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';
import { useAppTheme } from '../../../lib/ui/useAppTheme';
import { FadeIn } from '../../../components/ui/FadeIn';
import { motionTokens } from '../../../lib/ui/motion';

import {
  ConnectionBanner,
  DashboardHeader,
  QueueCard,
  CategoryCard,
  CertificateAlert,
  FocusModeCTA,
} from '../../../components/doctor/dashboard';
import { useDashboardResponsive } from '../../../components/doctor/dashboard/useDashboardResponsive';

/**
 * Status que representam "pendente de revisão" para receita/exame — bate 1:1
 * com o `PENDING_STATUSES` de `app/(doctor)/review-queue.tsx`. Manter os dois
 * conjuntos idênticos é condição necessária: a contagem no CategoryCard precisa
 * refletir exatamente o que o modo foco vai mostrar ao médico ao tocar no card.
 *
 * Historicamente este filtro reutilizava `isPendingForPanel`, que também
 * incluía `approved`/`paid`/`in_consultation`/`approved_pending_payment`.
 * Isso criava um bug em que o card exibia "1 pendente" para receitas
 * aprovadas aguardando assinatura, mas o modo foco filtrava fora e a tela
 * aparecia vazia — reportado como "Renovação de receitas" divergente.
 */
const REVIEW_PENDING_STATUSES = new Set<string>([
  'submitted',
  'in_review',
  'pending',
  'analyzing',
  'searching_doctor',
]);

/**
 * Para a categoria "Teleconsulta" o card navega para a aba de Pedidos
 * filtrada por consulta, então o filtro precisa refletir o bucket `pending`
 * de `getStateTab` em `requests.tsx` — que inclui consultas já agendadas /
 * em andamento, não só as que aguardam médico.
 */
const CONSULTATION_PENDING_STATUSES = new Set<string>([
  ...REVIEW_PENDING_STATUSES,
  'in_consultation',
  'consultation_ready',
  'pending_post_consultation',
  'paid',
  'approved',
  'approved_pending_payment',
]);

// ─── Helpers ────────────────────────────────────────────────────
function sanitizeDoctorName(name: string): { displayFirst: string; greetingName: string } {
  const raw = name.trim().split(/\s+/).filter(Boolean);
  const prefixes = ['dr', 'dr.', 'dra', 'dra.'];
  const first = raw[0] ?? '';
  const isPrefix = prefixes.includes(first.toLowerCase().replace(/\.$/, ''));
  const displayFirst = isPrefix && raw.length > 1 ? raw[1] : first || 'Médico';
  const greetingName = displayFirst.toLowerCase().startsWith('dr') ? displayFirst : `Dr(a). ${displayFirst}`;
  return { displayFirst, greetingName };
}

// Dashboard background agora vem de colors.background do useAppTheme
// (migrado do constante colors.background que duplicava o valor #F8FAFC).

// ═════════════════════════════════════════════════════════════════
// DASHBOARD — Clinical Soft
// ═════════════════════════════════════════════════════════════════
export default function DoctorDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const responsive = useDashboardResponsive();
  const { user } = useAuth();
  // FIX #24: Usa useAppTheme dinâmico ao invés de clinicalSoftTokens.colors estático.
  // Isso garante que loading state e render principal respeitem dark mode.
  const { colors } = useAppTheme({ role: 'doctor' });

  const [refreshing, setRefreshing] = useState(false);
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);

  const { subscribe, isConnected } = useRequestsEvents();
  const invalidateDoctorRequests = useInvalidateDoctorRequests();
  const {
    data: queue = [],
    isLoading: loading,
    refetch,
  } = useDoctorRequestsQuery(isConnected);

  useEffect(() => {
    let cancelled = false;
    getActiveCertificate()
      .then((cert) => { if (!cancelled) setHasCertificate(!!cert); })
      .catch(() => { if (!cancelled) setHasCertificate(false); });
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  useEffect(() => {
    return subscribe(() => invalidateDoctorRequests());
  }, [subscribe, invalidateDoctorRequests]);

  const onRefresh = useCallback(async () => {
    haptics.light();
    setRefreshing(true);
    try {
      await refetch();
      showToast({ message: 'Painel atualizado', type: 'success' });
    } catch {
      showToast({ message: 'Erro ao atualizar', type: 'error' });
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // ─── Derived Data ──────────────────────────────────────────
  // Contagem per-type alinhada ao destino de cada card (Bug #1):
  //   prescription/exam → navega para review-queue (modo foco) → REVIEW_PENDING_STATUSES
  //   consultation      → navega para requests?type=consultation → CONSULTATION_PENDING_STATUSES
  // Manter essa paridade é crítico: se o filtro diverge, o card mostra "N pendentes"
  // mas a tela destino aparece vazia — bug reportado em 2026-04-09.
  const counts = useMemo(() => {
    let prescription = 0;
    let exam = 0;
    let consultation = 0;
    for (const q of queue) {
      const status = q?.status ?? '';
      if (!status) continue;
      const type = q.requestType;
      if (type === 'prescription' && REVIEW_PENDING_STATUSES.has(status)) {
        prescription++;
      } else if (type === 'exam' && REVIEW_PENDING_STATUSES.has(status)) {
        exam++;
      } else if (type === 'consultation' && CONSULTATION_PENDING_STATUSES.has(status)) {
        consultation++;
      }
    }
    return { prescription, exam, consultation };
  }, [queue]);

  const { displayFirst, greetingName } = useMemo(
    () => sanitizeDoctorName(user?.name || ''),
    [user?.name]
  );

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleCategory = useCallback(
    (type: 'prescription' | 'exam' | 'consultation') => {
      haptics.selection();
      // Receita e exame → Modo Foco filtrado: é assinável em lote, então
      // vale ir direto ao fluxo de revisão sequencial.
      // Consulta → tab de pedidos filtrada: teleconsulta não é assinatura em
      // lote (é fluxo de vídeo), então Modo Foco não cabe.
      if (type === 'consultation') {
        router.push('/(doctor)/(tabs)/requests?type=consultation' as never);
        return;
      }
      router.push(`/(doctor)/review-queue?type=${type}` as never);
    },
    [router]
  );

  /**
   * Handler do CTA primário "Entrar no modo foco" — abre o modo foco
   * unificado, sem `?type=`, que mostra receitas + exames na mesma fila
   * sequencial. Não incluímos `consultation` porque teleconsulta é fluxo
   * de vídeo (não assinatura em lote) e não cabe no modelo sequencial
   * de revisão/aprovação.
   */
  const handleEnterFocusMode = useCallback(() => {
    router.push('/(doctor)/review-queue' as never);
  }, [router]);

  const handleProfile = useCallback(() => {
    router.push('/(doctor)/profile');
  }, [router]);

  // ─── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 10,
              paddingHorizontal: responsive.paddingHorizontal,
              maxWidth: responsive.maxContentWidth,
              alignSelf: responsive.isTablet ? 'center' : 'stretch',
            },
          ]}
        >
          <View style={styles.loadingHeader}>
            <View style={{ flex: 1 }} />
            <View
              style={[
                styles.loadingAvatar,
                {
                  width: responsive.avatarSize,
                  height: responsive.avatarSize,
                  borderRadius: responsive.avatarSize / 2,
                  backgroundColor: colors.surfaceTertiary,
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.loadingCard,
              { minHeight: responsive.heights.queueCardMin, backgroundColor: colors.surfaceTertiary },
            ]}
          />
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <FadeIn visible={!loading} {...motionTokens.fade.doctor}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 10,
              paddingBottom: 20 + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View
            style={[
              styles.contentInner,
              {
                paddingHorizontal: responsive.paddingHorizontal,
                maxWidth: responsive.maxContentWidth,
                alignSelf: responsive.isTablet ? 'center' : 'stretch',
              },
            ]}
          >
          {!isConnected && <ConnectionBanner responsive={responsive} />}
            <DashboardHeader
              greeting={getGreeting()}
              name={greetingName}
              date={dateStr}
              avatarUrl={user?.avatarUrl}
              initials={(displayFirst[0] ?? 'M').toUpperCase()}
              onAvatarPress={handleProfile}
              responsive={responsive}
            />

            <QueueCard counts={counts} />

            {/* CTA primário — entrada unificada no modo foco.
                As categorias abaixo continuam servindo como atalhos
                filtrados para quem quer revisar só um tipo por vez. */}
            <FocusModeCTA
              totalCount={counts.prescription + counts.exam}
              onPress={handleEnterFocusMode}
            />

            <View style={styles.categoriesSection}>
              <View style={styles.categoriesTitleRow}>
                <Text style={styles.categoriesTitle}>FILTRAR POR CATEGORIA</Text>
                <View style={styles.categoriesTitleLine} />
              </View>
              <View style={styles.categoriesList}>
                <CategoryCard
                  kind="prescription"
                  count={counts.prescription}
                  onPress={() => handleCategory('prescription')}
                />
                <CategoryCard
                  kind="exam"
                  count={counts.exam}
                  onPress={() => handleCategory('exam')}
                />
                <CategoryCard
                  kind="consultation"
                  count={counts.consultation}
                  onPress={() => handleCategory('consultation')}
                />
              </View>
            </View>

            {hasCertificate === false && (
              <CertificateAlert onPress={() => router.push('/certificate/upload')} />
            )}
          </View>
        </ScrollView>
        </FadeIn>
      </View>
    </ErrorBoundary>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  contentInner: { width: '100%' },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  loadingAvatar: {},
  loadingCard: {
    borderRadius: 16,
    marginBottom: 20,
  },
  categoriesSection: {
    marginBottom: 20,
  },
  categoriesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  categoriesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categoriesTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  categoriesList: {
    gap: 12,
  },
});
