'use client';

import Link from 'next/link';
import { Text, type TextProps } from '@mantine/core';

// See LinkButton.tsx for why this needs to be a client component.
export function LinkText({ href, children, ...props }: TextProps & { href: string; children?: React.ReactNode }) {
  return (
    <Text component={Link} href={href} {...props}>
      {children}
    </Text>
  );
}
