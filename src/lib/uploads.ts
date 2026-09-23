import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './data/uploads');

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_DIMENSION = 4000; // px, either side
const THUMB_WIDTH = 480;

const ALLOWED_FORMATS: Record<string, { ext: string; mimeType: string }> = {
  jpeg: { ext: '.jpg', mimeType: 'image/jpeg' },
  png: { ext: '.png', mimeType: 'image/png' },
  webp: { ext: '.webp', mimeType: 'image/webp' },
};

export interface SavedImage {
  path: string; // relative to UPLOAD_DIR, e.g. "2026/09/<random>.jpg"
  thumbPath: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
}

export class UploadValidationError extends Error {}

function randomName(ext: string): string {
  return `${crypto.randomBytes(16).toString('hex')}${ext}`;
}

/**
 * Validate, resize, and save an uploaded image. Confirms the real image
 * format via sharp's own metadata probe (magic bytes, not the client's
 * Content-Type header), caps dimensions, and re-encodes rather than copying
 * the input — that re-encode is what strips EXIF/GPS, since sharp only
 * carries metadata through when .withMetadata() is explicitly called.
 */
export async function saveUploadedImage(buffer: Buffer): Promise<SavedImage> {
  if (buffer.byteLength > MAX_BYTES) {
    throw new UploadValidationError('Image is too large (max 8MB)');
  }

  const image = sharp(buffer, { failOn: 'error' });
  const metadata = await image.metadata().catch(() => null);
  if (!metadata?.format || !metadata.width || !metadata.height) {
    throw new UploadValidationError('File is not a valid image');
  }

  const formatInfo = ALLOWED_FORMATS[metadata.format];
  if (!formatInfo) {
    throw new UploadValidationError('Only JPEG, PNG, and WebP images are supported');
  }

  const now = new Date();
  const subdir = path.join(
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
  );
  await fs.mkdir(path.join(UPLOAD_DIR, subdir), { recursive: true });

  const baseName = randomName(formatInfo.ext);
  const relativePath = path.join(subdir, baseName);
  const relativeThumbPath = path.join(subdir, `thumb-${baseName}`);

  const [fullInfo] = await Promise.all([
    image
      .clone()
      .rotate() // bake in EXIF orientation before the tag itself gets dropped
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .toFile(path.join(UPLOAD_DIR, relativePath)),
    image
      .clone()
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .toFile(path.join(UPLOAD_DIR, relativeThumbPath)),
  ]);

  return {
    path: relativePath,
    thumbPath: relativeThumbPath,
    width: fullInfo.width,
    height: fullInfo.height,
    mimeType: formatInfo.mimeType,
    byteSize: fullInfo.size,
  };
}

/**
 * Resolve a relative path against UPLOAD_DIR, refusing anything that
 * escapes it (path traversal via `..` or an absolute path).
 */
export function resolveUploadPath(relativePath: string): string | null {
  const resolved = path.resolve(UPLOAD_DIR, relativePath);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
    return null;
  }
  return resolved;
}
