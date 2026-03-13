import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { FadeIn } from '../../components/ui/FadeIn';

const SUS_GREEN = '#16A34A';

export default function ExportacaoScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<{ exportados: number; erros: number } | null>(null);

  const handleExportar = async () => {
    setExporting(true);
    // Simula exportação
    await new Promise(r => setTimeout(r, 3000));
    setLastResult({ exportados: 23, erros: 0 });
    setExporting(false);
    Alert.alert(
      'Exportação Concluída',
      '23 atendimentos exportados com sucesso para o e-SUS APS.\n\n0 erros encontrados.',
    );
  };

  const exportHistory = [
    { data: '12/03/2026 18:30', total: 45, erros: 0, status: 'sucesso' },
    { data: '11/03/2026 18:15', total: 52, erros: 1, status: 'parcial' },
    { data: '10/03/2026 18:45', total: 38, erros: 0, status: 'sucesso' },
    { data: '09/03/2026 18:00', total: 41, erros: 0, status: 'sucesso' },
    { data: '08/03/2026 18:20', total: 47, erros: 2, status: 'parcial' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Exportação e-SUS APS</Text>
        <Text style={styles.subtitle}>Integração LEDI — Ministério da Saúde</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <FadeIn visible>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <View style={[styles.statusIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="time-outline" size={22} color="#D97706" />
                </View>
                <Text style={styles.statusValue}>23</Text>
                <Text style={styles.statusLabel}>Pendentes</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <View style={[styles.statusIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={SUS_GREEN} />
                </View>
                <Text style={styles.statusValue}>1.217</Text>
                <Text style={styles.statusLabel}>Exportados</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <View style={[styles.statusIcon, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.statusValue}>12/03</Text>
                <Text style={styles.statusLabel}>Última</Text>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* Export button */}
        <FadeIn visible delay={100}>
          <Pressable
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExportar}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.exportBtnText}>Exportando atendimentos...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={22} color="#fff" />
                <Text style={styles.exportBtnText}>Exportar para e-SUS APS</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.exportNote}>
            Os dados serão convertidos para o formato LEDI e enviados ao PEC do e-SUS APS da prefeitura.
          </Text>
        </FadeIn>

        {/* What gets exported */}
        <FadeIn visible delay={200}>
          <Text style={styles.sectionTitle}>O que será exportado</Text>
          <View style={styles.infoCard}>
            {[
              { icon: 'document-text-outline', label: 'Fichas de Atendimento Individual', desc: '23 fichas pendentes' },
              { icon: 'people-outline', label: 'Cadastros de Cidadãos', desc: '3 novos cadastros' },
              { icon: 'medkit-outline', label: 'Procedimentos Realizados', desc: '47 procedimentos' },
            ].map((item, i) => (
              <View key={i} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon as any} size={18} color={SUS_GREEN} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* Export History */}
        <FadeIn visible delay={300}>
          <Text style={styles.sectionTitle}>Histórico de Exportações</Text>
          {exportHistory.map((h, i) => (
            <View key={i} style={styles.histRow}>
              <View style={styles.histLeft}>
                <Ionicons
                  name={h.status === 'sucesso' ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={h.status === 'sucesso' ? SUS_GREEN : '#D97706'}
                />
                <View>
                  <Text style={styles.histDate}>{h.data}</Text>
                  <Text style={styles.histDetail}>{h.total} fichas</Text>
                </View>
              </View>
              <View style={[
                styles.histBadge,
                { backgroundColor: h.status === 'sucesso' ? '#DCFCE7' : '#FEF3C7' }
              ]}>
                <Text style={[
                  styles.histBadgeText,
                  { color: h.status === 'sucesso' ? SUS_GREEN : '#D97706' }
                ]}>
                  {h.erros === 0 ? 'Sucesso' : `${h.erros} erro(s)`}
                </Text>
              </View>
            </View>
          ))}
        </FadeIn>

        {/* LEDI info */}
        <FadeIn visible delay={400}>
          <View style={styles.lediCard}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <View style={styles.lediContent}>
              <Text style={styles.lediTitle}>Sobre a integração LEDI</Text>
              <Text style={styles.lediText}>
                O sistema exporta dados no formato LEDI (Layout e-SUS APS de Dados e Interface), compatível com o PEC do e-SUS APS. Os dados são validados antes do envio e podem ser auditados a qualquer momento.
              </Text>
            </View>
          </View>
        </FadeIn>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: DesignColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  statusCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.borderLight },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusItem: { flex: 1, alignItems: 'center' },
  statusIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statusValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statusLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  statusDivider: { width: 1, height: 50, backgroundColor: colors.borderLight },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: SUS_GREEN, paddingVertical: 16, borderRadius: 14, marginTop: 20 },
  exportBtnDisabled: { opacity: 0.7 },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  exportNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 28, marginBottom: 12 },
  infoCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  infoRow: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'center' },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: SUS_GREEN + '10', alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  infoDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight },
  histLeft: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  histDate: { fontSize: 13, fontWeight: '600', color: colors.text },
  histDetail: { fontSize: 11, color: colors.textSecondary },
  histBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  histBadgeText: { fontSize: 11, fontWeight: '700' },
  lediCard: { flexDirection: 'row', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 20 },
  lediContent: { flex: 1 },
  lediTitle: { fontSize: 13, fontWeight: '700', color: '#1D4ED8' },
  lediText: { fontSize: 12, color: '#3B82F6', marginTop: 4, lineHeight: 18 },
});
