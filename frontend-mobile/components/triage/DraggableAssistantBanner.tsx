/**
 * DraggableAssistantBanner — Dra. Renoveja com opção de mover
 *
 * Pensado para idosos e leigos: toque em "Mover" e escolha onde quer que ela fique.
 * Sem arrastar — apenas tocar na opção desejada.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Text,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { uiTokens } from '../../lib/ui/tokens';
import {
  getBannerPositionMode,
  getBannerFloatingPosition,
  setBannerPositionMode,
  setBannerFloatingPosition,
} from '../../lib/triage/triagePersistence';
import type { BannerPositionMode, BannerFloatingPosition } from '../../lib/triage/triage.types';
import { AssistantBanner } from './AssistantBanner';
import type { CTAAction } from '../../lib/triage/triage.types';

const BANNER_WIDTH = 340;
const BANNER_HEIGHT_EST = 120;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };
const MIN_TOUCH_TARGET = 52; // Acessibilidade: alvos grandes para idosos

type Anchor = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

const POSITION_OPTIONS: { anchor: Anchor | 'fixed'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { anchor: 'fixed', label: 'Ficar em baixo (padrão)', icon: 'pin' },
  { anchor: 'top-left', label: 'Em cima à esquerda', icon: 'arrow-up' },
  { anchor: 'top-right', label: 'Em cima à direita', icon: 'arrow-up' },
  { anchor: 'bottom-left', label: 'Em baixo à esquerda', icon: 'arrow-down' },
  { anchor: 'bottom-right', label: 'Em baixo à direita', icon: 'arrow-down' },
];

function getPositionForAnchor(
  anchor: Anchor,
  screenW: number,
  screenH: number,
  bannerW: number,
  padding: number,
  topInset: number,
  bottomInset: number
): { x: number; y: number } {
  const safeW = Math.max(screenW, 200);
  const safeH = Math.max(screenH, 300);
  const safePadding = Math.max(0, padding);
  const safeTop = topInset ?? 0;
  const safeBottom = bottomInset ?? 0;

  const topY = Math.max(0, safeTop + safePadding);
  const bottomY = Math.max(topY, safeH - BANNER_HEIGHT_EST - safeBottom - safePadding);
  const leftX = safePadding;
  const rightX = Math.max(leftX, safeW - bannerW - safePadding);

  switch (anchor) {
    case 'top-left':
      return { x: leftX, y: topY };
    case 'top-right':
      return { x: rightX, y: topY };
    case 'bottom-left':
      return { x: leftX, y: bottomY };
    case 'bottom-right':
      return { x: rightX, y: bottomY };
  }
}

interface DraggableAssistantBannerProps {
  onAction?: (action: CTAAction) => void;
  onCompanionPress?: () => void;
  containerStyle?: object;
}

export function DraggableAssistantBanner({ onAction, onCompanionPress, containerStyle }: DraggableAssistantBannerProps) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const padding = Math.max(uiTokens.screenPaddingHorizontal, insets?.left ?? 0, insets?.right ?? 0);
  const bottomFixed = (insets?.bottom ?? 0) + uiTokens.cardGap * 2;
  const fixedY = Math.max(0, screenH - BANNER_HEIGHT_EST - bottomFixed);

  const [mode, setMode] = useState<BannerPositionMode>('fixed');
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const safePadding = Number.isFinite(padding) ? padding : 16;
  const safeFixedY = Number.isFinite(fixedY) ? fixedY : 200;
  const translateX = useSharedValue(safePadding);
  const translateY = useSharedValue(safeFixedY);

  const bannerWidth = Math.min(screenW - padding * 2, BANNER_WIDTH);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, pos] = await Promise.all([
          getBannerPositionMode(),
          getBannerFloatingPosition(),
        ]);
        if (!cancelled) {
          setMode(m);
          if (pos && m === 'floating' && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
            translateX.value = pos.x;
            translateY.value = pos.y;
          } else {
            translateX.value = safePadding;
            translateY.value = safeFixedY;
          }
          setInitialized(true);
        }
      } catch {
        if (!cancelled) {
          translateX.value = safePadding;
          translateY.value = safeFixedY;
          setInitialized(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveFloating = useCallback(async (x: number, y: number, anchor: Anchor) => {
    await setBannerFloatingPosition({ x, y, anchor });
  }, []);

  const selectPosition = useCallback(
    async (option: (typeof POSITION_OPTIONS)[0]) => {
      setShowPositionModal(false);

      try {
        if (option.anchor === 'fixed') {
          setMode('fixed');
          await setBannerPositionMode('fixed');
          translateX.value = withSpring(safePadding, SPRING_CONFIG);
          translateY.value = withSpring(safeFixedY, SPRING_CONFIG);
          await saveFloating(safePadding, safeFixedY, 'bottom-left');
        } else {
          const { x, y } = getPositionForAnchor(
            option.anchor,
            screenW,
            screenH,
            bannerWidth,
            padding,
            insets.top ?? 0,
            insets.bottom ?? 0
          );
          setMode('floating');
          await setBannerPositionMode('floating');
          translateX.value = withSpring(x, SPRING_CONFIG);
          translateY.value = withSpring(y, SPRING_CONFIG);
          await saveFloating(x, y, option.anchor);
        }
      } catch {
        // Evita crash: em caso de erro, mantém estado e fecha o modal
        setShowPositionModal(false);
      }
    },
    [safePadding, safeFixedY, padding, screenW, screenH, bannerWidth, insets, saveFloating]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  if (!initialized) return null;

  return (
    <>
      <View
        style={[
          styles.wrapper,
          {
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            marginHorizontal: 0,
          },
          containerStyle,
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.floatingInner,
            { top: 0, left: 0, width: bannerWidth },
            animatedStyle,
          ]}
        >
          <Pressable
            onPress={() => setShowPositionModal(true)}
            style={styles.moveButton}
            accessibilityLabel="Mover a Dra. Renoveja de posição"
            accessibilityHint="Toque para escolher onde a assistente aparece na tela"
          >
            <Ionicons name="move-outline" size={22} color={theme.colors.primary.main} />
            <Text style={styles.moveButtonText}>Mover</Text>
          </Pressable>
          <AssistantBanner
            onAction={onAction}
            onCompanionPress={onCompanionPress}
            containerStyle={styles.bannerNoMargin}
          />
        </Animated.View>
      </View>

      <Modal
        visible={showPositionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPositionModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPositionModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Onde a Dra. Renoveja deve aparecer?</Text>
            <Text style={styles.modalSubtitle}>Toque na opção desejada</Text>

            {POSITION_OPTIONS.map((option) => (
              <Pressable
                key={option.anchor}
                onPress={() => selectPosition(option)}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionButtonPressed,
                ]}
                accessibilityLabel={option.label}
                accessibilityRole="button"
              >
                <View style={styles.optionIconWrap}>
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={theme.colors.primary.main}
                  />
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowPositionModal(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: uiTokens.screenPaddingHorizontal,
  },
  floatingInner: {
    position: 'absolute',
    width: BANNER_WIDTH,
    marginHorizontal: 0,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: theme.borderRadius.md,
    borderTopRightRadius: theme.borderRadius.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  moveButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: theme.colors.primary.main,
  },
  bannerNoMargin: {
    marginHorizontal: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: theme.colors.text.secondary,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: theme.colors.background.default,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
  },
  optionButtonPressed: {
    opacity: 0.8,
    backgroundColor: theme.colors.primary.soft,
  },
  optionIconWrap: {
    width: 32,
    marginRight: 12,
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: theme.colors.text.primary,
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: theme.colors.text.tertiary,
  },
});
