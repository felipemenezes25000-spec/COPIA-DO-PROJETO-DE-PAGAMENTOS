import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { FadeIn } from '../../components/ui/FadeIn';
import { AGENDA_STATUS_LABELS, AGENDA_STATUS_COLORS } from '../../types/sus';
import type { AgendaUbsDto, AgendaStatus } from '../../types/sus';

const SUS_GREEN = '#16A34A';

const MOCK_AGENDA: AgendaUbsDto[] = [
  { id: '1', cidadaoId: '1', cidadaoNome: 'Maria da Silva', profissionalId: 'p1', profissionalNome: 'Dr. Carlos Mendes', unidadeSaudeId: 'ubs-1', dataHora: '2026-03-13T08:00:00', status: 'aguardando', tipoAtendimento: 'Consulta', observacoes: null, checkInAt: '2026-03-13T07:50:00', chamadaAt: null, inicioAt: null, fimAt: null, createdAt: '2026-03-12' },
  { id: '2', cidadaoId: '2', cidadaoNome: 'João Santos', profissionalId: 'p1', profissionalNome: 'Dr. Carlos Mendes', unidadeSaudeId: 'ubs-1', dataHora: '2026-03-13T08:20:00', status: 'agendado', tipoAtendimento: 'Retorno', observacoes: 'Hipertensão', checkInAt: null, chamadaAt: null, inicioAt: null, fimAt: null, createdAt: '2026-03-12' },
  { id: '3', cidadaoId: '3', cidadaoNome: 'Ana Costa', profissionalId: 'p2', profissionalNome: 'Dra. Fernanda Lima', unidadeSaudeId: 'ubs-1', dataHora: '2026-03-13T08:40:00', status: 'agendado', tipoAtendimento: 'Pré-natal', observacoes: null, checkInAt: null, chamadaAt: null, inicioAt: null, fimAt: null, createdAt: '2026-03-12' },
  { id: '4', cidadaoId: '4', cidadaoNome: 'Pedro Lima', profissionalId: 'p1', profissionalNome: 'Dr. Carlos Mendes', unidadeSaudeId: 'ubs-1', dataHora: '2026-03-13T09:00:00', status: 'agendado', tipoAtendimento: 'Consulta', observacoes: 'Diabetes acompanhamento', checkInAt: null, chamadaAt: null, inicioAt: null, fimAt: null, createdAt: '2026-03-12' },
  { id: '5', cidadaoId: '5', cidadaoNome: 'Francisca Oliveira', profissionalId: 'p2', profissionalNome: 'Dra. Fernanda Lima', unidadeSaudeId: 'ubs-1', dataHora: '2026-03-13T09:20:00', status: 'agendado', tipoAtendimento: 'Consulta', observacoes: null, checkInAt: null, chamadaAt: null, inicioAt: null, fimAt: null, createdAt: '2026-03-12' },
  { id: '6', cidadaoId: '1', cidadaoNome: 'Carlos Ferreira', profissionalId: 'p1', profissionalNome: 'Dr. Carlos Mendes', unidadeSaudeId: 'ubs-1', dataHora: '2026-03-13T09:40:00', status: 'finalizado', tipoAtendimento: 'Retorno', observacoes: null, checkInAt: '2026-03-13T07:30:00', chamadaAt: '2026-03-13T07:35:00', inicioAt: '2026-03-13T07:36:00', fimAt: '2026-03-13T07:55:00', createdAt: '2026-03-12' },
];

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [agenda, setAgenda] = useState(MOCK_AGENDA);

  const handleAction = useCallback((id: string, action: string) => {
    setAgenda(prev => prev.map(a => {
      if (a.id !== id) return a;
      switch (action) {
        case 'checkin': return { ...a, status: 'aguardando' as AgendaStatus, checkInAt: new Date().toISOString() };
        case 'chamar': return { ...a, status: 'chamado' as AgendaStatus, chamadaAt: new Date().toISOString() };
        case 'iniciar': return { ...a, status: 'em_atendimento' as AgendaStatus, inicioAt: new Date().toISOString() };
        case 'finalizar': return { ...a, status: 'finalizado' as AgendaStatus, fimAt: new Date().toISOString() };
        default: return a;
      }
    }));
  }, []);

  const getNextAction = (status: AgendaStatus): { label: string; action: string; icon: string } | null => {
    switch (status) {
      case 'agendado': return { label: 'Check-in', action: 'checkin', icon: 'log-in-outline' };
      case 'aguardando': return { label: 'Chamar', action: 'chamar', icon: 'megaphone-outline' };
      case 'chamado': return { label: 'Iniciar', action: 'iniciar', icon: 'play-outline' };
      case 'em_atendimento': return { label: 'Finalizar', action: 'finalizar', icon: 'checkmark-circle-outline' };
      default: return null;
    }
  };

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const counts = useMemo(() => ({
    total: agenda.length,
    aguardando: agenda.filter(a => a.status === 'aguardando').length,
    atendimento: agenda.filter(a => a.status === 'em_atendimento').length,
    finalizados: agenda.filter(a => a.status === 'finalizado').length,
  }), [agenda]);

  const renderItem = useCallback(({ item }: { item: AgendaUbsDto }) => {
    const nextAction = getNextAction(item.status);
    const statusColor = AGENDA_STATUS_COLORS[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={[styles.cardTime, { color: statusColor }]}>{formatTime(item.dataHora)}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <View style={styles.cardCenter}>
            <Text style={styles.cardName}>{item.cidadaoNome}</Text>
            <Text style={styles.cardProfissional}>{item.profissionalNome}</Text>
            <View style={styles.cardTags}>
              <View style={[styles.typeBadge, { backgroundColor: statusColor + '15' }]}>
                <Text style={[styles.typeBadgeText, { color: statusColor }]}>{item.tipoAtendimento}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{AGENDA_STATUS_LABELS[item.status]}</Text>
              </View>
            </View>
            {item.observacoes && <Text style={styles.cardObs}>{item.observacoes}</Text>}
          </View>
        </View>
        {nextAction && (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: statusColor }]}
            onPress={() => handleAction(item.id, nextAction.action)}
          >
            <Ionicons name={nextAction.icon as any} size={16} color="#fff" />
            <Text style={styles.actionBtnText}>{nextAction.label}</Text>
          </Pressable>
        )}
      </View>
    );
  }, [styles, handleAction]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Agenda do Dia</Text>
        <Text style={styles.date}>13/03/2026 — UBS Central</Text>
      </View>

      {/* Summary strip */}
      <FadeIn visible delay={100}>
        <View style={styles.summary}>
          {[
            { label: 'Total', value: counts.total, color: '#64748B' },
            { label: 'Na Fila', value: counts.aguardando, color: '#F59E0B' },
            { label: 'Atendendo', value: counts.atendimento, color: '#0EA5E9' },
            { label: 'Finalizados', value: counts.finalizados, color: SUS_GREEN },
          ].map((s, i) => (
            <View key={i} style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      <FlatList
        data={agenda}
        keyExtractor={item => item.id}
        getItemLayout={(_: unknown, i: number) => ({ length: 80, offset: 80 * i, index: i })}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const makeStyles = (colors: DesignColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  date: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  summary: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.borderLight },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardLeft: { alignItems: 'center', gap: 4 },
  cardTime: { fontSize: 15, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardCenter: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardProfissional: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  cardTags: { flexDirection: 'row', gap: 6, marginTop: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  cardObs: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
