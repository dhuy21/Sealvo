'use client';

import { useEffect, useState } from 'react';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-search.module.css';

export function RotationNotice({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timeouts = visible
      ? [setTimeout(() => setMounted(true), 0), setTimeout(() => setShown(true), 100)]
      : [setTimeout(() => setShown(false), 0), setTimeout(() => setMounted(false), 300)];
    return () => timeouts.forEach(clearTimeout);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div className={cx(styles, 'rotation-notification', shown && 'show')}>
      <div className={cx(styles, 'rotation-icon')}>📱</div>
      <div className={cx(styles, 'rotation-content')}>
        <div className={cx(styles, 'rotation-title')}>Rotation de l&apos;écran requise</div>
        <div className={cx(styles, 'rotation-message')}>
          Veuillez tourner votre appareil en mode paysage pour jouer
        </div>
      </div>
    </div>
  );
}
