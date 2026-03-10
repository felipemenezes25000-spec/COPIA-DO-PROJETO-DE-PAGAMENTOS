import { test, expect } from '@playwright/test';
import { checkA11y } from './a11y-helper';

test.describe('Admin Login', () => {
  test('deve carregar página de login do admin', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: /Painel Administrativo/i })).toBeVisible();
  });

  test('deve exibir campos de email e senha', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Senha/i)).toBeVisible();
  });

  test('deve exibir botão Entrar', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel(/Email/i).fill('teste@invalido.com');
    await page.getByLabel(/Senha/i).fill('senhaerrada');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page.getByText(/Credenciais inválidas|inválidas/i)).toBeVisible({ timeout: 5000 });
  });

  test('deve passar em verificação de acessibilidade', async ({ page }) => {
    await page.goto('/admin/login');
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });
});
