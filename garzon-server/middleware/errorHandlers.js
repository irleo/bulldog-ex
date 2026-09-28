import mongoose from "mongoose";
import { HttpStatus } from "../config/constants.js";
import { InputError } from '../utils/validation.js';

export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** @typedef {import('express').Request<Record<string, string>> & {user: InstanceType<typeof import('../models/userModel.js').default>, tokenHash: string}} AppRequest */
/** Converts rejected async request handlers into Express errors.
 * @param {(request: AppRequest, response: import('express').Response, next: import('express').NextFunction) => unknown} handler */
export const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

/** Handles requests that do not match an API route. */
export const notFoundHandler = (_request, _response, next) => {
  next(
    new ApiError(
      HttpStatus.NOT_FOUND,
      'The requested resource could not be found.',
    ),
  );
};

/** Produces the final structured response for validation, expected, and server errors. */
export const serverErrorHandler = (error, _request, response, _next) => {
  let statusCode =
    error instanceof ApiError
      ? error.statusCode
      : HttpStatus.INTERNAL_SERVER_ERROR;
  let message =
    error instanceof ApiError ? error.message : "We couldn't complete your request. Please try again.";
  let details = error instanceof ApiError ? error.details : null;

  if (error instanceof InputError) {
    statusCode = 400;
    message = error.message;
    details = error.fieldErrors;
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Please send a valid JSON request.';
  } else if (error?.type === 'entity.too.large') {
    statusCode = 413;
    message = 'The submitted data is too large.';
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = "Please check the submitted fields.";
    details = Object.fromEntries(
      Object.keys(error.errors).map((field) => [
        field,
        `Please enter a valid ${field}.`,
      ]),
    );
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = `Invalid value for ${error.path}.`;
  } else if (error?.code === 11000) {
    statusCode = HttpStatus.CONFLICT;
    message = "A document with the same unique field already exists.";
    message = 'That email, SKU, or unique record is already in use.';
    details = null;
  } else if (error instanceof mongoose.Error.StrictModeError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'The request contains an unsupported field.';
  }

  response.status(statusCode).json({
    success: false,
    message,
    count: 0,
    data: null,
    error: {
      ...(details ? { details } : {}),
    },
  });
};
