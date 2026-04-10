import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RequestTypeDonut, type RequestTypeCounts } from './RequestTypeDonut';

interface QueueCardProps {
  /** Contagem por tipo (somente itens pendentes na fila). */
  counts: RequestTypeCounts;
  /**
   * @deprecated Não há mais navegação a partir do QueueCard — as categorias
   * logo abaixo levam o médico ao destino correto. A prop é mantida para
   * compatibilidade binária com chamadores antigos e pode ser removida
   * após a próxima onda de refactor.
   */
  onPress?: () => void;
}

/**
 * Header do dashboard — bloco com o total agregado de solicitações à
 * esquerda e o donut por tipo (Receitas/Exames/Tele) à direita.
 *
 * Histórico: o donut havia sido removido em a5a5215 quando estava à
 * ESQUERDA do número, porque competia com o número grande pelo destaque
 * visual e duplicava a informação dos CategoryCard logo abaixo. Voltou
 * agora à DIREITA, atuando como complemento visual (proporção entre
 * tipos) e não como concorrente do contador. Ainda não é TouchableOpacity:
 * navegação acontece pelos CategoryCard logo abaixo.
 *
 * Termo: **solicitações**, não "pacientes" — a fila agrega receitas,
 * exames e teleconsulta. "Pacientes" induzia médicos a interpretar o
 * número como teleconsultas.
 */
function QueueCard_Fn({ counts }: QueueCardProps) {
  const total = counts.prescription + counts.exam + counts.consultation;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        total > 0
          ? `${total} solicitações aguardando: ${counts.prescription} receitas, ${counts.exam} exames, ${counts.consultation} teleconsultas`
          : 'Nenhuma solicitação aguardando atendimento'
      }
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.eyebrow}>Hoje você tem</Text>
          <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>
            {total}
          </Text>
          <Text style={styles.word}>
            {total === 1 ? 'solicitação' : 'solicitações'}
          </Text>
          <Text style={styles.foot}>
            {total > 0 ? 'aguardando atendimento' : 'no momento'}
          </Text>
        </View>
        <RequestTypeDonut counts={counts} size={116} showLegend />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 22,
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  bigNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -2.2,
    lineHeight: 56,
    marginTop: 4,
  },
  word: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginTop: 6,
  },
  foot: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
  },
});

export const QueueCard = React.memo(QueueCard_Fn);
