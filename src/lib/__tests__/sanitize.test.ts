import { describe, expect, it } from 'vitest';
import { sanitizePostHtml } from '../sanitize';

describe('sanitizePostHtml', () => {
  it('strips script tags entirely, including their content', () => {
    const result = sanitizePostHtml('<p>Great meal<script>alert(1)</script></p>');
    expect(result).toBe('<p>Great meal</p>');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
  });

  it('strips event handler attributes even on an allowed tag', () => {
    const result = sanitizePostHtml('<p onclick="alert(1)">hi</p>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
  });

  it('keeps allowed formatting tags', () => {
    const result = sanitizePostHtml('<p>Some <strong>bold</strong> and <em>italic</em> text.</p>');
    expect(result).toBe('<p>Some <strong>bold</strong> and <em>italic</em> text.</p>');
  });

  it('drops img tags — photos attach via PostImage, not inline HTML', () => {
    const result = sanitizePostHtml('<p>Look</p><img src="x.jpg" onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
  });

  it('forces safe rel/target on links and drops unsafe schemes', () => {
    const safe = sanitizePostHtml('<a href="https://example.com">link</a>');
    expect(safe).toContain('rel="noopener noreferrer nofollow"');
    expect(safe).toContain('target="_blank"');

    const unsafe = sanitizePostHtml('<a href="javascript:alert(1)">link</a>');
    expect(unsafe).not.toContain('javascript:');
  });
});
