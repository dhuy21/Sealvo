import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mini-Jeux' };

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
