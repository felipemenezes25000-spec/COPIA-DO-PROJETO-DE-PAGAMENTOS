import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { clinicalSoftTokens } from './clinicalSoftTokens';

const { colors } = clinicalSoftTokens;

export interface RequestTypeCounts {
  prescription: number;
  exam: number;
  consultation: number;
}

interface RequestTypeDonutProps {
  counts: RequestTypeCounts;
  /** Diâmetro externo do SVG. Default: 116 (mockup aprovado). */
  size?: number;
  /** Mostrar legenda à direita do donut. Default: true. */
  showLegend?: boolean;
}

const RADIUS = 45;
const STROKE = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 282.74

/**
 * Donut SVG com 3 arcos representando a proporção entre tipos de solicitação.
 *
 * Por que SVG ao invés de Views: 3 arcos parciais com bordas precisas via
 * `strokeDasharray` é trivial em SVG e quase impossível com `borderRadius` puro.
 *
 * Cores reutilizam `clinicalSoftTokens.colors.statReceitas/Pendentes/Consultas`
 * para manter alinhamento com o design system do dashboard.
 */
function RequestTypeDonut_Fn({
  counts,
  size = 116,
  showLegend = true,
}: RequestTypeDonutProps) {
  const total = counts.prescription + counts.exam + counts.consultation;
  const center = size / 2;

  // Vazio: trilho cinza + label "Nenhuma".
  if (total === 0) {
    return (
      <View style={styles.col}>
        <View style={[styles.svgWrap, { width: size, height: size }]}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Circle
              cx={center}
              cy={center}
              r={RADIUS}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={STROKE}
            />
          </Svg>
          <View style={styles.centerLabel} pointerEvents="none">
            <Text style={styles.centerNumberMuted}>0</Text>
          </View>
        </View>
        {showLegend ? (
          <Text style={styles.emptyLegend}>Nenhuma{'\n'}solicitação</Text>
        ) : null}
      </View>
    );
  }

  const slices = [
    { value: counts.prescription, color: colors.statReceitas, label: 'Receitas' },
    { value: counts.exam, color: colors.statPendentes, label: 'Exames' },
    { value: counts.consultation, color: colors.statConsultas, label: 'Tele' },
  ];

  let cursor = 0;
  const arcs = slices.map((s, i) => {
    const length = (s.value / total) * CIRCUMFERENCE;
    const offset = -cursor;
    cursor += length;
    return (
      <Circle
        key={i}
        cx={center}
        cy={center}
        r={RADIUS}
        fill="none"
        stroke={s.color}
        strokeWidth={STROKE}
        strokeDasharray={`${length} ${CIRCUMFERENCE}`}
        strokeDashoffset={offset}
        strokeLinecap="butt"
      />
    );
  });

  return (
    <View style={styles.col}>
      <View style={[styles.svgWrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={STROKE}
          />
          {/* Rotaciona -90° para começar no topo (12h) */}
          <G transform={`rotate(-90 ${center} ${center})`}>{arcs}</G>
        </Svg>
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          {slices.map((s) => (
            <View key={s.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.legendName} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={styles.legendCount}>{s.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    flexShrink: 0,
    alignItems: 'center',
    gap: 10,
  },
  svgWrap: {
    position: 'relative',
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNumberMuted: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94A3B8',
  },
  legend: {
    gap: 4,
    alignSelf: 'stretch',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    minWidth: 50,
  },
  legendCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyLegend: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export const RequestTypeDonut = React.memo(RequestTypeDonut_Fn);
