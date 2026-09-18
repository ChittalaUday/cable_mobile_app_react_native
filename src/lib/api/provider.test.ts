// The devtools plugin ships untranspiled ESM; nothing here exercises it.
import { queryClient } from './provider';

jest.mock('@dev-plugins/react-query', () => ({ useReactQueryDevTools: () => {} }));

function retryAfter(failureCount: number, error: unknown): boolean | number {
  const retry = queryClient.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function')
    throw new TypeError('queries.retry is not a predicate');

  return retry(failureCount, error as Error);
}

const withStatus = (status: number) => ({ response: { status } });

describe('query retry policy', () => {
  it('takes a 4xx as the answer and stops', () => {
    // 401 matters most: each retry drags the token refresh through the
    // interceptor again for a session that is already gone.
    expect(retryAfter(0, withStatus(401))).toBe(false);
    expect(retryAfter(0, withStatus(403))).toBe(false);
    expect(retryAfter(0, withStatus(404))).toBe(false);
    expect(retryAfter(0, withStatus(429))).toBe(false);
  });

  it('gives a server fault or a dead connection a second chance', () => {
    expect(retryAfter(0, withStatus(500))).toBe(true);
    expect(retryAfter(1, withStatus(503))).toBe(true);
    expect(retryAfter(2, withStatus(500))).toBe(false);

    // No `response` at all: the request never reached the server.
    expect(retryAfter(0, new Error('Network Error'))).toBe(true);
    expect(retryAfter(2, new Error('Network Error'))).toBe(false);
  });
});
