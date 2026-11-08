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
