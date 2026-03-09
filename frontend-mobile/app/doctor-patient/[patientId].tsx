/**
 * Prontuário Unificado do Paciente — Tela com abas + contadores.
 *
 * Visão Geral | Consultas (n) | Documentos (n) | Notas (n)
 *
 * Refatorado: FlatList para virtualização, CompactHeader extraído,
 * contadores nas tabs, espaçamentos unificados via designSystem.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../lib/themeDoctor';
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
import { AppSegmentedControl, AppEmptyState } from '../../components/ui';
import { useTriageEval } from '../../hooks/useTriageEval';
import { showToast } from '../../components/ui/Toast';
import { haptics } from '../../lib/haptics';
import { extractAllergiesFromJson } from '../../lib/domain/anamnesis';

import { CompactHeader } from '../../components/prontuario/shared';
import { PatientIdentityCard } from '../../components/prontuario/PatientIdentityCard';
import { AlertsBanner } from '../../components/prontuario/AlertsBanner';
import { ClinicalOverviewTab } from '../../components/prontuario/ClinicalOverviewTab';
import { ConsultationsTab } from '../../components/prontuario/ConsultationsTab';
import { DocumentsTab } from '../../components/prontuario/DocumentsTab';
import { ClinicalNotesTab } from '../../components/prontuario/ClinicalNotesTab';

type TabKey = 'overview' | 'consultations' | 'documents' | 'notes';

export default function DoctorPatientProntuario() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const id = Array.isArray(patientId) ? patientId[0] : patientId ?? '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listPadding = useListBottomPadding();
  const { colors, gradients } = useAppTheme({ role: 'doctor' });
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
      .catch(() => {
        if (!cancelled) { setSummary(null); setStructured(null); }
      })
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

  // Tabs com contadores — médico vê de imediato onde há dados
  const tabItems = useMemo(() => [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'consultations', label: 'Consultas', count: consultations.length || undefined },
    { key: 'documents', label: 'Documentos', count: (prescriptions.length + exams.length) || undefined },
    { key: 'notes', label: 'Notas', count: doctorNotes.length || undefined },
  ], [consultations.length, prescriptions.length, exams.length, doctorNotes.length]);

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

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <CompactHeader title="Prontuário" subtitle={patientName} topInset={insets.top} onBack={() => router.back()} colors={colors} gradientColors={gradients.doctorHeader} />
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }

  if (loadError && requests.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <CompactHeader title="Prontuário" subtitle={patientName} topInset={insets.top} onBack={() => router.back()} colors={colors} gradientColors={gradients.doctorHeader} />
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
      <CompactHeader
        title="Prontuário"
        subtitle={patientName}
        topInset={insets.top}
        onBack={() => router.back()}
        colors={colors}
        gradientColors={gradients.doctorHeader}
        hasAlerts={allAllergies.length > 0 || (structured?.alerts?.length ?? 0) > 0}
      />

      <View style={styles.tabsWrap}>
        <AppSegmentedControl
          items={tabItems}
          value={activeTab}
          onValueChange={(v) => {
            haptics.selection();
            setActiveTab(v as TabKey);
          }}
          size="sm"
          scrollable
        />
      </View>

      <FlatList
        data={CONTENT_KEY}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: listPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        renderItem={() => (
          <View style={styles.contentWrap}>
            <PatientIdentityCard
              profile={profile}
              patientName={patientName}
              consultationCount={consultations.length}
              prescriptionCount={prescriptions.length}
              examCount={exams.length}
              allergies={allAllergies}
            />
            <AlertsBanner
              allergies={allAllergies}
              alerts={structured?.alerts ?? []}
            />
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
    loadingWrap: { flex: 1, backgroundColor: colors.background },
    tabsWrap: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    contentWrap: {
      gap: spacing.md,
    },
    tabContent: {
      gap: spacing.md,
    },
  });
}
