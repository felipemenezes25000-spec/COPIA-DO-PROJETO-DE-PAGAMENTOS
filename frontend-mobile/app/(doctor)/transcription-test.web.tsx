/**
 * Stub para web — Daily.co/WebRTC não está disponível no browser.
 * A tela completa está em transcription-test.tsx (usada em native).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/themeDoctor';

export default function TranscriptionTestWebScreen() {
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
            O teste de transcrição usa Daily.co e WebRTC nativos.{'\n'}
            Use o app no dispositivo (iOS/Android) para acessar esta funcionalidade.
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    margin: 20,
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
});
