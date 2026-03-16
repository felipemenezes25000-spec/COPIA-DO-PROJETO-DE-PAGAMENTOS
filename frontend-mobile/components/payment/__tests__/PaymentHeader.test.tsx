import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaymentHeader } from '../PaymentHeader';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { primary: '#2CB1FF', text: '#0f172a', surface: '#fff' },
  }),
}));
jest.mock('../../../lib/theme', () => ({
  spacing: { md: 16, sm: 8 },
  shadows: { card: {} },
}));

describe('PaymentHeader', () => {
  it('renderiza título padrão Pagamento', () => {
    const { getByText } = render(<PaymentHeader onBack={() => {}} />);
    expect(getByText('Pagamento')).toBeTruthy();
  });

  it('renderiza título customizado', () => {
    const { getByText } = render(
      <PaymentHeader title="Confirmar pagamento" onBack={() => {}} />
    );
    expect(getByText('Confirmar pagamento')).toBeTruthy();
  });

  it('dispara onBack ao pressionar voltar', () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(<PaymentHeader onBack={onBack} />);
    fireEvent.press(getByLabelText('Voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
