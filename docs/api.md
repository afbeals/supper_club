# API

All routes are Next.js route handlers under `src/app/api/`. There is no separate API server or
API versioning — this is a monolith. Every mutating route calls `requireUser()` or `requireAdmin()`
(`src/lib/apiGuards.ts`) as its first line; see `auth.md` for what each guard means.

## Auth — `api/auth/`

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | Public | `{ email, password }`. Generic failure message for both wrong password and unknown email. |
| `/api/auth/logout` | POST | Any | Deletes the current session row + cookie. |
| `/api/auth/session` | GET | Any | Returns the current session or `null` — used by client components that need to know who's signed in without a full page reload. |

## Profile — `api/profile/`

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/profile` | PATCH | User | `{ bio, avatarPath }`. Always updates the caller's own row (`guard.session.userId`) — there's no `id` param, by design, so this route can never touch another user's profile. `avatarPath` is set from an `/api/uploads` response (`image.thumbPath`), not uploaded directly by this route. |

## Posts — `api/posts/`

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/posts` | GET | User | Own posts only (drafts + published). |
| `/api/posts` | POST | User | Create a review (`src/lib/validation/posts.ts`). `bodyHtml` is sanitized server-side before storage. |
| `/api/posts/[id]` | GET | User | Owned only — another user's post (even published) 404s here, since this endpoint is for editing, not viewing; **use the public `(site)/posts/[slug]` page to view any published post.** |
| `/api/posts/[id]` | PATCH | User | Full-replace update (ratings/bullets/images/subitems are deleted and recreated inside a transaction, not diffed). |
| `/api/posts/[id]/publish` | POST | User | Toggles `status` between `DRAFT`/`PUBLISHED`; sets `publishedAt` on first publish only. |

## Products — `api/products/`

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/products` | GET | Public | Returns `{ products, productTypes }` — `productTypes[].criteria` includes only active (non-archived) criteria, for the authoring form's rating sliders. |
| `/api/products` | POST | User | Any signed-in user, not admin-only — see `auth.md` for why. |

## Comments — `api/comments/`

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/comments` | POST | User | `{ postId, parentId: number \| null, bodyText }`. Plain text only — never accepts HTML. |
| `/api/comments/[id]` | DELETE | User (author only) | Soft delete (`deletedAt`), so reply threads never orphan. |

## Uploads & media

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/uploads` | POST | User | Multipart upload → `sharp` validates real image bytes (ignores client-claimed MIME type), caps to 8MB / 4000px, strips EXIF/GPS by re-encoding, writes original + 480px thumbnail. |
| `/api/media/[...path]` | GET | Public | Streams a file from `UPLOAD_DIR`. Resolves the path and asserts it's still inside `UPLOAD_DIR` before streaming (rejects `../` traversal, raw or URL-encoded) — never trust a path segment from the URL directly. Long, immutable `Cache-Control` since filenames are content-random. |

## Health — `api/health/`

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/health` | GET | Public | Runs `SELECT 1` against the database and returns `{ status: 'ok' }` — a real readiness check, not just process liveness. What the Docker `HEALTHCHECK` (see `deploy-digitalocean.md`) polls every 30s. |

## Admin — `api/admin/`

All routes below require `requireAdmin()` (403 for a signed-in non-admin, 401 for anonymous).

| Route | Method | Notes |
| --- | --- | --- |
| `/api/admin/product-types` | GET, POST | List / create a `ProductType`. |
| `/api/admin/product-types/[id]` | PATCH, DELETE | Update, or archive (`archivedAt`, never a hard delete). |
| `/api/admin/product-types/[id]/criteria` | POST | Add a `RatingCriterion` to a product type. `minValue < maxValue` enforced (400 otherwise). |
| `/api/admin/criteria/[id]` | PATCH, DELETE | Update a criterion, or archive it. |
| `/api/admin/users` | GET, POST | List / create a `User`. |
| `/api/admin/users/[id]` | PATCH | Update role/active status — includes a self-lockout guard (an admin can't deactivate or demote themself). |

## Conventions

- Validation is `zod`, defined once in `src/lib/validation/*.ts` and shared between the API route
  and the corresponding form (`PostForm`, `LoginForm`, the admin managers) — never duplicate a
  shape check in both places.
- A 404 on an owned resource (e.g. `GET /api/posts/[id]` for someone else's post) is used
  deliberately instead of a 403, so the response doesn't leak whether the resource exists at all.
- Every route returns `{ error: string }` on failure with an appropriate status code — no bare
  500s with stack traces in the response body.
