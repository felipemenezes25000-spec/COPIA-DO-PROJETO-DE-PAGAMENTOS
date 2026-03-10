import { test, expect } from '@playwright/test';
import { checkA11y } from './a11y-helper';

const VALID_UUID = '12345678-1234-1234-1234-123456789012';

test.describe('Página Verify', () => {
  test('deve carregar página de verificação com ID válido', async ({ page }) => {
    await page.goto(`/verify/${VALID_UUID}`);
    await expect(page.getByLabel(/Código de 6 dígitos/i)).toBeVisible();
  });

  test('deve exibir campo de código de 6 dígitos', async ({ page }) => {
    await page.goto(`/verify/${VALID_UUID}`);
    const input = page.getByPlaceholder('000000');
    await expect(input).toHaveAttribute('maxlength', '6');
  });

  test('deve exibir mensagem de erro para ID inválido', async ({ page }) => {
    await page.goto('/verify/id-invalido');
    await expect(page.getByText(/ID inválido na URL/i)).toBeVisible();
  });

  test('deve passar em verificação de acessibilidade', async ({ page }) => {
    await page.goto(`/verify/${VALID_UUID}`);
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });
});
