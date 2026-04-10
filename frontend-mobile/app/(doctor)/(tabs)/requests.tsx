import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useListBottomPadding } from '../../../lib/ui/responsive';
import { Ionicons } from '@expo/vector-icons';
import { doctorDS } from '../../../lib/themeDoctor';
import { useAppTheme } from '../../../lib/ui/useAppTheme';
import type { DesignColors } from '../../../lib/designSystem';
import { RequestResponseDto, RequestStatus } from '../../../types/database';
import { cacheRequest } from '../../doctor-request/[id]';
import { useQueryClient } from '@tanstack/react-query';
import { useRequestsEvents } from '../../../contexts/RequestsEventsContext';
import { useDoctorRequestsQuery, useInvalidateDoctorRequests } from '../../../lib/hooks/useDoctorRequestsQuery';
import { useReviewAndApproveMutation } from '../../../lib/hooks/useBatchSignature';
import { QueueItem, type QueueItemStatusTone } from '../../../components/doctor/QueueItem';
import { BatchSignModal } from '../../../components/doctor/batch/BatchSignModal';
import { ProductivityBanner } from '../../../components/doctor/batch/ProductivityBanner';
import { AppEmptyState } from '../../../components/ui';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';
import { FadeIn } from '../../../components/ui/FadeIn';
import { showToast } from '../../../components/ui/Toast';
import { haptics } from '../../../lib/haptics';
import { humanizeError } from '../../../lib/errors/humanizeError';
import type { ApiError } from '../../../lib/api-client';

const pad = doctorDS.screenPaddingHorizontal;

const DOCTOR_REQUESTS_STALE_MS = 10_000;

// ─── State tabs (pastas de estado, proposta Carolina Akiko) ───
type StateTab = 'pending' | 'approved' | 'rejected' | 'signed';

type StateTabItem = {
  key: StateTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
};

const STATE_TABS: StateTabItem[] = [
  { key: 'pending', label: 'A visualizar', icon: 'time-outline', accessibilityLabel: 'A visualizar' },
  { key: 'approved', label: 'Aprovados', icon: 'checkmark-circle-outline', accessibilityLabel: 'Aprovados' },
  { key: 'rejected', label: 'Rejeitados', icon: 'close-circle-outline', accessibilityLabel: 'Rejeitados' },
  { key: 'signed', label: 'Assinados', icon: 'shield-checkmark-outline', accessibilityLabel: 'Assinados' },
];

function getStateTab(status: RequestStatus): StateTab {
  switch (status) {
    case 'submitted':
    case 'in_review':
    case 'pending':
    case 'analyzing':
    case 'searching_doctor':
      return 'pending';
    case 'approved':
    case 'paid':
    case 'approved_pending_payment':
    case 'pending_payment':
      return 'approved';
    case 'rejected':
    case 'cancelled':
      return 'rejected';
    case 'signed':
    case 'delivered':
    case 'completed':
      return 'signed';
    // Status que não se encaixam direto em nenhum bucket — default "pending"
    case 'consultation_ready':
    case 'in_consultation':
    case 'pending_post_consultation':
    case 'consultation_finished':
      return 'pending';
    default:
      return 'pending';
  }
}

export default function DoctorQueue() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listPadding = useListBottomPadding();
  const { width: screenWidth } = useWindowDimensions();
  // Query params suportados:
  //   ?initialTab=pending|approved|rejected|signed   → state tab (fluxo de assinatura em lote)
  //   ?type=prescription|exam|consultation           → filtro por tipo (CategoryCards do dashboard, PR #61)
  //   ?filter=approved-today|rejected-today          → recorta o histórico do dia (HubFolderTile, PR #65)
  const params = useLocalSearchParams<{ initialTab?: string; type?: string; filter?: string }>();
  const initialTab = useMemo<StateTab>(() => {
    const t = params.initialTab;
    return t === 'approved' || t === 'rejected' || t === 'signed' || t === 'pending' ? t : 'pending';
  }, [params.initialTab]);
  const [activeTab, setActiveTab] = useState<StateTab>(initialTab);
  const dayFilter = useMemo<'approved-today' | 'rejected-today' | null>(() => {
    const f = params.filter;
    return f === 'approved-today' || f === 'rejected-today' ? f : null;
  }, [params.filter]);
  useEffect(() => {
    if (initialTab !== activeTab && params.initialTab) {
      setActiveTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const typeFilter = useMemo<'prescription' | 'exam' | 'consultation' | null>(() => {
    const t = params.type;
    return t === 'prescription' || t === 'exam' || t === 'consultation' ? t : null;
  }, [params.type]);
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showBatchSignModal, setShowBatchSignModal] = useState(false);

  const { colors } = useAppTheme({ role: 'doctor' });
  const styles = useMemo(() => makeStyles(colors, screenWidth), [colors, screenWidth]);

  const { subscribe, isConnected } = useRequestsEvents();
  const invalidateDoctorRequests = useInvalidateDoctorRequests();
  const reviewAndApproveMutation = useReviewAndApproveMutation();

  const {
    data: requests = [],
    isLoading: loading,
    isError,
    error: queryError,
    refetch,
  } = useDoctorRequestsQuery(isConnected);

  useEffect(() => {
    return subscribe(() => invalidateDoctorRequests());
  }, [subscribe, invalidateDoctorRequests]);

  const queryClient = useQueryClient();
  useFocusEffect(useCallback(() => {
    const state = queryClient.getQueryState(['doctor-requests']);
    const age = Date.now() - (state?.dataUpdatedAt ?? 0);
    if (age > DOCTOR_REQUESTS_STALE_MS) refetch();
  }, [queryClient, refetch]));

  const onRefresh = useCallback(async () => {
    haptics.light();
    setIsRefreshing(true);
    try {
      await refetch();
      showToast({ message: 'Fila atualizada', type: 'success' });
    } catch {
      showToast({ message: 'Não foi possível atualizar', type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleTabChange = useCallback((key: StateTab) => {
    haptics.selection();
    setActiveTab(key);
  }, []);

  // Contadores por estado
  const counts = useMemo(() => {
    const acc: Record<StateTab, number> = { pending: 0, approved: 0, rejected: 0, signed: 0 };
    for (const r of requests) {
      acc[getStateTab(r.status)] += 1;
    }
    return acc;
  }, [requests]);

  // Itens que podem realmente ser assinados em lote. Inclui `approved` e
  // `paid` para cobrir o optimistic update do `useReviewAndApproveMutation`
  // (que move para `paid` antes do refetch). O backend aceita ambos como
  // status válidos para batch sign desde que exista o log `approved_for_signing`.
  const signableRequests = useMemo(
    () => requests.filter((r) => r.status === 'approved' || r.status === 'paid'),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    let list = requests.filter((r) => getStateTab(r.status) === activeTab);
    if (typeFilter) list = list.filter((r) => r.requestType === typeFilter);

    // Quando vier dos hubs de categoria (?filter=approved-today|rejected-today), recorta
    // ao histórico do dia. Mantém comportamento original (fila viva) quando não há filter.
    if (dayFilter) {
      const isToday = (iso: string | null | undefined): boolean => {
        if (!iso) return false;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return false;
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      };
      // Spec §2.1 "Aprovados" = médico já aprovou / pagou / entregou.
      // `consultation_finished` fica na pasta 'pending' (getStateTab) e NÃO
      // deve entrar aqui mesmo no recorte do dia — senão a pasta Aprovados
      // mostraria itens que ainda aguardam ação do médico pós-consulta.
      const APPROVED = new Set<RequestStatus>([
        'approved', 'paid', 'signed', 'delivered', 'completed',
      ]);
      list = list.filter((r) => {
        const effective = r.signedAt ?? r.updatedAt ?? r.createdAt;
        if (!isToday(effective)) return false;
        return dayFilter === 'approved-today'
          ? APPROVED.has(r.status)
          : r.status === 'rejected';
      });
    }

    const q = searchText.trim().toLowerCase();
    if (q) list = list.filter((r) => (r.patientName ?? '').toLowerCase().includes(q));
    return list;
  }, [requests, activeTab, typeFilter, dayFilter, searchText]);

  // ─── Pulse animação para o ícone do Modo Foco ───
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulseScale]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  // ─── Produtividade (aba Assinados) ───
  // Computa em milissegundos para bater com o contrato do ProductivityBanner.
  // Guarda contra timestamps nulos/inválidos (ambos signedAt e updatedAt podem
  // faltar em dados legados — `new Date(null)` produz Invalid Date).
  const productivityStats = useMemo(() => {
    if (activeTab !== 'signed') return null;
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;

    let todayCount = 0;
    let weekCount = 0;
    const batchBuckets = new Set<number>();

    for (const r of filteredRequests) {
      const ts = r.signedAt ?? r.updatedAt;
      if (!ts) continue;
      const date = new Date(ts);
      const t = date.getTime();
      if (Number.isNaN(t)) continue;
      if (t >= sevenDaysAgoMs) weekCount += 1;
      if (t >= todayStartMs) {
        todayCount += 1;
        // Agrupa por janela de 1 minuto — aproximação de "lotes" até o backend
        // expor um batchId real por sessão de assinatura.
        batchBuckets.add(Math.floor(t / 60000));
      }
    }

    // TODO: substituir por tempo real quando backend expor duração da sessão.
    // ~0.8 min por doc assinado, ~1.5 min economizado vs fluxo manual.
    const totalTimeMs = Math.round(todayCount * 0.8 * 60_000);
    const savedTimeMs = Math.round(todayCount * 1.5 * 60_000);
    const weeklyAverage = Math.round(weekCount / 7);
    const batchesToday =
      batchBuckets.size > 0 ? batchBuckets.size : Math.ceil(todayCount / 8);

    return { todayCount, weeklyAverage, batchesToday, totalTimeMs, savedTimeMs };
  }, [activeTab, filteredRequests]);

  // ─── Ação rápida de aprovar ───
  const handleQuickApprove = useCallback(
    async (requestId: string) => {
      haptics.success();
      try {
        await reviewAndApproveMutation.mutateAsync(requestId);
        showToast({ message: 'Pedido aprovado para assinatura', type: 'success' });
      } catch (e) {
        const err = e as ApiError;
        showToast({
          message: humanizeError(err, 'request') ?? 'Falha ao aprovar',
          type: 'error',
        });
      }
    },
    [reviewAndApproveMutation]
  );

  const keyExtractor = useCallback((item: RequestResponseDto) => item.id, []);

  // Tom do badge do QueueItem conforme a pasta de estado ativa no dashboard.
  // Sem override, o QueueItem usa o uiState canônico (perspectiva do paciente),
  // que por padrão pinta 'approved' de amarelo/needs_action — incoerente com a
  // tab ✓ verde "Aprovados" vista pelo médico.
  const statusTone: QueueItemStatusTone | undefined = useMemo(() => {
    if (activeTab === 'approved') return 'approved';
    if (activeTab === 'rejected') return 'rejected';
    if (activeTab === 'signed') return 'signed';
    return undefined;
  }, [activeTab]);

  const renderDoctorItem = useCallback(
    ({ item, index }: { item: RequestResponseDto; index: number }) => {
      // O status badge é desenhado dentro do próprio QueueItem (via
      // getRequestUiState). Não renderizamos um badge extra aqui para não
      // sobrepor o texto do card — bug reportado em 2026-04-08.
      return (
        <FadeIn visible delay={index * 40} duration={300} fromY={8} fill={false}>
          <View style={styles.itemWrapper}>
            <QueueItem
              request={item}
              onPress={() => {
                haptics.selection();
                cacheRequest(item);
                router.push(`/doctor-request/${item.id}`);
              }}
              colors={colors}
              statusTone={statusTone}
            />
            {/* Ações inline: apenas na aba "A visualizar".
                Decisão: mantemos apenas o "Aprovar rápido" inline; a rejeição com motivo
                acontece no Modo Foco ou dentro do detalhe, para não poluir o card. */}
            {activeTab === 'pending' && (
              <View style={styles.itemActionsRow}>
                <TouchableOpacity
                  style={[styles.itemActionBtn, styles.itemActionApprove]}
                  onPress={() => handleQuickApprove(item.id)}
                  disabled={reviewAndApproveMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Aprovar pedido de ${item.patientName ?? 'paciente'}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  <Text style={styles.itemActionApproveText}>Aprovar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </FadeIn>
      );
    },
    [router, colors, activeTab, statusTone, styles, handleQuickApprove, reviewAndApproveMutation.isPending]
  );

  const errorSubtitle = useMemo(() => {
    if (!isError || !queryError) return null;
    const err = queryError as ApiError;
    if (err?.status === 401) return 'Sessão expirada. Faça login novamente.';
    if (err?.status === 500) return 'Erro no servidor. Tente novamente em alguns instantes.';
    return humanizeError(queryError, 'request');
  }, [isError, queryError]);
  const error = isError ? (errorSubtitle ?? (queryError as Error)?.message ?? 'Erro ao carregar') : null;
  const empty = !loading && !error && filteredRequests.length === 0;
  const isQueueEmpty = empty && requests.length === 0;
  const isFilteredEmpty = empty && requests.length > 0;

  // ─── Banners/headers ─────────────────────────
  const listHeader = useMemo(() => {
    if (activeTab === 'pending' && filteredRequests.length > 0) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            haptics.light();
            // Cast: rota tipada gerada pelo Expo Router após primeiro build
            router.push('/(doctor)/review-queue' as never);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Iniciar Modo Foco com ${filteredRequests.length} pedidos`}
          style={styles.focusCardWrap}
        >
          <LinearGradient
            colors={['#2563EB', '#0EA5E9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.focusCard}
          >
            <Animated.View style={[styles.focusIconWrap, pulseStyle]}>
              <Ionicons name="flash" size={22} color="#FFFFFF" />
            </Animated.View>
            <View style={styles.focusCardText}>
              <Text style={styles.focusCardTitle}>Modo foco</Text>
              <Text style={styles.focusCardSubtitle}>
                Revise {filteredRequests.length} pedido{filteredRequests.length > 1 ? 's' : ''} em sequência
              </Text>
            </View>
            <View style={styles.focusCardCta}>
              <Text style={styles.focusCardCtaText}>Iniciar</Text>
              <Ionicons name="arrow-forward" size={16} color="#0EA5E9" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    if (activeTab === 'signed' && productivityStats) {
      return (
        <ProductivityBanner
          todayCount={productivityStats.todayCount}
          weeklyAverage={productivityStats.weeklyAverage}
          batchesToday={productivityStats.batchesToday}
          totalTimeMs={productivityStats.totalTimeMs}
          savedTimeMs={productivityStats.savedTimeMs}
        />
      );
    }

    return null;
  }, [activeTab, filteredRequests.length, productivityStats, styles, pulseStyle, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Pedidos</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredRequests.length}</Text>
          </View>
        </View>

        {/* Search field */}
        <View
          style={[
            styles.searchWrap,
            searchFocused && styles.searchWrapFocused,
          ]}
        >
          <Ionicons
            name="search"
            size={16}
            color={searchFocused ? '#0EA5E9' : '#94A3B8'}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar paciente..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar solicitações"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => { setSearchText(''); haptics.light(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Limpar busca"
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── STATE TABS ── */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {STATE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabChange(tab.key)}
                disabled={loading}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.accessibilityLabel}, ${count} ${count === 1 ? 'item' : 'itens'}`}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                <Text
                  style={[
                    styles.filterChipCount,
                    isActive && styles.filterChipCountActive,
                  ]}
                >
                  ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── LIST ── */}
      {loading && requests.length === 0 ? (
        <View style={styles.loadingWrap}>
          <SkeletonList count={6} />
        </View>
      ) : error ? (
        <AppEmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          subtitle={error}
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={keyExtractor}
          renderItem={renderDoctorItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listPadding },
            empty && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#0EA5E9']}
              tintColor="#0EA5E9"
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={10}
          windowSize={7}
          initialNumToRender={8}
          ListEmptyComponent={
            isQueueEmpty ? (
              <AppEmptyState
                icon="checkmark-done-circle-outline"
                title="Nenhum pedido por aqui"
                subtitle="Quando pacientes enviarem solicitações, elas aparecerão aqui."
              />
            ) : isFilteredEmpty ? (
              <AppEmptyState
                icon="search-outline"
                title="Nenhum resultado"
                subtitle={
                  searchText.trim()
                    ? `Nenhum paciente encontrado para "${searchText.trim()}"`
                    : 'Nenhum pedido nesta pasta.'
                }
              />
            ) : null
          }
        />
      )}

      {/* FAB sticky — Assinar em lote. Visível em QUALQUER aba enquanto
          houver pedidos aprovados prontos para assinatura. Antes o CTA era
          um banner dentro da aba "Aprovados", o que obrigava o médico a
          trocar de aba para descobrir o fluxo de batch sign. */}
      {signableRequests.length > 0 && (
        <View
          pointerEvents="box-none"
          style={[styles.signFabWrap, { bottom: insets.bottom + 16 }]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              haptics.light();
              setShowBatchSignModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Assinar ${signableRequests.length} documento${signableRequests.length > 1 ? 's' : ''} em lote`}
            style={styles.signFab}
          >
            <LinearGradient
              colors={['#0EA5E9', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signFabGradient}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.signFabText}>
                Assinar {signableRequests.length} documento
                {signableRequests.length > 1 ? 's' : ''}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de assinatura em lote — sempre usa a lista canônica de
          itens assináveis (status === 'approved'), nunca filteredRequests,
          que pode conter paid/pending_payment ou recortes por dia. */}
      <BatchSignModal
        visible={showBatchSignModal}
        onClose={() => setShowBatchSignModal(false)}
        requests={signableRequests}
      />

    </View>
  );
}

function makeStyles(colors: DesignColors, screenWidth: number) {
  // Responsive padding: narrower on small screens
  const horizontalPad = screenWidth <= 360 ? 12 : pad;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },

    // ── Header ──
    header: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: horizontalPad,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: '#0F172A',
      letterSpacing: -0.3,
    },
    countBadge: {
      minWidth: 28,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    countText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#0EA5E9',
    },

    // ── Search ──
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 12,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#F1F5F9',
      gap: 8,
    },
    searchWrapFocused: {
      borderColor: '#0EA5E9',
      backgroundColor: '#FFFFFF',
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '400',
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      color: '#0F172A',
    },

    // ── Filters / State tabs ──
    filtersContainer: {
      backgroundColor: '#FFFFFF',
      paddingTop: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    filtersScroll: {
      paddingHorizontal: horizontalPad,
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    filterChipActive: {
      backgroundColor: '#0EA5E9',
      borderColor: '#0EA5E9',
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#64748B',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    filterChipCount: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748B',
      backgroundColor: '#F1F5F9',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      marginLeft: 2,
      overflow: 'hidden',
      minWidth: 22,
      textAlign: 'center',
    },
    filterChipCountActive: {
      color: '#FFFFFF',
      backgroundColor: 'rgba(255,255,255,0.22)',
    },

    // ── List ──
    loadingWrap: {
      flex: 1,
      paddingHorizontal: horizontalPad,
      paddingTop: 16,
    },
    listContent: {
      paddingTop: 8,
      paddingHorizontal: horizontalPad,
    },
    listContentEmpty: { flexGrow: 1 },

    // ── Modo Foco card ──
    focusCardWrap: {
      marginTop: 8,
      marginBottom: 12,
      borderRadius: 16,
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    focusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      gap: 12,
    },
    focusIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    focusCardText: {
      flex: 1,
    },
    focusCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
    focusCardSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.9)',
      marginTop: 2,
    },
    focusCardCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    focusCardCtaText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0EA5E9',
    },

    // ── Sticky batch-sign FAB ──
    signFabWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    signFab: {
      borderRadius: 999,
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    signFabGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderRadius: 999,
    },
    signFabText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },

    // ── Productivity banner: agora renderizado via <ProductivityBanner/>
    //    (componente em components/doctor/batch/ProductivityBanner.tsx).
    //    Os estilos ficam encapsulados no componente — nada aqui.

    // ── Item wrapper + actions ──
    // Observação: o status badge é desenhado dentro do próprio QueueItem;
    // não usamos overlay absoluto aqui para evitar sobreposição de texto.
    itemWrapper: {
      position: 'relative',
    },
    itemActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: -6,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    itemActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    itemActionApprove: {
      backgroundColor: '#10B981',
    },
    itemActionApproveText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
