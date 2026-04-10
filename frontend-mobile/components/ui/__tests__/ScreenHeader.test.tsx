import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ScreenHeader } from '../ScreenHeader';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { primary: '#2CB1FF', text: '#0f172a', surfaceSecondary: '#f1f5f9' },
  }),
}));

jest.mock('../../../lib/ui/tokens', () => ({ uiTokens: { screenPaddingHorizontal: 20 } }));
jest.mock('../../../lib/haptics', () => ({ haptics: { selection: jest.fn() } }));

describe('ScreenHeader', () => {
  it('renderiza título', () => {
    const { getByText } = render(<ScreenHeader title="Configurações" />);
    expect(getByText('Configurações')).toBeTruthy();
  });

  it('botão voltar tem acessibilidade', () => {
    const { getByLabelText } = render(<ScreenHeader title="Tela" />);
    expect(getByLabelText('Voltar')).toBeTruthy();
  });

  it('dispara onBack quando passado', () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(
      <ScreenHeader title="Tela" onBack={onBack} />
    );
    fireEvent.press(getByLabelText('Voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renderiza slot right quando passado', () => {
    const { getByText } = render(
      <ScreenHeader title="Tela" right={<Text>Salvar</Text>} />
    );
    expect(getByText('Salvar')).toBeTruthy();
  });
});
