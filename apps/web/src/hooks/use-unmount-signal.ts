import { useCallback, useEffect, useRef } from 'react';

/** Returns a getter for an `AbortSignal` that aborts when the component unmounts. */
export function useUnmountSignal() {
  const controllerRef = useRef(new AbortController());

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    return () => controller.abort();
  }, []);

  return useCallback(() => controllerRef.current.signal, []);
}
