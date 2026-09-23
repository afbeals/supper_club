import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 's', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre'];

/**
 * Sanitize tiptap-authored HTML before it's stored. Applied on every save
 * (not just on render) — a WYSIWYG body on a publicly readable page is the
 * stored-XSS path here. Inline images aren't allowed: photos attach as
 * PostImage rows via the dedicated upload flow instead.
 */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'rel', 'target'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }, true),
    },
  });
}
