/**
 * ConsultationsTab — Timeline de consultas com anamnese expandível.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { spacing, borderRadius, typography } from '../../lib/themeDoctor';
import type { RequestResponseDto } from '../../types/database';
import { AnamnesisCard } from './AnamnesisCard';
import { parseAnamnesis, parseSuggestions, extractCidFromJson } from '../../lib/domain/anamnesis';
import { AppEmptyState } from '../ui';
import { showToast } from '../ui/Toast';
import { formatDateTimeBR } from '../../lib/utils/format';

interface ConsultationsTabProps {
  consultations: RequestResponseDto[];
}

export function ConsultationsTab({ consultations }: ConsultationsTabProps) {
  const { colors } = useAppTheme({ role: 'doctor' });
  const S = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (consultations.length === 0) {
    return (
      <AppEmptyState
        icon="videocam-outline"
        title="Nenhuma consulta"
        subtitle="Quando este paciente realizar consultas por vídeo, o histórico aparecerá aqui com anamnese estruturada."
      />
    );
  }

  return (
    <View style={S.container}>
      <Text style={S.countLabel}>{consultations.length} consulta(s)</Text>

      {consultations.map((c, idx) => {
        const isExpanded = expandedId === c.id;
        const anamnesis = parseAnamnesis(c.consultationAnamnesis);
        const suggestions = parseSuggestions(c.consultationAiSuggestions);
        const cid = extractCidFromJson(c.consultationAnamnesis);
        const hasAnamnesis = anamnesis && Object.keys(anamnesis).length > 0;
        const hasTranscript = !!(c.consultationTranscript?.trim());

        return (
          <View key={c.id} style={S.card}>
            {/* Header — always visible */}
            <Pressable
              style={S.cardHeader}
              onPress={() => setExpandedId(isExpanded ? null : c.id)}
            >
              <View style={S.iconWrap}>
                <Ionicons name="videocam" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.cardTitle}>Consulta {idx + 1}</Text>
                <Text style={S.cardDate}>{formatDateTimeBR(c.createdAt)}</Text>
              </View>
              {cid && (
                <View style={S.cidBadge}>
                  <Text style={S.cidText}>{cid}</Text>
                </View>
              )}
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>

            {/* Quick preview — always visible */}
            {c.symptoms && (
              <View style={S.quickField}>
                <Text style={S.quickLabel}>Queixa (paciente)</Text>
                <Text style={S.quickValue} numberOfLines={2}>{c.symptoms}</Text>
              </View>
            )}

            {(c.doctorConductNotes || c.aiConductSuggestion) && (
              <View style={S.quickField}>
                <Text style={S.quickLabel}>
                  {c.doctorConductNotes ? 'Registro do médico' : 'Sugestão de conduta IA'}
                </Text>
                <Text
                  style={[S.quickValue, !c.doctorConductNotes && { fontStyle: 'italic', color: colors.textSecondary }]}
                  numberOfLines={isExpanded ? undefined : 3}
                >
                  {c.doctorConductNotes || c.aiConductSuggestion}
                </Text>
                {c.doctorConductNotes && c.conductUpdatedAt && (
                  <Text style={S.metaText}>Editado em {formatDateTimeBR(c.conductUpdatedAt)}</Text>
                )}
              </View>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <>
                {hasAnamnesis && (
                  <AnamnesisCard
                    data={anamnesis!}
                    showAlerts
                    showMedsSuggestions
                    showExamsSuggestions
                    style={S.anamnesisCard}
                  />
                )}

                {suggestions.length > 0 && (
                  <View style={S.suggestionsBlock}>
                    <Text style={S.sectionLabel}>Sugestões clínicas da IA</Text>
                    {suggestions.map((s, i) => {
                      const isRed = s.startsWith('🚨');
                      return (
                        <View key={i} style={[S.suggestionItem, isRed && S.suggestionDanger]}>
                          <Ionicons
                            name={isRed ? 'alert-circle' : 'bulb-outline'}
                            size={14}
                            color={isRed ? colors.error : colors.primaryLight}
                          />
                          <Text style={[S.suggestionText, isRed && { color: colors.error }]}>
                            {s.replace('🚨 ', '')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {hasTranscript && (
                  <View style={S.transcriptBlock}>
                    <View style={S.transcriptHeader}>
                      <Text style={S.sectionLabel}>Transcrição</Text>
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(c.consultationTranscript || '');
                          showToast({ message: 'Transcrição copiada', type: 'success' });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={S.transcriptText} numberOfLines={6}>
                      {c.consultationTranscript}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={S.detailLink}
                  onPress={() => router.push(`/doctor-request/${c.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Text style={S.detailLinkText}>Ver detalhes da consulta</Text>
                  <Ionicons name="open-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(colors: DesignColors) {
  return StyleSheet.create({
    container: { gap: spacing.md },
    countLabel: {
      fontSize: 12,
      fontFamily: typography.fontFamily.bold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
      gap: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.successLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 15,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.text,
    },
    cardDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    cidBadge: {
      backgroundColor: colors.successLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.pill,
    },
    cidText: {
      fontSize: 11,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.success,
    },
    quickField: {
      paddingTop: spacing.xs,
    },
    quickLabel: {
      fontSize: 11,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    quickValue: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 21,
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    anamnesisCard: {
      marginTop: spacing.sm,
    },
    suggestionsBlock: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: spacing.xs,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    suggestionItem: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      paddingVertical: 4,
    },
    suggestionDanger: {
      backgroundColor: colors.errorLight,
      borderRadius: 8,
      padding: 8,
    },
    suggestionText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      flex: 1,
    },
    transcriptBlock: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    transcriptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    transcriptText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    detailLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    detailLinkText: {
      fontSize: 13,
      fontFamily: typography.fontFamily.semibold,
      color: colors.primary,
    },
  });
}
