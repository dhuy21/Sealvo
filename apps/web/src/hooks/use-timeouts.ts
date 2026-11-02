import { useCallback, useEffect, useRef } from 'react';

/** `setTimeout` whose pending callbacks are cancelled on unmount; nothing is scheduled once unmounted. */
export function useTimeouts() {
  const pendingRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const unmountedRef = useRef(false);

  useEffect(() => {
    const pending = pendingRef.current;
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return useCallback((fn: () => void, ms: number) => {
    if (unmountedRef.current) return;
    const id = setTimeout(() => {
      pendingRef.current.delete(id);
      fn();
    }, ms);
    pendingRef.current.add(id);
  }, []);
}
