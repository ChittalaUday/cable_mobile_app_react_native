/* eslint-disable react-refresh/only-export-components */
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

/**
 * A 4xx is an answer, not a blip. Retrying it spends a phone's battery and data
 * to be told the same thing three more times — and on a 401 it drags the token
 * refresh through the interceptor again on each pass. Only faults that might
 * pass on their own (no signal, 5xx) are worth a second try.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: unknown) => {
        const status = (error as { response?: { status?: number } }).response?.status;

        if (status !== undefined && status >= 400 && status < 500)
          return false;

        return failureCount < 2;
      },
    },
  },
});

export function APIProvider({ children }: { children: React.ReactNode }) {
  useReactQueryDevTools(queryClient);
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
