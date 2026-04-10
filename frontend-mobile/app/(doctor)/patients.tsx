/**
 * DoctorPatients (mobile) — Lista de pacientes do médico.
 *
 * Estratégia equivalente ao web (`frontend-web/src/pages/doctor/DoctorPatients.tsx`):
 * em vez de criar endpoint novo, reutiliza o cache de pedidos do médico
 * (`useDoctorRequestsQuery`) e extrai os pacientes únicos pelo `patientId`,
 * mantendo o pedido mais recente de cada um como referência.
 *
 * Navegação: abre `/doctor-patient/[patientId]` (prontuário unificado).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../lib/ui/useAppTheme';
import { useRequestsEvents } from '../../contexts/RequestsEventsContext';
import { useDoctorRequestsQuery } from '../../lib/hooks/useDoctorRequestsQuery';
import { useListBottomPadding } from '../../lib/ui/responsive';
import { AppEmptyState } from '../../components/ui';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { showToast } from '../../components/ui/Toast';
import { haptics } from '../../lib/haptics';
import { humanizeError } from '../../lib/errors/humanizeError';
import type { RequestResponseDto } from '../../types/database';

interface PatientItem {
  patientId: string;
  patientName: string;
  lastRequest: RequestResponseDto;
}

function extractUniquePatients(requests: RequestResponseDto[]): PatientItem[] {
  const byPatient = new Map<string, RequestResponseDto>();
  for (const r of requests) {
    const pid = r.patientId;
    if (!pid) continue;
    const existing = byPatient.get(pid);
    if (
      !existing ||
      new Date(r.createdAt).getTime() > new Date(existing.createdAt).getTime()
    ) {
      byPatient.set(pid, r);
    }
  }
  return Array.from(byPatient.entries())
    .map(([patientId, lastRequest]) => ({
      patientId,
      patientName: lastRequest.patientName ?? 'Paciente',
      lastRequest,
    }))
    .sort(
      (a, b) =>
        new Date(b.lastRequest.createdAt).getTime() -
        new Date(a.lastRequest.createdAt).getTime()
    );
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase() || '?';
}

function getTypeLabel(type: RequestResponseDto['requestType']): string {
  if (type === 'prescription') return 'Receita';
  if (type === 'exam') return 'Exame';
  if (type === 'consultation') return 'Consulta';
  return 'Pedido';
}

function getTypeIconName(
  type: RequestResponseDto['requestType']
): keyof typeof Ionicons.glyphMap {
  if (type === 'prescription') return 'medkit-outline';
  if (type === 'exam') return 'flask-outline';
  if (type === 'consultation') return 'videocam-outline';
  return 'document-text-outline';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DoctorPatientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listPadding = useListBottomPadding();
  useAppTheme({ role: 'doctor' });

  const { isConnected } = useRequestsEvents();
  const {
    data: requests = [],
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useDoctorRequestsQuery(isConnected);

  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const patients = useMemo(() => extractUniquePatients(requests), [requests]);

  const filteredPatients = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.patientName.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q)
    );
  }, [patients, searchText]);

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

  const handleOpenPatient = useCallback(
    (patientId: string) => {
      haptics.selection();
      router.push(`/doctor-patient/${patientId}` as never);
    },
    [router]
  );

  const keyExtractor = useCallback((item: PatientItem) => item.patientId, []);

  const renderItem = useCallback(
    ({ item }: { item: PatientItem }) => {
      const iconName = getTypeIconName(item.lastRequest.requestType);
      return (
        <TouchableOpacity
          onPress={() => handleOpenPatient(item.patientId)}
          activeOpacity={0.7}
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={`Abrir prontuário de ${item.patientName}`}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.patientName)}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.patientName}
            </Text>
            <View style={styles.cardMetaRow}>
              <Ionicons name={iconName} size={12} color="#64748B" />
              <Text style={styles.cardMeta} numberOfLines={1}>
                {getTypeLabel(item.lastRequest.requestType)}
                {'  ·  '}
                {formatDate(item.lastRequest.createdAt)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      );
    },
    [handleOpenPatient]
  );

  const errorSubtitle = isError
    ? humanizeError(queryError, 'request') ?? 'Erro ao carregar pacientes'
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
            <Text style={styles.title}>Pacientes</Text>
            <Text style={styles.subtitle}>
              {filteredPatients.length}{' '}
              {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View
          style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}
        >
          <Ionicons
            name="search"
            size={16}
            color={searchFocused ? '#0EA5E9' : '#94A3B8'}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar paciente"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                haptics.light();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Limpar busca"
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── BODY ── */}
      {isLoading && patients.length === 0 ? (
        <View style={styles.loadingWrap}>
          <SkeletonList count={6} />
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
          data={filteredPatients}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listPadding },
            filteredPatients.length === 0 && styles.listContentEmpty,
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
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="people-outline"
              title={
                searchText.trim()
                  ? 'Nenhum paciente encontrado'
                  : 'Nenhum paciente ainda'
              }
              subtitle={
                searchText.trim()
                  ? `Nenhum resultado para "${searchText.trim()}"`
                  : 'Os pacientes aparecerão aqui após atendimentos.'
              }
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
    marginBottom: 12,
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

  // Search
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

  // List
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 8,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.2,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  cardMeta: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 1,
  },
});
