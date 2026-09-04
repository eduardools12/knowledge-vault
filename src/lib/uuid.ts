const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a route parameter can be a row id.
 *
 * Checked before querying because Postgres raises a type error on a malformed
 * uuid, which would turn a junk URL into a 500 instead of an ordinary "not
 * found".
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
