/**
 * Tela de teste de transcrição — carregamento lazy.
 * O conteúdo (WebRTC/Daily) só é carregado ao navegar para a tela,
 * evitando crash em startup (startMediaDevicesEventMonitor of null).
 * Requer: development build para transcrição real.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/themeDoctor';
import { isExpoGo } from '../../lib/expo-go';

export default function TranscriptionTestScreen() {
  const [Content, setContent] = useState<React.ComponentType | null>(null);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    if (isExpoGo) return;
    import('./transcription-test-content')
      .then((m) => setContent(() => m.default))
      .catch((e) => setErr(e instanceof Error ? e : new Error(String(e))));
  }, []);

  if (isExpoGo) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Teste de Transcrição',
            headerBackTitle: 'Voltar',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.container}>
          <View style={styles.card}>
            <Ionicons name="mic" size={48} color={colors.primary} />
            <Text style={styles.title}>Teste de Transcrição</Text>
            <Text style={styles.subtitle}>
              O teste usa transcrição nativa do Daily.co.{'\n'}
              No Expo Go o módulo de vídeo não está disponível.{'\n'}
              Use um build de desenvolvimento para testar.
            </Text>
          </View>
        </View>
      </>
    );
  }

  if (err) {
    return (
      <>
        <Stack.Screen options={{ title: 'Teste de Transcrição' }} />
        <View style={styles.container}>
          <Text style={styles.errorText}>Erro ao carregar: {err.message}</Text>
        </View>
      </>
    );
  }

  if (!Content) {
    return (
      <>
        <Stack.Screen options={{ title: 'Teste de Transcrição' }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </>
    );
  }

  return <Content />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 12 },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  errorText: { color: colors.error, padding: 20, fontSize: 14 },
});
