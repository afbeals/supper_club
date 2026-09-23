import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Palette + type scale lifted from the "Cozy Refined" Figma concept
// (figma.com/design/1vRPd2r0ds5pf9hti60BZ8) — warm cream surfaces, a coral
// primary accent, a sage secondary accent used for the "Book" category and
// stat pills, and warm-gray ("sand") for muted text/neutral chips.
const coral: MantineColorsTuple = [
  '#fdf2f2',
  '#fbe6e4',
  '#f9d9d6',
  '#f8ccc9',
  '#f6bfbb',
  '#f4b3ae',
  '#f2a6a0',
  '#e85e53',
  '#c8281b',
  '#7c1911',
];

const sage: MantineColorsTuple = [
  '#f6f9f6',
  '#e7efe6',
  '#d8e5d7',
  '#c9dcc8',
  '#bad2b9',
  '#abc8a9',
  '#9cbe9a',
  '#70a16d',
  '#4f774c',
  '#31492f',
];

const sand: MantineColorsTuple = [
  '#f8f7f7',
  '#e9e7e4',
  '#d9d6d2',
  '#cac5c0',
  '#bbb4ae',
  '#aba49b',
  '#9c9389',
  '#7d7369',
  '#5a534c',
  '#38342f',
];

export const theme = createTheme({
  primaryColor: 'coral',
  primaryShade: 6,
  colors: { coral, sage, sand },
  fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'var(--font-inter), monospace',
  headings: {
    fontFamily: 'var(--font-nunito), var(--font-inter), sans-serif',
    fontWeight: '800',
  },
  defaultRadius: 'lg',
  radius: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '100px',
  },
  shadows: {
    xs: '0 2px 8px rgba(58, 53, 50, 0.06)',
    sm: '0 4px 16px rgba(58, 53, 50, 0.08)',
    md: '0 8px 24px rgba(58, 53, 50, 0.10)',
    lg: '0 12px 32px rgba(58, 53, 50, 0.12)',
    xl: '0 16px 40px rgba(58, 53, 50, 0.14)',
  },
  black: '#3a3532',
  components: {
    Button: {
      defaultProps: { radius: 'xl' },
    },
    Badge: {
      defaultProps: { radius: 'xl', tt: 'none', fw: 600 },
    },
    Paper: {
      defaultProps: { radius: 'lg' },
    },
    Card: {
      defaultProps: { radius: 'lg', shadow: 'sm' },
    },
    Avatar: {
      defaultProps: { radius: 'xl' },
    },
  },
  other: {
    // Not a Mantine color-scale value — the page background sits slightly
    // warmer/lighter than the lowest "sand" shade, matching the design's
    // #fffbf7 body vs. #fffefc card surfaces.
    pageBackground: '#fffbf7',
    surfaceBackground: '#fffefc',
    textPrimary: '#3a3532',
    textMuted: '#9c9389',
  },
});
