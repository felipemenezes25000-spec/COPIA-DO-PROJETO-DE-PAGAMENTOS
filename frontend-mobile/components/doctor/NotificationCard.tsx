import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DesignColors } from '../../lib/designSystem';
import { NotificationResponseDto } from '../../types/database';

export interface NotificationVisual {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}

interface NotificationCardProps {
  item: NotificationResponseDto;
  visual: NotificationVisual;
  colors: DesignColors;
  isDark: boolean;
  onPress: () => void;
  timeAgo: string;
}

export function NotificationCard({ item, visual, colors, isDark, onPress, timeAgo }: NotificationCardProps) {
  const isUnread = !item.read;

  // FIX: No Android, elevation + overflow:'hidden' + borderRadius cria artefato
  // cinza ao redor do card. Solução: separar a sombra em um wrapper externo
  // e remover overflow:'hidden' do card principal.
  const cardBg = isUnread
    ? (isDark ? colors.primarySoft : colors.surface)
    : colors.surface;

  const cardBorderColor = isUnread
    ? colors.primary + '25'
    : (isDark ? colors.border : colors.borderLight);

  return (
    <View style={[
      styles.cardOuter,
      Platform.OS === 'android' && (isUnread ? styles.cardOuterElevatedAndroid : styles.cardOuterAndroid),
      Platform.OS === 'ios' && (isUnread ? styles.cardOuterElevatedIos : styles.cardOuterIos),
    ]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorderColor,
          },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Notificação: ${item.title}`}
      >
        {/* Borda lateral de destaque para não lidas */}
        {isUnread && (
          <View style={[styles.unreadStrip, { backgroundColor: colors.primary }]} />
        )}

        {/* Ícone */}
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: visual.color + (isDark ? '22' : '14') },
          ]}
        >
          <Ionicons name={visual.icon} size={20} color={visual.color} />
        </View>

        {/* Corpo */}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: colors.text },
                isUnread && styles.titleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>

          <Text
            style={[styles.message, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo}</Text>
            <View
              style={[styles.categoryPill, { backgroundColor: visual.color + '18' }]}
            >
              <Text style={[styles.categoryLabel, { color: visual.color }]}>
                {visual.label}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={15}
          color={colors.textMuted}
          style={styles.chevron}
          importantForAccessibility="no"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // FIX: Wrapper externo para sombras — evita o artefato cinza do Android
  cardOuter: {
    borderRadius: 16,
  },
  cardOuterAndroid: {
    elevation: 1,
  },
  cardOuterElevatedAndroid: {
    elevation: 2,
  },
  cardOuterIos: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardOuterElevatedIos: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    // FIX: removido overflow:'hidden' — era a causa do artefato cinza no Android
    // quando combinado com elevation e borderRadius.
    // A unreadStrip usa borderRadius próprio para compensar.
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  unreadStrip: {
    width: 3,
    alignSelf: 'stretch',
    flexShrink: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    marginRight: 12,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chevron: {
    marginRight: 14,
    marginLeft: 6,
    flexShrink: 0,
  },
});
