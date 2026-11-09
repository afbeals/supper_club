# Testing

Not a pineapple project — no test-generation skill routing here. Tests are written directly with
`vitest` (unit) and `@playwright/test` (E2E).

## Unit & component tests (vitest)

```bash
yarn test        # watch mode
yarn test:ci      # single run, what CI runs
```

100 tests across 20 files: 63 pure-function/library-level (no DB, no network, no rendering) plus
37 React Testing Library component tests (`happy-dom` environment).

### Logic tests

| File | Covers |
| --- | --- |
| `src/lib/__tests__/scoring.test.ts` | `normalizeRating` (clamping, `higherIsBetter` inversion, degenerate min===max), `overallScore` (weighted mean, empty/zero-weight edge cases) |
| `src/lib/__tests__/slug.test.ts` | `uniqueSlug` |
| `src/lib/__tests__/sanitize.test.ts` | `sanitizePostHtml`'s tag/attribute allowlist |
| `src/lib/__tests__/format.test.ts` | `formatDate`; `relativeTime`'s thresholds (just now / Xm / Xh / Xd / falls back to `formatDate`) using `vi.useFakeTimers()` |
| `src/lib/__tests__/uploads.test.ts` | `resolveUploadPath` (path-traversal rejection), `saveUploadedImage` (rejects non-images regardless of claimed type, rejects oversized buffers, resizes + caps a real in-memory `sharp`-generated fixture) |
| `src/lib/__tests__/apiGuards.test.ts` | `requireUser`/`requireAdmin`, mocking `getSession` from `../auth`: no session → 401, non-admin → 403 (via `requireAdmin`), admin → passes through |
| `src/lib/validation/__tests__/posts.test.ts` | `createPostSchema`'s required-field and range validation |
| `src/lib/validation/__tests__/admin.test.ts` | `createProductTypeSchema`, `createCriterionSchema`, `createProductSchema`, `createUserSchema`, `updateUserSchema` |
| `src/lib/validation/__tests__/auth.test.ts` | `loginSchema` (email lowercasing/trim, required password) |
| `src/lib/validation/__tests__/comments.test.ts` | `createCommentSchema` (`parentId` defaults to `null`, `bodyText` length bounds) |
| `src/lib/validation/__tests__/profile.test.ts` | `updateProfileSchema` |

`uploads.test.ts` generates its own test image in memory (`sharp({create:{...}}).jpeg().toBuffer()`)
rather than checking in a binary fixture, and cleans up every file it writes in `afterAll`.

### Component tests (React Testing Library + happy-dom)

| File | Covers |
| --- | --- |
| `src/components/shared/__tests__/SiteShell.test.tsx` | Signed-out shows only "Sign in"; signed-in shows "Add review" + Dashboard/Profile/Sign out; admin-only "Admin" menu item; `shortName` abbreviation ("Sample Writer" → "Sample W.") |
| `src/components/post/__tests__/ReviewListRow.test.tsx` | Row vs. card variant; `compact` hides category/product name/summary; card variant renders the title as plain text (regression guard for a nested-anchor bug), row variant renders it as a link |
| `src/components/product/__tests__/ProductCompareSelector.test.tsx` | No compare buttons with only 1 post; "N review(s) ready" panel on selection; `router.push` with both ids on a 2nd selection; re-clicking deselects without navigating; dismiss clears the selection; score badge only when a score exists |
| `src/components/comments/__tests__/CommentThread.test.tsx` | Comment count header; empty state; a 4-deep reply chain all renders (regression guard for the recursive grouping logic); signed-out shows a sign-in prompt instead of a composer; a full reply flow (`fetch` call + `router.refresh()`); Delete only on the current user's own comment |
| `src/components/post/__tests__/PostForm.test.tsx` | Add/remove pro & con bullets; add/remove chapter/item subitems; the product `Select`'s custom filter matches by product name only, not the "(Book)"/"(Restaurant)" type suffix |
| `src/components/shared/__tests__/ImageDropzone.test.tsx` | Renders each existing image; the right image's remove button drops only that one via `onChange` |
| `src/components/shared/__tests__/AvatarUpload.test.tsx` | Shows the name initial and no Remove button with no avatar; Remove button clears via `onChange(null)` when an avatar is set |
| `src/components/shared/__tests__/ProfileForm.test.tsx` | Bio textarea reflects typed input; Save sends the current bio/avatarPath via `PATCH /api/profile` |
| `src/components/post/__tests__/PostCard.test.tsx` | Summary only rendered when present; category chip color cycles by `productType.id` parity |

#### Setup

- `vitest.setup.ts` imports `@testing-library/jest-dom/vitest` globally (wired via
  `test.setupFiles` in `vitest.config.ts`) — gives every test `toBeInTheDocument()` etc. without
  a per-file import.
- `src/test/renderWithProviders.tsx` wraps `render()` in the app's real `MantineProvider theme`.
  Every component under test uses theme colors (`coral`/`sage`/`sand`) and Mantine defaultProps
  (`Card` → `radius: 'lg', shadow: 'sm'`) that don't resolve to anything meaningful under bare
  Mantine defaults — always render through this helper, never `@testing-library/react`'s `render`
  directly.

#### Gotchas found writing these (all happy-dom-specific — real browsers don't have them)

- **A Mantine `Menu`/searchable `Select` dropdown never visually "opens."** Mantine's `Popover`
  (which backs both) always includes Floating UI's `hide()` middleware. happy-dom does no real
  layout — every `getBoundingClientRect()` is `0×0` — so that middleware's clipping check always
  judges the dropdown's reference element as off-screen and force-sets `display: none` on the
  dropdown, regardless of its actual open/closed state. `getByRole('menuitem', ...)` /
  `getByRole('option', ...)` therefore can't find items in an "open" dropdown by default, since
  RTL excludes elements with `display: none` from the accessibility tree. Fix: pass
  `{ hidden: true }` to bypass that visibility filter and query by role structurally — you're
  testing which items conditionally render, not Mantine's own positioning library, so ignoring
  the (here-unreliable) visibility check is correct, not a workaround for a real bug.
- **An `<img alt="">` isn't `role="img"`.** Per the ARIA spec, an image with an empty `alt`
  (decorative) gets an implicit `presentation` role, not `img` — `getByRole('img')` won't find
  it. Use `container.querySelectorAll('img')` (from `renderWithProviders`'s return value) instead
  when the images under test are intentionally decorative.
- **An anchor's accessible name is the concatenation of every descendant's text**, not just text
  that's directly inside the `<a>`. When a whole card is one link (`LinkCard`) and you need to
  prove there's no *second*, nested anchor around just the title (invalid HTML, breaks
  hydration), `queryByRole('link', { name: /Title/ })` will still find a match — it's matching
  the outer card-link's full accessible name, not proving the title isn't its own nested anchor.
  Assert `getAllByRole('link')` has length 1 instead.
- **Casting lightweight fixtures with `as never`.** Component props are typed against Prisma's
  generated model shapes; a hand-written test fixture rarely matches exactly. Casting the fixture
  variable itself to `never` makes every later property access on it untypeable. Cast only at the
  JSX prop usage site (`posts={fixture as never}`), never the fixture variable, so assertions
  elsewhere in the test can still read its properties with real types.
- **Mocking `next/navigation` and `fetch`.** `vi.mock('next/navigation', () => ({ useRouter: () =>
  ({ push: vi.fn(), refresh: vi.fn() }) }))` at module scope; `vi.stubGlobal('fetch', vi.fn()...)`
  per test with `vi.unstubAllGlobals()` in `afterEach` to avoid leaking a stub into unrelated
  tests in the same file.

## E2E tests (Playwright)

```bash
yarn test:e2e
```

Build first with `yarn build`, install browsers with `yarn playwright install chromium webkit`,
then run `yarn test:e2e`. The runner starts a production server on port 3000 using a
fresh temporary SQLite database with all migrations and seed data. It refuses to
reuse an existing server and removes its database when the server exits.

- `tests/e2e/smoke.spec.ts` verifies public page rendering.
- `tests/e2e/golden-path.spec.ts` covers the desktop admin/product/review/compare/comment journey.
- `tests/e2e/ratings.spec.ts` runs on desktop Chromium, Pixel Chromium, and iPhone WebKit.
  It covers missing criterion rows in old drafts, keyboard input, mouse dragging,
  mobile taps and Chromium touch dragging, personal rating save/reload/publish,
  creating products inside the form, renaming product types while preserving
  associations, and crawler headers/metadata/robots.txt.

`src/lib/__tests__/review-routes.test.ts` applies real SQLite migrations to an isolated
database and covers create/update/publish validation, ownership, existing published
reviews, and product-type edit conflicts. Personal ratings remain nullable for legacy
records and drafts; publishing requires a value between 1 and 10.

`.github/workflows/quality.yml` runs lint, types, Vitest, production build and all
browser projects. Failure traces and screenshots are retained as workflow artifacts.

### Locator patterns that worked here

Prefer role-based locators with an explicit accessible name over `getByLabel`/`getByText` whenever
more than one element could plausibly match:

- `getByRole('textbox', { name: 'Password' })` over `getByLabel('Password')` — a password field's
  visibility-toggle button can also match the label text.
- `getByRole('combobox', { name })` over `getByLabel(name)` for a Mantine `Select` — both the input
  and its listbox can match the label.
- `getByRole('button', { name, exact: true })` when two buttons share a name prefix (e.g. "Add" vs
  "Add pro").
- Check the input's actual accessible name, not just its visible label text, before using
  `{ exact: true }` — a visible "*" required-field marker isn't necessarily part of the accessible
  name.
- `getByText(...)` for text that legitimately appears more than once on a page (e.g. "Sign in" in
  both the header nav and an inline prompt) will throw a strict-mode violation — narrow to the
  substring that's actually unique, or scope the locator to a specific role/container first.

### Sandbox note

Playwright's own bundled Chromium (`npx playwright install chromium`) launches successfully in
this environment even when separate browser-automation MCP tools (chrome-devtools, playwright-mcp)
fail to attach to an already-running Chrome instance — they're different mechanisms (Playwright
launches its own isolated browser process; the MCP tools attach to an existing one over a debug
port). If interactive browser MCP tools aren't available, Playwright's own test runner is still a
valid way to get real browser verification.


## Experience dates and visual regressions

Reviews can optionally store an experience date as `YYYY-MM-DD`. The form uses the
browser's date input/calendar picker, with the existing Mantine input styling.
The title and date share a row on wider screens and stack below 576px. Published
reviews show an `Experienced:` date only when present, beside the `Reviewed:` date.
The stored calendar day is formatted independently of server/browser time zones.

The added validation, form and real-SQLite route tests cover omitted/null dates,
valid leap days, invalid dates, editing and clearing, preserving dates when older
clients omit the field, and migrating existing reviews without changing their data.
`tests/e2e/experience-date.spec.ts` covers save/reload/publish/clear and responsive
input alignment on desktop Chromium, mobile Chromium and mobile WebKit. Narrow-screen
checks also keep the navigation inside its header so it cannot cover the form.

Screenshot comparisons cover the new/edit form and published review with and without
an experience date at desktop, Pixel, iPhone and 320px widths:

```bash
yarn build
yarn test:visual
```

The visual runner reuses the isolated temporary browser-test server with an optional
`--visual` fixture setup. Fixtures have fixed dates and cannot run against the
production database. The existing E2E server command is unchanged.

Baselines are captured on macOS; the additive `visual` CI job uses macOS 15 while
application regressions continue running on Linux. After reviewing an intentional
style change on macOS, regenerate the checked-in screenshots with:

```bash
yarn test:visual:update
```

Native calendar/picker chrome is supplied by each browser or operating system;
screenshot assertions cover the application fields and review layout.


## Release version check

The `Release version` CI job requires every pull request to increase
`package.json.version` above the PR base commit's version. Unchanged or lower
versions fail, including changes to build metadata alone. Versions use SemVer
ordering, so `1.0.10` sorts above `1.0.9` and a stable release sorts above its
prereleases. Both root version fields in `package-lock.json` must match
`package.json`; the Yarn workspace lock entry does not store the release version.

Run the same check locally against your PR's base ref or commit:

```bash
yarn check:version origin/main
```

Ensure that ref is up to date using your usual Git fetch workflow. Without a base
argument, `yarn check:version` validates the current version and lockfile only.
Pushes to `main` and manual CI runs use that consistency-only mode, because the
version increase is checked on pull requests. A supplied base ref that cannot be
resolved fails rather than silently skipping the comparison.

For a new release, use your existing versioning workflow (for example,
`npm version patch --no-git-tag-version`) and commit the package/lockfile changes.
The release shortcut continues to read the version from `package.json`; CI does
not build or publish Docker images. Script tests cover SemVer ordering, lockfile
mismatches, the Git base comparison, and command exit status in temporary repos.
