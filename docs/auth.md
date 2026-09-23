# Authentication & Authorization

## Model

- Accounts are **admin-created only** — there is no public signup route. `role` is `ADMIN` or
  `WRITER`.
- Sessions are **DB-backed**, not stateless JWTs: `Session` rows (`src/lib/auth.ts`) with a random
  32-byte hex token, a 7-day expiry, and a plain httpOnly cookie (`sc_session`) holding just the
  token. Logging in deletes the user's existing sessions first — one active session per user.
- `getSession()` reads the cookie, looks up the `Session` row, and returns `null` (deleting the
  stale row) if it's expired or the user has been deactivated (`User.active === false`) — a
  deactivated account is logged out on its very next request, not just blocked from logging in
  again.

## Access model by area

| Area | Who |
| --- | --- |
| Reading published posts, products, compare pages, author pages | Anyone, including anonymous |
| Commenting | Any signed-in user (`requireUser`) |
| Creating/editing/publishing **your own** posts | Any signed-in user — `WRITER` and `ADMIN` alike |
| Creating a **product** | Any signed-in user (not admin-gated — writers need this while authoring a review for a product that doesn't exist yet) |
| Product type + criteria CRUD | `ADMIN` only (`requireAdmin`) |
| User CRUD | `ADMIN` only |

The "any signed-in user can create a product" rule is deliberate, and differs from the plan's
original draft (which grouped product creation under `/api/admin/products`) — moved to
`/api/products` during Phase 5 once it became clear a writer authoring a review for a brand-new
book/restaurant needs to create that product inline, without asking an admin first.

## Route guards (`src/lib/apiGuards.ts`)

```ts
const g = await requireUser(); // or requireAdmin()
if (g.error) return g.error;   // 401 (or 403 for requireAdmin) NextResponse
// g.session.userId / .role / .userName are available past this point
```

Every mutating API route calls one of these first. GET routes on owned resources (e.g.
`GET /api/posts/[id]`) additionally filter by `authorId` so that fetching another user's *draft*
post returns a 404, not a 403 — a 403 would leak that the post exists at all; the current behavior
deliberately doesn't distinguish "not yours" from "doesn't exist."

## Cookie security

`COOKIE_SECURE` (env var, default `"false"`) must be explicitly set to `"true"` once the app is
served over HTTPS. This is an opt-in, not an opt-out: a `Secure` cookie is **silently dropped by
the browser** over plain HTTP, which breaks every login attempt with no visible error — this is
why it isn't just tied to `NODE_ENV === 'production'`. Set it to `"true"` in `deploy-digitalocean.md`'s
production `.env` once the reverse proxy terminates TLS. `sameSite: 'lax'` is fixed (not
configurable) — appropriate for a same-site app with no cross-site embedding use case.

## Passwords

bcrypt via `bcryptjs`, cost factor 12 (`src/app/api/auth/login/route.ts`, `prisma/seed.ts`). Login
failure returns a generic "Invalid email or password" for both a wrong password and a nonexistent
email — never reveal which one was wrong. **Both seeded accounts use the password `changeme123`
— change them before deploying anywhere reachable outside your own machine.**

## The passwordHash leak (fixed, worth remembering)

Three places in the codebase used to pass a **full** Prisma `User` row (via `include: { author:
true }`, or an unfiltered `findMany`) as a prop into a Client Component: the post detail page's
comment thread, the reviews page's author filter list, and the comment-creation API's JSON
response. Because any prop crossing the Server→Client Component boundary is serialized into the
page's RSC payload and shipped to the browser, `passwordHash` (the bcrypt hash) was visible in
plain page source and in the API response body — not exploitable to log in directly, but a bcrypt
hash is exactly the kind of thing that should never leave the server. Fixed by using Prisma
`select: { id, name }` at every one of those query sites instead of `include: true`/an unfiltered
`findMany`, and narrowing the corresponding client component's prop type to match. **The rule going
forward: never pass a bare Prisma model type into a client component's props — always define a
narrowed local type matching exactly what `select` returns.** See `architecture.md`'s RSC section
for the general pattern.
