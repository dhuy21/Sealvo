'use client';

import { useEffect } from 'react';
import { ErrorPanel, INTERNAL_ERROR_MESSAGE } from '@/components/ErrorPanel';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <title>Erreur | SealVo</title>
      <ErrorPanel message={INTERNAL_ERROR_MESSAGE} onRetry={retry} />
    </>
  );
}
