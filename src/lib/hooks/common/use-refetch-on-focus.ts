import { useFocusEffect } from 'expo-router';
import * as React from 'react';

/**
 * Refetches when the screen comes back into view — after a pushed screen is
 * popped, or a tab is revisited — but not on the first focus, which the query
 * already fetched for. React Query's own focus refetch only covers the app
 * returning to the foreground.
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  const opened = React.useRef(false);
  useFocusEffect(React.useCallback(() => {
    if (opened.current)
      void refetch();
    opened.current = true;
  }, [refetch]));
}
