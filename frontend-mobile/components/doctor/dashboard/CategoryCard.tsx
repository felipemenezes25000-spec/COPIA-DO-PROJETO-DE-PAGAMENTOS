import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { haptics } from '../../../lib/haptics';

export type CategoryKind = 'prescription' | 'exam' | 'consultation';

interface CategoryCardProps {
  kind: CategoryKind;
  count: number;
  onPress: () => void;
}

interface CategoryConfig {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  gradient: readonly [string, string];
  shadow: string;
}

/**
 * Spec dos 3 cards (proposta Carolina Akiko, mockup #14 aprovado).
 * Cores espelham `clinicalSoftTokens.colors.statReceitas/Pendentes/Consultas`.
 */
const CONFIG: Record<CategoryKind, CategoryConfig> = {
  prescription: {
    title: 'Renovação de receitas',
    subtitle: 'pendentes para assinatura',
    icon: 'file-text',
    gradient: ['#0EA5E9', '#38BDF8'] as const,
    shadow: 'rgba(14,165,233,0.32)',
  },
  exam: {
    title: 'Solicitação de exames',
    subtitle: 'aguardando aprovação',
    icon: 'clipboard',
    gradient: ['#F59E0B', '#FCD34D'] as const,
    shadow: 'rgba(245,158,11,0.32)',
  },
  consultation: {
    title: 'Teleconsulta',
    subtitle: 'agendada para hoje',
    icon: 'video',
    gradient: ['#8B5CF6', '#C4B5FD'] as const,
    shadow: 'rgba(139,92,246,0.32)',
  },
};

function CategoryCard_Fn({ kind, count, onPress }: CategoryCardProps) {
  const cfg = CONFIG[kind];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${cfg.title}: ${count} ${count === 1 ? 'solicitação' : 'solicitações'}`}
      style={[styles.shadowWrap, { shadowColor: cfg.shadow }]}
    >
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}
      >
        {/* Ícone decorativo (canto inferior direito, rotacionado) */}
        <View style={styles.iconBg} pointerEvents="none">
          <Feather name={cfg.icon} size={96} color="rgba(255,255,255,0.28)" />
        </View>

        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {cfg.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {cfg.subtitle}
          </Text>
        </View>

        <Text style={styles.count}>{count}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 6,
  },
  tile: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 86,
  },
  iconBg: {
    position: 'absolute',
    right: -14,
    bottom: -22,
    transform: [{ rotate: '-15deg' }],
  },
  text: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.1,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 36,
    marginLeft: 12,
    zIndex: 1,
  },
});

export const CategoryCard = React.memo(CategoryCard_Fn);
