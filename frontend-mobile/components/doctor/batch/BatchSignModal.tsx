/**
 * BatchSignModal — Bottom sheet modal de assinatura em lote (médico).
 *
 * Estados internos:
 *  1. confirm  → revisão dos N documentos + senha + consentimento
 *  2. signing  → anel de progresso animado (delegado a BatchSigningProgress)
 *  3. success  → relatório de resultados (delegado a BatchSignSuccess)
 *  4. error    → mensagem amigável + opção de tentar novamente
 *
 * Segurança:
 *  - A senha do PFX vive apenas em estado local e é descartada
 *    no cleanup quando o modal é fechado. Nunca é logada nem persistida.
 *
 * Acessibilidade:
 *  - Botões têm `accessibilityLabel` e `accessibilityRole`.
 *  - Campo de senha tem `accessibilityHint` explícito.
 *  - Backdrop não fecha o modal durante o estado 'signing'.
 *  - Live region do progresso é feita por BatchSigningProgress.
 *
 * Arquitetura:
 *  - Progresso e tela de sucesso foram extraídos para sub-componentes
 *    (BatchSigningProgress, BatchSignSuccess) em Wave 1. Este arquivo
 *    contém apenas a orquestração + estado confirm/error.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Animated,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RequestResponseDto } from '../../../types/database';
import { useSignBatchMutation } from '../../../lib/hooks/useBatchSignature';
import type { BatchSignatureResult } from '../../../lib/api-batch-signature';
import { getApiErrorMessage } from '../../../lib/api-client';
import { humanizeError } from '../../../lib/errors/humanizeError';
import { haptics } from '../../../lib/haptics';
import { useAppTheme } from '../../../lib/ui/useAppTheme';
import { showToast } from '../../ui/Toast';

import { BatchSigningProgress } from './BatchSigningProgress';
import { BatchSignSuccess } from './BatchSignSuccess';

type SheetState = 'confirm' | 'signing' | 'success' | 'error';

export interface BatchSignModalProps {
  visible: boolean;
  onClose: () => void;
  requests: RequestResponseDto[];
  doctorName?: string;
  certificateName?: string;
  certificateValidUntil?: string;
  onComplete?: (result: BatchSignatureResult) => void;
}

// ============================================
// Paleta local (constantes do design)
// ============================================

const PALETTE = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  certBg: '#F5F3FF',
  certBorder: '#DDD6FE',
  certIcon: '#7C3AED',
  white: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#475569',
  border: '#E2E8F0',
  surfaceMuted: '#F8FAFC',
  backdrop: 'rgba(15, 23, 42, 0.55)',
} as const;

// ============================================
// Helpers
// ============================================

function describeRequest(r: RequestResponseDto): { title: string; subtitle: string } {
  const patient = r.patientName?.trim() || 'Paciente';
  if (r.requestType === 'prescription') {
    const med = r.medications?.[0]?.trim();
    return { title: patient, subtitle: med ? `Receita — ${med}` : 'Receita médica' };
  }
  if (r.requestType === 'exam') {
    const exam = r.exams?.[0]?.trim() || r.examType?.trim();
    return { title: patient, subtitle: exam ? `Exame — ${exam}` : 'Pedido de exame' };
  }
  return { title: patient, subtitle: 'Documento médico' };
}

function formatValidity(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ============================================
// Componente principal
// ============================================

export function BatchSignModal({
  visible,
  onClose,
  requests,
  doctorName,
  certificateName,
  certificateValidUntil,
  onComplete,
}: BatchSignModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme({ role: 'doctor' });

  const [sheetState, setSheetState] = useState<SheetState>('confirm');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Lista de pedidos em uso — congelada durante signing e reduzida a falhas
  // em caso de retry parcial. Começa igual a `requests`.
  const [workingRequests, setWorkingRequests] =
    useState<RequestResponseDto[]>(requests);

  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BatchSignatureResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startTimeRef = useRef<number | null>(null);

  // FIX A6: safety net contra setState em componente desmontado.
  // O parent pode desmontar este modal enquanto `signBatch.mutateAsync` está
  // em voo (ex.: médico navega para outra rota no Expo Router). Como
  // react-query NÃO aborta a mutation no unmount, o setResult/setProgress/
  // setSheetState do `then` rodariam em componente unmounted — warning
  // amarelo em RN e, em alguns Androids antigos, crash. Gate-ar todos os
  // setStates do fluxo assíncrono em `isMountedRef.current`.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const signBatch = useSignBatchMutation();

  const total = workingRequests.length;

  // Sincroniza workingRequests quando a prop muda fora de um fluxo de assinatura.
  useEffect(() => {
    if (sheetState === 'confirm') {
      setWorkingRequests(requests);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  // Reset on close (cleanup) — descarta senha
  useEffect(() => {
    if (!visible) {
      setPassword('');
      setShowPassword(false);
      setConsentChecked(false);
      setSheetState('confirm');
      setProgress(0);
      setResult(null);
      setErrorMessage(null);
      setElapsedMs(0);
      setWorkingRequests(requests);
      startTimeRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSign = useCallback(async () => {
    if (total === 0 || password.length === 0 || !consentChecked) return;

    setErrorMessage(null);
    setProgress(0);
    setSheetState('signing');
    startTimeRef.current = Date.now();

    try {
      const requestIds = workingRequests.map((r) => r.id);
      const res = await signBatch.mutateAsync({ requestIds, pfxPassword: password });
      // Se o componente já foi desmontado, não tocar em estado.
      // O onComplete ainda pode ser chamado porque o parent pode querer
      // reagir (ex.: invalidar queries), mas qualquer setState local é no-op.
      if (!isMountedRef.current) {
        onComplete?.(res);
        return;
      }
      // Ao final, o anel salta de 0 → total com animação de 800ms do próprio
      // BatchSigningProgress. Nada de simulação.
      setProgress(total);
      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      setElapsedMs(elapsed);
      setResult(res);

      // FIX: Quando TODOS os itens falharam com o mesmo erro (ex.: senha do
      // PFX errada), não faz sentido mostrar a tela de sucesso parcial com
      // "0 ASSINADOS / 0%". Em vez disso, mostramos a tela de erro com a
      // mensagem específica — o médico entende melhor o que aconteceu e pode
      // corrigir a senha e tentar de novo.
      if (res.signedCount === 0 && res.failedCount > 0) {
        const failedMessages = res.items
          .filter((i) => !i.success && i.errorMessage)
          .map((i) => i.errorMessage!);
        const allSameError =
          failedMessages.length > 0 &&
          failedMessages.every((msg) => msg === failedMessages[0]);

        if (allSameError) {
          // Erro uniforme (ex.: senha errada) → tela de erro direta
          setErrorMessage(
            humanizeError(new Error(failedMessages[0]), 'batch-sign'),
          );
          haptics.error();
          setSheetState('error');
          onComplete?.(res);
          return;
        }
      }

      if (res.failedCount > 0) {
        haptics.warning();
      } else {
        haptics.success();
      }
      setSheetState('success');
      onComplete?.(res);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = getApiErrorMessage(err);
      setErrorMessage(message);
      haptics.error();
      setSheetState('error');
    }
  }, [total, password, consentChecked, workingRequests, signBatch, onComplete]);

  const handleBackdropPress = useCallback(() => {
    // Bloqueia fechamento durante signing E enquanto a mutation estiver pendente.
    // Sem o segundo check, há uma janela de race condition: entre a mutation
    // completar (isPending=false) e o setSheetState('success') rodar no próximo
    // microtask, o usuário pode tocar o backdrop. Como sheetState ainda é
    // 'signing' nesse instante, o early return funciona — mas se o React
    // batching já tiver aplicado o transitório, o modal fecharia ANTES de
    // BatchSignSuccess renderizar, e o médico nunca veria o resultado de
    // um batch que já completou no backend.
    if (sheetState === 'signing' || signBatch.isPending) return;
    onClose();
  }, [sheetState, signBatch.isPending, onClose]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setSheetState('confirm');
  }, []);

  const handleRetryFailed = useCallback(
    (failedRequestIds: string[]) => {
      const failedSet = new Set(failedRequestIds);
      const next = workingRequests.filter((r) => failedSet.has(r.id));
      if (next.length === 0) {
        onClose();
        return;
      }
      setWorkingRequests(next);
      setPassword(''); // limpa por segurança
      setResult(null);
      setProgress(0);
      setElapsedMs(0);
      setErrorMessage(null);
      setSheetState('confirm');
      // Aviso explícito: antes o campo de senha era resetado silenciosamente
      // e o médico via a tela voltar "vazia" sem contexto. Agora toast
      // informa por que a senha sumiu — evita confusão e click-repetido.
      showToast({
        type: 'info',
        message: 'Senha resetada por segurança. Digite novamente para tentar os itens que falharam.',
      });
    },
    [workingRequests, onClose],
  );

  const canSign = password.length > 0 && consentChecked && total > 0 && !signBatch.isPending;
  const validityLabel = useMemo(() => formatValidity(certificateValidUntil), [certificateValidUntil]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'android' ? 'fade' : 'slide'}
      onRequestClose={() => {
        // Mesma proteção do handleBackdropPress: bloqueia durante mutation
        // pendente E durante signing state. Previne Android back button de
        // fechar o modal no meio de uma assinatura ou durante transição.
        if (sheetState === 'signing' || signBatch.isPending) return;
        onClose();
      }}
      statusBarTranslucent
    >
      <Pressable
        style={s.backdrop}
        onPress={handleBackdropPress}
        accessibilityLabel="Fechar modal de assinatura"
        accessibilityRole="button"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.kavWrap}
        pointerEvents="box-none"
        keyboardVerticalOffset={0}
      >
        <View
          style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 28 }]}
          accessibilityViewIsModal
        >
          <View style={s.handle} />
          {sheetState === 'confirm' && (
            <ConfirmContent
              total={total}
              requests={workingRequests}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              consentChecked={consentChecked}
              setConsentChecked={setConsentChecked}
              doctorName={doctorName}
              certificateName={certificateName}
              validityLabel={validityLabel}
              canSign={canSign}
              onSign={handleSign}
              onClose={onClose}
              textMutedColor={colors.textMuted}
            />
          )}
          {sheetState === 'signing' && (
            <BatchSigningProgress
              progress={progress}
              total={total}
              subtitle="Aguarde enquanto assinamos seus documentos..."
              // Estimativa: ~3s por documento (geração PDF + assinatura
              // PAdES + upload S3). Conservadora — batches pequenos
              // normalmente terminam mais rápido, mas preferível
              // superestimar a subestimar (médico fica ansioso se estimativa
              // otimista passar).
              estimatedTotalSeconds={total * 3}
            />
          )}
          {sheetState === 'success' && result && (
            <BatchSignSuccess
              signedCount={result.signedCount}
              failedCount={result.failedCount}
              elapsedMs={elapsedMs}
              items={result.items}
              onClose={onClose}
              onRetryFailed={handleRetryFailed}
            />
          )}
          {sheetState === 'error' && (
            <ErrorContent message={errorMessage} onRetry={handleRetry} onClose={onClose} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================
// Confirm content
// ============================================

interface ConfirmContentProps {
  total: number;
  requests: RequestResponseDto[];
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  consentChecked: boolean;
  setConsentChecked: React.Dispatch<React.SetStateAction<boolean>>;
  doctorName?: string;
  certificateName?: string;
  validityLabel: string | null;
  canSign: boolean;
  onSign: () => void;
  onClose: () => void;
  textMutedColor: string;
}

function ConfirmContent({
  total,
  requests,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  consentChecked,
  setConsentChecked,
  doctorName,
  certificateName,
  validityLabel,
  canSign,
  onSign,
  onClose,
  textMutedColor,
}: ConfirmContentProps) {
  const previewItems = requests.slice(0, 3);
  const remaining = Math.max(0, total - previewItems.length);

  // Micro-interaction da checkbox: pequeno scale 0.92 → 1.0
  const checkboxScale = useRef(new Animated.Value(1)).current;

  const handleConsentToggle = useCallback(() => {
    haptics.light();
    Animated.sequence([
      Animated.timing(checkboxScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(checkboxScale, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
    setConsentChecked((v) => !v);
  }, [checkboxScale, setConsentChecked]);

  return (
    <ScrollView
      style={s.scrollArea}
      contentContainerStyle={s.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{`Assinar ${total} ${total === 1 ? 'documento' : 'documentos'}`}</Text>
          <Text style={s.description}>
            Uma única digitação de senha assinará todos os documentos já revisados e aprovados por você.
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Fechar modal"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={textMutedColor} />
        </Pressable>
      </View>

      <View style={s.previewList}>
        {previewItems.map((r) => {
          const { title, subtitle } = describeRequest(r);
          return (
            <View key={r.id} style={s.previewItem}>
              <View style={s.previewCheck}>
                <Ionicons name="checkmark" size={14} color={PALETTE.white} />
              </View>
              <Text style={s.previewText} numberOfLines={1}>
                <Text style={s.previewTitle}>{title}</Text>
                <Text style={s.previewSubtitle}>{` — ${subtitle}`}</Text>
              </Text>
            </View>
          );
        })}
        {remaining > 0 && (
          <Text style={s.previewMore}>{`+ ${remaining} ${remaining === 1 ? 'outro documento' : 'outros documentos'}`}</Text>
        )}
      </View>

      <View style={s.certCard}>
        <View style={s.certIconWrap}>
          <Ionicons name="lock-closed" size={18} color={PALETTE.certIcon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.certName} numberOfLines={1}>
            {doctorName ?? 'Certificado do médico'}
          </Text>
          <Text style={s.certMeta} numberOfLines={1}>
            {certificateName ?? 'Certificado ICP-Brasil'}
          </Text>
          {validityLabel && (
            <Text style={s.certMeta}>{`Válido até ${validityLabel}`}</Text>
          )}
        </View>
      </View>

      <View style={s.passwordWrap}>
        <TextInput
          style={s.passwordInput}
          value={password}
          onChangeText={setPassword}
          placeholder="Senha do certificado"
          placeholderTextColor={textMutedColor}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="password"
          accessibilityLabel="Senha do certificado ICP-Brasil"
          accessibilityHint="Digite a senha do seu certificado A1 para assinar todos os documentos"
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          style={({ pressed }) => [s.eyeBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color={textMutedColor}
          />
        </Pressable>
      </View>

      <Pressable
        onPress={handleConsentToggle}
        style={({ pressed }) => [s.consentRow, pressed && { opacity: 0.85 }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consentChecked }}
        accessibilityLabel="Confirmar revisão dos documentos"
      >
        <Animated.View
          style={[
            s.checkbox,
            consentChecked && s.checkboxOn,
            { transform: [{ scale: checkboxScale }] },
          ]}
        >
          {consentChecked && <Ionicons name="checkmark" size={14} color={PALETTE.white} />}
        </Animated.View>
        <Text style={s.consentText}>
          {`Confirmo que revisei todos os ${total} documentos e autorizo a assinatura digital com meu certificado ICP-Brasil, conforme MP 2.200-2/2001.`}
        </Text>
      </Pressable>

      <Pressable
        onPress={onSign}
        disabled={!canSign}
        style={({ pressed }) => [
          s.primaryBtn,
          !canSign && s.primaryBtnDisabled,
          pressed && canSign && { backgroundColor: PALETTE.primaryDark },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Assinar todos os ${total} documentos`}
        accessibilityState={{ disabled: !canSign }}
      >
        <Ionicons name="shield-checkmark" size={18} color={PALETTE.white} />
        <Text style={s.primaryBtnText}>{`Assinar todos os ${total}`}</Text>
      </Pressable>
    </ScrollView>
  );
}

// ============================================
// Error content
// ============================================

interface ErrorContentProps {
  message: string | null;
  onRetry: () => void;
  onClose: () => void;
}

function ErrorContent({ message, onRetry, onClose }: ErrorContentProps) {
  return (
    <View style={s.errorWrap}>
      <View style={s.errorIcon}>
        <Ionicons name="close" size={48} color={PALETTE.white} />
      </View>
      <Text style={s.errorTitle}>Não foi possível assinar</Text>
      <Text style={s.errorMessage}>
        {message ?? 'Erro ao assinar. Verifique sua senha e tente novamente.'}
      </Text>

      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          s.primaryBtn,
          pressed && { backgroundColor: PALETTE.primaryDark },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Tentar assinar novamente"
      >
        <Ionicons name="refresh" size={18} color={PALETTE.white} />
        <Text style={s.primaryBtnText}>Tentar novamente</Text>
      </Pressable>

      <Pressable
        onPress={onClose}
        style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
      >
        <Text style={s.secondaryBtnText}>Fechar</Text>
      </Pressable>
    </View>
  );
}

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: PALETTE.backdrop,
  },
  kavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: PALETTE.border,
    marginBottom: 12,
  },
  scrollArea: {
    width: '100%',
  },
  scrollContent: {
    paddingTop: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: PALETTE.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: PALETTE.textSubtle,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.surfaceMuted,
  },
  previewList: {
    gap: 8,
    marginBottom: 14,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PALETTE.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    color: PALETTE.text,
  },
  previewTitle: {
    fontWeight: '600',
    color: PALETTE.text,
  },
  previewSubtitle: {
    color: PALETTE.textSubtle,
  },
  previewMore: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginLeft: 28,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PALETTE.certBg,
    borderColor: PALETTE.certBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  certIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certName: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.text,
  },
  certMeta: {
    fontSize: 12,
    color: PALETTE.textSubtle,
    marginTop: 1,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PALETTE.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
    backgroundColor: PALETTE.white,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: PALETTE.text,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    borderColor: PALETTE.primary,
    backgroundColor: PALETTE.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: PALETTE.textSubtle,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.primary,
    borderRadius: 14,
    height: 54,
    marginTop: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryBtnText: {
    color: PALETTE.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginTop: 8,
  },
  secondaryBtnText: {
    color: PALETTE.textSubtle,
    fontSize: 14,
    fontWeight: '600',
  },

  // Error
  errorWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: PALETTE.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: PALETTE.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    color: PALETTE.textSubtle,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
    lineHeight: 18,
  },
});
