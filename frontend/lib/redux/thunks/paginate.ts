import { PaginatedResult } from "@/lib/data";

/**
 * Rebuild a `PaginatedResult` from an API envelope.
 *
 * The backend's Respond() *spreads* its payload onto the response root, so a
 * paginated reply arrives as `{ data, total, page, totalPages, success }` and
 * `apiService` hands that whole envelope back. A paginated thunk must therefore
 * return the envelope — not `response.data`, which is only the inner array.
 *
 * Getting this backwards is silent and lethal: the reducers read
 * `action.payload.data`, so returning the bare array writes `array.data` —
 * `undefined` — into the store, and the next render dies on `undefined.length`.
 * Route every paginated thunk through here and the shape can't drift.
 */
export function toPaginated<T>(response: {
  data?: T[];
  total?: number;
  page?: number;
  totalPages?: number;
}): PaginatedResult<T> {
  return {
    data: response.data ?? [],
    total: response.total ?? 0,
    page: response.page ?? 1,
    totalPages: response.totalPages ?? 0,
  };
}
