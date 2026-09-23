import { expect, test } from '@playwright/test';

test('home page loads and shows the site title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Supper Club').first()).toBeVisible();
});
