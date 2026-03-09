/**
 * PatientIdentityCard — Card compacto de identificação do paciente.
 *
 * Exibe dados cadastrais, métricas e alergias.
 * Fixo no topo do prontuário (fora do scroll).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { spacing, borderRadius, typography } from '../../lib/themeDoctor';
import { FieldRow, QuickStat } from './shared';
import type { PatientProfileForDoctorDto } from '../../types/database';

interface PatientIdentityCardProps {
  profile: PatientProfileForDoctorDto | null;
  patientName: string;
  consultationCount: number;
  prescriptionCount: number;
  examCount: number;
  allergies: string[];
  style?: object;
}

function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate()))
    age--;
  return age >= 0 ? age : null;
}

function fmtBirthDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAddress(p: PatientProfileForDoctorDto): string {
  const parts: string[] = [];
  if (p.street) parts.push(p.street + (p.number ? `, ${p.number}` : ''));
  if (p.neighborhood) parts.push(p.neighborhood);
  if (p.city) parts.push(p.city + (p.state ? ` - ${p.state}` : ''));
  if (p.postalCode) parts.push(`CEP ${p.postalCode.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')}`);
  return parts.filter(Boolean).join(' · ') || '—';
}

export function PatientIdentityCard({
  profile,
  patientName,
  consultationCount,
  prescriptionCount,
  examCount,
  allergies,
  style,
}: PatientIdentityCardProps) {
  const { colors } = useAppTheme({ role: 'doctor' });
  const S = useMemo(() => makeStyles(colors), [colors]);
  const age = calcAge(profile?.birthDate);

  return (
    <View style={[S.card, style]}>
      {/* Patient name & age */}
      <View style={S.nameRow}>
        <View style={S.avatarWrap}>
          <Text style={S.avatarText}>
            {patientName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.name} numberOfLines={1}>{patientName}</Text>
          <Text style={S.meta}>
            {age != null ? `${age} anos` : ''}
            {age != null && profile?.gender ? ' · ' : ''}
            {profile?.gender === 'M' ? 'Masculino' : profile?.gender === 'F' ? 'Feminino' : profile?.gender ?? ''}
            {profile?.cpfMasked ? ` · ${profile.cpfMasked}` : ''}
          </Text>
        </View>
      </View>

      {/* Details grid */}
      {profile && (
        <View style={S.detailsGrid}>
          {profile.birthDate && (
            <FieldRow icon="calendar-outline" label="Nascimento" value={fmtBirthDate(profile.birthDate)} />
          )}
          {profile.phone && (
            <FieldRow icon="call-outline" label="Telefone" value={profile.phone} />
          )}
          {profile.email && (
            <FieldRow icon="mail-outline" label="E-mail" value={profile.email} />
          )}
          {(profile.street || profile.city) && (
            <FieldRow icon="location-outline" label="Endereço" value={formatAddress(profile)} />
          )}
        </View>
      )}

      {/* Metrics bar */}
      <View style={S.metricsBar}>
        <QuickStat icon="videocam" count={consultationCount} label="Consultas" color={colors.success} />
        <QuickStat icon="document-text" count={prescriptionCount} label="Receitas" color={colors.primary} />
        <QuickStat icon="flask" count={examCount} label="Exames" color={colors.info} />
      </View>

      {/* Allergies banner */}
      {allergies.length > 0 && (
        <View style={S.allergyBanner}>
          <View style={S.allergyLabel}>
            <Ionicons name="warning" size={14} color={colors.error} />
            <Text style={S.allergyLabelText}>ALERGIAS</Text>
          </View>
          <Text style={S.allergyValue}>{allergies.join(' · ')}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: DesignColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    avatarWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.primary,
    },
    name: {
      fontSize: 18,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.text,
    },
    meta: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    detailsGrid: {
      gap: 4,
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    metricsBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    allergyBanner: {
      backgroundColor: colors.errorLight,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.errorLight,
    },
    allergyLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    allergyLabelText: {
      fontSize: 11,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.error,
      letterSpacing: 0.5,
    },
    allergyValue: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 19,
    },
  });
}
