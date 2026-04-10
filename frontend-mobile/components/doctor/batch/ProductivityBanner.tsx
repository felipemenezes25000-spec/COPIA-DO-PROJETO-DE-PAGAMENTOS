/**
 * ProductivityBanner
 *
 * Celebratory banner shown at the top of the doctor's "Assinados" (Signed)
 * tab in `app/(doctor)/requests.tsx`. Displays today's signing productivity:
 * today's count (animated), comparison vs weekly average, and mini stats
 * (total time, time saved, batches).
 *
 * Spec reference: §2.4 (Productivity Banner) and §4.3 (Productivity gradient).
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ProductivityBannerProps {
  /** Documents signed today */
  todayCount: number;
  /** Rolling 7-day average documents/day signed (pass 0 if unknown). */
  weeklyAverage: number;
  /** Total batches completed today */
  batchesToday: number;
  /** Total time spent signing today in milliseconds */
  totalTimeMs: number;
  /** Estimated time saved vs manual signing today in milliseconds */
  savedTimeMs: number;
}

function formatTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}min`;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

export function ProductivityBanner({
  todayCount,
  weeklyAverage,
  batchesToday,
  totalTimeMs,
  savedTimeMs,
}: ProductivityBannerProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (todayCount === 0) {
      setDisplayed(0);
      return;
    }
    const duration = 800;
    const steps = 30;
    const stepMs = duration / steps;
    const increment = todayCount / steps;
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      const current = Math.min(todayCount, Math.round(step * increment));
      setDisplayed(current);
      if (step >= steps) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [todayCount]);

  const safeSavedMs = Math.max(0, savedTimeMs);

  const showComparison = weeklyAverage > 0;
  const isAboveAverage = showComparison && todayCount > weeklyAverage;
  const isBelowAverage = showComparison && todayCount < weeklyAverage;
  const percentAbove =
    isAboveAverage && weeklyAverage > 0
      ? Math.round(((todayCount - weeklyAverage) / weeklyAverage) * 100)
      : 0;

  const isEmpty = todayCount === 0;

  return (
    <LinearGradient
      // Brand hex colors (spec §4.3 productivity gradient) — intentionally
      // not from theme so the celebratory feel is consistent across modes.
      colors={['#6D28D9', '#4C1D95', '#2563EB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
      accessibilityLabel={`Produtividade hoje: ${todayCount} documentos assinados`}
    >
      {/* Decorative pattern overlay */}
      <View pointerEvents="none" style={styles.patternWrap}>
        <Ionicons name="sparkles" size={180} color="#FFFFFF" style={styles.patternIcon} />
      </View>

      {/* Row 1 — hero */}
      <Text style={styles.label}>PRODUTIVIDADE HOJE</Text>

      {isEmpty ? (
        <Text style={styles.emptyText}>
          Nenhum documento assinado hoje · Aproveite para revisar pedidos pendentes
        </Text>
      ) : (
        <>
          <Text style={styles.heroNumber}>{displayed}</Text>
          <Text style={styles.heroCaption}>documentos assinados</Text>

          {/* Row 2 — comparison pill */}
          {isAboveAverage && (
            <View style={[styles.pill, styles.pillPositive]}>
              <Ionicons name="checkmark-circle" size={14} color="#BBF7D0" />
              <Text style={styles.pillText}>+{percentAbove}% acima da média</Text>
            </View>
          )}
          {isBelowAverage && (
            <View style={[styles.pill, styles.pillNeutral]}>
              <Text style={styles.pillText}>
                ↓ Média dos últimos 7 dias: {weeklyAverage}
              </Text>
            </View>
          )}

          {/* Row 3 — mini stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Ionicons name="time-outline" size={16} color="#FFFFFF" />
              <Text style={styles.statValue}>{formatTime(totalTimeMs)}</Text>
              <Text style={styles.statLabel}>TEMPO TOTAL</Text>
            </View>
            <View style={styles.statCell}>
              <Ionicons name="flash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.statValue}>{formatTime(safeSavedMs)}</Text>
              <Text style={styles.statLabel}>ECONOMIA</Text>
            </View>
            <View style={styles.statCell}>
              <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
              <Text style={styles.statValue}>{batchesToday}</Text>
              <Text style={styles.statLabel}>
                {batchesToday === 1 ? 'LOTE' : 'LOTES'}
              </Text>
            </View>
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  patternWrap: {
    position: 'absolute',
    top: -30,
    right: -30,
    opacity: 0.08,
    transform: [{ rotate: '-15deg' }],
  },
  patternIcon: {
    // size set via Ionicons prop
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroNumber: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: 4,
  },
  heroCaption: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    marginTop: 2,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginTop: 10,
    lineHeight: 22,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
    gap: 6,
  },
  pillPositive: {
    backgroundColor: 'rgba(34,197,94,0.22)',
  },
  pillNeutral: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  statCell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default ProductivityBanner;
