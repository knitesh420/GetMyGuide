/**
 * Query-string parsing for the user module.
 *
 * user is the one module in the migration with NO zod validators — its
 * controller reads `req.query` by hand with `parseInt(...) || default`. That
 * idiom has three behaviours a schema would quietly change, so it is preserved
 * verbatim and shared between the Express controller and the native handlers
 * rather than being "modernised" on one side only:
 *
 *  - `?limit=0` falls back to the default, because 0 is falsy. A
 *    `z.coerce.number().default(n)` would accept the 0 and return an empty page.
 *  - `?limit=abc` falls back too, where a schema would answer 400.
 *  - `?limit=12abc` parses as 12, because `parseInt` stops at the first
 *    non-digit. A schema would reject it.
 *
 * No radix is passed, also deliberately: `parseInt('0x10')` is 16 here, and
 * adding `10` would change that.
 */

export function intOr(value: string | null | undefined, fallback: number): number {
	return parseInt(value as string) || fallback;
}

/** `?search=` with `?query=` accepted as an alias, as the controller does. */
export function searchParam(params: URLSearchParams): string | undefined {
	return params.get('search') || params.get('query') || undefined;
}
