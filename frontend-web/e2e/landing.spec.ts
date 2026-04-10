import { test, expect } from '@playwright/test';
import { checkA11y } from './a11y-helper';

test.describe('Landing page', () => {
  test('deve carregar a página inicial', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RenoveJá/);
  });

  test('deve exibir header e seções principais', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('deve ter navegação para área de problema', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Problema/i })).toBeVisible();
  });

  test('deve ter link para cookies', async ({ page }) => {
    await page.goto('/');
    const cookiesLink = page.getByRole('link', { name: /Cookies|Política de cookies/i });
    await expect(cookiesLink.first()).toBeVisible();
  });

  test('deve navegar para /cookies ao clicar em Cookies', async ({ page }) => {
    await page.goto('/');
    const cookiesLink = page.getByRole('link', { name: /Cookies|Política de cookies/i }).first();
    await cookiesLink.click();
    await expect(page).toHaveURL(/\/cookies/);
  });

  test('deve passar em verificação de acessibilidade', async ({ page }) => {
    await page.goto('/');
    const results = await checkA11y(page);
    expect(results.violations).toEqual([]);
  });
});
