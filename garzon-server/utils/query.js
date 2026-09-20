import { HttpStatus } from '../config/constants.js';
import { ApiError } from '../middleware/errorHandlers.js';
import { numeric, text } from './validation.js';

/** @param {unknown} value */
export const escapeRegex = (value) =>
  text(value, 'search', 0, 120).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @param {unknown} rawPage
 * @param {unknown} rawLimit
 */
export const parsePagination = (rawPage, rawLimit) => {
  const page = numeric(rawPage ?? 1, 'page', 1, 100000, true, true);
  const limit = numeric(rawLimit ?? 20, 'limit', 1, 100, true, true);

  if (!Number.isInteger(page) || page < 1) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'page must be a positive integer.');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'limit must be between 1 and 100.');
  }

  return { page, limit, skip: (page - 1) * limit };
};

/**
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {boolean | undefined}
 */
export const parseOptionalBoolean = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new ApiError(
    HttpStatus.BAD_REQUEST,
    `${fieldName} must be true or false.`,
  );
};

/**
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {number | undefined}
 */
export const parseOptionalNonNegativeNumber = (value, fieldName) => {
  if (value === undefined) return undefined;

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      `${fieldName} must be a non-negative number.`,
    );
  }

  return number;
};
