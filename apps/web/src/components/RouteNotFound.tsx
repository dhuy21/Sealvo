'use client';

import { useSyncExternalStore } from 'react';
import { ErrorPanel } from '@/components/ErrorPanel';

const subscribe = () => () => {};

/** Old notFoundHandler message. The 404 page is prerendered, so the URL is only known on the client. */
export function RouteNotFound() {
  const url = useSyncExternalStore(
    subscribe,
    () => location.pathname + location.search,
    () => '',
  );
  return <ErrorPanel message={['La route GET', url, "n'existe pas"].filter(Boolean).join(' ')} />;
}
