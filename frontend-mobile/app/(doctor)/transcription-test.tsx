/**
 * Tela de teste de transcrição — usa Daily.co (transcrição nativa).
 * Cria sala temporária, entra na chamada, inicia transcrição e exibe o texto em tempo real.
 * Requer: backend com DAILY_API_KEY, development build (não Expo Go).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchTranscriptionTestRoom } from '../../lib/api-daily';
import { useDailyCall } from '../../hooks/useDailyCall';
import { colors } from '../../lib/themeDoctor';
import { isExpoGo } from '../../lib/expo-go';

export default function TranscriptionTestScreen() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'joined' | 'error'>('idle');
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const transcriptRef = useRef<string[]>([]);
  const startedTranscriptionRef = useRef(false);

  const {
    callState,
    join,
    leave,
    callRef,
  } = useDailyCall({
    roomUrl: roomUrl ?? '',
    token: token ?? '',
    onCallEnded: () => {
      setPhase('idle');
      setRoomUrl(null);
      setToken(null);
      setTranscript([]);
      transcriptRef.current = [];
    },
    onError: (msg) => {
      setError(msg);
      setPhase('error');
    },
  });

  // Iniciar transcrição ao entrar na chamada
  useEffect(() => {
    const call = callRef.current;
    if (!call || callState !== 'joined' || startedTranscriptionRef.current) return;

    const startTranscription = async () => {
      try {
        await call.startTranscription?.({ language: 'pt-BR' });
        startedTranscriptionRef.current = true;
        if (__DEV__) console.warn('[TranscriptionTest] Transcrição Daily.co iniciada');
      } catch (e) {
        if (__DEV__) console.warn('[TranscriptionTest] Falha ao iniciar transcrição:', e);
      }
    };

    startTranscription();
  }, [callRef, callState]);

  // Ouvir eventos de transcrição
  useEffect(() => {
    const call = callRef.current;
    if (!call) return;

    const handleMessage = (event: { text?: string; message?: { text?: string } }) => {
      const text = event?.text ?? event?.message?.text ?? '';
      if (!text?.trim()) return;
      transcriptRef.current = [...transcriptRef.current, text.trim()];
      setTranscript([...transcriptRef.current]);
    };

    call.on?.('transcription-message' as any, handleMessage);
    return () => {
      call.off?.('transcription-message' as any, handleMessage);
    };
  }, [callRef, callState]);

  const joinRequestedRef = useRef(false);

  // Entrar na sala quando roomUrl e token estiverem disponíveis
  useEffect(() => {
    if (!roomUrl || !token || !joinRequestedRef.current) return;
    joinRequestedRef.current = false;
    join()
      .then(() => setPhase('joined'))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setPhase('error');
      });
  }, [roomUrl, token, join]);

  const handleStart = useCallback(async () => {
    if (isExpoGo) {
      Alert.alert(
        'Módulo indisponível',
        'O teste de transcrição requer um build de desenvolvimento (não funciona no Expo Go).'
      );
      return;
    }
    try {
      setPhase('loading');
      setError(null);
      setTranscript([]);
      transcriptRef.current = [];
      startedTranscriptionRef.current = false;

      const { roomUrl: url, token: t } = await fetchTranscriptionTestRoom();
      setRoomUrl(url);
      setToken(t);
      joinRequestedRef.current = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase('error');
      if (__DEV__) console.warn('[TranscriptionTest]', e);
    }
  }, []);

  const handleLeave = useCallback(async () => {
    joinRequestedRef.current = false;
    startedTranscriptionRef.current = false;
    await leave();
    setPhase('idle');
    setRoomUrl(null);
    setToken(null);
    setTranscript([]);
    transcriptRef.current = [];
  }, [leave]);

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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Ionicons name="mic" size={48} color={colors.primary} />
          <Text style={styles.title}>Teste de Transcrição</Text>
          <Text style={styles.subtitle}>
            Transcrição via Daily.co (em tempo real).{'\n'}
            Entra em uma sala de teste, fale no microfone e veja o texto aparecer.
          </Text>

          {phase === 'idle' && (
            <TouchableOpacity style={styles.btn} onPress={handleStart} activeOpacity={0.8}>
              <Ionicons name="videocam" size={20} color={colors.surface} />
              <Text style={styles.btnText}>Iniciar teste</Text>
            </TouchableOpacity>
          )}

          {phase === 'loading' && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Criando sala e entrando...</Text>
            </View>
          )}

          {phase === 'joined' && (
            <View style={styles.joined}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Conectado · Fale no microfone</Text>
              </View>
              <ScrollView
                style={styles.transcriptBox}
                contentContainerStyle={styles.transcriptContent}
                nestedScrollEnabled
              >
                {transcript.length === 0 ? (
                  <Text style={styles.transcriptPlaceholder}>
                    Aguardando transcrição... Fale claramente no microfone.
                  </Text>
                ) : (
                  transcript.map((line, i) => (
                    <Text key={i} style={styles.transcriptLine}>
                      {line}
                    </Text>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity style={styles.btnLeave} onPress={handleLeave} activeOpacity={0.8}>
                <Ionicons name="exit" size={20} color={colors.surface} />
                <Text style={styles.btnLeaveText}>Sair da sala</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'error' && (
            <View style={styles.resultError}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
              <Text style={styles.resultTitle}>Erro</Text>
              <Text style={styles.resultText}>{error ?? 'Erro desconhecido'}</Text>
              <Text style={styles.hint}>
                Verifique se o backend está rodando e se DAILY_API_KEY está configurada.
              </Text>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => { setPhase('idle'); setError(null); }}>
                <Text style={styles.btnSecondaryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  btnText: { color: colors.surface, fontWeight: '600', fontSize: 16 },
  loading: { marginTop: 24, alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  joined: { marginTop: 24, width: '100%', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  statusText: { fontSize: 14, color: colors.textSecondary },
  transcriptBox: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  transcriptContent: { paddingBottom: 8 },
  transcriptPlaceholder: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  transcriptLine: { fontSize: 14, color: colors.text, marginBottom: 4, lineHeight: 20 },
  btnLeave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  btnLeaveText: { color: colors.surface, fontWeight: '600', fontSize: 14 },
  resultError: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8 },
  resultText: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
  btnSecondary: { marginTop: 16 },
  btnSecondaryText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
