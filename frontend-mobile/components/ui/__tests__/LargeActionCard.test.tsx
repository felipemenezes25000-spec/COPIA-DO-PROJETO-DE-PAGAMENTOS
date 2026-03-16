import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { LargeActionCard } from '../LargeActionCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#2CB1FF',
      primarySoft: '#E3F4FF',
      text: '#0f172a',
      textSecondary: '#64748b',
      info: '#0ea5e9',
      infoLight: '#e0f2fe',
      success: '#22c55e',
      successLight: '#dcfce7',
    },
    radius: { card: 12 },
    shadows: { card: {} },
  }),
}));

describe('LargeActionCard', () => {
  it('renderiza título e descrição', () => {
    const { getByText } = render(
      <LargeActionCard
        icon={<Text>Icon</Text>}
        title="Exames"
        description="Solicitar exames"
        onPress={() => {}}
      />
    );
    expect(getByText('Exames')).toBeTruthy();
    expect(getByText('Solicitar exames')).toBeTruthy();
  });

  it('dispara onPress ao pressionar', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <LargeActionCard
        icon={<Text>I</Text>}
        title="Consulta"
        description="Iniciar consulta"
        onPress={onPress}
      />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('usa accessibilityLabel quando passado', () => {
    const { getByLabelText } = render(
      <LargeActionCard
        icon={<Text>I</Text>}
        title="Título"
        description="Desc"
        accessibilityLabel="Abrir exames"
        onPress={() => {}}
      />
    );
    expect(getByLabelText('Abrir exames')).toBeTruthy();
  });

  it('renderiza variantes sem erro', () => {
    const variants = ['primary', 'exam', 'consultation'] as const;
    variants.forEach((variant) => {
      expect(() =>
        render(
          <LargeActionCard
            icon={<Text>I</Text>}
            title="T"
            description="D"
            variant={variant}
            onPress={() => {}}
          />
        )
      ).not.toThrow();
    });
  });
});
