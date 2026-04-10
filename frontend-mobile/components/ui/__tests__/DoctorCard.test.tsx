import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { DoctorCard } from '../DoctorCard';

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { surface: '#fff', borderLight: '#e2e8f0' },
    borderRadius: { card: 16 },
    shadows: { card: {} },
  }),
}));

describe('DoctorCard', () => {
  it('renderiza children', () => {
    const { getByText } = render(
      <DoctorCard>
        <Text>Conteúdo do card</Text>
      </DoctorCard>
    );
    expect(getByText('Conteúdo do card')).toBeTruthy();
  });

  it('dispara onPress quando clicado', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <DoctorCard onPress={onPress} accessibilityLabel="Abrir card">
        <Text>Conteúdo</Text>
      </DoctorCard>
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('aceita noPadding sem quebrar', () => {
    const { getByText } = render(
      <DoctorCard noPadding>
        <Text>Sem padding</Text>
      </DoctorCard>
    );
    expect(getByText('Sem padding')).toBeTruthy();
  });
});
