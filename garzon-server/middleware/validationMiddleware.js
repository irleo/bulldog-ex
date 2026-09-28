import {
  validateBody,
  validateQuery,
  InputError,
} from "../utils/validation.js";

/** Validates registration fields against the existing User model's input rules.
 * @type {import('express').RequestHandler}
 */
export const registerValidation = (request, _response, next) => {
  try {
    validateQuery(request.query);
    if (request.is("multipart/form-data")) {
      throw new InputError("body", "Use JSON for this request.");
    }
    request.body = validateBody("/api/v1/users/register", "POST", request.body);
    next();
  } catch (error) {
    next(error);
  }
};

/** @type {import('express').RequestHandler} */
export const validateRequest = (request, _response, next) => {
  try {
    validateQuery(request.query);
    if (
      request.is("multipart/form-data") &&
      !/^\/api\/v1\/products(?:\/[a-f\d]{24}(?:\/upload-image)?)?\/?(?:\?|$)/i.test(
        request.originalUrl,
      )
    ) {
      throw new InputError("body", "Use JSON for this request.");
    }
    if (!request.is("multipart/form-data")) {
      request.body = validateBody(
        request.originalUrl,
        request.method,
        request.body,
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};
