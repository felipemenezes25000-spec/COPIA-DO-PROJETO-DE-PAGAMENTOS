/**
 * SwipeableRequestCard
 * --------------------
 * Gesture-enabled wrapper for the doctor "Modo Foco" review queue
 * (see spec §2.2 — swipe right to approve, swipe left to reject —
 * and spec §4.4 — swipe is a complement to the existing buttons,
 * never a replacement).
 *
 * This component does NOT own the request card content. It receives
 * `children` (the detail panel rendered by `review-queue.tsx`) and
 * wraps them in a horizontal pan gesture with visual indicator
 * overlays behind the card. When the translation crosses the
 * configurable threshold the card animates off-screen and fires
 * `onApprove` / `onReject`.
 *
 * Dependencies:
 *  - react-native-reanimated v3 (useSharedValue / withTiming / withSpring / runOnJS)
 *  - react-native-gesture-handler ~2.28 (new Gesture API, NOT the deprecated
 *    PanGestureHandler component).
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { haptics } from '../../../lib/haptics';

const APPROVE_COLOR = '#10B981'; // emerald-500
const REJECT_COLOR = '#EF4444'; // red-500
const APPROVE_BG = 'rgba(16, 185, 129, 0.20)'; // emerald-500 @ 20%
const REJECT_BG = 'rgba(239, 68, 68, 0.20)'; // red-500 @ 20%
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

export interface SwipeableRequestCardProps {
  /** Content to display inside the swipeable card (the request detail panel). */
  children: React.ReactNode;
  /** Called when user swipes right past the approve threshold. */
  onApprove: () => void;
  /** Called when user swipes left past the reject threshold. */
  onReject: () => void;
  /** Disables gestures (e.g. while mutation is in flight). */
  disabled?: boolean;
  /** Horizontal translation threshold in pixels to trigger callback. Default 120. */
  threshold?: number;
}

const RESET_DELAY_MS = 60;
const OFFSCREEN_DURATION_MS = 220;

export function SwipeableRequestCard({
  children,
  onApprove,
  onReject,
  disabled = false,
  threshold = 120,
}: SwipeableRequestCardProps) {
  const { width } = useWindowDimensions();

  const translateX = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(0);

  const triggerHaptic = useCallback(() => {
    haptics.light();
  }, []);

  const resetPosition = useCallback(() => {
    // Reset after the parent has had a chance to swap the current item.
    setTimeout(() => {
      translateX.value = 0;
      hasTriggeredHaptic.value = 0;
    }, RESET_DELAY_MS);
  }, [translateX, hasTriggeredHaptic]);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      const crossed = Math.abs(event.translationX) > threshold;
      if (crossed && hasTriggeredHaptic.value === 0) {
        hasTriggeredHaptic.value = 1;
        runOnJS(triggerHaptic)();
      } else if (!crossed && hasTriggeredHaptic.value === 1) {
        // Allow re-trigger if user drags back under threshold and out again.
        hasTriggeredHaptic.value = 0;
      }
    })
    .onEnd((event) => {
      if (event.translationX > threshold) {
        translateX.value = withTiming(
          width * 1.2,
          { duration: OFFSCREEN_DURATION_MS },
          (finished) => {
            if (finished) {
              runOnJS(onApprove)();
              runOnJS(resetPosition)();
            }
          },
        );
      } else if (event.translationX < -threshold) {
        translateX.value = withTiming(
          -width * 1.2,
          { duration: OFFSCREEN_DURATION_MS },
          (finished) => {
            if (finished) {
              runOnJS(onReject)();
              runOnJS(resetPosition)();
            }
          },
        );
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        hasTriggeredHaptic.value = 0;
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const approveOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, threshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [0, threshold],
      [0.6, 1],
      Extrapolation.CLAMP,
    );
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, threshold],
      [TRANSPARENT, APPROVE_BG],
    );
    return {
      opacity,
      backgroundColor,
      transform: [{ scale }],
    };
  });

  const rejectOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      -translateX.value,
      [0, threshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      -translateX.value,
      [0, threshold],
      [0.6, 1],
      Extrapolation.CLAMP,
    );
    const backgroundColor = interpolateColor(
      -translateX.value,
      [0, threshold],
      [TRANSPARENT, REJECT_BG],
    );
    return {
      opacity,
      backgroundColor,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Approve indicator — revealed on the LEFT as the card moves RIGHT. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, styles.overlayLeft, approveOverlayStyle]}
      >
        <Ionicons name="checkmark-circle" size={64} color={APPROVE_COLOR} />
      </Animated.View>

      {/* Reject indicator — revealed on the RIGHT as the card moves LEFT. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, styles.overlayRight, rejectOverlayStyle]}
      >
        <Ionicons name="close-circle" size={64} color={REJECT_COLOR} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          accessible
          accessibilityRole="adjustable"
          accessibilityHint="Deslize para a direita para aprovar, esquerda para rejeitar"
          style={[styles.card, cardStyle]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  card: {
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLeft: {
    left: 0,
  },
  overlayRight: {
    right: 0,
  },
});

export default SwipeableRequestCard;
