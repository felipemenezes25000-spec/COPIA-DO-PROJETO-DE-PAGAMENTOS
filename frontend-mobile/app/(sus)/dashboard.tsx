import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListBottomPadding } from '../../lib/ui/responsive';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import type { DesignColors } from '../../lib/designSystem';
import { layout as dsLayout, shadows as dsShadows, borderRadius as dsBorderRadius } from '../../lib/designSystem';
import { StatsCard } from '../../components/StatsCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { AppCard } from '../../components/ui/AppCard';
import { AppEmptyState } from '../../components/ui';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { FadeIn } from '../../components/ui/FadeIn';
import { LargeActionCard } from '../../components/ui/LargeActionCard';
import { TopSummaryStrip } from '../../components/ui/TopSummaryStrip';
import { haptics } from '../../lib/haptics';
import { motionTokens } from '../../lib/ui/motion';
import { getGreeting } from '../../lib/utils/format';

const SUS_GREEN = '#16A34A';
const SUS_GREEN_LIGHT = '#22C55E';
const SUS_GRADIENT: [string, string, string] = ['#047857', '#059669', '#16A34A'];

const MOCK_QUEUE = [
  { id: '1', name: 'Maria da Silva', time: '08:00', status: 'aguardando', type: 'Consulta', prof: 'Dr. Carlos Mendes' },
  { id: '2', name: 'João Santos', time: '08:20', status: 'agendado', type: 'Retorno', prof: 'Dr. Carlos Mendes' },
  { id: '3', name: 'Ana Costa', time: '08:40', status: 'agendado', type: 'Pré-natal', prof: 'Dra. Fernanda Lima' },
  { id: '4', name: 'Pedro Lima', time: '09:00', status: 'agendado', type: 'Hipertensão', prof: 'Dr. Carlos Mendes' },
  { id: '5', name: 'Francisca Oliveira', time: '09:20', status: 'agendado', type: 'Diabetes', prof: 'Dra. Fernanda Lima' },
];

export default function SusDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listPadding = useListBottomPadding();
  const { user } = useAuth();
  const { colors, shadows, borderRadius: radius } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.selection();
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const summaryItems = [
    { label: 'Atendimentos', value: '47' },
    { label: 'Na Fila', value: '12' },
    { label: 'Agendados', value: '85' },
    { label: 'Pendente e-SUS', value: '23' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={SUS_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name ?? 'Profissional'}</Text>
            <View style={styles.ubsBadge}>
              <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.ubsName}>UBS Central — Jundiaí</Text>
            </View>
          </View>
          <Pressable style={styles.headerAvatar} onPress={() => haptics.selection()} accessibilityLabel="Perfil">
            <Ionicons name="medical" size={26} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: listPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SUS_GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ paddingHorizontal: dsLayout.screenPaddingHorizontal, paddingTop: 16 }}>
            <SkeletonList count={1} />
          </View>
        ) : (
          <FadeIn visible delay={0}>
            <TopSummaryStrip items={summaryItems} />
          </FadeIn>
        )}

        {loading ? (
          <View style={{ paddingHorizontal: dsLayout.screenPaddingHorizontal, paddingTop: 8 }}>
            <SkeletonList count={2} />
          </View>
        ) : (
          <FadeIn visible delay={100}>
            <View style={styles.statsGrid}>
              <StatsCard icon="medkit" label="Hoje" value={47} iconColor={SUS_GREEN} />
              <StatsCard icon="people" label="Na Fila" value={12} iconColor="#F59E0B" />
              <StatsCard icon="calendar" label="Agendados" value={85} iconColor="#3B82F6" />
              <StatsCard icon="cloud-upload" label="Exportar" value={23} iconColor="#8B5CF6" />
            </View>
          </FadeIn>
        )}

        <FadeIn visible delay={200}>
          <SectionHeader title="Ações rápidas" />
          <View style={styles.actionsRow}>
            <LargeActionCard
              icon={<Ionicons name="person-add" size={24} color={SUS_GREEN} />}
              title="Novo Cidadão"
              description="Cadastrar paciente SUS"
              variant="primary"
              onPress={() => { haptics.selection(); router.push('/(sus)/cidadaos'); }}
            />
            <LargeActionCard
              icon={<Ionicons name="calendar" size={24} color="#3B82F6" />}
              title="Agenda"
              description="Fila do dia"
              variant="exam"
              onPress={() => { haptics.selection(); router.push('/(sus)/agenda'); }}
            />
          </View>
          <View style={[styles.actionsRow, { marginTop: 8 }]}>
            <LargeActionCard
              icon={<Ionicons name="medkit" size={24} color={SUS_GREEN} />}
              title="Atendimento"
              description="Registrar consulta SOAP"
              variant="consultation"
              onPress={() => { haptics.selection(); router.push('/(sus)/atendimento'); }}
            />
            <LargeActionCard
              icon={<Ionicons name="cloud-upload" size={24} color="#8B5CF6" />}
              title="Exportar"
              description="Enviar ao e-SUS"
              variant="primary"
              onPress={() => { haptics.selection(); router.push('/(sus)/exportacao'); }}
            />
          </View>
        </FadeIn>

        <FadeIn visible delay={300}>
          <SectionHeader
            title="Fila de atendimento"
            count={MOCK_QUEUE.length}
            actionText="Ver agenda"
            onAction={() => { haptics.selection(); router.push('/(sus)/agenda'); }}
          />

          {loading ? (
            <View style={{ paddingHorizontal: dsLayout.screenPaddingHorizontal }}>
              <SkeletonList count={3} />
            </View>
          ) : MOCK_QUEUE.length === 0 ? (
            <AppEmptyState icon="calendar-outline" title="Nenhum paciente na fila" subtitle="A agenda do dia está vazia" />
          ) : (
            MOCK_QUEUE.map((item, i) => (
              <FadeIn visible key={item.id} delay={350 + i * 60}>
                <AppCard
                  variant="outlined"
                  onPress={() => { haptics.selection(); router.push('/(sus)/atendimento'); }}
                  style={{ marginBottom: 8, marginHorizontal: dsLayout.screenPaddingHorizontal }}
                >
                  <View style={styles.queueRow}>
                    <View style={styles.queueLeft}>
                      <View style={[styles.queueTimeBadge, {
                        backgroundColor: item.status === 'aguardando' ? '#FEF3C7' : colors.primarySoft,
                      }]}>
                        <Text style={[styles.queueTime, {
                          color: item.status === 'aguardando' ? '#92400E' : SUS_GREEN,
                        }]}>{item.time}</Text>
                      </View>
                      <View style={styles.queueInfo}>
                        <Text style={styles.queueName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.queueProf} numberOfLines={1}>{item.prof}</Text>
                      </View>
                    </View>
                    <View style={styles.queueRight}>
                      <View style={[styles.queueTypeBadge, { backgroundColor: SUS_GREEN + '12' }]}>
                        <Text style={[styles.queueTypeText, { color: SUS_GREEN }]}>{item.type}</Text>
                      </View>
                      <View style={[styles.queueStatusDot, {
                        backgroundColor: item.status === 'aguardando' ? '#F59E0B' : '#94A3B8',
                      }]} />
                    </View>
                  </View>
                </AppCard>
              </FadeIn>
            ))
          )}
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: DesignColors, radius: { card: number }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: dsLayout.screenPaddingHorizontal,
      paddingTop: 20, paddingBottom: 28,
      borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerLeft: { flex: 1 },
    greeting: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500', letterSpacing: 0.2 },
    userName: { fontSize: 24, color: '#fff', fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
    ubsBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 8, marginTop: 10, alignSelf: 'flex-start',
    },
    ubsName: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    headerAvatar: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    },
    scroll: { flex: 1 },
    statsGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10,
      paddingHorizontal: dsLayout.screenPaddingHorizontal, marginTop: 8,
    },
    actionsRow: {
      flexDirection: 'row', gap: 10,
      paddingHorizontal: dsLayout.screenPaddingHorizontal,
    },
    queueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    queueLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    queueTimeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 52, alignItems: 'center' },
    queueTime: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
    queueInfo: { flex: 1 },
    queueName: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.1 },
    queueProf: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    queueRight: { alignItems: 'flex-end', gap: 6 },
    queueTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    queueTypeText: { fontSize: 11, fontWeight: '700' },
    queueStatusDot: { width: 8, height: 8, borderRadius: 4 },
  });
