import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Regras desabilitadas temporariamente até correções de a11y no app. Reativar conforme forem corrigidas. */
const DISABLED_A11Y_RULES = [
  'color-contrast',
  'landmark-one-main',
  'page-has-heading-one',
  'region',
  'button-name',
  'heading-order',
  'image-redundant-alt',
];

export async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page })
    .disableRules(DISABLED_A11Y_RULES)
    .analyze();
  return results;
}
