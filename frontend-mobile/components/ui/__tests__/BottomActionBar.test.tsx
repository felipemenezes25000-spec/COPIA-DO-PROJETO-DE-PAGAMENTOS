import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { BottomActionBar } from '../BottomActionBar';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { surface: '#fff', borderLight: '#e2e8f0' },
    spacing: { md: 16 },
    shadows: { sm: {} },
  }),
}));

describe('BottomActionBar', () => {
  it('renderiza children', () => {
    const { getByText } = render(
      <BottomActionBar>
        <Text>Botão principal</Text>
      </BottomActionBar>
    );
    expect(getByText('Botão principal')).toBeTruthy();
  });

  it('renderiza com keyboardAware false sem quebrar', () => {
    const { getByText } = render(
      <BottomActionBar keyboardAware={false}>
        <Text>Conteúdo</Text>
      </BottomActionBar>
    );
    expect(getByText('Conteúdo')).toBeTruthy();
  });
});
