import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { FadeIn } from '../../components/ui/FadeIn';

const SUS_GREEN = '#16A34A';

type Periodo = 'hoje' | 'semana' | 'mes';

const MOCK_DATA = {
  hoje: { atendimentos: 47, cidadaos: 42, profissionais: 8, porUnidade: [
    { nome: 'UBS Central', total: 18 }, { nome: 'UBS Hortolândia', total: 12 },
    { nome: 'UBS Retiro', total: 9 }, { nome: 'UBS Tulipas', total: 5 }, { nome: 'UBS Rio Branco', total: 3 },
  ], porProfissional: [
    { nome: 'Dr. Carlos Mendes', total: 12 }, { nome: 'Dra. Fernanda Lima', total: 10 },
    { nome: 'Enf. Juliana Souza', total: 8 }, { nome: 'Dr. Roberto Alves', total: 7 },
    { nome: 'Dra. Patricia Costa', total: 6 }, { nome: 'Enf. Marcos Silva', total: 4 },
  ]},
  semana: { atendimentos: 285, cidadaos: 210, profissionais: 15, porUnidade: [
    { nome: 'UBS Central', total: 95 }, { nome: 'UBS Hortolândia', total: 72 },
    { nome: 'UBS Retiro', total: 55 }, { nome: 'UBS Tulipas', total: 38 }, { nome: 'UBS Rio Branco', total: 25 },
  ], porProfissional: [
    { nome: 'Dr. Carlos Mendes', total: 62 }, { nome: 'Dra. Fernanda Lima', total: 55 },
    { nome: 'Enf. Juliana Souza', total: 48 }, { nome: 'Dr. Roberto Alves', total: 42 },
    { nome: 'Dra. Patricia Costa', total: 40 }, { nome: 'Enf. Marcos Silva', total: 38 },
  ]},
  mes: { atendimentos: 1240, cidadaos: 890, profissionais: 22, porUnidade: [
    { nome: 'UBS Central', total: 410 }, { nome: 'UBS Hortolândia', total: 305 },
    { nome: 'UBS Retiro', total: 240 }, { nome: 'UBS Tulipas', total: 165 }, { nome: 'UBS Rio Branco', total: 120 },
  ], porProfissional: [
    { nome: 'Dr. Carlos Mendes', total: 265 }, { nome: 'Dra. Fernanda Lima', total: 240 },
    { nome: 'Enf. Juliana Souza', total: 210 }, { nome: 'Dr. Roberto Alves', total: 185 },
    { nome: 'Dra. Patricia Costa', total: 175 }, { nome: 'Enf. Marcos Silva', total: 165 },
  ]},
};

export default function RelatoriosScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [periodo, setPeriodo] = useState<Periodo>('hoje');

  const data = MOCK_DATA[periodo];
  const maxUnidade = Math.max(...data.porUnidade.map(u => u.total));
  const maxProf = Math.max(...data.porProfissional.map(p => p.total));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios de Produção</Text>
        <Text style={styles.subtitle}>Rede Municipal de Saúde — Jundiaí</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {([
          { key: 'hoje', label: 'Hoje' },
          { key: 'semana', label: 'Semana' },
          { key: 'mes', label: 'Mês' },
        ] as { key: Periodo; label: string }[]).map(p => (
          <Pressable
            key={p.key}
            style={[styles.periodBtn, periodo === p.key && styles.periodBtnActive]}
            onPress={() => setPeriodo(p.key)}
          >
            <Text style={[styles.periodText, periodo === p.key && styles.periodTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <FadeIn visible>
          <View style={styles.statsRow}>
            {[
              { label: 'Atendimentos', value: data.atendimentos, icon: 'medkit', color: SUS_GREEN },
              { label: 'Cidadãos', value: data.cidadaos, icon: 'people', color: '#3B82F6' },
              { label: 'Profissionais', value: data.profissionais, icon: 'person', color: '#8B5CF6' },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
                <Text style={[styles.statValue, { color: s.color }]}>{s.value.toLocaleString()}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* Por Unidade */}
        <FadeIn visible delay={100}>
          <Text style={styles.sectionTitle}>Produção por Unidade</Text>
          {data.porUnidade.map((u, i) => (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{u.nome}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${(u.total / maxUnidade) * 100}%`, backgroundColor: SUS_GREEN }]} />
              </View>
              <Text style={styles.barValue}>{u.total}</Text>
            </View>
          ))}
        </FadeIn>

        {/* Por Profissional */}
        <FadeIn visible delay={200}>
          <Text style={styles.sectionTitle}>Produção por Profissional</Text>
          {data.porProfissional.map((p, i) => (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{p.nome}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${(p.total / maxProf) * 100}%`, backgroundColor: '#3B82F6' }]} />
              </View>
              <Text style={styles.barValue}>{p.total}</Text>
            </View>
          ))}
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
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  periodBtnActive: { backgroundColor: SUS_GREEN, borderColor: SUS_GREEN },
  periodText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  periodTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  statValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 120, fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  barContainer: { flex: 1, height: 22, backgroundColor: colors.surfaceSecondary, borderRadius: 6, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 6 },
  barValue: { width: 40, fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right' },
});
