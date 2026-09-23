'use client';

import Link from 'next/link';
import { Button, type ButtonProps } from '@mantine/core';

// Mantine's `component={Link}` polymorphic pattern passes a function reference
// into Button (a client component) — fine from another client component, but
// not from a Server Component, which can't serialize a function prop across
// the boundary. This wrapper keeps the Link reference inside client-only code
// so Server Component pages can just pass a plain `href` string.
export function LinkButton({ href, ...props }: ButtonProps & { href: string; children?: React.ReactNode }) {
  return <Button component={Link} href={href} {...props} />;
}
