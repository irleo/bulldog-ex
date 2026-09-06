import { HttpStatus } from '../config/constants.js';
import User from '../models/userModel.js';
import { ApiError, asyncHandler } from './errorHandlers.js';
import { verifyAccessToken } from '../utils/token.js';

/**
 * Verifies a Bearer JWT, reloads the account, and attaches the active user to
 * the request for downstream controllers and authorization middleware.
 */
export const authenticate = asyncHandler(async (request, _response, next) => {
  const authorizationHeader = request.get('authorization') ?? '';
  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication is required.');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    throw new ApiError(
      HttpStatus.UNAUTHORIZED,
      error?.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'The authentication token is invalid.',
    );
  }

  const user = await User.findById(payload.sub).select(
    'firstName lastName email role phone address isActive',
  );

  if (!user) {
    throw new ApiError(HttpStatus.UNAUTHORIZED, 'The account no longer exists.');
  }
  if (!user.isActive) {
    throw new ApiError(HttpStatus.FORBIDDEN, 'This account is inactive.');
  }

  request.user = user;
  next();
});

export default authenticate;
