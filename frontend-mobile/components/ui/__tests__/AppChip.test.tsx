import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppChip } from '../AppChip';

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#2CB1FF',
      primarySoft: '#E3F4FF',
      surface: '#fff',
      border: '#e2e8f0',
      textSecondary: '#64748b',
    },
  }),
}));

describe('AppChip', () => {
  it('renderiza o label', () => {
    const { getByText } = render(
      <AppChip label="Todos" onPress={() => {}} />
    );
    expect(getByText('Todos')).toBeTruthy();
  });

  it('dispara onPress ao pressionar', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AppChip label="Filtro" onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('expõe accessibilityLabel para filtro', () => {
    const { getByLabelText } = render(
      <AppChip label="Ativos" onPress={() => {}} />
    );
    expect(getByLabelText('Filtrar por Ativos')).toBeTruthy();
  });

  it('aceita selected sem quebrar', () => {
    const { getByText } = render(
      <AppChip label="Selecionado" selected onPress={() => {}} />
    );
    expect(getByText('Selecionado')).toBeTruthy();
  });

  it('não dispara onPress quando disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AppChip label="Desabilitado" disabled onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
