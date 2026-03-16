import React from 'react';
import { render } from '@testing-library/react-native';
import { Loading } from '../Loading';

jest.mock('../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { primary: '#2CB1FF' },
    spacing: { lg: 24, sm: 8 },
  }),
}));

describe('Loading', () => {
  it('renderiza sem mensagem', () => {
    const { toJSON } = render(<Loading />);
    expect(toJSON()).toBeTruthy();
  });

  it('renderiza com mensagem', () => {
    const { getByText } = render(<Loading message="Carregando..." />);
    expect(getByText('Carregando...')).toBeTruthy();
  });

  it('aceita size small e large', () => {
    expect(() => render(<Loading size="small" />)).not.toThrow();
    expect(() => render(<Loading size="large" />)).not.toThrow();
  });

  it('aceita color customizado', () => {
    const { toJSON } = render(<Loading color="#ff0000" />);
    expect(toJSON()).toBeTruthy();
  });
});
