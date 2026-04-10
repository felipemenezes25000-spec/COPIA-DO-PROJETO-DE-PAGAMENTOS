import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../lib/themeDoctor';
import { DoctorCard } from '../ui/DoctorCard';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import { RequestResponseDto, PatientProfileForDoctorDto } from '../../types/database';
import { formatDateTimeBR } from '../../lib/utils/format';

/**
 * Badge visual para indicar o tipo da solicitação (receita/exame/consulta)
 * no cabeçalho do card. Necessário no modo foco unificado, onde diferentes
 * tipos aparecem na mesma fila sequencial — sem o badge, o médico perderia
 * o contexto do tipo do item atual.
 */
export interface RequestTypeBadge {
  label: string;
  bg: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface PatientInfoCardProps {
  request: RequestResponseDto;
  profile?: PatientProfileForDoctorDto | null;
  onViewRecord: () => void;
  /**
   * Badge opcional exibido no topo do card indicando o tipo da solicitação.
   * Usado no modo foco unificado para diferenciar receitas/exames/consultas
   * misturados na mesma fila.
   */
  typeBadge?: RequestTypeBadge;
  style?: object;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] || '?').toUpperCase();
}

function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age >= 0 ? age : null;
}

export function PatientInfoCard({ request, profile, onViewRecord, typeBadge, style }: PatientInfoCardProps) {
  const { colors } = useAppTheme({ role: 'doctor' });
  const s = useMemo(() => makeStyles(colors), [colors]);

  const age = profile ? calcAge(profile.birthDate) : null;
  const metaParts: string[] = [];
  if (age != null) metaParts.push(`${age} anos`);
  if (profile?.cpfMasked) metaParts.push(`CPF ${profile.cpfMasked}`);
  if (profile?.phone) metaParts.push(profile.phone);
  const hasExtraInfo = metaParts.length > 0;
  const canViewRecord = !!request.patientId;

  return (
    <DoctorCard style={style}>
      {/* Badge de tipo (opcional) — visível no modo foco unificado */}
      {typeBadge && (
        <View style={[s.typeBadge, { backgroundColor: typeBadge.bg }]}>
          <Ionicons name={typeBadge.icon} size={12} color={typeBadge.color} />
          <Text style={[s.typeBadgeText, { color: typeBadge.color }]}>
            {typeBadge.label}
          </Text>
        </View>
      )}

      {/* Identidade do paciente */}
      <View style={s.patientRow}>
        <View style={s.patientAvatar}>
          <Text style={s.patientAvatarText}>{getInitials(request.patientName)}</Text>
        </View>
        <View style={s.patientInfo}>
          <Text style={s.patientName} numberOfLines={1}>
            {request.patientName || 'Paciente'}
          </Text>
          <Text style={s.patientDate}>{formatDateTimeBR(request.createdAt)}</Text>
          {hasExtraInfo && (
            <Text style={s.patientMetaText} numberOfLines={2}>
              {metaParts.join(' · ')}
            </Text>
          )}
        </View>
      </View>

      {/* CTA "Abrir histórico clínico" — antes era só um link textual "VER PRONTUÁRIO"
          dentro da área do nome do paciente, o que era ambíguo (levava a lugares
          diferentes conforme o contexto) e pouco descobrível. Agora é um botão
          claro, com contraste, que sempre leva ao prontuário unificado. */}
      {canViewRecord && (
        <TouchableOpacity
          onPress={onViewRecord}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Abrir histórico clínico do paciente"
          style={s.recordButton}
        >
          <Ionicons name="folder-open" size={16} color={colors.primary} />
          <Text style={s.recordButtonText}>Abrir histórico clínico</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </DoctorCard>
  );
}

function makeStyles(colors: {
  primary: string;
  primarySoft: string;
  white: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  borderLight: string;
}) {
  return StyleSheet.create({
    typeBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginBottom: 12,
    },
    typeBadgeText: {
      fontSize: 11,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    patientRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    patientAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    patientAvatarText: {
      fontSize: 18,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.white,
    },
    patientInfo: { flex: 1, minWidth: 0 },
    patientName: {
      fontSize: 16,
      fontFamily: typography.fontFamily.semibold,
      fontWeight: '600',
      color: colors.text,
    },
    patientDate: {
      fontSize: 12,
      fontFamily: typography.fontFamily.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    patientMetaText: {
      fontSize: 12,
      fontFamily: typography.fontFamily.regular,
      color: colors.textSecondary,
      marginTop: 4,
    },
    recordButton: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.primarySoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    recordButtonText: {
      flex: 1,
      textAlign: 'left',
      fontSize: 13,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.3,
    },
  });
}
