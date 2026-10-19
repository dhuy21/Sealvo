'use client';

import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react').then((mod) => mod.Lottie), { ssr: false });

/** The seal file is 1024×1024. `size` is the box it is drawn into. */
export function SealAnimation({ size }: { size: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size, display: 'inline-flex', flex: 'none' }}>
      <Lottie src="/animations/seal.json" loop autoplay style={{ width: size, height: size }} />
    </span>
  );
}
