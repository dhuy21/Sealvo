import { useMemo, useState } from 'react';
import type { Package } from '@/hooks/use-packages';

export type FilterType = 'my-packages' | 'all-public' | 'private' | 'public' | 'protected';

/** Filter tab + search of the packages page, and the stats of the user's own packages. */
export function usePackageFilters(
  myPackages: Package[] | undefined,
  publicPackages: Package[] | undefined,
) {
  const [filter, setFilter] = useState<FilterType>('my-packages');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const pkgs = myPackages ?? [];
    return {
      total: pkgs.length,
      public: pkgs.filter((p) => p.mode === 'public').length,
      private: pkgs.filter((p) => p.mode === 'private').length,
    };
  }, [myPackages]);

  const filteredPackages = useMemo(() => {
    const term = search.toLowerCase();
    let list: Package[] = [];

    if (filter === 'all-public') {
      list = publicPackages ?? [];
    } else {
      list = myPackages ?? [];
      if (filter === 'private' || filter === 'public' || filter === 'protected') {
        list = list.filter((p) => p.mode === filter);
      }
    }

    if (term) {
      list = list.filter(
        (p) =>
          p.package_name.toLowerCase().includes(term) ||
          (p.package_description ?? '').toLowerCase().includes(term) ||
          (p.username ?? '').toLowerCase().includes(term),
      );
    }

    return list;
  }, [myPackages, publicPackages, filter, search]);

  return {
    filter,
    setFilter,
    search,
    setSearch,
    stats,
    filteredPackages,
    isPublicView: filter === 'all-public',
  };
}
