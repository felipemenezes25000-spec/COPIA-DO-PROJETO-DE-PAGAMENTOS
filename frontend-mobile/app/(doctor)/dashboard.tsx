import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../contexts/AuthContext';
import { useRequestsEvents } from '../../contexts/RequestsEventsContext';
import { theme, colors, spacing, shadows } from '../../lib/theme';
import { getRequests, getActiveCertificate } from '../../lib/api';
import { RequestResponseDto } from '../../types/database';
import { cacheRequest } from '../doctor-request/[id]';

import { AppEmptyState } from '../../components/ui';
import { AppButton } from '../../components/ui/AppButton';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { FadeIn } from '../../components/ui/FadeIn';

import {
  countPendentes,
  getPendingForPanel,
  getRequestUiState,
} from '../../lib/domain/getRequestUiState';
import { haptics } from '../../lib/haptics';
import { showToast } from '../../components/ui/Toast';

// -----------------------------------------------------------------------------
// Doctor Queue Item Component (Inline for specific dashboard use)
// -----------------------------------------------------------------------------
const QueueItem = ({ request, onPress }: { request: RequestResponseDto; onPress: () => void }) => {
  const { label, colorKey } = getRequestUiState(request);
  const statusColor = theme.colors.status[colorKey === 'waiting' ? 'warning' : 'info'] || theme.colors.primary.main;
  
  // Risco (Mock logic if not present)
  const isHighRisk = request.aiRiskLevel === 'high';
  const riskColor = isHighRisk ? theme.colors.status.error : theme.colors.text.tertiary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.queueItem}
      accessibilityRole="button"
      accessibilityLabel={`Atender ${request.patientName}`}
    >
      <View style={[styles.queueLeftStrip, { backgroundColor: isHighRisk ? theme.colors.status.error : theme.colors.primary.main }]} />
      
      <View style={styles.queueContent}>
        <View style={styles.queueHeader}>
          <Text style={styles.queueType}>{request.requestType === 'prescription' ? 'Receita' : 'Exame/Consulta'}</Text>
          {isHighRisk && (
            <View style={styles.riskBadge}>
              <Ionicons name="alert-circle" size={12} color={theme.colors.status.error} />
              <Text style={styles.riskText}>Risco Alto</Text>
            </View>
          )}
        </View>

        <Text style={styles.queuePatient} numberOfLines={1}>{request.patientName || 'Paciente não identificado'}</Text>
        
        <View style={styles.queueFooter}>
          <Text style={styles.queueTime}>Há {Math.floor(Math.random() * 50) + 2} min</Text>
          <View style={styles.statusDot} />
          <Text style={[styles.queueStatus, { color: statusColor }]}>{label}</Text>
        </View>
      </View>

      <View style={styles.queueAction}>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

export default function DoctorDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [queue, setQueue] = useState<RequestResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);

  const loadData = useCallback(async (withFeedback = false) => {
    try {
      const [cert, res] = await Promise.allSettled([
        getActiveCertificate(),
        getRequests({ page: 1, pageSize: 50 }),
      ]);
      setHasCertificate(cert.status === 'fulfilled' && !!cert.value);
      const items = res.status === 'fulfilled' ? (res.value?.items ?? []) : [];
      setQueue(items);
      if (withFeedback) showToast({ message: 'Painel atualizado', type: 'success' });
    } catch (e) {
      console.error(e);
      if (withFeedback) showToast({ message: 'Erro ao atualizar', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const { subscribe, isConnected } = useRequestsEvents();

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (!isConnected) {
        const interval = setInterval(loadData, 10000); // Polling fallback
        return () => clearInterval(interval);
      }
    }, [loadData, isConnected])
  );

  useEffect(() => {
    return subscribe(() => loadData());
  }, [subscribe, loadData]);

  const onRefresh = () => {
    haptics.light();
    setRefreshing(true);
    loadData(true);
  };

  const pendingList = useMemo(() => getPendingForPanel(queue, 10), [queue]);
  const pendentesCount = countPendentes(queue);
  const firstName = user?.name?.split(' ')[0] || 'Doutor(a)';

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.headerSkeleton, { paddingTop: insets.top + 20 }]} />
        <View style={{ padding: 20 }}>
          <SkeletonList count={3} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary.contrast} />}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <LinearGradient
          colors={theme.colors.gradients.doctorHeader}
          style={[styles.header, { paddingTop: insets.top + 24 }]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Olá, Dr(a). {firstName}</Text>
              <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(doctor)/profile')}>
               {/* Avatar placeholder or image */}
               <Text style={styles.profileInitials}>{firstName[0]}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* STATS SUMMARY (Clean) */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendentesCount}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            <View style={styles.dividerVertical} />
             <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: theme.colors.status.success }]}>
                {queue.filter(q => q.status === 'approved' || q.status === 'signed').length}
              </Text>
              <Text style={styles.statLabel}>Hoje</Text>
            </View>
          </View>

          {/* ACTION NEEDED: Certificate */}
          {hasCertificate === false && (
            <FadeIn visible>
              <TouchableOpacity style={styles.alertBox} onPress={() => router.push('/certificate/upload')}>
                <Ionicons name="shield-checkmark" size={24} color={theme.colors.status.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Certificado Digital pendente</Text>
                  <Text style={styles.alertDesc}>Configure para assinar receitas.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.status.warning} />
              </TouchableOpacity>
            </FadeIn>
          )}

          {/* QUEUE LIST */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fila de Atendimento</Text>
            <TouchableOpacity onPress={() => router.push('/(doctor)/requests')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {pendingList.length > 0 ? (
            pendingList.map(req => (
              <QueueItem 
                key={req.id} 
                request={req} 
                onPress={() => {
                  haptics.selection();
                  cacheRequest(req);
                  router.push(`/doctor-request/${req.id}`);
                }} 
              />
            ))
          ) : (
            <AppEmptyState
              icon="checkmark-done-circle" 
              title="Fila limpa!" 
              subtitle="Não há pacientes aguardando no momento."
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.subtle,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerSkeleton: {
    height: 160,
    backgroundColor: theme.colors.primary.main,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary.contrast,
  },
  date: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInitials: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 18,
  },
  
  // Body overlaps Header
  body: {
    marginTop: -30,
    paddingHorizontal: 20,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.paper,
    borderRadius: 20,
    padding: 20,
    ...theme.shadows.md, // Clean shadow
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary.main,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  dividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border.light,
  },

  // Alerts
  alertBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.status.warningBg,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.status.warning,
  },
  alertDesc: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.main,
  },

  // Queue Item - Clean Design
  queueItem: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...theme.shadows.sm, // Subtle elevation
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  queueLeftStrip: {
    width: 6,
    height: '100%',
  },
  queueContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 12, // Compensate strip
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  queueType: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    color: theme.colors.text.tertiary,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.status.errorBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    gap: 4,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.status.error,
  },
  queuePatient: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueTime: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text.disabled,
    marginHorizontal: 8,
  },
  queueStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  queueAction: {
    justifyContent: 'center',
    paddingRight: 16,
  },
});
