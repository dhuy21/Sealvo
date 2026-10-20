import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mes Packages' };

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
