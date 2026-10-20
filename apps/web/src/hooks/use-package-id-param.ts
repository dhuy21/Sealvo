import { useSearchParams } from 'next/navigation';

/** The `?package=` id of the page, null when it is missing or not a positive integer */
export function usePackageIdParam(): number | null {
  const id = Number(useSearchParams().get('package'));
  return Number.isInteger(id) && id > 0 ? id : null;
}
