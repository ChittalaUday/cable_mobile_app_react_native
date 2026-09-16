import * as React from 'react';

/**
 * Open/closed node ids, and the toggles the tree calls.
 *
 * Lives apart from the tree component because more than one screen drives the
 * same tree, and a file that exports a hook alongside a component loses fast
 * refresh for both.
 */
export function useTreeExpansion(initial: string[] = []) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(initial));

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id))
        next.delete(id);
      else
        next.add(id);
      return next;
    });
  }, []);

  const collapse = React.useCallback((id: string) => {
    setExpanded((prev) => {
      if (!prev.has(id))
        return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const expand = React.useCallback((ids: string[]) => {
    if (ids.length === 0)
      return;

    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids)
        next.add(id);
      return next;
    });
  }, []);

  const collapseMany = React.useCallback((ids: string[]) => {
    if (ids.length === 0)
      return;

    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids)
        next.delete(id);
      return next;
    });
  }, []);

  return {
    expanded,
    expand,
    toggle,
    collapse,
    collapseMany,
    collapseAll: React.useCallback(() => setExpanded(new Set()), []),
  };
}
