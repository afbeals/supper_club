'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from '@mantine/core';

const TABS = [
  { href: '/admin/product-types', label: 'Product Types' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/users', label: 'Users' },
];

export function AdminTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = TABS.find((tab) => pathname.startsWith(tab.href))?.href ?? TABS[0]!.href;

  return (
    <Tabs value={activeTab} onChange={(value) => value && router.push(value)}>
      <Tabs.List>
        {TABS.map((tab) => (
          <Tabs.Tab key={tab.href} value={tab.href}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
