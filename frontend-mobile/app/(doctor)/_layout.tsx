/**
 * Doctor Layout — Stack raiz.
 *
 * Motivação: as telas "detalhe" do médico (review-queue/Modo Foco, hub-*,
 * patients, ai-rejected, transcription-test) estavam registradas como
 * `Tabs.Screen` com `href: null` dentro de um `<Tabs>`. Isso causava bugs
 * de navegação — notadamente em review-queue, onde qualquer re-render
 * soltava o foco da aba escondida e devolvia o usuário para a aba ativa
 * anterior ("volta para a lista de pedidos" após clicar Aprovar).
 *
 * Agora: este arquivo é um Stack. O grupo aninhado `(tabs)` hospeda as
 * 5 abas visíveis (dashboard, requests, consultations, notifications,
 * profile). As telas detalhe ficam como Stack.Screen neste nível, sendo
 * empurradas por cima do Tabs via `router.push('/(doctor)/review-queue')`
 * etc. — a sintaxe de navegação segue idêntica porque grupos
 * `(parens)` são invisíveis nas URLs do Expo Router.
 *
 * Auth, permissões e tema ficam aqui (cross-cutting para todas as rotas
 * do médico). O Tabs interno só cuida do chrome das abas.
 */

import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../../lib/ui/useAppTheme';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { useRequirePermissions } from '../../hooks/useRequirePermissions';

export default function DoctorLayout() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useAppTheme({ role: 'doctor' });
  useRequirePermissions('/(doctor)/dashboard');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
      return;
    }
    if (!loading && user?.role === 'patient') {
      router.replace('/(patient)/home');
      return;
    }
    // Bloqueia médico com cadastro incompleto (ex.: novo usuário Google)
    if (!loading && user && user.role === 'doctor' && !user.profileComplete) {
      router.replace('/(auth)/complete-doctor');
    }
  }, [loading, user, router]);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="review-queue" options={{ title: 'Modo Foco' }} />
        <Stack.Screen name="patients" options={{ title: 'Pacientes' }} />
        <Stack.Screen name="ai-rejected" options={{ title: 'Rejeitados pela IA' }} />
        <Stack.Screen name="transcription-test" options={{ title: 'Teste Transcrição' }} />
      </Stack>
    </ErrorBoundary>
  );
}
