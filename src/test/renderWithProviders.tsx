import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/theme';

// Every component under test uses Mantine style props / theme colors (coral,
// sage, sand), so it needs the real app theme in context, not just Mantine's
// defaults — otherwise color props like `color="coral"` silently resolve to
// nothing meaningful.
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <MantineProvider theme={theme}>{children}</MantineProvider>,
    ...options,
  });
}
