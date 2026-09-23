import type { Metadata } from 'next';
import { Inter, Nunito } from 'next/font/google';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '@/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Supper Club',
  description: 'Team reviews of the products and articles we actually use',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable}`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <Notifications />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
