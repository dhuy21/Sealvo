import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quiz de Vocabulaire' };

export default function VocabQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
