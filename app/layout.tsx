import type { Metadata } from 'next';
import './globals.css';

const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.CF_PAGES_URL ?? 'http://localhost:3000';
const siteOrigin = configuredOrigin.startsWith('http') ? configuredOrigin : `https://${configuredOrigin}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'Mappi — mapas que criam trabalho',
  description: 'Desenhe processos e transforme cada etapa em tarefas, decisões, prazos e agenda.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'Mappi — mapas que criam trabalho',
    description: 'Desenhe processos e transforme cada etapa em tarefas, decisões, prazos e agenda.',
    images: [{
      url: '/og-mappi-v2.png',
      width: 1200,
      height: 630,
      alt: 'Mappi: um mapa gerando tarefas e agenda',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mappi — mapas que criam trabalho',
    description: 'Mapas, tarefas, decisões, agenda e aplicativos em uma experiência única.',
    images: ['/og-mappi-v2.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
