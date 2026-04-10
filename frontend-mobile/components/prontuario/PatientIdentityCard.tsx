/**
 * PatientIdentityCard — Compact identity card for the prontuário.
 *
 * Redesign 2026-04-10: compact by default, progressive disclosure.
 * Shows: avatar + name + meta + metrics in ~160px.
 * Contact details are hidden behind a toggle to save vertical space.
 *
 * Hierarchy:
 *   1. Avatar + name + age/CPF (instant recognition)
 *   2. Metrics bar (consultas / receitas / exames) — always visible
 *   3. Expandable details (phone, email, address) — tap to reveal
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { typography } from '../../lib/themeDoctor';
import type { PatientProfileForDoctorDto } from '../../types/database';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

// ── Compact metric pill ──

interface MetricPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  accent: string;
  bg: string;
  S: ReturnType<typeof makeStyles>;
}

function MetricPill({ icon, value, label, accent, bg, S }: MetricPillProps) {
  return (
    <View style={S.metricPill}>
      <View style={[S.metricIconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View style={S.metricTextCol}>
        <Text style={S.metricValue}>{value}</Text>
        <Text style={S.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ── Detail row (shown only when expanded) ──

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: DesignColors;
  S: ReturnType<typeof makeStyles>;
}

function DetailRow({ icon, label, value, colors, S }: DetailRowProps) {
  return (
    <View style={S.detailRow}>
      <View style={S.detailIconWrap}>
        <Ionicons name={icon} size={12} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={S.detailLabel}>{label}</Text>
        <Text style={S.detailValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
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
  const [expanded, setExpanded] = useState(false);
  const age = calcAge(profile?.birthDate);

  const metaParts: string[] = [];
  if (age != null) metaParts.push(`${age} anos`);
  if (profile?.cpfMasked) metaParts.push(profile.cpfMasked);

  const hasDetails = profile && (profile.birthDate || profile.phone || profile.email || profile.street || profile.city);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[S.card, style]}>
      {/* ── Row 1: Avatar + Name + Expand toggle ── */}
      <Pressable style={S.identityRow} onPress={hasDetails ? toggleExpand : undefined}>
        <View style={S.avatarCircle}>
          <Text style={S.avatarText}>{getInitials(patientName)}</Text>
        </View>
        <View style={S.nameCol}>
          <Text style={S.name} numberOfLines={1}>{patientName}</Text>
          {metaParts.length > 0 && (
            <Text style={S.meta} numberOfLines={1}>
              {metaParts.join(' · ')}
            </Text>
          )}
        </View>
        {hasDetails && (
          <View style={S.expandBtn}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textMuted}
            />
          </View>
        )}
      </Pressable>

      {/* ── Expandable details ── */}
      {expanded && profile && (
        <View style={S.detailsBlock}>
          {profile.birthDate && (
            <DetailRow icon="calendar-outline" label="Nascimento" value={fmtBirthDate(profile.birthDate)} colors={colors} S={S} />
          )}
          {profile.phone && (
            <DetailRow icon="call-outline" label="Telefone" value={profile.phone} colors={colors} S={S} />
          )}
          {profile.email && (
            <DetailRow icon="mail-outline" label="E-mail" value={profile.email} colors={colors} S={S} />
          )}
          {(profile.street || profile.city) && (
            <DetailRow icon="location-outline" label="Endereço" value={formatAddress(profile)} colors={colors} S={S} />
          )}
        </View>
      )}

      {/* ── Divider ── */}
      <View style={S.divider} />

      {/* ── Metrics bar — always visible ── */}
      <View style={S.metricsRow}>
        <MetricPill icon="videocam" value={consultationCount} label="Consultas" accent="#059669" bg="#DCFCE7" S={S} />
        <View style={S.metricSep} />
        <MetricPill icon="document-text" value={prescriptionCount} label="Receitas" accent="#0369A1" bg="#E0F2FE" S={S} />
        <View style={S.metricSep} />
        <MetricPill icon="flask" value={examCount} label="Exames" accent="#7C3AED" bg="#F3E8FF" S={S} />
      </View>
    </View>
  );
}

function makeStyles(colors: DesignColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },

    // ── Identity row ──
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    nameCol: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 18,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    meta: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: '500',
    },
    expandBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Expandable details ──
    detailsBlock: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    detailIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    detailLabel: {
      fontSize: 10,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 1,
    },
    detailValue: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 17,
      fontWeight: '500',
    },

    // ── Divider ──
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginTop: 12,
      marginBottom: 10,
    },

    // ── Metrics ──
    metricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 2,
    },
    metricIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricTextCol: {
      alignItems: 'flex-start',
    },
    metricValue: {
      fontSize: 18,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 21,
    },
    metricLabel: {
      fontSize: 9,
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    metricSep: {
      width: 1,
      height: 28,
      backgroundColor: colors.borderLight,
    },
  });
}
