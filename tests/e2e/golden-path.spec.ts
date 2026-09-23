import { expect, test, type Page } from '@playwright/test';

// Unique per run so repeated executions against the same seeded dev.db never collide.
const RUN_ID = Date.now();
const PRODUCT_TYPE_NAME = `E2E Gadget ${RUN_ID}`;
const PRODUCT_NAME = `Widget ${RUN_ID}`;
const FIRST_REVIEW_TITLE = `${PRODUCT_NAME} is solid`;
const SECOND_REVIEW_TITLE = `${PRODUCT_NAME}, a second opinion`;
const COMMENT_TEXT = `Nice write-up ${RUN_ID}!`;

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

async function logout(page: Page) {
  // The account menu is in the one shared header now, present on every page —
  // no need to navigate anywhere first.
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.waitForURL('/login');
}

// One serial describe block: each step depends on state the previous step created
// (product type -> product -> two reviews -> compare -> comment -> anonymous view).
test.describe.serial('golden path: admin config through publish, compare, and comments', () => {
  let firstReviewUrl = '';

  test('admin creates a product type with two criteria', async ({ page }) => {
    await login(page, 'admin@supperclub.local', 'changeme123');
    await page.goto('/admin/product-types');

    await page.getByRole('button', { name: 'Add product type' }).click();
    await page.getByLabel('Name').fill(PRODUCT_TYPE_NAME);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(PRODUCT_TYPE_NAME)).toBeVisible();

    await page.getByText(PRODUCT_TYPE_NAME).click();
    for (const criterionName of ['Speed', 'Build quality']) {
      await page.getByRole('button', { name: '+ Add criterion' }).click();
      await page.getByLabel('Name').fill(criterionName);
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.getByRole('cell', { name: criterionName })).toBeVisible();
    }

    await logout(page);
  });

  test('admin creates a product under the new type', async ({ page }) => {
    await login(page, 'admin@supperclub.local', 'changeme123');
    await page.goto('/admin/products');

    await page.getByRole('button', { name: 'Add product' }).click();
    await page.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: PRODUCT_TYPE_NAME }).click();
    await page.getByLabel('Name').fill(PRODUCT_NAME);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: PRODUCT_NAME })).toBeVisible();

    await logout(page);
  });

  test('admin writes, rates, and publishes the first review', async ({ page }) => {
    await login(page, 'admin@supperclub.local', 'changeme123');
    await page.goto('/posts/new');

    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(FIRST_REVIEW_TITLE);
    await page.getByRole('combobox', { name: 'Product' }).click();
    await page.getByRole('option', { name: new RegExp(PRODUCT_NAME) }).click();

    // Rating sliders default to the criterion's midpoint once a product is
    // selected — the golden path doesn't need to drag them to prove ratings
    // round-trip, just that a review with the default ratings publishes and
    // renders correctly.
    await page.getByRole('button', { name: 'Add pro' }).click();
    await page.getByPlaceholder('e.g. Fast and reliable').fill('Great value');

    await page.locator('[contenteditable="true"]').click();
    await page.keyboard.type('Does exactly what it says on the box.');

    await page.getByRole('button', { name: 'Publish' }).click();
    await page.waitForURL('/dashboard');

    await logout(page);
  });

  test('published review is publicly visible from the reviews index, and links through to its product hub', async ({
    page,
  }) => {
    await page.goto('/reviews');
    await page.getByRole('link', { name: new RegExp(FIRST_REVIEW_TITLE) }).click();
    await expect(page.getByText('Does exactly what it says on the box.')).toBeVisible();
    await expect(page.getByText('Great value')).toBeVisible();
    firstReviewUrl = page.url();

    // There's no standalone /products index (removed in favor of Writers) — a
    // review's own product link is how anyone reaches the product hub now.
    await page.getByRole('link', { name: new RegExp(PRODUCT_NAME) }).click();
    await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();
  });

  test('a different writer publishes a second review of the same product', async ({ page }) => {
    await login(page, 'writer@supperclub.local', 'changeme123');
    await page.goto('/posts/new');

    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(SECOND_REVIEW_TITLE);
    await page.getByRole('combobox', { name: 'Product' }).click();
    await page.getByRole('option', { name: new RegExp(PRODUCT_NAME) }).click();
    await page.locator('[contenteditable="true"]').click();
    await page.keyboard.type('Fine, but overpriced for what it does.');

    await page.getByRole('button', { name: 'Publish' }).click();
    await page.waitForURL('/dashboard');

    await logout(page);
  });

  test('product hub aggregates both reviews and the compare page shows them side by side', async ({ page }) => {
    await page.goto(firstReviewUrl);
    await page.getByRole('link', { name: new RegExp(PRODUCT_NAME) }).click();

    await expect(page.getByRole('link', { name: new RegExp(FIRST_REVIEW_TITLE) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(SECOND_REVIEW_TITLE) })).toBeVisible();
    await expect(page.getByText(/Aggregate scores \(2 reviews\)/)).toBeVisible();

    // Compare is now a per-card selection flow, not a static link: picking
    // one review shows the "ready" panel, picking a second navigates to the
    // compare page with both.
    await page.getByRole('button', { name: new RegExp(`Compare ${FIRST_REVIEW_TITLE}`) }).click();
    await expect(page.getByText('1 review ready')).toBeVisible();

    await page.getByRole('button', { name: new RegExp(`Compare ${SECOND_REVIEW_TITLE}`) }).click();
    await page.waitForURL(/\/compare(\?|$)/);
    await expect(page.getByText('Admin')).toBeVisible();
    await expect(page.getByText('Sample Writer')).toBeVisible();
    await expect(page.getByText(/\d+\/100/).first()).toBeVisible();
  });

  test('a signed-in user can comment on a review', async ({ page }) => {
    await login(page, 'writer@supperclub.local', 'changeme123');
    await page.goto(firstReviewUrl);

    await page.getByPlaceholder('Add a comment').fill(COMMENT_TEXT);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/comments') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Post' }).click(),
    ]);
    await expect(page.getByText(COMMENT_TEXT)).toBeVisible();

    await logout(page);
  });

  test('an anonymous visitor gets read-only access', async ({ page, request }) => {
    await page.goto(firstReviewUrl);
    await expect(page.getByText(COMMENT_TEXT)).toBeVisible();
    // "Sign in" itself also appears in the header nav for anonymous visitors —
    // this text is specific to the comment box's read-only prompt.
    await expect(page.getByText('to leave a comment.')).toBeVisible();
    await expect(page.getByPlaceholder('Add a comment')).toHaveCount(0);

    const response = await request.post('/api/comments', {
      data: { postId: 1, parentId: null, bodyText: 'anonymous write attempt' },
    });
    expect(response.status()).toBe(401);
  });
});
