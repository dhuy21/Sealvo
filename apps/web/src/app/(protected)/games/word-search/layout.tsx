import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mots Cachés' };

export default function WordSearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
