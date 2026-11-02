import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Memory Match' };

export default function FlashMatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
