/**
 * FocusModeCTA — Botão primário de entrada no Modo Foco unificado.
 *
 * Resolve o problema de UX reportado pelo usuário em 2026-04-09: antes,
 * a única forma de entrar no modo foco era clicando em um CategoryCard
 * (Receitas / Exames), o que forçava o médico a escolher um tipo de
 * antemão e criava três filas separadas — cada uma com seu próprio
 * contador, seu próprio "zero" e seu próprio fluxo.
 *
 * Visão do usuário: "Na minha visão, o ideal seria que tudo estivesse
 * junto, em um único fluxo, com apenas um contador consolidado."
 *
 * Solução: este CTA leva direto a `/review-queue` (sem `?type=`), o que
 * faz o modo foco entrar em modo **unificado** — todas as solicitações
 * pendentes (receita + exame + consulta) na mesma fila sequencial, com
 * um único contador consolidado. Os CategoryCards continuam funcionando
 * como filtros/deep links para quem quer revisar só um tipo.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../../../lib/haptics';

interface FocusModeCTAProps {
  /** Total consolidado de solicitações pendentes (todos os tipos). */
  totalCount: number;
  onPress: () => void;
}

function FocusModeCTA_Fn({ totalCount, onPress }: FocusModeCTAProps) {
  const isEmpty = totalCount === 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      disabled={isEmpty}
      accessibilityRole="button"
      accessibilityLabel={
        isEmpty
          ? 'Nenhuma solicitação para revisar'
          : `Entrar no modo foco e revisar ${totalCount} solicitações`
      }
      style={styles.shadowWrap}
    >
      <LinearGradient
        colors={
          isEmpty
            ? ['#E2E8F0', '#CBD5E1']
            : ['#0EA5E9', '#0284C7']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}
      >
        {/* Ícone decorativo rotacionado no canto */}
        <View style={styles.decorIcon} pointerEvents="none">
          <Ionicons name="eye" size={100} color="rgba(255,255,255,0.18)" />
        </View>

        <View style={styles.content}>
          <View style={styles.textCol}>
            <Text style={styles.eyebrow}>
              {isEmpty ? 'TUDO EM DIA' : 'FLUXO ÚNICO'}
            </Text>
            <Text style={styles.title}>
              {isEmpty ? 'Nada a revisar' : 'Entrar no modo foco'}
            </Text>
            <Text style={styles.subtitle}>
              {isEmpty
                ? 'Aguarde novas solicitações'
                : `Revise ${totalCount} ${
                    totalCount === 1 ? 'solicitação' : 'solicitações'
                  } sem interrupções`}
            </Text>
          </View>

          {!isEmpty && (
            <View style={styles.arrowBubble}>
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 22,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
    elevation: 8,
    marginBottom: 18,
  },
  tile: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 24,
    minHeight: 116,
  },
  decorIcon: {
    position: 'absolute',
    right: -10,
    bottom: -18,
    transform: [{ rotate: '-12deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 18,
  },
  arrowBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});

export const FocusModeCTA = React.memo(FocusModeCTA_Fn);
