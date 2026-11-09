// @vitest-environment node
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { NextRequest, NextResponse } from 'next/server';

const identity = vi.hoisted(() => ({ userId: 1, admin: true, signedIn: true }));
vi.mock('@/lib/apiGuards', () => ({
  requireUser: async () => identity.signedIn ? { session: { userId: identity.userId } } : { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) },
  requireAdmin: async () => identity.admin ? { session: { userId: identity.userId } } : { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) },
}));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'supper-routes-'));
const previousUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = `file:${path.join(directory, 'test.db')}`;
let prisma: typeof import('@/lib/db')['prisma'];
let posts: typeof import('@/app/api/posts/route');
let post: typeof import('@/app/api/posts/[id]/route');
let publish: typeof import('@/app/api/posts/[id]/publish/route');
let productType: typeof import('@/app/api/admin/product-types/[id]/route');
let productId: number;
let typeId: number;
const request = (data: unknown) => new NextRequest('http://localhost/api/test', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
const params = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

beforeAll(async () => {
  const db = new Database(path.join(directory, 'test.db'));
  for (const name of fs.readdirSync('prisma/migrations').sort()) {
    const migration = path.join('prisma/migrations', name, 'migration.sql');
    if (fs.existsSync(migration)) db.exec(fs.readFileSync(migration, 'utf8'));
  }
  db.close();
  ({ prisma } = await import('@/lib/db'));
  posts = await import('@/app/api/posts/route'); post = await import('@/app/api/posts/[id]/route');
  publish = await import('@/app/api/posts/[id]/publish/route'); productType = await import('@/app/api/admin/product-types/[id]/route');
  await prisma.user.create({ data: { id: 1, email: 'test@example.test', name: 'Test', passwordHash: 'unused', role: 'ADMIN' } });
  const type = await prisma.productType.create({ data: { name: 'Book', slug: 'book' } }); typeId = type.id;
  const product = await prisma.product.create({ data: { name: 'Test product', slug: 'test-product', productTypeId: type.id, createdById: 1 } }); productId = product.id;
});
beforeEach(() => { identity.admin = true; identity.signedIn = true; identity.userId = 1; });
afterAll(async () => {
  await prisma?.$disconnect(); fs.rmSync(directory, { recursive: true, force: true });
  if (previousUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousUrl;
});

describe('review persistence and all publishing routes', () => {
  it('keeps legacy published reviews unrated and published', async () => {
    const legacy = await prisma.post.create({ data: { authorId: 1, title: 'Legacy', slug: 'legacy', productId, status: 'PUBLISHED' } });
    const response = await post.GET(request({}), params(legacy.id));
    expect((await response.json()).post).toMatchObject({ status: 'PUBLISHED', personalRating: null });
  });
  it('allows drafts but prevents bypassing personal rating via create, edit, or status shortcut', async () => {
    const data = { title: 'New review', productId, status: 'DRAFT' };
    expect((await posts.POST(request({ ...data, status: 'PUBLISHED' }))).status).toBe(400);
    const created = await posts.POST(request(data)); expect(created.status).toBe(201);
    const { post: draft } = await created.json();
    expect(draft.personalRating).toBeNull();
    expect((await post.PATCH(request({ ...data, status: 'PUBLISHED' }), params(draft.id))).status).toBe(400);
    expect((await publish.POST(request({ status: 'PUBLISHED' }), params(draft.id))).status).toBe(400);
    expect((await post.PATCH(request({ ...data, personalRating: 8 }), params(draft.id))).status).toBe(200);
    expect((await publish.POST(request({ status: 'PUBLISHED' }), params(draft.id))).status).toBe(200);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: draft.id } })).personalRating).toBe(8);
    expect((await publish.POST(request({ status: 'DRAFT' }), params(draft.id))).status).toBe(200);
  });
  it('enforces auth and review ownership', async () => {
    identity.signedIn = false;
    expect((await posts.POST(request({}))).status).toBe(401);
    identity.signedIn = true; identity.userId = 99;
    const legacy = await prisma.post.findUniqueOrThrow({ where: { slug: 'legacy' } });
    expect((await post.PATCH(request({}), params(legacy.id))).status).toBe(404);
    expect((await publish.POST(request({ status: 'PUBLISHED' }), params(legacy.id))).status).toBe(404);
  });
});

describe('product type metadata updates', () => {
  it('renames and edits description while preserving slug, products and review links, then archives/unarchives', async () => {
    expect((await productType.PATCH(request({ name: 'Books', description: 'Updated' }), params(typeId))).status).toBe(200);
    expect(await prisma.productType.findUniqueOrThrow({ where: { id: typeId } })).toMatchObject({ name: 'Books', description: 'Updated', slug: 'book', archivedAt: null });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).productTypeId).toBe(typeId);
    expect((await productType.PATCH(request({ archived: true }), params(typeId))).status).toBe(200);
    expect((await prisma.productType.findUniqueOrThrow({ where: { id: typeId } })).archivedAt).not.toBeNull();
    expect((await productType.PATCH(request({ archived: false }), params(typeId))).status).toBe(200);
  });
  it('rejects blank/duplicate names, missing IDs, empty patches and non-admin updates', async () => {
    await prisma.productType.create({ data: { name: 'Other', slug: 'other' } });
    expect((await productType.PATCH(request({ name: 'Other' }), params(typeId))).status).toBe(409);
    expect((await productType.PATCH(request({ name: ' ' }), params(typeId))).status).toBe(400);
    expect((await productType.PATCH(request({}), params(typeId))).status).toBe(400);
    expect((await productType.PATCH(request({ name: 'Gone' }), params(999))).status).toBe(404);
    identity.admin = false;
    expect((await productType.PATCH(request({ name: 'Forbidden' }), params(typeId))).status).toBe(403);
  });
});


describe('experience date persistence and compatibility', () => {
  it('saves, reads, changes and clears the date without changing the review timestamp', async () => {
    const data = { title: 'Experience date review', productId, status: 'PUBLISHED', personalRating: 8, experiencedOn: '2024-02-29' };
    const response = await posts.POST(request(data));
    expect(response.status).toBe(201);
    const { post: created } = await response.json();
    expect(created.experiencedOn).toBe('2024-02-29');
    expect((await (await post.GET(request({}), params(created.id))).json()).post.experiencedOn).toBe('2024-02-29');
    const updated = await post.PATCH(request({ ...data, experiencedOn: '2026-11-09' }), params(created.id));
    expect(updated.status).toBe(200);
    expect((await updated.json()).post).toMatchObject({ experiencedOn: '2026-11-09', publishedAt: created.publishedAt });
    const { experiencedOn: _date, ...oldClientPayload } = data;
    expect((await post.PATCH(request(oldClientPayload), params(created.id))).status).toBe(200);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: created.id } })).experiencedOn).toBe('2026-11-09');
    expect((await post.PATCH(request({ ...data, experiencedOn: null }), params(created.id))).status).toBe(200);
    expect(await prisma.post.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ experiencedOn: null, status: 'PUBLISHED' });
  });

  it('rejects invalid calendar dates without replacing an existing value', async () => {
    const data = { title: 'Keep this date', productId, status: 'DRAFT', experiencedOn: '2026-11-09' };
    const { post: draft } = await (await posts.POST(request(data))).json();
    expect((await post.PATCH(request({ ...data, experiencedOn: '2026-02-29' }), params(draft.id))).status).toBe(400);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: draft.id } })).experiencedOn).toBe('2026-11-09');
    expect((await posts.POST(request({ ...data, experiencedOn: '2026-04-31' }))).status).toBe(400);
  });

  it('adds the nullable column to an existing database without changing its reviews', () => {
    const db = new Database(':memory:');
    try {
      for (const name of ['20260922165917_init', '20261107000000_personal_rating']) {
        db.exec(fs.readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8'));
      }
      db.exec(`
        INSERT INTO User (id, email, name, passwordHash) VALUES (1, 'legacy@example.test', 'Legacy', 'unused');
        INSERT INTO ProductType (id, name, slug) VALUES (1, 'Book', 'book');
        INSERT INTO Product (id, productTypeId, name, slug, createdById) VALUES (1, 1, 'Legacy product', 'legacy-product', 1);
        INSERT INTO Post (id, authorId, title, slug, productId, status, personalRating, updatedAt)
          VALUES (1, 1, 'Keep my review', 'keep-my-review', 1, 'PUBLISHED', 8, '2026-11-01');
      `);
      const before = db.prepare('SELECT * FROM Post').get();
      db.exec(fs.readFileSync('prisma/migrations/20261109000000_experience_date/migration.sql', 'utf8'));
      expect(db.prepare('SELECT * FROM Post').get()).toEqual({ ...before as object, experiencedOn: null });
    } finally { db.close(); }
  });
});
