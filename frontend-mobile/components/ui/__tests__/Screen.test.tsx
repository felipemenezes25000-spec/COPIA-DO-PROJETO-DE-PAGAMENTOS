import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Screen } from '../Screen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('../../../contexts/ColorSchemeContext', () => ({
  useColorSchemeContext: () => ({ colorScheme: 'light' }),
}));

jest.mock('../../../lib/designSystem', () => ({
  createTokens: () => ({
    colors: { background: '#ffffff' },
    gradients: {
      auth: ['#2CB1FF', '#0ea5e9'],
      doctorHeader: ['#1e3a5f', '#0f172a'],
    },
  }),
}));

describe('Screen', () => {
  it('renderiza children', () => {
    const { getByText } = render(
      <Screen>
        <Text>Conteúdo da tela</Text>
      </Screen>
    );
    expect(getByText('Conteúdo da tela')).toBeTruthy();
  });

  it('renderiza com scroll=false', () => {
    const { getByText } = render(
      <Screen scroll={false}>
        <Text>Sem scroll</Text>
      </Screen>
    );
    expect(getByText('Sem scroll')).toBeTruthy();
  });

  it('aceita variantes default e gradient', () => {
    expect(() =>
      render(
        <Screen variant="default">
          <Text>Default</Text>
        </Screen>
      )
    ).not.toThrow();
    expect(() =>
      render(
        <Screen variant="gradient">
          <Text>Gradient</Text>
        </Screen>
      )
    ).not.toThrow();
  });
});
