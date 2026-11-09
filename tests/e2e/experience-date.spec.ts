import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Los_Angeles', locale: 'en-US' });

test('an experience date is optional and can be saved, edited, published and cleared', async ({ page, isMobile }) => {
  const login = await page.request.post('/api/auth/login', { data: { email: 'admin@supperclub.local', password: 'changeme123' } });
  expect(login.ok()).toBeTruthy();
  const { products } = await (await page.request.get('/api/products')).json();
  const response = await page.request.post('/api/posts', { data: {
    title: `Experience date ${randomUUID().slice(0, 8)}`,
    productId: products[0].id, status: 'DRAFT', personalRating: 8,
  } });
  expect(response.status()).toBe(201);
  const { post } = await response.json();
  expect(post.experiencedOn).toBeNull();

  await page.goto(`/posts/${post.id}/edit`);
  const date = page.getByLabel('Experience date', { exact: true });
  await expect(date).toHaveValue('');
  await expect(date).not.toHaveAttribute('required');
  await expect(date).toHaveAttribute('type', 'date');
  if (isMobile) await date.tap();
  else await date.click();
  await date.fill('2026-11-09');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  const saved = await (await page.request.get(`/api/posts/${post.id}`)).json();
  expect(saved.post.experiencedOn).toBe('2026-11-09');

  await page.goto(`/posts/${post.id}/edit`);
  await expect(date).toHaveValue('2026-11-09');
  await date.fill('2024-02-29');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto(`/posts/${post.slug}`);
  await expect(page.getByText('Experienced: Feb 29, 2024', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Reviewed:/)).toBeVisible();
  await expect(page.locator('time[datetime="2024-02-29"]')).toHaveText('Feb 29, 2024');
  const published = await (await page.request.get(`/api/posts/${post.id}`)).json();

  await page.goto(`/posts/${post.id}/edit`);
  await date.fill('');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  const cleared = await (await page.request.get(`/api/posts/${post.id}`)).json();
  expect(cleared.post.experiencedOn).toBeNull();
  expect(cleared.post.publishedAt).toBe(published.post.publishedAt);
  await page.context().clearCookies();
  await page.goto(`/posts/${post.slug}`);
  await expect(page.getByText(/^Reviewed:/)).toBeVisible();
  await expect(page.getByText(/^Experienced:/)).toHaveCount(0);
});

test('title and date align on desktop and remain usable on narrow mobile screens', async ({ page }) => {
  await page.request.post('/api/auth/login', { data: { email: 'admin@supperclub.local', password: 'changeme123' } });
  await page.goto('/posts/new');
  const title = page.getByRole('textbox', { name: 'Title', exact: true });
  const date = page.getByLabel('Experience date', { exact: true });
  await expect(date).toBeVisible();
  const titleBox = (await title.boundingBox())!;
  const dateBox = (await date.boundingBox())!;
  if (page.viewportSize()!.width > 576) {
    expect(Math.abs(titleBox.y - dateBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(titleBox.height - dateBox.height)).toBeLessThanOrEqual(1);
    expect(titleBox.width).toBeGreaterThan(dateBox.width * 2);
    expect(dateBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
  } else {
    expect(dateBox.y).toBeGreaterThan(titleBox.y + titleBox.height);
    expect(Math.abs(titleBox.width - dateBox.width)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(date).toHaveCSS('font-size', '16px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const header = (await page.getByRole('banner').boundingBox())!;
  const addReview = (await page.getByRole('link', { name: 'Add review', exact: true }).boundingBox())!;
  const account = (await page.getByRole('button', { name: 'Account menu' }).boundingBox())!;
  expect(addReview.y + addReview.height).toBeLessThanOrEqual(header.y + header.height);
  expect(account.y + account.height).toBeLessThanOrEqual(header.y + header.height);
  expect((await page.getByRole('heading', { name: 'New review' }).boundingBox())!.y).toBeGreaterThanOrEqual(header.y + header.height);
});
