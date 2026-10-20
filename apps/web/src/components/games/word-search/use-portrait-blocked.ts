import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(debounce);
    debounce = setTimeout(onChange, 100);
  };
  const onTouch = () => setTimeout(onChange, 100);

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('touchstart', onTouch, { passive: true });
  return () => {
    clearTimeout(debounce);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    document.removeEventListener('touchstart', onTouch);
  };
}

/** Screens up to 950px wide must be in landscape to play. */
export const isPortraitBlocked = () =>
  window.innerWidth <= 950 && window.innerWidth <= window.innerHeight;

export function usePortraitBlocked(): boolean {
  return useSyncExternalStore(subscribe, isPortraitBlocked, () => false);
}
