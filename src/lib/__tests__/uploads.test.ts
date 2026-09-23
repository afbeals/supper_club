import path from 'node:path';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveUploadPath, saveUploadedImage, UploadValidationError, UPLOAD_DIR } from '../uploads';

describe('resolveUploadPath', () => {
  it('resolves a normal relative path inside UPLOAD_DIR', () => {
    const resolved = resolveUploadPath('2026/09/abc123.jpg');
    expect(resolved).toBe(path.join(UPLOAD_DIR, '2026/09/abc123.jpg'));
  });

  it('rejects a traversal attempt with ../', () => {
    expect(resolveUploadPath('../../etc/passwd')).toBeNull();
  });

  it('rejects an absolute path escaping UPLOAD_DIR', () => {
    expect(resolveUploadPath('/etc/passwd')).toBeNull();
  });
});

describe('saveUploadedImage', () => {
  const written: string[] = [];

  afterAll(async () => {
    await Promise.all(written.map((p) => fs.unlink(p).catch(() => {})));
  });

  it('rejects a file that is not a real image, regardless of claimed type', async () => {
    const notAnImage = Buffer.from('this is just a text file pretending to be a photo');
    await expect(saveUploadedImage(notAnImage)).rejects.toBeInstanceOf(UploadValidationError);
  });

  it('rejects a buffer over the byte-size cap without even probing it as an image', async () => {
    const oversized = Buffer.alloc(9 * 1024 * 1024);
    await expect(saveUploadedImage(oversized)).rejects.toThrow(/too large/);
  });

  it('saves a real image and caps its dimensions', async () => {
    const wide = await sharp({ create: { width: 5000, height: 100, channels: 3, background: { r: 10, g: 20, b: 30 } } })
      .jpeg()
      .toBuffer();

    const result = await saveUploadedImage(wide);
    written.push(path.join(UPLOAD_DIR, result.path), path.join(UPLOAD_DIR, result.thumbPath));

    expect(result.width).toBeLessThanOrEqual(4000);
    expect(result.mimeType).toBe('image/jpeg');

    const fullMeta = await sharp(path.join(UPLOAD_DIR, result.path)).metadata();
    expect(fullMeta.width).toBeLessThanOrEqual(4000);

    const thumbMeta = await sharp(path.join(UPLOAD_DIR, result.thumbPath)).metadata();
    expect(thumbMeta.width).toBeLessThanOrEqual(480);
  });
});
