/**
 * DraggableAssistantBanner — Dra. Renoveja discreta e arrastável
 *
 * - Botãozinho discreto com ícone de IA (sparkles)
 * - Toque para expandir / recolher
 * - Arraste para mover para qualquer lugar da tela
 * - Posição persistida entre sessões
 *
 * Drag/position logic is extracted into useDraggablePanel hook.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, Pressable as GHPressable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import { useTriageAssistant } from '../../contexts/TriageAssistantProvider';
import {
  getBannerFloatingPosition,
  setBannerFloatingPosition,
  setBannerPositionMode,
  getBannerExpanded,
  setBannerExpanded,
} from '../../lib/triage/triagePersistence';
import { AssistantBanner } from './AssistantBanner';
import type { CTAAction } from '../../lib/triage/triage.types';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';

const FAB_SIZE = 48;
const BANNER_WIDTH = 300;

interface DraggableAssistantBannerProps {
  onAction?: (action: CTAAction, message?: { requestId?: string; status?: string | null }) => void;
  onCompanionPress?: () => void;
  containerStyle?: object;
}

export function DraggableAssistantBanner({ onAction, onCompanionPress, containerStyle }: DraggableAssistantBannerProps) {
  const { current } = useTriageAssistant();
  const { colors, zIndex } = useAppTheme({ role: 'patient' });

  const [expanded, setExpanded] = useState(false);
  const [lastAutoExpandKey, setLastAutoExpandKey] = useState<string | null>(null);
  const pulseScale = useSharedValue(1);

  const expandedHeight = 180; // Will be clamped by hook via screen dimensions

  const {
    initialized,
    fabGesture,
    expandedGesture,
    fabAnimatedStyle,
    expandedAnimatedStyle,
    clampForExpand,
    initialExpanded,
  } = useDraggablePanel({
    fabSize: FAB_SIZE,
    bannerWidth: BANNER_WIDTH,
    expandedHeight,
    isExpanded: expanded,
    loadPosition: async () => {
      const pos = await getBannerFloatingPosition();
      return pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) ? { x: pos.x, y: pos.y } : null;
    },
    loadExpanded: getBannerExpanded,
    savePosition: async (x, y) => {
      await setBannerPositionMode('floating');
      await setBannerFloatingPosition({ x, y, anchor: 'bottom-right' });
    },
  });

  // Sync initialExpanded from hook (loaded from storage)
  useEffect(() => {
    if (initialExpanded && !expanded) {
      setExpanded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on init
  }, [initialExpanded]);

  // Pulse animation when there's a recommendation and FAB is collapsed
  useEffect(() => {
    if (current && !expanded) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 250 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pulseScale is shared value ref
  }, [!!current, expanded]);

  const handleExpand = useCallback(() => {
    clampForExpand();
    setExpanded(true);
    void setBannerExpanded(true);
  }, [clampForExpand]);

  const handleCollapse = useCallback(() => {
    setExpanded(false);
    void setBannerExpanded(false);
  }, []);

  // Auto-expand for high-urgency messages
  useEffect(() => {
    if (!current?.key) return;
    if (expanded) return;
    if (lastAutoExpandKey === current.key) return;
    if (current.severity === 'attention') {
      handleExpand();
      setLastAutoExpandKey(current.key);
    }
  }, [current?.key, current?.severity, expanded, lastAutoExpandKey, handleExpand]);

  const tapGesture = Gesture.Tap()
    .maxDistance(20)
    .onEnd(() => {
      runOnJS(handleExpand)();
    });

  // Tap first: priority to expand on touch; Pan only activates after 16px drag
  const composedGestureFab = Gesture.Exclusive(tapGesture, fabGesture);

  // FAB style: merge hook's position with pulse scale
  const fabPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!initialized) return null;

  return (
    <View
      style={[
        styles.wrapper,
        {
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: zIndex.float,
        },
        containerStyle,
      ]}
      pointerEvents="box-none"
    >
      {!expanded ? (
        <GestureDetector gesture={composedGestureFab}>
          <Animated.View
            style={[
              styles.fab,
              { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, backgroundColor: colors.surface },
              fabAnimatedStyle,
              fabPulseStyle,
            ]}
          >
            <View style={styles.fabInner}>
              <Ionicons name="sparkles" size={22} color={colors.primary} />
            </View>
          </Animated.View>
        </GestureDetector>
      ) : (
        <GestureDetector gesture={expandedGesture}>
          <Animated.View
            style={[
              styles.expandedContainer,
              {
                width: Math.min(BANNER_WIDTH, 300),
                height: expandedHeight,
                backgroundColor: colors.surface,
              },
              expandedAnimatedStyle,
            ]}
          >
            <View style={[styles.expandedHeader, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.border }]}>
              <View style={styles.expandedHeaderLeft}>
                <View style={[styles.expandedFabIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
                <Text style={[styles.expandedHeaderLabel, { color: colors.text }]}>Dra. Renoveja</Text>
              </View>
              <GHPressable
                onPress={handleCollapse}
                hitSlop={12}
                style={({ pressed }) => [styles.collapseBtn, pressed && styles.collapseBtnPressed]}
                accessibilityLabel="Recolher assistente"
              >
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </GHPressable>
            </View>
            <ScrollView
              style={styles.bannerScroll}
              contentContainerStyle={styles.bannerScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <AssistantBanner
                onAction={onAction}
                onCompanionPress={onCompanionPress}
                containerStyle={styles.bannerContent}
                embedded={true}
              />
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 0,
  },
  fab: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  bannerScroll: {
    flexGrow: 0,
  },
  bannerScrollContent: {
    flexGrow: 0,
    paddingBottom: 12,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  expandedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedFabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedHeaderLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  collapseBtn: {
    padding: 4,
  },
  collapseBtnPressed: {
    opacity: 0.7,
  },
  bannerContent: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
});
