# Architecture

## Shape

Supper Club is a single Next.js 16 App Router application — one process, one port, server-rendered
for SEO and link previews. There is no separate API server: `src/app/api/**/route.ts` handlers run
in the same process as the pages and share the same Prisma client.

```
Browser <--> Next.js (pages + /api routes) <--> Prisma (SQLite, file on disk)
                                              <--> uploaded images (disk, under UPLOAD_DIR)
```

SQLite plus a disk-mounted upload directory means the app is stateful at the filesystem level —
both must live on the same persistent volume when deployed (see `deploy-digitalocean.md`).

## Route groups

Four route groups under `src/app/`, each with its own `layout.tsx` and its own access model — but
all three signed-area layouts render the **same** `SiteShell` component
(`src/components/shared/SiteShell.tsx`), parameterized by `isSignedIn`/`isAdmin`/`avatarPath`
props each layout computes from `getSession()`; there is no separate `AppShellNav` or
`AdminShell` component:

| Group | Layout | Access | Purpose |
| --- | --- | --- | --- |
| `(site)` | `SiteShell` | Public | Home, reviews index, writers directory + profile, product hub, compare, post detail |
| `(auth)` | none | Public | `/login` |
| `(app)` | `SiteShell` | Any signed-in user | Dashboard, guided post authoring/editing, own profile |
| `(admin)` | `SiteShell` + local `AdminTabs` | `ADMIN` role only (`layout.tsx` redirects otherwise) | Product type + criteria CRUD, product CRUD, user CRUD |

Route groups don't affect the URL — `(site)/page.tsx` still serves `/`. They exist purely to give
each area its own layout (redirect logic, admin-role check) and, implicitly, its own trust
boundary — not to give each area a visually distinct shell.

## Server Components vs. Client Components — the two rules that bit us

`SiteShell` — the one shared layout for all three signed/public route groups (see above) — is a
`'use client'` component that wraps the entire Mantine `AppShell` tree, even though the page
content it wraps is still rendered server-side. This is not a style preference — it's required by
two Next.js RSC (React Server
Component) boundary rules that don't fail at typecheck or lint, only at runtime:

1. **A Server Component cannot pass a function into a Client Component.** Mantine's
   `component={Link}` pattern — passing Next's `Link` as a prop — throws "Functions cannot be
   passed directly to Client Components" when the passing component is a Server Component. Fixed
   by keeping every `component={Link}` usage inside `'use client'` code: see
   `src/components/shared/LinkButton.tsx`, `LinkCard.tsx`, `LinkText.tsx` — thin wrappers that take
   a plain `href: string` and hide the `Link` reference internally, safe for a Server Component to
   render.
2. **A Server Component cannot reach into a compound component's static sub-property**
   (`AppShell.Header`, `AppShell.Main`, `List.Item`, ...) if that compound component is exported
   from a `'use client'` module. Next's client-reference proxy for a client export doesn't carry
   static properties through, so `AppShell.Header` resolves to `undefined` and React throws
   "Element type is invalid: ...got undefined." Fixed by moving the entire compound-component tree
   into one `'use client'` wrapper (`SiteShell`) that takes only plain serializable props, never by
   touching `AppShell.*` from an `async function Page()`.

If you add a new page that needs a Mantine compound component or a `component={Link}`-style prop,
put that piece inside an existing (or new) `'use client'` wrapper rather than reaching for it
directly from a Server Component.

## RSC prop-serialization boundary (security-relevant)

Any prop a Server Component passes into a Client Component is serialized into the page's RSC
flight payload and shipped to the browser — visible in page source, not just in the rendered DOM.
Passing a full Prisma model row across that boundary leaks every column, including ones the UI
never displays. This bit us for `User.passwordHash` (see `database.md` → Security) and the fix is
the same rule everywhere: `select` exactly the fields a client component needs, and give the
client component's prop type that narrowed shape — never the full generated Prisma model type.

## Directory map

```
src/app/
  (site)/        public pages — home, reviews, writers directory + profile, product hub,
                 compare, post detail (no standalone products index — see below)
  (auth)/login/  login page
  (app)/         dashboard + guided authoring (new/edit post) + own profile editor
  (admin)/admin/ product-type/criteria/product/user CRUD
  api/           route handlers — auth, posts, products, comments, uploads, media, profile,
                 admin/*, health
src/components/
  post/          PostCard, PostForm (the guided authoring form), ReviewListRow (shared row/card
                 renderer for listings — see the "compact"/"card" variant props on its own tests)
  product/       ProductCompareSelector (the floating "N review(s) ready" compare picker)
  comments/      CommentThread
  shared/        LinkButton/LinkCard/LinkText/LinkAvatar (component={Link} wrappers — see the RSC
                 section below), SiteShell, RichTextEditorField, ImageDropzone, AvatarUpload,
                 ProfileForm
src/lib/
  db.ts          Prisma singleton
  auth.ts        session cookie + DB-backed session
  apiGuards.ts   requireUser / requireAdmin route wrappers
  scoring.ts     normalizeRating / overallScore
  sanitize.ts    sanitizePostHtml (tiptap HTML allowlist)
  slug.ts        uniqueSlug
  format.ts      formatDate / relativeTime
  uploads.ts     sharp validation/resize pipeline + traversal-safe path resolution
  validation/    zod schemas shared by forms and API routes
prisma/          schema.prisma, migrations/, seed.ts
```

A page-specific component used by exactly one route (`AdminTabs`, `ProductTypesManager`,
`ProductsManager`, `UsersManager`, `LoginForm`, `DashboardList`, `ReviewsFilterBar`) lives
colocated next to that route under `src/app/`, not under `src/components/` — `src/components/`
is reserved for pieces reused across more than one route.

There is no standalone `/products` browsing index — removed once it became clear that browsing
"all products" doesn't scale as a UI once there are more than a handful (unlike Reviews, which
stays useful at any size via its filters). A product is still fully browsable and comparable: a
review links to its product's hub page (`/products/[slug]`, aggregate scores + a
`ProductCompareSelector` for picking reviews to compare — see below), just not as a top-level
directory. In its place, `/writers` is now the third top-level browsing
axis (by person, alongside Reviews-by-post and product-hub-by-subject) — a directory of active
writers with avatar + stats, linking to `/writers/[id]` for their full profile. A writer edits
their own `bio`/avatar at `/profile` (`(app)` group); there's no separate admin-managed path for
those two fields — `role`/`active` stay admin-only (`/admin/users`), but bio and avatar are
personal, not administrative, so they follow the same "you own your own content" pattern as posts.

## Why this stack

Chosen to match two existing in-house references rather than invent new conventions:
`~/Code/tmp/finapp_2.0` for the Next.js + Prisma + SQLite + cookie-session + Docker-volume shape
(reused near-verbatim: `db.ts`, `auth.ts`, `apiGuards.ts`, `prisma.config.ts`, `docker/entrypoint.sh`),
and `~/Code/tmp/sieve` for the Mantine UI precedent. See `database.md` for the one deliberate
schema deviation (Prisma 6, not 7 — a dependency dead end, not a design choice) and
`deploy-digitalocean.md` for the Docker shape borrowed from `~/Code/tmp/m3`.
