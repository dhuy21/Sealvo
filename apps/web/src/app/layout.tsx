import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import { AppProviders } from '@/providers/app-providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'SealVo', template: '%s | SealVo' },
  description: 'Learn vocabulary in 18 languages with spaced repetition and mini-games.',
  icons: { icon: '/images/logo.png', apple: '/images/logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#2575fc',
};

// Every page renders per request so its scripts carry the CSP nonce (proxy.ts): no static shell
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script src="/env.js" strategy="beforeInteractive" nonce={nonce} />
        <AppProviders nonce={nonce}>
          <div className="app flex-1">
            <Header />
            <main className="content flex-1">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
