/**
 * BatchSigningProgress
 * ---------------------------------------------------------------------------
 * Componente de progresso para assinatura em lote de documentos médicos
 * com certificado PFX ICP-Brasil.
 *
 * Substitui a barra horizontal inline do BatchSignModal (§2.3 da spec)
 * por um anel circular animado em SVG + Reanimated v3.
 *
 * - Ring SVG 200x200, stroke 14, rotacionado -90deg para iniciar às 12h.
 * - Animação de `strokeDashoffset` via `useAnimatedProps` + `withTiming`
 *   (800ms, Easing.out(cubic)) reagindo a mudanças de `progress`.
 * - Texto central: contador grande + subtítulo "de N".
 * - Pill com percentual arredondado.
 * - Subtítulo configurável + live region para acessibilidade.
 *
 * Spec ref: §2.3 — "anel circular animado".
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { useAppTheme } from '@/lib/ui/useAppTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const STROKE_WIDTH = 14;
const RADIUS = 86;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;

export interface BatchSigningProgressProps {
  /** How many documents have been signed so far (0..total) */
  progress: number;
  /** Total documents in this batch */
  total: number;
  /** Optional subtitle override; default: "Aguarde enquanto assinamos seus documentos..." */
  subtitle?: string;
  /** Accessibility live announcement; default derived from progress/total */
  announcement?: string;
  /**
   * Estimated total time for the batch in seconds. When provided, renders a
   * human-readable ETA hint below the pill (ex.: "Estimativa: ~15 segundos").
   * Useful for larger batches where the user would otherwise wonder if the
   * process is frozen.
   */
  estimatedTotalSeconds?: number;
}

/**
 * Formata segundos em uma string curta em PT-BR:
 *   <60s       → "~45 segundos"
 *   60-119s    → "~1 minuto"
 *   120-3599s  → "~N minutos"
 *   >=3600s    → "mais de 1 hora"
 *
 * O "~" enfatiza que é estimativa; evita induzir ansiedade se o tempo
 * real variar para mais.
 */
function formatEta(seconds: number): string {
  if (seconds < 60) {
    const rounded = Math.max(5, Math.round(seconds / 5) * 5);
    return `~${rounded} segundos`;
  }
  if (seconds < 120) return '~1 minuto';
  if (seconds < 3600) return `~${Math.round(seconds / 60)} minutos`;
  return 'mais de 1 hora';
}

export function BatchSigningProgress({
  progress,
  total,
  subtitle = 'Aguarde enquanto assinamos seus documentos...',
  announcement,
  estimatedTotalSeconds,
}: BatchSigningProgressProps): React.ReactElement {
  const { colors } = useAppTheme({ role: 'doctor' });

  // Guard contra divisão por zero e progress > total.
  const safeRatio =
    total <= 0 ? 0 : Math.min(1, Math.max(0, progress / total));
  const percentLabel = `${Math.round(safeRatio * 100)}%`;

  const animatedRatio = useSharedValue(safeRatio);

  useEffect(() => {
    animatedRatio.value = withTiming(safeRatio, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [safeRatio, animatedRatio]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedRatio.value),
  }));

  // Track color = neutral[200] via surfaceTertiary token (palette equivalent of #E2E8F0).
  const trackColor = colors.surfaceTertiary;

  const accessibilityLabel =
    announcement ?? `Assinando ${progress} de ${total} documentos`;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
    >
      <View style={styles.ringWrapper}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <G rotation="-90" originX={CENTER} originY={CENTER}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={trackColor}
              strokeWidth={STROKE_WIDTH}
              strokeOpacity={0.3}
              fill="none"
            />
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={colors.primary}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
              animatedProps={animatedProps}
            />
          </G>
        </Svg>

        <View style={styles.centerText}>
          <Text
            style={[styles.progressNumber, { color: colors.primary }]}
            allowFontScaling={false}
          >
            {progress}
          </Text>
          <Text style={[styles.progressTotal, { color: colors.textSecondary }]}>
            de {total}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.pill,
          { backgroundColor: `${colors.primary}1A` },
        ]}
      >
        <Text style={[styles.pillText, { color: colors.primary }]}>
          {percentLabel}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {subtitle}
      </Text>

      {estimatedTotalSeconds !== undefined && estimatedTotalSeconds > 0 && (
        <Text
          style={[styles.etaHint, { color: colors.textMuted }]}
          accessibilityLabel={`Tempo estimado: ${formatEta(estimatedTotalSeconds)}`}
        >
          Estimativa: {formatEta(estimatedTotalSeconds)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  ringWrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 78,
    textAlign: 'center',
  },
  progressTotal: {
    fontSize: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  pill: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 20,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 280,
  },
  etaHint: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    opacity: 0.8,
  },
});

export default BatchSigningProgress;
