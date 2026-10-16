import { useEffect } from 'react';

const MESSAGE = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter?';

/** Browser confirmation on reload / tab close while `dirty`. */
export function useUnsavedChangesWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = MESSAGE;
      return MESSAGE;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);
}
