import React from 'react';
import { render } from '@testing-library/react-native';
import { StepIndicator } from '../StepIndicator';

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#2CB1FF',
      white: '#fff',
      surfaceSecondary: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#e2e8f0',
      borderLight: '#f1f5f9',
      text: '#0f172a',
      textSecondary: '#64748b',
    },
    typography: { fontFamily: { bold: 'System', semibold: 'System', regular: 'System' } },
  }),
}));

jest.mock('../../../lib/ui/tokens', () => ({
  uiTokens: { spacing: { md: 16, sm: 8 }, screenPaddingHorizontal: 20 },
}));

describe('StepIndicator', () => {
  it('renderiza passo atual e total', () => {
    const { getByLabelText } = render(<StepIndicator current={1} total={3} />);
    expect(getByLabelText('Passo 1 de 3')).toBeTruthy();
  });

  it('renderiza números dos passos', () => {
    const { getByText } = render(<StepIndicator current={2} total={3} />);
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('renderiza labels quando passados', () => {
    const { getByText } = render(
      <StepIndicator current={1} total={2} labels={['Dados', 'Confirmação']} />
    );
    expect(getByText('Dados')).toBeTruthy();
    expect(getByText('Confirmação')).toBeTruthy();
  });

  it('aceita showConnectorLines false', () => {
    const { getByLabelText } = render(
      <StepIndicator current={1} total={2} showConnectorLines={false} />
    );
    expect(getByLabelText('Passo 1 de 2')).toBeTruthy();
  });

  it('limita current entre 1 e total', () => {
    const { getByLabelText } = render(<StepIndicator current={10} total={3} />);
    expect(getByLabelText('Passo 3 de 3')).toBeTruthy();
  });
});
