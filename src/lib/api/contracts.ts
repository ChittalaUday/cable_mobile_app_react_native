import type { paths } from './schema.generated';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Operation<Path extends keyof paths, Verb extends Method> = NonNullable<paths[Path][Verb]>;

/** Projections of generated schemas, without another copy of the wire shape. */
export type ApiResponse<Path extends keyof paths, Verb extends Method = 'get', Code extends number = 200>
  = Operation<Path, Verb> extends { responses: infer Responses }
    ? Code extends keyof Responses
      ? Responses[Code] extends { content: { 'application/json': infer Data } } ? Data : never
      : never
    : never;

export type ApiBody<Path extends keyof paths, Verb extends Method>
  = Operation<Path, Verb> extends { requestBody?: { content: { 'application/json': infer Body } } } ? Body : never;

export type ApiQuery<Path extends keyof paths>
  = Operation<Path, 'get'> extends { parameters: { query?: infer Query } }
    // Pagination defaults are applied by the server, so callers may omit them.
    ? Omit<NonNullable<Query>, 'page' | 'limit'> & Partial<Pick<NonNullable<Query>, Extract<keyof NonNullable<Query>, 'page' | 'limit'>>>
    : never;
