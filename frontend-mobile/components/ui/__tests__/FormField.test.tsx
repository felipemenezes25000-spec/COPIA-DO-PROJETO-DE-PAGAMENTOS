import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { FormField } from '../FormField';

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      text: '#0f172a',
      textMuted: '#64748b',
      error: '#dc2626',
    },
    typography: {
      fontFamily: { semibold: 'System', medium: 'System', regular: 'System' },
    },
  }),
}));

jest.mock('../AppInput', () => ({
  AppInput: ({ style, ...props }: any) => {
    const { TextInput } = require('react-native');
    return <TextInput {...props} testID="app-input" style={style} />;
  },
}));

describe('FormField', () => {
  it('renderiza label', () => {
    const { getByText } = render(
      <FormField label="E-mail" value="" onChangeText={() => {}} />
    );
    expect(getByText('E-mail')).toBeTruthy();
  });

  it('renderiza asterisco quando required', () => {
    const { getByText } = render(
      <FormField label="Senha" required value="" onChangeText={() => {}} />
    );
    expect(getByText(/Senha/)).toBeTruthy();
    expect(getByText(/\*/)).toBeTruthy();
  });

  it('renderiza mensagem de erro', () => {
    const { getByText } = render(
      <FormField
        label="Campo"
        error="Campo obrigatório"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(getByText('Campo obrigatório')).toBeTruthy();
  });

  it('renderiza helperText quando não há erro', () => {
    const { getByText } = render(
      <FormField
        label="Campo"
        helperText="Texto de ajuda"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(getByText('Texto de ajuda')).toBeTruthy();
  });

  it('renderiza children em vez de AppInput quando passado', () => {
    const { getByText } = render(
      <FormField label="Custom">
        <Text>Custom input</Text>
      </FormField>
    );
    expect(getByText('Custom input')).toBeTruthy();
  });
});
