import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SectionHeader } from '../SectionHeader';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { primary: '#2CB1FF', primarySoft: '#E3F4FF', text: '#0f172a' },
    typography: { fontFamily: { bold: 'System', semibold: 'System' } },
  }),
}));

describe('SectionHeader', () => {
  it('renderiza título', () => {
    const { getByText } = render(<SectionHeader title="Dados pessoais" />);
    expect(getByText('Dados pessoais')).toBeTruthy();
  });

  it('renderiza actionText e dispara onAction', () => {
    const onAction = jest.fn();
    const { getByLabelText } = render(
      <SectionHeader title="Seção" actionText="Ver todos" onAction={onAction} />
    );
    fireEvent.press(getByLabelText('Ver todos'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renderiza count badge quando count > 0', () => {
    const { getByText } = render(
      <SectionHeader title="Itens" count={3} />
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('não renderiza count quando count é 0', () => {
    const { queryByText } = render(
      <SectionHeader title="Itens" count={0} />
    );
    expect(queryByText('0')).toBeNull();
  });

  it('aceita variant form e default', () => {
    expect(() => render(<SectionHeader title="T" variant="default" />)).not.toThrow();
    expect(() => render(<SectionHeader title="T" variant="form" icon="person" />)).not.toThrow();
  });
});
