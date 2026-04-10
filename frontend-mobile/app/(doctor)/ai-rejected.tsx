/**
 * DoctorAiRejectedList (mobile) — Pedidos rejeitados automaticamente pela IA.
 *
 * Consome `GET /api/requests/ai-rejected` (filtrado por especialidade do médico
 * no backend). Ao tocar no item, navega para o detalhe do pedido, onde o médico
 * pode reabrir a rejeição via `reopenAiRejection`.
 *
 * Equivalente web: `frontend-web/src/pages/doctor/DoctorAiRejectedList.tsx`.
 */

import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../lib/ui/useAppTheme';
import { fetchAiRejectedRequests } from '../../lib/api-requests';
import { useListBottomPadding } from '../../lib/ui/responsive';
import { AppEmptyState } from '../../components/ui';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { showToast } from '../../components/ui/Toast';
import { haptics } from '../../lib/haptics';
import { humanizeError } from '../../lib/errors/humanizeError';
import type { RequestResponseDto } from '../../types/database';

const AI_REJECTED_QUERY_KEY = ['doctor-ai-rejected'] as const;

function getTypeLabel(type: RequestResponseDto['requestType']): string {
  if (type === 'prescription') return 'Receita';
  if (type === 'exam') return 'Exame';
  if (type === 'consultation') return 'Consulta';
  return 'Pedido';
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DoctorAiRejectedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listPadding = useListBottomPadding();
  useAppTheme({ role: 'doctor' });

  const {
    data: items = [],
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery<RequestResponseDto[]>({
    queryKey: AI_REJECTED_QUERY_KEY,
    queryFn: () => fetchAiRejectedRequests(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    haptics.light();
    setIsRefreshing(true);
    try {
      await refetch();
    } catch {
      showToast({ message: 'Não foi possível atualizar', type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleBack = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handleOpen = useCallback(
    (id: string) => {
      haptics.selection();
      router.push(`/doctor-request/${id}` as never);
    },
    [router]
  );

  const keyExtractor = useCallback((item: RequestResponseDto) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: RequestResponseDto }) => {
      const reason = item.aiRejectionReason?.trim();
      return (
        <TouchableOpacity
          onPress={() => handleOpen(item.id)}
          activeOpacity={0.8}
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={`Abrir pedido rejeitado pela IA de ${item.patientName ?? 'paciente'}`}
        >
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <Ionicons name="warning" size={12} color="#B45309" />
              <Text style={styles.badgeText}>Rejeitado pela IA</Text>
            </View>
            <Text style={styles.dateText}>{formatDateTime(item.aiRejectedAt)}</Text>
          </View>

          <Text style={styles.patientName} numberOfLines={1}>
            {item.patientName ?? 'Paciente'}
          </Text>
          <Text style={styles.typeLabel}>{getTypeLabel(item.requestType)}</Text>

          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Motivo da IA</Text>
            <Text style={styles.reasonText}>{reason || '—'}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.footerHint}>Toque para revisar</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </View>
        </TouchableOpacity>
      );
    },
    [handleOpen]
  );

  const errorSubtitle = isError
    ? humanizeError(queryError, 'request') ??
      'Não foi possível carregar os pedidos rejeitados pela IA.'
    : null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Rejeitados pela IA</Text>
            <Text style={styles.subtitle}>
              {items.length}{' '}
              {items.length === 1 ? 'pedido aguardando revisão' : 'pedidos aguardando revisão'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── BODY ── */}
      {isLoading && items.length === 0 ? (
        <View style={styles.loadingWrap}>
          <SkeletonList count={5} />
        </View>
      ) : isError ? (
        <AppEmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          subtitle={errorSubtitle ?? 'Tente novamente.'}
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listPadding },
            items.length === 0 && styles.listContentEmpty,
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
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="shield-checkmark-outline"
              title="Nada rejeitado pela IA"
              subtitle="Nenhum pedido rejeitado automaticamente no momento."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // List
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },

  // Card (amber warning style)
  card: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  typeLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  reasonBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
  },
  footerHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
