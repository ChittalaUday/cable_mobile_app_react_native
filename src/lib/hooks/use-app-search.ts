import * as React from 'react';
import { useAppRegistryStore } from '@/lib/hooks/use-app-registry-store';
import { usePermissions } from '@/lib/hooks/use-permissions';

export function useAppSearch(searchTerm: string) {
  const items = useAppRegistryStore.use.items();
  const fetchRegistry = useAppRegistryStore.use.fetchRegistry();
  const { can } = usePermissions();

  React.useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const results = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return items.filter(item => can(item.requiredPermission));
    }

    return items.filter((item) => {
      if (!can(item.requiredPermission))
        return false;

      const titleMatch = item.title.toLowerCase().includes(term);
      const descMatch = item.description?.toLowerCase().includes(term) ?? false;
      const keywordMatch = item.keywords.some(kw => kw.toLowerCase().includes(term));

      return titleMatch || descMatch || keywordMatch;
    });
  }, [items, searchTerm, can]);

  return {
    results,
    isSearching: Boolean(searchTerm.trim()),
  };
}
