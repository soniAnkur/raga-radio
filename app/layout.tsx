import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Raga Radio',
  description: 'AI-Powered Indian Classical Music Generator',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Raga Radio',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A0A0C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/styles.css" />
        <link rel="apple-touch-icon" href="/images/icon-180.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
