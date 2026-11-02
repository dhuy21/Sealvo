import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Apprendre des mots' };

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
