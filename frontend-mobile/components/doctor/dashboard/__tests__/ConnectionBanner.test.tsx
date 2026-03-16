import React from 'react';
import { render } from '@testing-library/react-native';
import { ConnectionBanner } from '../ConnectionBanner';

const mockResponsive = {
  heights: { banner: 48 },
  typography: { bannerText: 14 },
  paddingHorizontal: 20,
};

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('ConnectionBanner', () => {
  it('renderiza mensagem de reconexão', () => {
    const { getByText } = render(
      <ConnectionBanner responsive={mockResponsive as any} />
    );
    expect(getByText(/Sem conexão/)).toBeTruthy();
    expect(getByText(/Tentando reconectar/)).toBeTruthy();
  });
});
