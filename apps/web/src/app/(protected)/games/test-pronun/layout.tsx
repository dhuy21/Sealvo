import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Défi Prononcial' };

export default function TestPronunLayout({ children }: { children: React.ReactNode }) {
  return children;
}
