/**
 * @param {Record<string, unknown>} source
 * @param {readonly string[]} allowedFields
 * @returns {Record<string, unknown>}
 */
export const selectFields = (source, allowedFields) =>
  Object.fromEntries(
    allowedFields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );
