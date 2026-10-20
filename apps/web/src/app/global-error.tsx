'use client';

import { useEffect } from 'react';
import { ErrorPanel, INTERNAL_ERROR_MESSAGE } from '@/components/ErrorPanel';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <title>Erreur | SealVo</title>
        <ErrorPanel message={INTERNAL_ERROR_MESSAGE} onRetry={retry} />
      </body>
    </html>
  );
}
