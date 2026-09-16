/**
 * The message an API error is worth showing, or a caller's fallback.
 *
 * The server's own `message` is preferred because it is the one written for the
 * operator ("This provider already has a package named …"); an axios error's
 * own text is about HTTP, which tells them nothing they can act on.
 */
export function apiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message)
      return response.data.message;
  }
  return error instanceof Error ? error.message : fallback;
}
