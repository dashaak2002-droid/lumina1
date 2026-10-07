import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lumina — твоя жизнь в одном месте',
  description: 'Life OS для женщин: планер, привычки, цели, заметки и AI-помощник.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Lumina', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f2ec',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div className="app">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
