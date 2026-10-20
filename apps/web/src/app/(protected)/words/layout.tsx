import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mon Vocabulaire' };

export default function WordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
