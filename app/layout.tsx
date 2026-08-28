import type { Metadata } from 'next';
import './globals.css';

const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.CF_PAGES_URL ?? 'http://localhost:3000';
const siteOrigin = configuredOrigin.startsWith('http') ? configuredOrigin : `https://${configuredOrigin}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'Mappi — visual workflows that create work',
  description: 'Design processes and turn every step into tasks, decisions, deadlines, and schedules.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Mappi — visual workflows that create work',
    description: 'Design processes and turn every step into tasks, decisions, deadlines, and schedules.',
    images: [{
      url: '/og-mappi-v2.png',
      width: 1200,
      height: 630,
      alt: 'Mappi: a visual workflow generating tasks and a schedule',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mappi — visual workflows that create work',
    description: 'Maps, tasks, decisions, schedules, and apps in one connected experience.',
    images: ['/og-mappi-v2.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
