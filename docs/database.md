# Database

SQLite via Prisma 6.19.3 (not 7 — see "Why Prisma 6" below). Schema lives in
`prisma/schema.prisma`; the file itself lives at `DATABASE_URL` (default `../data/dev.db`,
relative to the schema file under Prisma 6).

## Model overview

```
User ──┬─< Session
       ├─< Post ──┬─< Rating >── RatingCriterion ──< ProductType ──< Product
       │          ├─< PostBullet (PRO | CON)
       │          ├─< PostImage ──> Subitem (optional)
       │          ├─< Subitem
       │          └─< Comment ──self──> Comment (parentId, threads)
       └─< Product (createdBy)
```

- **`ProductType`** — a template ("Book", "Restaurant") that owns a set of **`RatingCriterion`**
  rows (name, `minValue`/`maxValue`, `higherIsBetter`, `weight`). A review's rating sliders come
  from its product's `productType.criteria`, so two reviews of the same product always show the
  same criteria and stay comparable.
- **`Product`** — one book, one restaurant, etc. Belongs to exactly one `ProductType`. Any signed-in
  writer can create one (not admin-only — see `auth.md`).
- **`Post`** — a review of one `Product`: a required `productId`, `Rating`s against that product's
  criteria, `PostBullet`s (pros/cons), and optional `Subitem`s. `status` is `DRAFT` or
  `PUBLISHED`; `publishedAt` is set on first publish and left alone on later edits. (An earlier
  design also had an `ARTICLE_TAKE` post type for commentary on an external article, with no
  product/ratings — removed before this app had any real users, since two different post shapes
  living under one `Post` model was more confusing than useful. If that need comes back, it's a
  small, separate addition, not a revert of this schema.)
- **`Subitem`** — a labeled piece of *one* review: a food item ordered on a restaurant visit, a
  chapter read from a book. Belongs to `Post`, not `Product` — a second visit or a re-read is just
  a second `Post` with its own independent subitems; nothing about `Subitem` required a schema
  change to support that. `notes`, `rating` (bare 1–10 `Int?`, deliberately not tied into
  `RatingCriterion`), and `images` are all optional and independent of each other.
- **`PostImage`** — attaches to a `Post` always, and optionally to one of that post's `Subitem`s.
  This is a **direct** foreign key relationship, not implied by `Post → Subitem` nesting — see the
  Prisma nested-create gotcha below.
- **`Comment`** — self-referencing via `parentId` for threaded replies. Soft-deleted via
  `deletedAt` (never hard-deleted), so a reply thread never orphans when its parent is removed.

## Archiving, not deleting

`ProductType` and `RatingCriterion` both have `archivedAt` and are never hard-deleted. `Rating` rows
keep their `criterionId` forever, so a published review keeps rendering its original ratings even
after an admin archives that criterion — archived criteria are simply excluded from new authoring
forms and from aggregate averages, not from history.

## Prisma nested-create gotcha: `PostImage.postId`

`prisma.post.create({ data: { subitems: { create: [{ images: { create: [...] } }] } } })` fails to
typecheck. `PostImage.postId` is a **direct** foreign key to `Post`, independent of the
`Post → Subitem` nesting path — Prisma can't infer it through two levels of nested `create`. Both
`POST /api/posts` and `PATCH /api/posts/[id]` work around this by creating subitems *without*
images first, then attaching images in a follow-up `prisma.postImage.createMany({ data: [...] })`
using the real `postId`/`subitemId` values from the initial create's result. If you add another
model with a similar "direct FK independent of the nesting path" shape, expect the same limitation.

## Migrations

- `yarn db:migrate` — `prisma migrate dev` (local, interactive, generates a new migration)
- `yarn db:deploy` — `prisma migrate deploy` (non-interactive; what `docker/entrypoint.sh` runs)
- `yarn db:reset` — `prisma migrate reset --force && yarn db:seed` (drops and reseeds; local dev
  only — never run this against the production volume)
- `yarn db:studio` — Prisma Studio, a GUI for browsing/editing rows directly

The migration history is a single clean `init` migration — the schema was still being designed
(domain change from tech products to Books/Restaurants, the `Subitem` addition, `Product.vendor`
→ `Product.subtitle`) when nothing had shipped yet, so those were folded into one migration rather
than stacked.

## Seed data (`prisma/seed.ts`)

`yarn db:seed` creates: two users (`admin@supperclub.local` / `writer@supperclub.local`, both
password `changeme123`), two product types (`Book` with 4 criteria, `Restaurant` with 4 criteria),
and sample products/posts so the site isn't empty on first run. **Change both seeded passwords
before deploying anywhere reachable from outside your own machine.**

## Foreign keys and raw sqlite3

Prisma's own SQLite connector always issues `PRAGMA foreign_keys = ON` for every connection, so
cascade deletes (`onDelete: Cascade` on `Session`, `Rating`, `PostBullet`, `PostImage`, `Subitem`,
`Comment`) work correctly through the app. The raw `sqlite3` CLI does **not** turn this on by
default — if you ever clean up rows manually for local testing, run
`PRAGMA foreign_keys = ON;` as the first statement of that session, or cascades silently won't
fire and you'll leave orphaned child rows behind.

## Why Prisma 6, not Prisma 7

The original plan called for Prisma 7 with `@prisma/adapter-better-sqlite3`. That path hit a real
dependency dead end, not a design change: the adapter pins `better-sqlite3: ^12.x` in its own
`dependencies`, and the entire 12.x line of `better-sqlite3` predates prebuilt binaries — every
12.x release needs `node-gyp` to compile its native binding, which needs Yarn's install script,
which is deliberately disabled here (`enableScripts: false`, a supply-chain hardening default).
Forcing a newer `better-sqlite3` into the adapter's resolution via `resolutions` would have
silently violated the adapter's declared compatibility range. Prisma 7 also resolves a relative
`DATABASE_URL` against the process's current working directory instead of the schema file's
directory — copying a Prisma-6-style relative path verbatim under Prisma 7 wrote the real database
one level *above* the repo the first time this was tried. Net result: dropped the adapter,
downgraded to `prisma@6.19.3` / `@prisma/client@6.19.3`, and kept the plain `sqlite` provider with
no adapter — which needs no native module at runtime and matches `finapp_2.0` exactly.
