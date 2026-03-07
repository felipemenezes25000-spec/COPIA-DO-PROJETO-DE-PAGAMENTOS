import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, spacing, borderRadius, typography } from '../../lib/theme';
import { DoctorCard } from '../ui/DoctorCard';
import { AppButton } from '../ui/AppButton';

interface DoctorActionButtonsProps {
  canApprove: boolean;
  canReject: boolean;
  canSign: boolean;
  canAccept: boolean;
  canVideo: boolean;
  actionLoading: boolean;
  isPrescription: boolean;
  isExam?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSign: () => void;
  onAccept: () => void;
  onStartVideo: () => void;
  onNavigateEditor: () => void;

  showRejectForm: boolean;
  showSignForm: boolean;
  rejectionReason: string;
  certPassword: string;
  onRejectionReasonChange: (text: string) => void;
  onCertPasswordChange: (text: string) => void;
  onToggleRejectForm: () => void;
  onToggleSignForm: () => void;

  isInQueue: boolean;
}

export function DoctorActionButtons({
  canApprove,
  canReject,
  canSign,
  canAccept,
  canVideo,
  actionLoading,
  isPrescription,
  isExam = false,
  onApprove,
  onReject,
  onSign,
  onAccept,
  onStartVideo,
  onNavigateEditor,
  showRejectForm,
  showSignForm,
  rejectionReason,
  certPassword,
  onRejectionReasonChange,
  onCertPasswordChange,
  onToggleRejectForm,
  onToggleSignForm,
  isInQueue,
}: DoctorActionButtonsProps) {
  const { colors } = theme;

  return (
    <>
      {/* --- FORMULÁRIO DE ASSINATURA --- */}
      {showSignForm && (
        <DoctorCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary.soft }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary.main} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Assinatura Digital ICP-Brasil</Text>
              <Text style={styles.formDesc}>Digite a senha do seu certificado A1 para concluir.</Text>
            </View>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Senha do certificado"
            secureTextEntry
            value={certPassword}
            onChangeText={onCertPasswordChange}
            placeholderTextColor={colors.text.tertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={certPassword.length > 0 ? onSign : undefined}
          />
          
          <View style={styles.btnRow}>
            <AppButton
              title="Cancelar"
              variant="outline"
              onPress={onToggleSignForm}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Assinar Documento"
              variant="primary"
              icon="pencil"
              onPress={onSign}
              loading={actionLoading}
              disabled={certPassword.length === 0}
              style={{ flex: 1.5 }}
            />
          </View>
        </DoctorCard>
      )}

      {/* --- FORMULÁRIO DE REJEIÇÃO --- */}
      {showRejectForm && (
        <DoctorCard style={[styles.formCard, { borderColor: colors.status.error }]}>
          <View style={styles.formHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.status.errorBg }]}>
              <Ionicons name="close-circle" size={20} color={colors.status.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formTitle, { color: colors.status.error }]}>Rejeitar Pedido</Text>
              <Text style={styles.formDesc}>O motivo será enviado ao paciente.</Text>
            </View>
          </View>
          
          <TextInput
            style={styles.textArea}
            placeholder="Motivo da rejeição (ex: foto ilegível)..."
            value={rejectionReason}
            onChangeText={onRejectionReasonChange}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
          
          <View style={styles.btnRow}>
            <AppButton
              title="Voltar"
              variant="outline"
              onPress={onToggleRejectForm}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Confirmar Rejeição"
              variant="danger"
              icon="close-circle"
              onPress={onReject}
              loading={actionLoading}
              disabled={rejectionReason.trim().length === 0}
              style={{ flex: 1.5 }}
            />
          </View>
        </DoctorCard>
      )}

      {/* --- DICA DE FILA --- */}
      {isInQueue && !showSignForm && !showRejectForm && (
        <View style={styles.hintBox}>
          <Ionicons name="information-circle" size={20} color={colors.primary.main} />
          <Text style={styles.hintText}>
            Pedido aguardando sua análise. Verifique os dados acima antes de decidir.
          </Text>
        </View>
      )}

      {/* --- BOTÕES DE AÇÃO PRINCIPAIS --- */}
      {!showSignForm && !showRejectForm && (
        <View style={styles.mainActions}>
          {/* 1. ACEITAR CONSULTA (Fluxo de Telemedicina) */}
          {canAccept && (
            <AppButton
              title="Aceitar Atendimento"
              variant="primary"
              size="lg"
              icon="videocam"
              onPress={onAccept}
              loading={actionLoading}
              pulse
              fullWidth
            />
          )}

          {/* 2. APROVAR (Fluxo Simples) */}
          {canApprove && (
            <AppButton
              title="Aprovar Solicitação"
              variant="primary"
              size="lg"
              icon="checkmark-circle"
              onPress={onApprove}
              loading={actionLoading}
              fullWidth
            />
          )}

          {/* 3. ASSINAR (Fluxo Receita/Exame) */}
          {canSign && (isPrescription || isExam) && (
            <AppButton
              title="Visualizar e Assinar"
              variant="primary"
              size="lg"
              icon="document-text"
              trailing={<Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />}
              onPress={onNavigateEditor}
              loading={actionLoading}
              fullWidth
            />
          )}
          
          {/* 4. ASSINAR (Legado/Genérico) */}
          {canSign && !isPrescription && !isExam && (
            <AppButton
              title="Assinar Digitalmente"
              variant="primary"
              size="lg"
              icon="pencil"
              onPress={onToggleSignForm}
              loading={actionLoading}
              fullWidth
            />
          )}

          {/* 5. VÍDEO (Pós-Aceite) */}
          {canVideo && (
            <AppButton
              title="Entrar na Sala de Vídeo"
              variant="secondary" // Green for "Go"
              size="lg"
              icon="videocam"
              onPress={onStartVideo}
              pulse // Call to action!
              fullWidth
            />
          )}

          {/* 6. REJEITAR (Secundário) */}
          {canReject && (
            <AppButton
              title="Rejeitar Pedido"
              variant="ghost"
              size="md" // Smaller
              icon="close-circle-outline"
              onPress={onToggleRejectForm}
              style={{ marginTop: 8 }}
              fullWidth
            />
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cardMargin: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  formCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.main,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  formHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  formDesc: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border.main,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.subtle,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border.main,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.subtle,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.primary.soft,
    padding: 16,
    borderRadius: theme.borderRadius.card,
    marginHorizontal: 20,
    marginTop: 24,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  mainActions: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40, // Extra bottom padding for scroll
    gap: 12,
  },
});
