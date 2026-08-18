/**
 * Converts rejected controller promises into Express errors.
 * @param {import('express').RequestHandler} handler
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};
