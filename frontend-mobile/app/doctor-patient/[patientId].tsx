/**
 * Prontuário Unificado do Paciente — redesign 2026-04-10.
 *
 * Fixes:
 *   - Identity card agora é compacto (detalhes colapsáveis)
 *   - Header mais enxuto, sem padding excessivo
 *   - Tabs maiores e mais legíveis
 *   - Nada some da tela; conteúdo acessível sem scroll excessivo
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │ HEADER GRADIENTE (back + nome)      │
 *   ├── PatientIdentityCard (compact) ────┤   ← negative margin
 *   ├── AlertsBanner (se houver) ─────────┤
 *   ├── Tabs (pills, legíveis)            │
 *   ├── Conteúdo da aba                   │
 *   └─────────────────────────────────────┘
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { useListBottomPadding } from '../../lib/ui/responsive';
import {
  getPatientRequests,
  getPatientProfileForDoctor,
  getPatientClinicalSummary,
  sortRequestsByNewestFirst,
  type DoctorNoteDto,
  type PatientClinicalSummaryStructured,
} from '../../lib/api';
import type { RequestResponseDto, PatientProfileForDoctorDto } from '../../types/database';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { AppEmptyState } from '../../components/ui';
import { useTriageEval } from '../../hooks/useTriageEval';
import { showToast } from '../../components/ui/Toast';
import { haptics } from '../../lib/haptics';
import { extractAllergiesFromJson } from '../../lib/domain/anamnesis';

import { PatientIdentityCard } from '../../components/prontuario/PatientIdentityCard';
import { AlertsBanner } from '../../components/prontuario/AlertsBanner';
import { ClinicalOverviewTab } from '../../components/prontuario/ClinicalOverviewTab';
import { ConsultationsTab } from '../../components/prontuario/ConsultationsTab';
import { DocumentsTab } from '../../components/prontuario/DocumentsTab';
import { ClinicalNotesTab } from '../../components/prontuario/ClinicalNotesTab';

type TabKey = 'overview' | 'consultations' | 'documents' | 'notes';

const TAB_CONFIG: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'overview', label: 'Visão Geral', icon: 'pulse' },
  { key: 'consultations', label: 'Consultas', icon: 'videocam' },
  { key: 'documents', label: 'Documentos', icon: 'document-text' },
  { key: 'notes', label: 'Notas', icon: 'journal' },
];

export default function DoctorPatientProntuario() {
  useRequireAuth('doctor', { requireProfileComplete: true });
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const id = Array.isArray(patientId) ? patientId[0] : patientId ?? '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listPadding = useListBottomPadding();
  const { colors } = useAppTheme({ role: 'doctor' });
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [requests, setRequests] = useState<RequestResponseDto[]>([]);
  const [profile, setProfile] = useState<PatientProfileForDoctorDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [summary, setSummary] = useState<string | null>(null);
  const [structured, setStructured] = useState<PatientClinicalSummaryStructured | null>(null);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNoteDto[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  const loadData = useCallback(async (withFeedback = false) => {
    if (!id) return;
    try {
      setLoadError(false);
      const [data, prof] = await Promise.all([
        getPatientRequests(id),
        getPatientProfileForDoctor(id),
      ]);
      setRequests(data);
      setProfile(prof);
      if (withFeedback) showToast({ message: 'Prontuário atualizado', type: 'success' });
    } catch {
      setLoadError(true);
      if (withFeedback) showToast({ message: 'Não foi possível atualizar', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setSummaryLoading(true);
    setSummary(null);
    setStructured(null);
    getPatientClinicalSummary(id)
      .then((res) => {
        if (!cancelled) {
          setSummary(res.summary || res.fallback || null);
          setStructured(res.structured ?? null);
          setDoctorNotes(res.doctorNotes ?? []);
        }
      })
      .catch(() => { if (!cancelled) { setSummary(null); setStructured(null); } })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [id, summaryRefreshKey]);

  const onRefresh = () => {
    haptics.light();
    setRefreshing(true);
    setSummaryRefreshKey((k) => k + 1);
    loadData(true);
  };

  const sortedRequests = useMemo(() => sortRequestsByNewestFirst(requests), [requests]);
  const patientName = profile?.name ?? sortedRequests[0]?.patientName ?? 'Paciente';

  const consultations = useMemo(
    () => sortedRequests
      .filter((r) => r.requestType === 'consultation')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [sortedRequests]
  );
  const prescriptions = useMemo(
    () => sortedRequests.filter((r) => r.requestType === 'prescription'),
    [sortedRequests]
  );
  const exams = useMemo(
    () => sortedRequests.filter((r) => r.requestType === 'exam'),
    [sortedRequests]
  );

  const allAllergies = useMemo(() => {
    const set = new Set<string>();
    consultations.forEach((c) => {
      extractAllergiesFromJson(c.consultationAnamnesis).forEach((a) => set.add(a));
    });
    return Array.from(set);
  }, [consultations]);

  const lastConsultationDays = useMemo(() => {
    if (consultations.length === 0) return undefined;
    const latest = consultations[consultations.length - 1];
    return Math.floor(
      (Date.now() - new Date(latest.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    );
  }, [consultations]);

  const tabCounts: Record<TabKey, number | undefined> = {
    overview: undefined,
    consultations: consultations.length || undefined,
    documents: (prescriptions.length + exams.length) || undefined,
    notes: doctorNotes.length || undefined,
  };

  useTriageEval({
    context: 'doctor_prontuario',
    step: 'idle',
    role: 'doctor',
    totalRequests: requests.length,
    recentPrescriptionCount: useMemo(() => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      return requests.filter((r) => r.requestType === 'prescription' && new Date(r.createdAt) >= cutoff).length;
    }, [requests]),
    recentExamCount: useMemo(() => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      return requests.filter((r) => r.requestType === 'exam' && new Date(r.createdAt) >= cutoff).length;
    }, [requests]),
    lastConsultationDays,
  });

  // ── Header ──
  const renderHeader = useCallback(
    (subtitle?: string) => (
      <LinearGradient
        colors={['#0369A1', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>HISTÓRICO CLÍNICO</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {subtitle ?? 'Carregando...'}
            </Text>
          </View>
          {allAllergies.length > 0 && (
            <View style={styles.headerAlertChip}>
              <Ionicons name="warning" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
      </LinearGradient>
    ),
    [styles, insets.top, router, allAllergies.length]
  );

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader('Prontuário')}
        <View style={{ paddingHorizontal: 16, paddingTop: 32 }}>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }

  // ── Error ──
  if (loadError && requests.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader('Prontuário')}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <AppEmptyState
            icon="alert-circle-outline"
            title="Erro ao carregar"
            subtitle="Verifique sua conexão e tente novamente."
            actionLabel="Tentar novamente"
            onAction={() => loadData()}
          />
        </View>
      </View>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ClinicalOverviewTab
            structured={structured}
            narrativeSummary={summary}
            summaryLoading={summaryLoading}
            consultationCount={consultations.length}
            allergies={allAllergies}
            lastConsultationDays={lastConsultationDays}
          />
        );
      case 'consultations':
        return <ConsultationsTab consultations={consultations} />;
      case 'documents':
        return <DocumentsTab prescriptions={prescriptions} exams={exams} />;
      case 'notes':
        return (
          <ClinicalNotesTab
            patientId={id}
            doctorNotes={doctorNotes}
            onNotesChanged={setDoctorNotes}
            requests={sortedRequests}
          />
        );
      default:
        return null;
    }
  };

  const CONTENT_KEY = [{ key: 'content' }];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {renderHeader(patientName)}

      <FlatList
        data={CONTENT_KEY}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: listPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        renderItem={() => (
          <View style={styles.contentWrap}>
            {/* Identity card — compact, details behind toggle */}
            <View style={styles.floatingCardWrap}>
              <PatientIdentityCard
                profile={profile}
                patientName={patientName}
                consultationCount={consultations.length}
                prescriptionCount={prescriptions.length}
                examCount={exams.length}
                allergies={allAllergies}
              />
            </View>

            <AlertsBanner
              allergies={allAllergies}
              alerts={structured?.alerts ?? []}
            />

            {/* Tab bar — horizontally scrollable for narrow screens */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabBarScroll}
              contentContainerStyle={styles.tabBarContent}
            >
              {TAB_CONFIG.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = tabCounts[tab.key];
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.tab,
                      isActive && styles.tabActive,
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setActiveTab(tab.key);
                    }}
                    accessibilityRole="tab"
                    accessibilityLabel={`Aba ${tab.label}${count ? `, ${count} itens` : ''}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={isActive ? '#FFFFFF' : colors.textMuted}
                    />
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                    {count != null && (
                      <View
                        style={[
                          styles.tabCountBadge,
                          isActive ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabCountText,
                            isActive ? styles.tabCountTextActive : styles.tabCountTextInactive,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.tabContent}>
              {renderTabContent()}
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: DesignColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ── Header gradiente — mais enxuto ──
    headerGradient: {
      paddingHorizontal: 16,
      paddingBottom: 36, // reduzido de 52 → 36
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerBackBtn: {
      width: 36,
      height: 36,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      minWidth: 0,
    },
    headerEyebrow: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: 1.2,
      marginBottom: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    headerAlertChip: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(239,68,68,0.85)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Content ──
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
    },
    contentWrap: {
      gap: 12,
    },
    floatingCardWrap: {
      marginTop: -28, // sobrepõe o gradiente — menos agressivo que antes
    },

    // ── Tab bar ──
    tabBarScroll: {
      flexGrow: 0,
    },
    tabBarContent: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.borderLight,
      gap: 3,
      flexDirection: 'row',
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 11,
    },
    tabActive: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.1,
    },
    tabLabelActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    tabCountBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabCountBadgeInactive: {
      backgroundColor: colors.surfaceSecondary,
    },
    tabCountBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.28)',
    },
    tabCountText: {
      fontSize: 10,
      fontWeight: '800',
    },
    tabCountTextInactive: {
      color: colors.textMuted,
    },
    tabCountTextActive: {
      color: '#FFFFFF',
    },

    tabContent: {
      gap: 12,
    },
  });
}
