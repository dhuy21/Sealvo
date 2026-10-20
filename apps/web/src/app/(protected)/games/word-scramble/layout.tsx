import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mots Mélangés' };

export default function WordScrambleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
