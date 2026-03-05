import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, type AppThemeRole } from '../../lib/ui/useAppTheme';

export type LargeActionCardVariant = 'primary' | 'exam' | 'consultation';

interface LargeActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  variant?: LargeActionCardVariant;
  accessibilityLabel?: string;
  role?: AppThemeRole;
}

export function LargeActionCard({
  icon,
  title,
  description,
  onPress,
  variant = 'primary',
  accessibilityLabel,
  role,
}: LargeActionCardProps) {
  const { colors, radius, shadows } = useAppTheme({ role });
  const cardShadow =
    Platform.OS === 'web'
      ? { boxShadow: '0px 2px 12px rgba(0,0,0,0.06)' }
      : shadows.card;
  const borderColor =
    variant === 'exam'
      ? colors.border
      : variant === 'consultation'
        ? colors.successLight
        : colors.borderLight;
  const styles = createStyles(colors, radius);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { borderColor }, cardShadow, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      </View>
      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const createStyles = (
  colors: {
    text: string;
    textMuted: string;
    textSecondary: string;
    white: string;
    borderLight: string;
  },
  radius: {
    card: number;
  }
) => StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 88,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  description: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  chevronWrap: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
