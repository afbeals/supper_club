import { promises as fs } from 'node:fs';
import { NextResponse } from 'next/server';
import { resolveUploadPath } from '@/lib/uploads';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Publicly readable, no auth guard — attached images belong to reviews that
// are themselves publicly readable once published.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const resolved = resolveUploadPath(segments.join('/'));
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = resolved.slice(resolved.lastIndexOf('.'));
  const contentType = MIME_BY_EXT[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: Buffer;
  try {
    body = await fs.readFile(resolved);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': contentType,
      // Filenames are content-random and never reused, so caching forever is safe.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
