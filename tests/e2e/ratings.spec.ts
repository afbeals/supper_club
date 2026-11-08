import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';

async function post(request: APIRequestContext, url: string, data: unknown) {
  const response = await request.post(url, { data });
  expect(response.ok(), `${url}: ${await response.text()}`).toBeTruthy();
  return response.json();
}
async function admin(page: Page) {
  await post(page.request, '/api/auth/login', { email: 'admin@supperclub.local', password: 'changeme123' });
}
async function track(slider: Locator) {
  await slider.scrollIntoViewIfNeeded();
  return (await slider.locator('xpath=ancestor::*[contains(@class,"mantine-Slider-root")]').boundingBox())!;
}

test('legacy missing criteria respond to keyboard, mouse and mobile touch and persist with personal rating', async ({ page, isMobile, browserName }, info) => {
  await admin(page);
  const name = `Input regression ${info.project.name}`;
  const { productType } = await post(page.request, '/api/admin/product-types', { name });
  const { product } = await post(page.request, '/api/products', { productTypeId: productType.id, name });
  const { post: draft } = await post(page.request, '/api/posts', { status: 'DRAFT', title: name, productId: product.id, ratings: [] });
  const criterionResponse = await post(page.request, `/api/admin/product-types/${productType.id}/criteria`, { name: 'Quality', minValue: 1, maxValue: 10, higherIsBetter: true, weight: 1 });
  expect(criterionResponse).toBeTruthy();
  await page.goto(`/posts/${draft.id}/edit`);
  const quality = page.getByRole('slider', { name: 'Quality', exact: true });
  const personal = page.getByRole('slider', { name: 'Personal rating', exact: true });
  await expect(quality).toHaveAttribute('aria-valuenow', '1');
  await quality.focus();
  await page.keyboard.press('End');
  await expect(quality).toHaveAttribute('aria-valuenow', '10');
  const box = await track(quality);
  if (isMobile) {
    await page.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height / 2);
    await expect(quality).not.toHaveAttribute('aria-valuenow', '10');
    if (browserName === 'chromium') {
      const session = await page.context().newCDPSession(page);
      const y = box.y + box.height / 2;
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * 0.4, y }] });
      for (const fraction of [0.5, 0.6, 0.7, 0.8]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * fraction, y }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(quality).toHaveAttribute('aria-valuenow', '8');
      await session.detach();
    }
  } else {
    await quality.hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(quality).toHaveAttribute('aria-valuenow', '4');
  }
  const criterionValue = await quality.getAttribute('aria-valuenow');
  await personal.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  await expect(personal).toHaveAttribute('aria-valuenow', '9');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto(`/posts/${draft.id}/edit`);
  await expect(quality).toHaveAttribute('aria-valuenow', criterionValue!);
  await expect(personal).toHaveAttribute('aria-valuenow', '9');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto(`/posts/${draft.slug}`);
  await expect(page.getByText('Personal rating', { exact: true })).toBeVisible();
  await expect(page.getByText('9/10', { exact: true })).toBeVisible();
});

test('newly created products initialize criteria and product types can be renamed without losing associations', async ({ page }, info) => {
  await admin(page);
  const name = `Editable type ${info.project.name}`;
  const { productType } = await post(page.request, '/api/admin/product-types', { name });
  await post(page.request, `/api/admin/product-types/${productType.id}/criteria`, { name: 'Value', minValue: 1, maxValue: 10, higherIsBetter: true, weight: 1 });
  await page.goto('/posts/new');
  await expect(page.getByRole('slider', { name: 'Personal rating' })).toBeVisible();
  await page.getByRole('button', { name: 'Add new product' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name, exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(`New ${name}`);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Value', exact: true })).toHaveAttribute('aria-valuenow', '6');
  await page.goto('/admin/product-types');
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Edit product type', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Name', exact: true }).fill(`${name} renamed`);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: `${name} renamed`, exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Value', exact: true })).toBeVisible();
  const { products } = await (await page.request.get('/api/products')).json();
  const created = products.find((p: { name: string }) => p.name === `New ${name}`);
  expect(created.productType.id).toBe(productType.id);
  expect(created.productType.name).toBe(`${name} renamed`);
});

test('public pages and crawler directives discourage indexing and crawling', async ({ page, request }) => {
  const response = await page.goto('/reviews');
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex.*nofollow/);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('User-Agent: *');
  expect(await robots.text()).toContain('Disallow: /');
  expect(robots.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive');
});
