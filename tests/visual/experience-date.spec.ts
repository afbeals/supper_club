import { expect, test } from '@playwright/test';

test('review date layouts: empty and filled form, dated and undated published review', async ({ page }) => {
  const response = await page.request.post('/api/auth/login', { data: { email: 'admin@supperclub.local', password: 'changeme123' } });
  expect(response.ok()).toBeTruthy();
  const { posts } = await (await page.request.get('/api/posts')).json();
  const dated = posts.find((post: { slug: string }) => post.slug === 'experience-date-preview');
  expect(dated).toBeTruthy();

  await page.goto('/posts/new');
  await expect(page.getByLabel('Experience date', { exact: true })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Product', exact: true })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('form-without-date.png');

  await page.goto(`/posts/${dated.id}/edit`);
  await expect(page.getByLabel('Experience date', { exact: true })).toHaveValue('2026-10-31');
  await expect(page.getByRole('combobox', { name: 'Product', exact: true })).toHaveValue('Corner Bistro (Restaurant)');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('form-with-date.png');

  await page.goto('/posts/experience-date-preview');
  await expect(page.getByText('Reviewed: Nov 9, 2026', { exact: true })).toBeVisible();
  await expect(page.getByText('Experienced: Oct 31, 2026', { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('review-with-date.png');

  await page.goto('/posts/experience-date-preview-undated');
  await expect(page.getByText('Reviewed: Nov 9, 2026', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Experienced:/)).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('review-without-date.png');
});
