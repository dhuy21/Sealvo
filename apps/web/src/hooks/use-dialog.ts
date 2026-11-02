import { useEffect, useRef } from 'react';

/**
 * Modal keyboard behaviour while `open`: Escape calls `onClose`, focus moves into the dialog
 * (unless an element inside already has it) and returns to the opener on close.
 * Put the returned ref on the element with `role="dialog"` and `tabIndex={-1}`.
 */
export function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const focused = document.activeElement;
    const focusInside = !!dialog && dialog.contains(focused);
    const opener = !focusInside && focused instanceof HTMLElement ? focused : null;
    if (dialog && !focusInside) dialog.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, [open]);

  return dialogRef;
}
