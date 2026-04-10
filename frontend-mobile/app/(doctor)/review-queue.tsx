/**
 * Modo Foco — fluxo sequencial de revisão de pedidos médicos.
 *
 * Mostra um pedido por vez com botões grandes de aprovar/rejeitar/pular
 * e gestos de swipe (complemento aos botões, spec §2.2).
 *
 * Design spec: docs/superpowers/specs/2026-04-07-assinatura-lote-design.md §2.2
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useDoctorRequestsQuery } from '../../lib/hooks/useDoctorRequestsQuery';
import { usePatientProfileQuery } from '../../lib/hooks/usePatientProfileQuery';
import { useRequestsEvents, useOnRequestClaimed } from '../../contexts/RequestsEventsContext';
import { useReviewAndApproveMutation } from '../../lib/hooks/useBatchSignature';
import { rejectRequest } from '../../lib/api-requests';
import { showToast } from '../../components/ui/Toast';
import { haptics } from '../../lib/haptics';
import { humanizeError } from '../../lib/errors/humanizeError';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { AppEmptyState } from '../../components/ui';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import { SwipeableRequestCard } from '../../components/doctor/batch/SwipeableRequestCard';
import { BatchSignModal } from '../../components/doctor/batch/BatchSignModal';
import { DoctorCard } from '../../components/ui/DoctorCard';
import { PatientInfoCard } from '../../components/doctor-request/PatientInfoCard';
import {
  AiCopilotSection,
  hasUsefulAiContent,
} from '../../components/doctor-request/AiCopilotSection';
import { PrescriptionImageGallery } from '../../components/doctor-request/PrescriptionImageGallery';
import type { RequestResponseDto, RequestStatus } from '../../types/database';

// Status considerados "pendentes de revisão" — mesmo mapeamento usado em requests.tsx
const PENDING_STATUSES: ReadonlySet<RequestStatus> = new Set<RequestStatus>([
  'submitted',
  'in_review',
  'pending',
  'analyzing',
  'searching_doctor',
]);

// ─── Helpers (module scope — sem dependência de hooks) ───

type FocusType = 'prescription' | 'exam' | 'consultation';

function getRequestTypeLabel(type: RequestResponseDto['requestType']): string {
  if (type === 'prescription') return 'RECEITA SOLICITADA';
  if (type === 'exam') return 'EXAME SOLICITADO';
  if (type === 'consultation') return 'CONSULTA SOLICITADA';
  return 'PEDIDO';
}

/**
 * Título do header do modo foco.
 *
 * Quando `type === null` (modo unificado — default), todos os tipos entram na
 * mesma fila sequencial. Essa é a experiência preferida pelo usuário: um
 * único contador consolidado ao invés de fluxos separados por categoria.
 *
 * A navegação por categoria (deep link com `?type=prescription`) ainda é
 * suportada para quem quer filtrar, mas o CTA primário do dashboard leva
 * ao modo unificado.
 */
function getFocusTypeTitle(type: FocusType | null): string {
  if (type === 'prescription') return 'Modo foco · Receitas';
  if (type === 'exam') return 'Modo foco · Exames';
  if (type === 'consultation') return 'Modo foco · Consultas';
  return 'Modo foco';
}

/**
 * Badge curto para marcar visualmente o tipo da solicitação atual.
 * Necessário no modo unificado, onde a fila mistura receitas/exames/consultas
 * e o médico precisa saber instantaneamente qual é o tipo do card atual.
 */
function getRequestTypeBadge(type: RequestResponseDto['requestType']): {
  label: string;
  bg: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (type === 'prescription') {
    return { label: 'RECEITA', bg: '#E0F2FE', color: '#0369A1', icon: 'document-text' };
  }
  if (type === 'exam') {
    return { label: 'EXAME', bg: '#FEF3C7', color: '#B45309', icon: 'flask' };
  }
  if (type === 'consultation') {
    return { label: 'CONSULTA', bg: '#F3E8FF', color: '#6D28D9', icon: 'videocam' };
  }
  return { label: 'PEDIDO', bg: '#F1F5F9', color: '#475569', icon: 'document' };
}

function getRequestItems(r: RequestResponseDto): string[] {
  if (r.requestType === 'prescription') return r.medications ?? [];
  if (r.requestType === 'exam') return r.exams ?? [];
  if (r.requestType === 'consultation') {
    return r.symptoms ? [r.symptoms] : [];
  }
  return [];
}

export default function ReviewQueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useAppTheme({ role: 'doctor' });

  const { type: rawType } = useLocalSearchParams<{ type?: string }>();
  const type = useMemo<FocusType | null>(() => {
    return rawType === 'prescription' || rawType === 'exam' || rawType === 'consultation'
      ? rawType
      : null;
  }, [rawType]);

  const { isConnected } = useRequestsEvents();
  const {
    data: requests = [],
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useDoctorRequestsQuery(isConnected);

  const reviewAndApproveMutation = useReviewAndApproveMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedCount, setRejectedCount] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  // FIX A7: guard síncrono contra duplo-clique. `isSubmitting` via useState
  // tem janela de race: em conexões lentas, o médico pode clicar duas vezes
  // antes do re-render aplicar `setIsSubmitting(true)`, e o closure do
  // segundo clique ainda vê `isSubmitting === false`. useRef é atualizado
  // no mesmo tick, eliminando a janela.
  const submittingRef = useRef(false);
  const [showBatchSignModal, setShowBatchSignModal] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);

  // Congela a fila no momento da abertura para evitar reshuffle durante o fluxo
  const [queueSnapshot, setQueueSnapshot] = useState<RequestResponseDto[] | null>(null);

  // Filtra proativamente itens reivindicados por outro médico do snapshot congelado
  useOnRequestClaimed((claimedRequestId) => {
    setQueueSnapshot((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((r) => r.id === claimedRequestId);
      if (idx === -1) return prev; // não está no snapshot
      if (idx < currentIndex) return prev; // já passou deste item
      showToast({
        message: 'Outro médico pegou um pedido da sua fila.',
        type: 'info',
      });
      return prev.filter((r) => r.id !== claimedRequestId);
    });
  });

  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          PENDING_STATUSES.has(r.status) &&
          (!type || r.requestType === type)
      ),
    [requests, type]
  );

  // Inicializa o snapshot assim que os pedidos chegam
  useEffect(() => {
    if (queueSnapshot === null && !isLoading && pendingRequests.length > 0) {
      setQueueSnapshot(pendingRequests);
    }
  }, [queueSnapshot, isLoading, pendingRequests]);

  const workingQueue: RequestResponseDto[] = queueSnapshot ?? pendingRequests;
  const totalCount = workingQueue.length;
  const currentRequest: RequestResponseDto | undefined = workingQueue[currentIndex];
  const processedCount = approvedCount + rejectedCount + skippedIds.size;
  const progress = totalCount > 0 ? Math.min(1, processedCount / totalCount) : 0;
  const isFinished = totalCount > 0 && currentIndex >= totalCount;
  const currentPosition = isFinished ? totalCount : processedCount + 1;

  // Lazy-fetch do perfil clínico do paciente atual — idade, CPF mascarado, telefone.
  const { data: patientProfile } = usePatientProfileQuery(
    workingQueue[currentIndex]?.patientId
  );

  const approvedRequests = useMemo(
    () => (queueSnapshot ?? []).filter((r) => approvedIds.has(r.id)),
    [queueSnapshot, approvedIds]
  );

  // ── Animations ──
  const fadeOpacity = useSharedValue(1);
  const fadeTranslateY = useSharedValue(0);
  const fadeKey = currentRequest?.id ?? '';
  const snappyEasing = REasing.bezier(0.2, 0.8, 0.2, 1);

  // Slide+fade on card advance (matches motionTokens.fade.doctorSection)
  useEffect(() => {
    if (!fadeKey) return;
    fadeOpacity.value = 0;
    fadeTranslateY.value = 8;
    fadeOpacity.value = withTiming(1, { duration: 210, easing: snappyEasing });
    fadeTranslateY.value = withTiming(0, { duration: 210, easing: snappyEasing });
  }, [fadeKey, fadeOpacity, fadeTranslateY, snappyEasing]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: fadeTranslateY.value }],
  }));

  // Animated progress bar
  const progressAnim = useSharedValue(0);
  useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 300, easing: REasing.out(REasing.ease) });
  }, [progress, progressAnim]);
  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%`,
  }));

  // Finished screen spring animation
  const checkScale = useSharedValue(0.3);
  const finishedStatsOpacity = useSharedValue(0);
  const finishedStatsY = useSharedValue(12);
  useEffect(() => {
    if (isFinished) {
      checkScale.value = withSpring(1, { damping: 8, stiffness: 140, mass: 0.9 });
      finishedStatsOpacity.value = withDelay(200, withTiming(1, { duration: 320 }));
      finishedStatsY.value = withDelay(200, withTiming(0, { duration: 320 }));
    }
  }, [isFinished, checkScale, finishedStatsOpacity, finishedStatsY]);
  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  const finishedStatsStyle = useAnimatedStyle(() => ({
    opacity: finishedStatsOpacity.value,
    transform: [{ translateY: finishedStatsY.value }],
  }));

  const goNext = useCallback(() => {
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleClose = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const handleSkip = useCallback(() => {
    if (!currentRequest) return;
    haptics.light();
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.add(currentRequest.id);
      return next;
    });
    goNext();
  }, [currentRequest, goNext]);

  const handleApprove = useCallback(async () => {
    if (!currentRequest || submittingRef.current) return;
    const request = currentRequest;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await reviewAndApproveMutation.mutateAsync(request.id);
      haptics.success();
      setApprovedCount((c) => c + 1);
      setApprovedIds((prev) => {
        const next = new Set(prev);
        next.add(request.id);
        return next;
      });
      // Toast passivo — não bloqueante, preserva momentum (spec §2.2).
      showToast({
        message: `Paciente ${request.patientName ?? 'aprovado'} aprovado · adicionado à fila`,
        type: 'success',
        duration: 5000,
      });
      goNext();
    } catch (err) {
      haptics.error();
      showToast({
        message: humanizeError(err, 'request'),
        type: 'error',
      });
      // Não avança — mantém item atual para o médico tentar novamente.
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [currentRequest, reviewAndApproveMutation, goNext]);

  const performReject = useCallback(
    async (request: RequestResponseDto, reason: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        await rejectRequest(request.id, reason);
        haptics.warning();
        setRejectedCount((c) => c + 1);
        showToast({
          message: `${request.patientName ?? 'Paciente'} rejeitado`,
          type: 'info',
          duration: 4000,
        });
        goNext();
      } catch (err) {
        haptics.error();
        showToast({
          message: humanizeError(err, 'request'),
          type: 'error',
        });
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [goNext]
  );

  const handleReject = useCallback(() => {
    if (!currentRequest || submittingRef.current) return;
    const request = currentRequest;

    if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt(
        'Rejeitar pedido',
        'Informe o motivo da rejeição (será enviado ao paciente):',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Rejeitar',
            style: 'destructive',
            onPress: (reason?: string) => {
              const trimmed = (reason ?? '').trim();
              if (!trimmed) {
                showToast({ message: 'Motivo é obrigatório', type: 'warning' });
                return;
              }
              void performReject(request, trimmed);
            },
          },
        ],
        'plain-text'
      );
      return;
    }

    // Android / Web: Alert.prompt não existe — usa confirmação simples com motivo genérico.
    // TODO: substituir por modal custom com TextInput quando a UI de modal estiver pronta.
    Alert.alert(
      'Rejeitar pedido',
      'Deseja rejeitar este pedido? Um motivo padrão será registrado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: () => {
            void performReject(request, 'Pedido rejeitado pelo médico após revisão.');
          },
        },
      ]
    );
  }, [currentRequest, performReject]);

  /**
   * Bug histórico (2026-04-09): este handler navegava para `/doctor-request/${id}`,
   * a tela de detalhe operacional da solicitação. Mas o botão que o dispara se
   * chama "VER PRONTUÁRIO" no PatientInfoCard, então o médico esperava o
   * histórico clínico do paciente e recebia uma tela intermediária com
   * outro botão "Ver Prontuário" — fluxo redundante e confuso.
   *
   * Correção: "Ver prontuário" passa a ser unívoco no app inteiro e sempre
   * leva ao prontuário unificado (/doctor-patient/:patientId). Se o médico
   * quiser ver os detalhes crus da solicitação, o card de detalhes no
   * próprio modo foco já os mostra (medicações, exames, observações, IA).
   */
  const handleOpenPatientRecord = useCallback(() => {
    if (!currentRequest?.patientId) return;
    haptics.selection();
    router.push(`/doctor-patient/${currentRequest.patientId}`);
  }, [currentRequest, router]);

  const handleOpenBatchSign = useCallback(() => {
    haptics.light();
    if (approvedRequests.length === 0) {
      router.replace('/(doctor)/(tabs)/requests' as never);
      return;
    }
    setShowBatchSignModal(true);
  }, [approvedRequests.length, router]);

  const handleCloseBatchSign = useCallback(() => {
    setShowBatchSignModal(false);
    router.replace('/(doctor)/(tabs)/dashboard' as never);
  }, [router]);

  const handleGoToDashboard = useCallback(() => {
    router.replace('/(doctor)/dashboard');
  }, [router]);

  // ─────────── RENDER ───────────

  if (isLoading && workingQueue.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <View style={styles.loadingWrap}>
          <SkeletonList count={3} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <AppEmptyState
          icon="alert-circle-outline"
          title="Não foi possível carregar"
          subtitle={humanizeError(queryError, 'request')}
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
        <TouchableOpacity style={[styles.backFallback, { backgroundColor: colors.primary }]} onPress={handleClose}>
          <Text style={styles.backFallbackText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (totalCount === 0) {
    // Empty state contextual: se o médico já revisou algo nesta sessão,
    // convida a ir para a fila de assinatura; caso contrário, apenas informa.
    const drainedMidSession = processedCount > 0;
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <AppEmptyState
          icon="checkmark-done-circle-outline"
          title={drainedMidSession ? 'Fila revisada!' : 'Tudo em dia!'}
          subtitle={
            drainedMidSession
              ? 'Todos os pedidos foram revisados · Assine em lote agora'
              : 'Nenhum pedido pendente.'
          }
        />
        <TouchableOpacity
          style={[styles.backFallback, { backgroundColor: colors.primary }]}
          onPress={drainedMidSession ? handleOpenBatchSign : handleClose}
          accessibilityRole="button"
          accessibilityLabel={drainedMidSession ? 'Assinar em lote' : 'Voltar'}
        >
          <Text style={styles.backFallbackText}>
            {drainedMidSession ? 'Assinar em lote' : 'Voltar'}
          </Text>
        </TouchableOpacity>
        <BatchSignModal
          visible={showBatchSignModal}
          onClose={handleCloseBatchSign}
          requests={approvedRequests}
        />
      </View>
    );
  }

  if (isFinished) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, backgroundColor: colors.background }]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <View style={styles.finishedWrap}>
          <Animated.View style={[styles.finishedIcon, { backgroundColor: colors.successLight }, checkAnimStyle]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </Animated.View>
          <Text style={[styles.finishedTitle, { color: colors.text }]}>Fila concluída!</Text>
          <Animated.View style={finishedStatsStyle}>
            <Text style={[styles.finishedSubtitle, { color: colors.textSecondary }]}>
              Você revisou {totalCount} {totalCount === 1 ? 'pedido' : 'pedidos'}:
              {'\n'}
              {approvedCount} {approvedCount === 1 ? 'aprovado' : 'aprovados'} ·{' '}
              {rejectedCount} {rejectedCount === 1 ? 'rejeitado' : 'rejeitados'} ·{' '}
              {skippedIds.size} {skippedIds.size === 1 ? 'pulado' : 'pulados'}
            </Text>
          </Animated.View>

          <TouchableOpacity
            style={styles.primaryCta}
            onPress={handleOpenBatchSign}
            accessibilityRole="button"
            accessibilityLabel={
              approvedRequests.length > 0
                ? `Assinar ${approvedRequests.length} documento${approvedRequests.length > 1 ? 's' : ''} em lote`
                : 'Ir para fila de assinatura'
            }
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryCtaGradient}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryCtaText}>
                {approvedRequests.length > 0
                  ? `Assinar ${approvedRequests.length} em lote`
                  : 'Ir para fila de assinatura'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryCta, { backgroundColor: colors.surface, borderColor: colors.surfaceTertiary }]}
            onPress={handleGoToDashboard}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao painel"
          >
            <Text style={[styles.secondaryCtaText, { color: colors.text }]}>Voltar ao painel</Text>
          </TouchableOpacity>
        </View>
        <BatchSignModal
          visible={showBatchSignModal}
          onClose={handleCloseBatchSign}
          requests={approvedRequests}
        />
      </View>
    );
  }

  // Current request card
  if (!currentRequest) {
    return null;
  }

  const items = getRequestItems(currentRequest);
  const typeLabel = getRequestTypeLabel(currentRequest.requestType);
  const hasAiAnalysis = hasUsefulAiContent(
    currentRequest.aiSummaryForDoctor,
    currentRequest.aiRiskLevel,
    currentRequest.aiUrgency
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerIconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar modo foco"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{getFocusTypeTitle(type)}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {currentPosition} de {totalCount} · {approvedCount} aprovados ·{' '}
              {rejectedCount} rejeitados
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSkip}
            disabled={isSubmitting}
            style={styles.headerLinkBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Pular pedido"
          >
            <Text style={[styles.headerLinkText, { color: colors.primary }]}>Pular</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Progress bar — animated */}
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceTertiary }]}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor: colors.primary }, progressFillStyle]}
          />
        </View>

      </View>

      {/* ── CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SwipeableRequestCard
          onApprove={handleApprove}
          onReject={handleReject}
          disabled={isSubmitting}
        >
          <Animated.View style={[styles.fadeWrap, fadeStyle]}>
            {/* Patient context card — idade, CPF mascarado, telefone e link p/ prontuário */}
            <PatientInfoCard
              request={currentRequest}
              profile={patientProfile ?? undefined}
              onViewRecord={handleOpenPatientRecord}
              typeBadge={getRequestTypeBadge(currentRequest.requestType)}
            />

            {/* Request details */}
            <DoctorCard style={{ gap: 6 }}>
              <Text style={[styles.detailsLabel, { color: colors.primary }]}>{typeLabel}</Text>
              {items.length === 0 ? (
                <Text style={[styles.detailsEmpty, { color: colors.textMuted }]}>Sem itens informados.</Text>
              ) : (
                items.map((item, idx) => (
                  <View key={`${item}-${idx}`} style={styles.detailsItem}>
                    <Text style={[styles.detailsBullet, { color: colors.text }]}>•</Text>
                    <Text style={[styles.detailsText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))
              )}
              {currentRequest.notes ? (
                <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Observações</Text>
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{currentRequest.notes}</Text>
                </View>
              ) : null}
            </DoctorCard>

            {/* Imagens anexadas — receita e/ou exame (self-guarding: retorna null se vazio) */}
            <PrescriptionImageGallery
              images={currentRequest.prescriptionImages ?? []}
              label="IMAGENS DA RECEITA"
              iconBackgroundColor="#E0F2FE"
            />
            <PrescriptionImageGallery
              images={currentRequest.examImages ?? []}
              label="IMAGENS DO EXAME"
              iconBackgroundColor="#FEF3C7"
            />

            {/* AI analysis — reutiliza o card estruturado do copiloto (headers/bullets, fundo sólido). */}
            {hasAiAnalysis ? (
              <AiCopilotSection
                request={currentRequest}
                expanded={aiExpanded}
                onToggleExpand={() => setAiExpanded((v) => !v)}
              />
            ) : null}
          </Animated.View>
        </SwipeableRequestCard>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <View
        style={[
          styles.actionBar,
          { paddingBottom: Math.max(12, insets.bottom + 8), backgroundColor: colors.surface, borderTopColor: colors.border, ...shadows.sm },
        ]}
      >
        <TouchableOpacity
          onPress={handleReject}
          disabled={isSubmitting}
          style={[styles.rejectBtn, isSubmitting && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Rejeitar pedido"
          accessibilityState={{ disabled: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#B91C1C" />
          ) : (
            <>
              <Ionicons name="close" size={18} color="#B91C1C" />
              <Text style={styles.rejectText}>Rejeitar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          disabled={isSubmitting}
          style={[styles.skipBtn, { backgroundColor: colors.surfaceSecondary }, isSubmitting && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Pular pedido"
          accessibilityState={{ disabled: isSubmitting }}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Pular</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleApprove}
          disabled={isSubmitting}
          style={[styles.approveBtn, isSubmitting && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Aprovar e ir para o próximo"
          accessibilityState={{ disabled: isSubmitting }}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.approveGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.approveText}>Aprovar e próximo</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  backFallback: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
  },
  backFallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },

  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  // ── Content ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  fadeWrap: {
    gap: 12,
  },

  // ── Details (inside DoctorCard) ──
  detailsLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailsEmpty: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  detailsItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  detailsBullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  notesBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Action bar ──
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  rejectBtn: {
    flex: 0.7,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  skipBtn: {
    flex: 0.5,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
  },
  approveGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // ── Finished state ──
  finishedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  finishedIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  finishedTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  finishedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryCta: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryCta: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
