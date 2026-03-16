import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StatsCard } from '../StatsCard';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { primary: '#2CB1FF', text: '#0f172a', textMuted: '#64748b', borderLight: '#e2e8f0' },
    shadows: { card: {}, cardLg: {} },
  }),
}));

describe('StatsCard', () => {
  it('renderiza label e value', () => {
    const { getByText } = render(
      <StatsCard icon="document-text" label="Pedidos" value={5} />
    );
    expect(getByText('5')).toBeTruthy();
    expect(getByText('Pedidos')).toBeTruthy();
  });

  it('dispara onPress quando clicado', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <StatsCard icon="document-text" label="Pedidos" value={3} onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('não é botão quando onPress ausente', () => {
    const { queryByRole } = render(
      <StatsCard icon="document-text" label="Total" value="10" />
    );
    expect(queryByRole('button')).toBeNull();
  });
});
