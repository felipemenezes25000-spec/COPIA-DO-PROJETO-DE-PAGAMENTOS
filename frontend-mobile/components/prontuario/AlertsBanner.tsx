/**
 * AlertsBanner — Banner de alertas clínicos (alergias + alertas IA).
 *
 * Componente fino fixo que destaca pontos de atenção.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { spacing, borderRadius, typography } from '../../lib/themeDoctor';

interface AlertsBannerProps {
  allergies: string[];
  alerts: string[];
  style?: object;
}

export function AlertsBanner({ allergies, alerts, style }: AlertsBannerProps) {
  const { colors } = useAppTheme({ role: 'doctor' });
  const S = useMemo(() => makeStyles(colors), [colors]);

  const totalItems = allergies.length + alerts.length;
  if (totalItems === 0) return null;

  return (
    <View style={[S.card, style]}>
      <View style={S.header}>
        <Ionicons name="warning" size={18} color={colors.error} />
        <Text style={S.title}>Pontos de atenção</Text>
        <View style={S.countBadge}>
          <Text style={S.countText}>{totalItems}</Text>
        </View>
      </View>

      <View style={S.list}>
        {allergies.map((a, i) => (
          <View key={`allergy-${i}`} style={S.item}>
            <View style={[S.itemDot, { backgroundColor: colors.error }]} />
            <Ionicons name="medical" size={13} color={colors.error} />
            <Text style={S.itemText}>
              <Text style={S.itemLabel}>Alergia: </Text>{a}
            </Text>
          </View>
        ))}
        {alerts.map((a, i) => (
          <View key={`alert-${i}`} style={S.item}>
            <View style={[S.itemDot, { backgroundColor: colors.warning }]} />
            <Ionicons name="alert-circle" size={13} color={colors.warning} />
            <Text style={S.itemText}>{a}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: DesignColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.errorLight,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 13,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.error,
      letterSpacing: 0.3,
      flex: 1,
    },
    countBadge: {
      backgroundColor: colors.error,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 22,
      alignItems: 'center',
    },
    countText: {
      fontSize: 11,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.white,
    },
    list: {
      gap: 4,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 3,
    },
    itemDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    itemLabel: {
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
    },
    itemText: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
      lineHeight: 19,
    },
  });
}
