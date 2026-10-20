import type { Metadata } from 'next';
import { RouteNotFound } from '@/components/RouteNotFound';

export const metadata: Metadata = { title: 'Erreur' };

export default function NotFound() {
  return <RouteNotFound />;
}
