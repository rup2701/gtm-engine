const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Guards against invalid/stale productId values (e.g. "null", empty strings,
// bookmarked links) hitting a Postgres uuid column and crashing with
// "invalid input syntax for type uuid" instead of a clean 400/fallback.
export function isValidUuid(value: string | null | undefined): value is string {
  return !!value && UUID_REGEX.test(value);
}
