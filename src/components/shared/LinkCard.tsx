'use client';

import Link from 'next/link';
import { Card, type CardProps } from '@mantine/core';

// See LinkButton.tsx for why this needs to be a client component.
export function LinkCard({ href, children, ...props }: CardProps & { href: string; children: React.ReactNode }) {
  return (
    <Card component={Link} href={href} {...props}>
      {children}
    </Card>
  );
}
