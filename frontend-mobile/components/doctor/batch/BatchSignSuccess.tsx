/**
 * BatchSignSuccess — tela celebratória exibida após a conclusão de uma
 * operação de assinatura em lote pelo médico.
 *
 * Ref: Spec §2.3 — "Batch Signature — Success Screen"
 *   - Hero animado com checkmark e gradiente emerald
 *   - Grade 2×2 de estatísticas (assinados, taxa, tempo, tempo economizado)
 *   - Lista de falhas com ação "Tentar novamente apenas os que falharam"
 *   - Ação primária "Voltar à fila"
 *
 * Substitui o bloco inline que existia em BatchSignModal.tsx (linhas ~580-660).
 */

import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../../lib/ui/useAppTheme';
import { haptics } from '../../../lib/haptics';
import { humanizeError } from '../../../lib/errors/humanizeError';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BatchSignSuccessItem {
  requestId: string;
  success: boolean;
  errorMessage: string | null;
}

export interface BatchSignSuccessProps {
  /** Total successfully signed documents */
  signedCount: number;
  /** Total failed documents */
  failedCount: number;
  /** Wall-clock elapsed milliseconds since batch started */
  elapsedMs: number;
  /** Per-item results for listing failures. Only items where success=false are shown. */
  items: BatchSignSuccessItem[];
  /** Called when user taps primary "Voltar à fila" action */
  onClose: () => void;
  /** Called when user taps "Tentar novamente apenas os que falharam". Receives only the failed requestIds. */
  onRetryFailed?: (failedRequestIds: string[]) => void;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Tempo médio de assinatura manual por documento, conforme benchmark da indústria. */
const MANUAL_SIGN_MS_PER_DOC = 90_000;

const PURPLE_ACCENT = '#8B5CF6';
const GRADIENT_COLORS: readonly [string, string] = ['#10B981', '#059669'];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  if (ms < 60_000) {
    const seconds = Math.round(ms / 1000);
    return seconds === 0 ? '<1s' : `${seconds}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}min ${seconds}s`;
}

function truncateId(requestId: string): string {
  if (requestId.length <= 8) return requestId;
  return `${requestId.slice(0, 8)}...`;
}

// -----------------------------------------------------------------------------
// Stat card (animated)
// -----------------------------------------------------------------------------

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  index: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
}

function StatCard({
  icon,
  iconColor,
  value,
  label,
  index,
  bgColor,
  borderColor,
  textColor,
  mutedColor,
}: StatCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 320, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(index * 80, withTiming(0, { duration: 320, easing: Easing.out(Easing.ease) }));
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.statCard,
        { backgroundColor: bgColor, borderColor },
        animatedStyle,
      ]}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
    </Animated.View>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export function BatchSignSuccess({
  signedCount,
  failedCount,
  elapsedMs,
  items,
  onClose,
  onRetryFailed,
}: BatchSignSuccessProps) {
  const { colors } = useAppTheme({ role: 'doctor' });

  // ---- computed values ---------------------------------------------------
  const total = signedCount + failedCount;
  const successRate = total === 0 ? 0 : Math.round((signedCount / total) * 100);
  const elapsedFormatted = useMemo(() => formatDuration(elapsedMs), [elapsedMs]);
  const savedMs = Math.max(0, signedCount * MANUAL_SIGN_MS_PER_DOC - elapsedMs);
  const savedFormatted = useMemo(() => formatDuration(savedMs), [savedMs]);

  // Humaniza a mensagem de erro de cada item ANTES de renderizar. O backend
  // emite mensagens como "Pedido não está mais apto para assinatura (status
  // atual: InReview)" que são incompreensíveis para o médico; humanizeError
  // com contexto 'batch-sign' traduz essas para PT-BR claro e acionável.
  const failedItems = useMemo(
    () =>
      items
        .filter((i) => !i.success)
        .map((i) => ({
          ...i,
          displayMessage: i.errorMessage
            ? humanizeError(new Error(i.errorMessage), 'batch-sign')
            : 'Erro desconhecido',
        })),
    [items]
  );
  const hasFailures = failedItems.length > 0;

  // Quando todos os itens falharam com a mesma mensagem (ex.: senha errada,
  // short-circuit no backend marca todos com o mesmo erro), consolidamos
  // em uma única linha em vez de N linhas idênticas.
  const allFailedSameMessage =
    failedItems.length > 1 &&
    failedItems.every((i) => i.displayMessage === failedItems[0].displayMessage);

  // ---- checkmark entry animation ----------------------------------------
  const checkScale = useSharedValue(0.3);
  useEffect(() => {
    haptics.success();
    checkScale.value = withSpring(1, {
      damping: 8,
      stiffness: 140,
      mass: 0.9,
      overshootClamping: false,
    });
  }, [checkScale]);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  // ---- retry handler -----------------------------------------------------
  const handleRetryFailed = () => {
    if (!onRetryFailed) return;
    onRetryFailed(failedItems.map((f) => f.requestId));
  };

  const title = hasFailures ? 'Parcialmente concluído' : 'Tudo pronto!';
  const subtitle = `${signedCount} de ${total} documentos assinados`;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero -------------------------------------------------------------- */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Animated.View style={checkAnimatedStyle}>
          <Ionicons name="checkmark-circle" size={72} color="#FFFFFF" />
        </Animated.View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </LinearGradient>

      {/* Stats grid -------------------------------------------------------- */}
      <View style={styles.statsGrid}>
        <StatCard
          index={0}
          icon="checkmark-done"
          iconColor={colors.success}
          value={String(signedCount)}
          label="Assinados"
          bgColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
        <StatCard
          index={1}
          icon="trending-up"
          iconColor={colors.primary}
          value={`${successRate}%`}
          label="Taxa de sucesso"
          bgColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
        <StatCard
          index={2}
          icon="time-outline"
          iconColor={colors.secondary}
          value={elapsedFormatted}
          label="Tempo"
          bgColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
        <StatCard
          index={3}
          icon="flash-outline"
          iconColor={PURPLE_ACCENT}
          value={savedFormatted}
          label="Economizado"
          bgColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
      </View>

      {/* Failed items list ------------------------------------------------- */}
      {hasFailures ? (
        <View style={styles.failedSection}>
          <Text style={[styles.failedTitle, { color: colors.error }]}>
            Itens que falharam ({failedItems.length})
          </Text>

          {/* Quando todos os itens falharam com o mesmo motivo (ex.: senha errada
              aplicada via short-circuit no backend), mostramos uma única mensagem
              consolidada em vez de repetir N linhas idênticas. */}
          {allFailedSameMessage ? (
            <View
              style={[
                styles.failedRow,
                { backgroundColor: `${colors.error}14` },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={18}
                color={colors.error}
                style={styles.failedIcon}
              />
              <View style={styles.failedBody}>
                <Text style={[styles.failedId, { color: colors.text }]}>
                  {failedItems.length === 1
                    ? '1 documento'
                    : `${failedItems.length} documentos`}
                </Text>
                <Text
                  numberOfLines={3}
                  style={[styles.failedMessage, { color: colors.textMuted }]}
                >
                  {failedItems[0].displayMessage}
                </Text>
              </View>
            </View>
          ) : (
            failedItems.map((item) => (
              <View
                key={item.requestId}
                style={[
                  styles.failedRow,
                  { backgroundColor: `${colors.error}14` },
                ]}
              >
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={colors.error}
                  style={styles.failedIcon}
                />
                <View style={styles.failedBody}>
                  <Text style={[styles.failedId, { color: colors.text }]}>
                    {truncateId(item.requestId)}
                  </Text>
                  <Text
                    numberOfLines={3}
                    style={[styles.failedMessage, { color: colors.textMuted }]}
                  >
                    {item.displayMessage}
                  </Text>
                </View>
              </View>
            ))
          )}

          {onRetryFailed ? (
            <TouchableOpacity
              onPress={handleRetryFailed}
              activeOpacity={0.8}
              style={[
                styles.retryButton,
                { borderColor: colors.error },
              ]}
            >
              <Ionicons name="refresh" size={18} color={colors.error} />
              <Text style={[styles.retryText, { color: colors.error }]}>
                Tentar novamente apenas os {failedItems.length}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Primary action ---------------------------------------------------- */}
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.85}
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.primaryButtonText}>Voltar à fila</Text>
      </TouchableOpacity>

      {/* Secondary action: share report (placeholder — noop hook point) ---- */}
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.7}
        style={styles.secondaryButton}
      >
        <Ionicons name="share-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
          Compartilhar relatório
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default BatchSignSuccess;

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  // Hero
  hero: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  // Stats grid
  statsGrid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Failed section
  failedSection: {
    marginTop: 24,
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  failedIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  failedBody: {
    flex: 1,
  },
  failedId: {
    fontSize: 14,
    fontWeight: '600',
  },
  failedMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  retryButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Primary action
  primaryButton: {
    marginTop: 28,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Secondary action
  secondaryButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
