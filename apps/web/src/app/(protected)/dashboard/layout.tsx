import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tableau de bord' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
