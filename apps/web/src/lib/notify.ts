import toast from 'react-hot-toast';

/** react-hot-toast has no info variant. */
export function notifyInfo(message: string, id?: string): void {
  toast(message, { id, icon: 'ℹ️' });
}

/** Long error kept 10 s; API validation errors span several lines. */
export function notifyLongError(message: string): void {
  toast.error(message, { duration: 10_000, style: { whiteSpace: 'pre-line' } });
}
