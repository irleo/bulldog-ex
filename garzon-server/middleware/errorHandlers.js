import mongoose from "mongoose";
import { HttpStatus } from "../config/constants.js";

export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** Converts rejected async request handlers into Express errors. */
export const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

/** Handles requests that do not match an API route. */
export const notFoundHandler = (request, _response, next) => {
  next(
    new ApiError(
      HttpStatus.NOT_FOUND,
      `Route not found: ${request.method} ${request.originalUrl}`,
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
    error instanceof Error ? error.message : "Unexpected server error.";
  let details = error instanceof ApiError ? error.details : null;

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = "Document validation failed.";
    details = Object.fromEntries(
      Object.entries(error.errors).map(([field, validationError]) => [
        field,
        validationError.message,
      ]),
    );
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = `Invalid value for ${error.path}.`;
  } else if (error?.code === 11000) {
    statusCode = HttpStatus.CONFLICT;
    message = "A document with the same unique field already exists.";
    details = error.keyValue ?? null;
  } else if (error instanceof mongoose.Error.StrictModeError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = error.message;
  }

  response.status(statusCode).json({
    success: false,
    message,
    count: 0,
    data: null,
    error: {
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === "development" && error instanceof Error
        ? { stack: error.stack }
        : {}),
    },
  });
};
