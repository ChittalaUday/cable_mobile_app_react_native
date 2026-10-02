import type { AxiosResponse } from 'axios';
import { AxiosHeaders } from 'axios';

/** A complete HTTP response fixture whose body keeps its schema type. */
export function httpResponse<Data>(data: Data): AxiosResponse<Data> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } };
}
