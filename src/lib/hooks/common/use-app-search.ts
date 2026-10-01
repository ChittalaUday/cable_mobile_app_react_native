import * as React from 'react';
import { registryFor } from '@/lib/app-registry';
import { usePermissions } from '@/lib/hooks/common/use-permissions';
import { useAuthStore } from '@/lib/hooks/stores/use-auth-store';

export function useAppSearch(searchTerm: string) {
  const role = useAuthStore.use.role();
  const { can } = usePermissions();
  const items = React.useMemo(() => registryFor(role), [role]);

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
