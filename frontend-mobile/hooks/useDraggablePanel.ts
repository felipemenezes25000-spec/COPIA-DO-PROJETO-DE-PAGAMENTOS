/**
 * useDraggablePanel — Reusable drag/position logic for floating panels.
 *
 * Extracted from DraggableAssistantBanner to isolate:
 * - Position initialization + storage persistence
 * - Screen dimension clamping (rotation, keyboard, navigation)
 * - Pan gesture handlers (fab + expanded states)
 * - Animated style computation
 *
 * The hook is agnostic to the panel content — it only manages position/gesture.
 */

import { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ViewStyle } from 'react-native';

const SPRING_CONFIG = { damping: 22, stiffness: 200 };
const DRAG_THRESHOLD = 16;
/** Bottom exclusion zone: FAB never covers StickyCTA/inputs (~100px). */
const CTA_EXCLUSION_ZONE = 100;

export interface DraggablePanelOptions {
  fabSize: number;
  bannerWidth: number;
  expandedHeight: number;
  isExpanded: boolean;
  padding?: number;
  /** Load persisted position. Return {x, y} or null. */
  loadPosition: () => Promise<{ x: number; y: number } | null>;
  /** Load persisted expanded state. */
  loadExpanded: () => Promise<boolean>;
  /** Save position to storage. */
  savePosition: (x: number, y: number) => Promise<void>;
}

export interface DraggablePanelReturn {
  initialized: boolean;
  translateX: { value: number };
  translateY: { value: number };
  fabGesture: GestureType;
  expandedGesture: GestureType;
  fabAnimatedStyle: ViewStyle;
  expandedAnimatedStyle: ViewStyle;
  /** Call when expanding: clamps position to expanded bounds */
  clampForExpand: () => { x: number; y: number };
  initialExpanded: boolean;
}

export function useDraggablePanel({
  fabSize,
  bannerWidth,
  expandedHeight,
  isExpanded,
  padding = 16,
  loadPosition,
  loadExpanded,
  savePosition,
}: DraggablePanelOptions): DraggablePanelReturn {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const [initialized, setInitialized] = useState(false);
  const [initialExpanded, setInitialExpanded] = useState(false);

  const translateX = useSharedValue(screenW - padding - fabSize);
  const translateY = useSharedValue(screenH - (insets.bottom ?? 0) - padding - fabSize);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const effectiveBannerWidth = Math.min(screenW - padding * 2, bannerWidth);

  // Limits
  const topLimit = (insets.top ?? 0) + padding;
  const maxXFab = screenW - fabSize - padding;
  const maxYFab = screenH - fabSize - (insets.bottom ?? 0) - CTA_EXCLUSION_ZONE;
  const maxXExpanded = screenW - effectiveBannerWidth - padding;
  const maxYExpanded = screenH - expandedHeight - (insets.bottom ?? 0) - CTA_EXCLUSION_ZONE;

  // Init: load persisted position
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pos, wasExpanded] = await Promise.all([
          loadPosition(),
          loadExpanded(),
        ]);
        if (!cancelled && screenW > 0 && screenH > 0) {
          let x: number;
          let y: number;
          if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
            x = Math.max(padding, Math.min(maxXFab, pos.x));
            y = Math.max(topLimit, Math.min(maxYFab, pos.y));
          } else {
            x = screenW - padding - fabSize;
            y = screenH - (insets.bottom ?? 0) - CTA_EXCLUSION_ZONE - fabSize;
          }
          if (wasExpanded) {
            const maxXExp = screenW - effectiveBannerWidth - padding;
            const bottomLimitExp = screenH - expandedHeight - (insets.bottom ?? 0) - padding;
            x = Math.max(padding, Math.min(maxXExp, x));
            y = Math.max(topLimit, Math.min(bottomLimitExp, y));
            void savePosition(x, y);
          }
          translateX.value = x;
          translateY.value = y;
          setInitialExpanded(!!wasExpanded);
        }
        if (!cancelled) setInitialized(true);
      } catch {
        if (!cancelled) {
          translateX.value = screenW - padding - fabSize;
          translateY.value = screenH - (insets.bottom ?? 0) - CTA_EXCLUSION_ZONE - fabSize;
          setInitialized(true);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init runs once
  }, []);

  // Re-clamp on screen dimension changes (rotation, keyboard, navigation)
  useEffect(() => {
    if (!initialized || screenW <= 0 || screenH <= 0) return;
    const clampX = isExpanded
      ? Math.max(padding, Math.min(maxXExpanded, translateX.value))
      : Math.max(padding, Math.min(maxXFab, translateX.value));
    const clampY = isExpanded
      ? Math.max(topLimit, Math.min(maxYExpanded, translateY.value))
      : Math.max(topLimit, Math.min(maxYFab, translateY.value));
    translateX.value = clampX;
    translateY.value = clampY;
    if (isExpanded) void savePosition(clampX, clampY);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savePosition is stable
  }, [screenW, screenH, insets.top, insets.bottom, initialized, isExpanded, effectiveBannerWidth, expandedHeight, padding]);

  const persistPosition = useCallback((x: number, y: number) => {
    void savePosition(x, y);
  }, [savePosition]);

  // Clamp position for expanding (call this when user expands)
  const clampForExpand = useCallback(() => {
    const bottomLimit = screenH - expandedHeight - (insets.bottom ?? 0) - padding;
    const maxX = screenW - effectiveBannerWidth - padding;
    let x = translateX.value;
    let y = translateY.value;
    if (x > maxX) x = maxX;
    if (x < padding) x = padding;
    if (y > bottomLimit) y = bottomLimit;
    if (y < topLimit) y = topLimit;
    translateX.value = withSpring(x, SPRING_CONFIG);
    translateY.value = withSpring(y, SPRING_CONFIG);
    persistPosition(x, y);
    return { x, y };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- translateX/Y are shared value refs
  }, [screenW, screenH, effectiveBannerWidth, padding, insets, expandedHeight, topLimit, persistPosition]);

  // Pan gesture for FAB (collapsed) state
  const fabGesture = Gesture.Pan()
    .minDistance(DRAG_THRESHOLD)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const x = Math.max(padding, Math.min(maxXFab, startX.value + e.translationX));
      const y = Math.max(topLimit, Math.min(maxYFab, startY.value + e.translationY));
      translateX.value = x;
      translateY.value = y;
    })
    .onEnd(() => {
      const finalX = translateX.value;
      const finalY = translateY.value;
      translateX.value = withSpring(finalX, SPRING_CONFIG);
      translateY.value = withSpring(finalY, SPRING_CONFIG);
      runOnJS(persistPosition)(finalX, finalY);
    });

  // Pan gesture for expanded state
  const expandedGesture = Gesture.Pan()
    .minDistance(DRAG_THRESHOLD)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const x = Math.max(padding, Math.min(maxXExpanded, startX.value + e.translationX));
      const y = Math.max(topLimit, Math.min(maxYExpanded, startY.value + e.translationY));
      translateX.value = x;
      translateY.value = y;
    })
    .onEnd(() => {
      const finalX = translateX.value;
      const finalY = translateY.value;
      translateX.value = withSpring(finalX, SPRING_CONFIG);
      translateY.value = withSpring(finalY, SPRING_CONFIG);
      runOnJS(persistPosition)(finalX, finalY);
    });

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const expandedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return {
    initialized,
    translateX,
    translateY,
    fabGesture,
    expandedGesture,
    fabAnimatedStyle: fabAnimatedStyle as unknown as ViewStyle,
    expandedAnimatedStyle: expandedAnimatedStyle as unknown as ViewStyle,
    clampForExpand,
    initialExpanded,
  };
}
