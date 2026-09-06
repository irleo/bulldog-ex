import { HttpStatus } from '../config/constants.js';
import { ApiError } from './errorHandlers.js';

/**
 * Allows a request to continue only when the authenticated user has one of
 * the permitted roles. Authentication must run before this middleware.
 */
export const authorize =
  (...roles) =>
  (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      next(
        new ApiError(
          HttpStatus.FORBIDDEN,
          'You do not have permission to perform this action.',
        ),
      );
      return;
    }

    next();
  };

export default authorize;
