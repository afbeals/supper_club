'use client';

import Link from 'next/link';
import { Avatar, type AvatarProps } from '@mantine/core';

// See LinkButton.tsx for why this needs to be a client component.
export function LinkAvatar({ href, children, ...props }: AvatarProps & { href: string; children?: React.ReactNode }) {
  return (
    <Avatar component={Link} href={href} {...props}>
      {children}
    </Avatar>
  );
}
