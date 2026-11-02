import { useEffect } from 'react';

/** The page this link leads to, or null when following it does not leave the current page */
function leavingLink(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return null;
  }
  const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
  if (
    !(link instanceof HTMLAnchorElement) ||
    link.target === '_blank' ||
    link.hasAttribute('download')
  ) {
    return null;
  }
  const url = new URL(link.href);
  const samePage = url.pathname === location.pathname && url.search === location.search;
  return url.origin === location.origin && !samePage ? link : null;
}

/**
 * Asks before leaving the page while `active`: reload and tab close (browser dialog), and the
 * in-app links, which navigate without unloading the page (so without `beforeunload`).
 */
export function useLeaveConfirmation(active: boolean, message: string): void {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
    };
    // Capture phase on document: runs before the link's own (React) click handler
    const onClick = (e: MouseEvent) => {
      if (leavingLink(e) && !window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, message]);
}
