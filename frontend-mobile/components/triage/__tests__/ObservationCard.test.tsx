import React from 'react';
import { render } from '@testing-library/react-native';
import { ObservationCard } from '../ObservationCard';

jest.setTimeout(15_000);

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      surfaceTertiary: '#f8fafc',
      primary: '#2CB1FF',
      primarySoft: '#E3F4FF',
      primaryDark: '#0c4a6e',
      accentSoft: '#f0f9ff',
      accent: '#0ea5e9',
      successLight: '#dcfce7',
      success: '#22c55e',
    },
  }),
}));

jest.mock('../../../lib/designSystem', () => ({
  shadows: { sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 } },
  borderRadius: { card: 12 },
}));

describe('ObservationCard', () => {
  it('retorna null quando text está vazio', () => {
    const { toJSON } = render(<ObservationCard mode="auto" text="" />);
    expect(toJSON()).toBeNull();
  });

  it('retorna null quando text é só espaços', () => {
    const { toJSON } = render(<ObservationCard mode="auto" text="   " />);
    expect(toJSON()).toBeNull();
  });

  it('renderiza texto no modo auto', () => {
    const { getByText } = render(
      <ObservationCard mode="auto" text="Observação da plataforma" />
    );
    expect(getByText('Observação da plataforma')).toBeTruthy();
    expect(getByText('Plataforma')).toBeTruthy();
  });

  it('renderiza texto no modo conduct com nome do médico', () => {
    const { getByText } = render(
      <ObservationCard mode="conduct" text="Conduta do médico" doctorName="Dr. Silva" />
    );
    expect(getByText('Conduta do médico')).toBeTruthy();
    expect(getByText(/Dr\. Silva/)).toBeTruthy();
  });
});
