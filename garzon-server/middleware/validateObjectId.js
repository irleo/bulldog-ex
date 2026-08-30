import mongoose from "mongoose";
import { HttpStatus } from "../config/constants.js";
import { ApiError } from "./errorHandlers.js";

/**
 * @param {string} [parameterName]
 * @returns {import('express').RequestHandler}
 */
export const validateObjectId =
  (parameterName = "id") =>
  (request, _response, next) => {
    const value = request.params[parameterName];

    if (!mongoose.isObjectIdOrHexString(value)) {
      next(
        new ApiError(
          HttpStatus.BAD_REQUEST,
          `${parameterName} must be a valid MongoDB ObjectId.`,
        ),
      );
      return;
    }

    next();
  };
