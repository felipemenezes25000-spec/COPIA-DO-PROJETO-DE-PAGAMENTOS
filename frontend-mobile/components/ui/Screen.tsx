import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollViewProps,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, gradients } from '../../lib/theme';
import { colors as doctorColors, gradients as doctorGradients } from '../../lib/themeDoctor';
import { uiTokens } from '../../lib/ui/tokens';
import { useColorSchemeContext } from '../../contexts/ColorSchemeContext';
import { createTokens } from '../../lib/designSystem';

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'doctor' | 'doctor-gradient';
  scroll?: boolean;
  padding?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({
  children,
  variant = 'default',
  scroll = true,
  padding = true,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
  ...scrollViewProps
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorSchemeContext();
  const isDark = colorScheme === 'dark';
  const tokens = createTokens('patient', colorScheme);

  const paddingTopContent = insets.top;
  const paddingStyle = padding
    ? { paddingHorizontal: uiTokens.screenPaddingHorizontal }
    : undefined;
  const contentPaddingStyle = { paddingTop: paddingTopContent };

  const isGradient = variant === 'gradient' || variant === 'doctor-gradient';
  const isDoctor = variant === 'doctor' || variant === 'doctor-gradient';

  const gradientColors: [string, string, ...string[]] = isDoctor
    ? (doctorGradients.doctorHeader as unknown as [string, string, ...string[]])
    : (isDark ? [...tokens.gradients.auth] as [string, string, ...string[]] : [...gradients.auth] as [string, string, ...string[]]);

  const bgColor = isDoctor
    ? doctorColors.background
    : (isDark ? tokens.colors.background : theme.colors.background.default);

  if (isGradient) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.flex, style]}
        pointerEvents="box-none"
      >
        <SafeAreaView style={styles.flex} edges={edges} pointerEvents="box-none">
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {scroll ? (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={[
                  styles.scrollContent,
                  contentPaddingStyle,
                  paddingStyle,
                  contentStyle,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="interactive"
                scrollEventThrottle={16}
                {...scrollViewProps}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.flex, contentPaddingStyle, paddingStyle, contentStyle]}>
                {children}
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }, style]} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              contentPaddingStyle,
              paddingStyle,
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            scrollEventThrottle={16}
            {...scrollViewProps}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentPaddingStyle, paddingStyle, contentStyle]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
});
