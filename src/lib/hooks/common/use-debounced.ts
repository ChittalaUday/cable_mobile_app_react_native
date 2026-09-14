import * as React from 'react';

/**
 * A value that settles before anything acts on it.
 *
 * Search boxes are wired straight into React Query variables, and a variable is
 * part of the query key: without this, every keystroke is a cache miss and a
 * request. Use it only where the filtering really is server-side — a list
 * already held in memory should just be filtered in place.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
