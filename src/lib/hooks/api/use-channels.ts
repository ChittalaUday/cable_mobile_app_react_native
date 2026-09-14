import type { Channel, ChannelResolution, Page } from '@/lib/api/types';
import { createInfiniteQuery } from 'react-query-kit';
import { client } from '@/lib/api/client';

const PAGE_SIZE = 40;

/**
 * What `GET /channels` filters on.
 *
 * Everything a picker needs is here, so no screen has to pull the whole lineup
 * down to filter it locally. Language and FTA are the exceptions — they have no
 * server-side filter, so a screen that offers them filters the loaded page.
 */
export type ChannelQueryVariables = {
  serviceProviderId?: string;
  genre?: string;
  resolution?: ChannelResolution;
  /** With `inPackage`, pages the channels a package does/does not carry. */
  packageId?: string;
  inPackage?: boolean;
  /** Free-text search; the API calls it `q`. */
  q?: string;
} | void;

export const useChannels = createInfiniteQuery<
  Page<Channel>,
  ChannelQueryVariables,
  Error,
  number
>({
  queryKey: ['channels'],
  fetcher: async (variables, { pageParam }) => {
    const response = await client.get<Page<Channel>>('/channels', {
      params: { limit: PAGE_SIZE, page: pageParam, ...variables },
    });
    return response.data;
  },
  getNextPageParam: (lastPage) => {
    const loaded = lastPage.page * lastPage.limit;
    return loaded < lastPage.total ? lastPage.page + 1 : undefined;
  },
  initialPageParam: 1,
  staleTime: 5 * 60 * 1000,
});
