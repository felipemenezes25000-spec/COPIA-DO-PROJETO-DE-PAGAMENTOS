/**
 * ClinicalNotesTab — Formulário de notas + timeline.
 *
 * Notas clínicas: evolução, impressão diagnóstica, complemento, observação.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { spacing, borderRadius, typography } from '../../lib/themeDoctor';
import {
  DOCTOR_NOTE_TYPES,
  NOTE_SENSITIVITY_OPTIONS,
  addDoctorPatientNote,
  type DoctorNoteDto,
  type NoteSensitivity,
} from '../../lib/api';
import type { RequestResponseDto } from '../../types/database';
import { AppButton, AppEmptyState } from '../ui';
import { showToast } from '../ui/Toast';
import { formatDateTimeBR, formatDateBR } from '../../lib/utils/format';

interface ClinicalNotesTabProps {
  patientId: string;
  doctorNotes: DoctorNoteDto[];
  onNotesChanged: (notes: DoctorNoteDto[]) => void;
  requests: RequestResponseDto[];
}

export function ClinicalNotesTab({
  patientId,
  doctorNotes,
  onNotesChanged,
  requests,
}: ClinicalNotesTabProps) {
  const { colors } = useAppTheme({ role: 'doctor' });
  const S = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<string>('progress_note');
  const [linkedRequestId, setLinkedRequestId] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<NoteSensitivity>('general');
  const [summaryForTeam, setSummaryForTeam] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Se o autor marca a nota como "author_only" ele precisa fornecer um
  // summary_for_team para não deixar a equipe multidisciplinar no escuro
  // (recomendação CFP 001/2009 + Lei 10.216/2001).
  const requiresTeamSummary = sensitivity === 'author_only';
  const canSubmit =
    !!newNoteContent.trim() &&
    (!requiresTeamSummary || summaryForTeam.trim().length > 0);

  const handleAddNote = useCallback(async () => {
    if (!patientId || !newNoteContent.trim()) return;
    if (requiresTeamSummary && !summaryForTeam.trim()) {
      showToast({ message: 'Informe um resumo para a equipe', type: 'error' });
      return;
    }
    setAddingNote(true);
    try {
      const note = await addDoctorPatientNote(patientId, {
        noteType: newNoteType,
        content: newNoteContent.trim(),
        requestId: linkedRequestId,
        sensitivity,
        summaryForTeam: requiresTeamSummary ? summaryForTeam.trim() : null,
      });
      onNotesChanged([note, ...doctorNotes]);
      setNewNoteContent('');
      setSummaryForTeam('');
      setSensitivity('general');
      setLinkedRequestId(null);
      showToast({ message: 'Nota registrada', type: 'success' });
    } catch {
      showToast({ message: 'Não foi possível registrar a nota', type: 'error' });
    } finally {
      setAddingNote(false);
    }
  }, [
    patientId,
    newNoteContent,
    newNoteType,
    linkedRequestId,
    sensitivity,
    summaryForTeam,
    requiresTeamSummary,
    doctorNotes,
    onNotesChanged,
  ]);

  const getNoteTypeLabel = (key: string) => DOCTOR_NOTE_TYPES.find((t) => t.key === key)?.label ?? key;
  const getNoteTypeIcon = (key: string) => DOCTOR_NOTE_TYPES.find((t) => t.key === key)?.icon ?? 'document-text';

  const sortedRequests = useMemo(() =>
    [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [requests]
  );

  return (
    <View style={S.container}>
      {/* New note form */}
      <View style={S.formCard}>
        <View style={S.formHeader}>
          <View style={S.formIconWrap}>
            <Ionicons name="journal" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.formTitle}>Nova nota clínica</Text>
            <Text style={S.formSubtitle}>Evolução, impressão diagnóstica, complementos e observações</Text>
          </View>
        </View>

        {/* Note type chips */}
        <Text style={S.fieldLabel}>Tipo da nota</Text>
        <View style={S.noteTypeChips}>
          {DOCTOR_NOTE_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[S.noteTypeChip, newNoteType === t.key && S.noteTypeChipActive]}
              onPress={() => setNewNoteType(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={t.icon as any} size={14} color={newNoteType === t.key ? colors.white : colors.primary} />
              <Text style={[S.noteTypeChipText, newNoteType === t.key && S.noteTypeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Confidencialidade — CFP 001/2009 + LGPD Art. 11 */}
        <Text style={S.fieldLabel}>Confidencialidade</Text>
        <View style={S.noteTypeChips}>
          {NOTE_SENSITIVITY_OPTIONS.map((opt) => {
            const active = sensitivity === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[S.noteTypeChip, active && S.noteTypeChipActive]}
                onPress={() => setSensitivity(opt.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={14}
                  color={active ? colors.white : colors.primary}
                />
                <Text style={[S.noteTypeChipText, active && S.noteTypeChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={S.sensitivityHint}>
          {NOTE_SENSITIVITY_OPTIONS.find((o) => o.key === sensitivity)?.description}
        </Text>

        {/* Content */}
        <Text style={S.fieldLabel}>Conteúdo</Text>
        <TextInput
          style={S.noteInput}
          placeholder="Ex: Opto por associar medicação X ao esquema atual..."
          placeholderTextColor={colors.textMuted}
          value={newNoteContent}
          onChangeText={setNewNoteContent}
          multiline
          textAlignVertical="top"
        />

        {/* Resumo para equipe — só quando a nota é privativa ao autor */}
        {requiresTeamSummary && (
          <>
            <Text style={S.fieldLabel}>Resumo para a equipe *</Text>
            <TextInput
              style={S.noteInput}
              placeholder="Resumo clínico seguro compartilhável com outros profissionais."
              placeholderTextColor={colors.textMuted}
              value={summaryForTeam}
              onChangeText={setSummaryForTeam}
              multiline
              textAlignVertical="top"
            />
          </>
        )}

        {/* Link to request */}
        {sortedRequests.length > 0 && (
          <>
            <Text style={S.fieldLabel}>Vincular a atendimento (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.requestLinkScroll}>
              <TouchableOpacity
                style={[S.requestLinkChip, !linkedRequestId && S.requestLinkChipActive]}
                onPress={() => setLinkedRequestId(null)}
              >
                <Text style={[S.requestLinkChipText, !linkedRequestId && S.requestLinkChipTextActive]}>
                  Nenhum
                </Text>
              </TouchableOpacity>
              {sortedRequests.map((r) => {
                const typeLabel = r.requestType === 'consultation' ? 'Consulta' : r.requestType === 'prescription' ? 'Receita' : 'Exame';
                const isSelected = linkedRequestId === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[S.requestLinkChip, isSelected && S.requestLinkChipActive]}
                    onPress={() => setLinkedRequestId(isSelected ? null : r.id)}
                  >
                    <Text
                      style={[S.requestLinkChipText, isSelected && S.requestLinkChipTextActive]}
                      numberOfLines={1}
                    >
                      {typeLabel} · {formatDateBR(r.createdAt, { short: true })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        <AppButton
          title="Registrar nota"
          variant="doctorPrimary"
          onPress={handleAddNote}
          loading={addingNote}
          disabled={!canSubmit}
          style={S.addBtn}
        />
      </View>

      {/* Notes timeline */}
      {doctorNotes.length > 0 ? (
        <View style={S.timelineCard}>
          <Text style={S.timelineTitle}>Histórico ({doctorNotes.length})</Text>
          {doctorNotes.map((note, idx) => (
            <View key={note.id} style={[S.noteCard, idx < doctorNotes.length - 1 && S.noteCardBorder]}>
              <View style={S.noteCardHeader}>
                <View style={S.noteCardTypeBadge}>
                  <Ionicons name={getNoteTypeIcon(note.noteType) as any} size={12} color={colors.primary} />
                  <Text style={S.noteCardTypeText}>{getNoteTypeLabel(note.noteType)}</Text>
                </View>
                {note.sensitivity && note.sensitivity !== 'general' && (
                  <View style={S.sensitivityBadge}>
                    <Ionicons
                      name={note.sensitivity === 'author_only' ? 'lock-closed' : 'medkit'}
                      size={11}
                      color={colors.warning}
                    />
                    <Text style={S.sensitivityBadgeText}>
                      {note.sensitivity === 'author_only' ? 'Só autor' : 'Especialidade'}
                    </Text>
                  </View>
                )}
                <Text style={S.noteCardDate}>{formatDateTimeBR(note.createdAt)}</Text>
              </View>
              {note.isMaskedForViewer && (
                <View style={S.maskedBanner}>
                  <Ionicons name="eye-off-outline" size={12} color={colors.textMuted} />
                  <Text style={S.maskedBannerText}>
                    Texto restrito ao autor — exibindo resumo para a equipe.
                  </Text>
                </View>
              )}
              <Text style={S.noteCardContent}>{note.content}</Text>
              {note.requestId && (
                <TouchableOpacity
                  style={S.noteCardLink}
                  onPress={() => router.push(`/doctor-request/${note.requestId}` as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="open-outline" size={12} color={colors.primary} />
                  <Text style={S.noteCardLinkText}>Ver atendimento vinculado</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={S.emptyWrap}>
          <AppEmptyState
            icon="document-text-outline"
            title="Nenhuma nota registrada"
            subtitle="Use o formulário acima para adicionar evolução, impressão diagnóstica ou observações."
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: DesignColors) {
  return StyleSheet.create({
    container: { gap: spacing.md },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    formIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formTitle: {
      fontSize: 16,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.text,
    },
    formSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    fieldLabel: {
      fontSize: 12,
      fontFamily: typography.fontFamily.bold,
      color: colors.textMuted,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    noteTypeChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    noteTypeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.pill,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    noteTypeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    noteTypeChipText: {
      fontSize: 13,
      fontFamily: typography.fontFamily.medium,
      color: colors.primary,
    },
    noteTypeChipTextActive: {
      color: colors.white,
    },
    noteInput: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      fontSize: 14,
      color: colors.text,
      minHeight: 88,
      borderWidth: 1,
      borderColor: colors.border,
      fontFamily: typography.fontFamily.regular,
    },
    requestLinkScroll: {
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    requestLinkChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.pill,
      backgroundColor: colors.surfaceSecondary,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestLinkChipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    requestLinkChipText: {
      fontSize: 12,
      fontFamily: typography.fontFamily.medium,
      color: colors.textSecondary,
    },
    requestLinkChipTextActive: {
      color: colors.primary,
    },
    addBtn: {
      marginTop: spacing.md,
      alignSelf: 'flex-start',
    },
    timelineCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: colors.border,
    },
    timelineTitle: {
      fontSize: 12,
      fontFamily: typography.fontFamily.bold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: spacing.md,
      textTransform: 'uppercase',
    },
    noteCard: {
      paddingVertical: spacing.md,
    },
    noteCardBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    noteCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      flexWrap: 'wrap',
      gap: 4,
    },
    noteCardTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.pill,
      backgroundColor: colors.primarySoft,
      alignSelf: 'flex-start',
    },
    noteCardTypeText: {
      fontSize: 11,
      fontFamily: typography.fontFamily.bold,
      color: colors.primary,
      letterSpacing: 0.3,
    },
    noteCardDate: {
      fontSize: 11,
      color: colors.textMuted,
    },
    noteCardContent: {
      fontSize: 14,
      fontFamily: typography.fontFamily.regular,
      color: colors.text,
      lineHeight: 22,
    },
    noteCardLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
    },
    noteCardLinkText: {
      fontSize: 12,
      fontFamily: typography.fontFamily.semibold,
      color: colors.primary,
    },
    emptyWrap: {
      paddingVertical: spacing.xl,
    },
    sensitivityHint: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: -spacing.xs,
      marginBottom: spacing.sm,
      fontStyle: 'italic',
    },
    sensitivityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.pill,
      backgroundColor: colors.warningLight,
    },
    sensitivityBadgeText: {
      fontSize: 10,
      fontFamily: typography.fontFamily.bold,
      color: colors.warning,
      letterSpacing: 0.3,
    },
    maskedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceSecondary,
      marginBottom: spacing.sm,
    },
    maskedBannerText: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
      flex: 1,
    },
  });
}
