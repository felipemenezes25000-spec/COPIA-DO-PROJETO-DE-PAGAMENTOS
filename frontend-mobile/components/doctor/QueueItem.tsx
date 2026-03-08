import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DesignColors } from '../../lib/designSystem';
import { RequestResponseDto } from '../../types/database';
import { getRequestUiState } from '../../lib/domain/getRequestUiState';

const TYPE_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  prescription: { label: 'Receita', icon: 'document-text' },
  exam: { label: 'Exame', icon: 'flask' },
  consultation: { label: 'Consulta', icon: 'videocam' },
};

function timeWaiting(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return 'Agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface QueueItemProps {
  request: RequestResponseDto;
  onPress: () => void;
  colors: DesignColors;
}

export function QueueItem({ request, onPress, colors }: QueueItemProps) {
  const { label, colorKey } = getRequestUiState(request);
  const isHighRisk = request.aiRiskLevel === 'high';
  const typeConf = TYPE_LABELS[request.requestType] ?? { label: 'Pedido', icon: 'document' as keyof typeof Ionicons.glyphMap };

  const statusColor = colorKey === 'action'
    ? colors.info
    : colorKey === 'success'
    ? colors.success
    : colorKey === 'waiting'
    ? colors.warning
    : colors.textMuted;

  const accentColor = isHighRisk ? colors.error : (colorKey === 'action' ? colors.primary : colorKey === 'success' ? colors.success : colors.primary);

  const initials = (request.patientName || 'P')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          shadowColor: colors.black,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Atender ${request.patientName ?? 'paciente'} — ${typeConf.label}`}
    >
      {/* Faixa lateral colorida */}
      <View style={[styles.strip, { backgroundColor: accentColor }]} />

      {/* Avatar com iniciais */}
      <View style={[styles.avatar, { backgroundColor: accentColor + '18' }]}>
        <Text style={[styles.avatarText, { color: accentColor }]}>{initials}</Text>
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.typePill, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={typeConf.icon} size={11} color={colors.primary} />
            <Text style={[styles.typeLabel, { color: colors.primary }]}>{typeConf.label}</Text>
          </View>
          {isHighRisk && (
            <View style={[styles.riskPill, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="alert-circle" size={11} color={colors.error} />
              <Text style={[styles.riskLabel, { color: colors.error }]}>Risco Alto</Text>
            </View>
          )}
        </View>

        <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
          {request.patientName || 'Paciente'}
        </Text>

        <View style={styles.bottomRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>{label}</Text>
          <View style={styles.spacer} />
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
            {timeWaiting(request.createdAt)}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  strip: {
    width: 4,
    alignSelf: 'stretch',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  riskLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  spacer: { flex: 1 },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
  },
  chevron: {
    marginRight: 14,
    marginLeft: 4,
    flexShrink: 0,
  },
});
