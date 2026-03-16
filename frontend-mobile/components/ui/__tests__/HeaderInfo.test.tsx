import React from 'react';
import { render } from '@testing-library/react-native';
import { HeaderInfo } from '../HeaderInfo';

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: { text: '#0f172a', textSecondary: '#64748b' },
  }),
}));

describe('HeaderInfo', () => {
  it('renderiza título e subtítulo', () => {
    const { getByText } = render(
      <HeaderInfo title="Olá" subtitle="Bem-vindo ao app" />
    );
    expect(getByText('Olá')).toBeTruthy();
    expect(getByText('Bem-vindo ao app')).toBeTruthy();
  });

  it('tem role header e accessibilityLabel composto', () => {
    const { getByLabelText } = render(
      <HeaderInfo title="Título" subtitle="Subtítulo" />
    );
    expect(getByLabelText('Título. Subtítulo')).toBeTruthy();
  });

  it('usa accessibilityLabel customizado quando passado', () => {
    const { getByLabelText } = render(
      <HeaderInfo
        title="A"
        subtitle="B"
        accessibilityLabel="Bloco principal"
      />
    );
    expect(getByLabelText('Bloco principal')).toBeTruthy();
  });
});
