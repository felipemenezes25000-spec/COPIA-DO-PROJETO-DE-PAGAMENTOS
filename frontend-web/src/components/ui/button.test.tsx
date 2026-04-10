import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('deve renderizar com texto', () => {
    render(<Button>Clique aqui</Button>);
    expect(
      screen.getByRole('button', { name: /Clique aqui/i })
    ).toBeInTheDocument();
  });

  it('deve chamar onClick ao clicar', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve estar desabilitado quando disabled', () => {
    render(<Button disabled>Desabilitado</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
