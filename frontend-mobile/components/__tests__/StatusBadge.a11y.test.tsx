import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge, StatusBadgeVariant, StatusBadgeByRequest } from '../StatusBadge';

jest.mock('../../lib/ui/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      info: '#3B82F6',
      infoLight: '#DBEAFE',
      success: '#10B981',
      successLight: '#D1FAE5',
      warning: '#F59E0B',
      warningLight: '#FEF3C7',
      textMuted: '#6B7280',
      surfaceSecondary: '#F3F4F6',
    },
  }),
}));

jest.mock('../../lib/domain/getRequestUiState', () => ({
  getRequestUiState: (input: { status?: string | null } | { status?: string | null; requestType?: string | null }) => {
    const status = input?.status ?? '';
    const map: Record<string, { label: string; colorKey: string }> = {
      submitted: { label: 'Enviado', colorKey: 'waiting' },
      in_review: { label: 'Em análise', colorKey: 'action' },
      signed: { label: 'Assinado', colorKey: 'historical' },
      delivered: { label: 'Entregue', colorKey: 'historical' },
      cancelled: { label: 'Cancelado', colorKey: 'historical' },
    };
    return map[status] ?? { label: 'Desconhecido', colorKey: 'historical' };
  },
  getUIStatusColorsForTheme: (c: { info?: string; infoLight?: string; success?: string; successLight?: string; warning?: string; warningLight?: string; textMuted?: string; surfaceSecondary?: string }) => ({
    action: { color: c.info ?? '#3B82F6', bg: c.infoLight ?? '#DBEAFE' },
    success: { color: c.success ?? '#10B981', bg: c.successLight ?? '#D1FAE5' },
    waiting: { color: c.warning ?? '#F59E0B', bg: c.warningLight ?? '#FEF3C7' },
    historical: { color: c.textMuted ?? '#6B7280', bg: c.surfaceSecondary ?? '#F3F4F6' },
  }),
  UI_STATUS_COLORS: {
    action: { color: '#3B82F6', bg: '#DBEAFE' },
    success: { color: '#10B981', bg: '#D1FAE5' },
    waiting: { color: '#F59E0B', bg: '#FEF3C7' },
    historical: { color: '#6B7280', bg: '#F3F4F6' },
  },
}));

describe('StatusBadge – Acessibilidade', () => {
  it('tem accessible=true', () => {
    const { getByLabelText } = render(<StatusBadge status="submitted" />);
    expect(getByLabelText('Status: Enviado')).toBeTruthy();
  });

  it('accessibilityLabel contém o rótulo legível do status', () => {
    const { getByLabelText } = render(<StatusBadge status="in_review" />);
    expect(getByLabelText('Status: Em análise')).toBeTruthy();
  });

  it('StatusBadgeVariant tem accessibilityLabel correto', () => {
    const { getByLabelText } = render(
      <StatusBadgeVariant variant="success" label="Concluído" />
    );
    expect(getByLabelText('Status: Concluído')).toBeTruthy();
  });

  it('StatusBadgeByRequest exibe label do status', () => {
    const mockRequest = { status: 'signed' } as any;
    const { getByLabelText } = render(<StatusBadgeByRequest request={mockRequest} />);
    expect(getByLabelText('Status: Assinado')).toBeTruthy();
  });

  it('status desconhecido mostra fallback sem quebrar', () => {
    expect(() => render(<StatusBadge status="status_invalido" />)).not.toThrow();
  });
});
