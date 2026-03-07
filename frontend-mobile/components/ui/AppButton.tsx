import React, { useRef, useEffect } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../lib/theme';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'doctorPrimary'    // Maps to primary
  | 'doctorSecondary'  // Maps to secondary
  | 'doctorOutline'    // Maps to outline
  | 'doctorDanger';    // Maps to danger

export type AppButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPressIn?: () => void;
  style?: StyleProp<ViewStyle>;
  pulse?: boolean;
}

const SIZE_CONFIG = {
  sm: { height: 40, fontSize: 13, iconSize: 16, padding: 16 },
  md: { height: 48, fontSize: 15, iconSize: 20, padding: 24 },
  lg: { height: 56, fontSize: 17, iconSize: 24, padding: 32 },
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  leading,
  trailing,
  onPressIn,
  style,
  pulse = false,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const sizeConf = SIZE_CONFIG[size];

  // Map variants to new theme tokens
  const getVariantStyles = () => {
    const c = theme.colors;
    
    switch (variant) {
      case 'secondary':
      case 'doctorSecondary':
        return {
          bg: c.secondary.main,
          text: c.secondary.contrast,
          border: 'transparent',
          shadow: theme.shadows.button,
        };
      case 'outline':
      case 'doctorOutline':
        return {
          bg: 'transparent',
          text: c.primary.main,
          border: c.primary.main,
          shadow: theme.shadows.none,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: c.primary.main,
          border: 'transparent',
          shadow: theme.shadows.none,
        };
      case 'danger':
      case 'doctorDanger':
        return {
          bg: c.status.error,
          text: c.text.inverse,
          border: 'transparent',
          shadow: theme.shadows.button,
        };
      case 'primary':
      case 'doctorPrimary':
      default:
        return {
          bg: c.primary.main,
          text: c.primary.contrast,
          border: 'transparent',
          shadow: theme.shadows.button,
        };
    }
  };

  const stylesConf = getVariantStyles();

  // Animation Refs
  const pressScale = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Pulse Animation
  useEffect(() => {
    if (!pulse || isDisabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, isDisabled, pulseScale]);

  const handlePressIn = () => {
    onPressIn?.();
    Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  const combinedScale = pulse && !isDisabled
    ? Animated.multiply(pressScale, pulseScale)
    : pressScale;

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale: combinedScale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          {
            height: sizeConf.height,
            backgroundColor: isDisabled ? theme.colors.text.disabled : stylesConf.bg,
            borderColor: isDisabled ? 'transparent' : stylesConf.border,
            borderWidth: stylesConf.border !== 'transparent' ? 1.5 : 0,
            paddingHorizontal: sizeConf.padding,
          },
          !isDisabled && variant !== 'ghost' && variant !== 'outline' && stylesConf.shadow,
          pressed && !isDisabled && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator
            color={variant.includes('outline') || variant === 'ghost' ? stylesConf.text : theme.colors.text.inverse}
            size="small"
          />
        ) : (
          <View style={styles.content}>
            {leading}
            {icon && (
              <Ionicons
                name={icon}
                size={sizeConf.iconSize}
                color={isDisabled ? theme.colors.text.inverse : stylesConf.text}
                style={[styles.icon, { marginRight: title ? 8 : 0 }]}
              />
            )}
            {title ? (
              <Text
                style={[
                  styles.text,
                  {
                    color: isDisabled ? theme.colors.text.inverse : stylesConf.text,
                    fontSize: sizeConf.fontSize,
                  },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : null}
            {trailing}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12, // Modern standardized radius
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    // Margin handled inline based on title presence
  },
  text: {
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
