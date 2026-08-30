import mongoose from "mongoose";
import { HttpStatus, OrderStatus } from "../config/constants.js";
import Product from "../models/productModel.js";
import Review from "../models/reviewModel.js";
import Order from "../models/orderModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";
import {
  escapeRegex,
  parseOptionalBoolean,
  parsePagination,
} from "../utils/query.js";
import { selectFields } from "../utils/selectFields.js";

const reviewPopulation = [
  { path: "productId", select: "name slug sku" },
  { path: "userId", select: "firstName lastName" },
];

const listReviewsWithFilter = async (request, response, baseFilter) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = {
    ...baseFilter,
    ...(request.query.productId ? { productId: request.query.productId } : {}),
    ...(request.query.rating ? { rating: Number(request.query.rating) } : {}),
  };
  if (request.query.q) {
    filter.content = { $regex: escapeRegex(request.query.q), $options: "i" };
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate(reviewPopulation)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: reviews,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const createReview = asyncHandler(async (request, response) => {
  const productId = String(request.body.productId ?? "");
  if (!mongoose.isObjectIdOrHexString(productId)) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "productId is invalid.");
  }
  const productExists = await Product.exists({
    _id: productId,
    isActive: true,
  });
  if (!productExists) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Product was not found.");
  }

  const claimedOrderExists = await Order.exists({
    userId: request.user._id,
    status: OrderStatus.CLAIMED,
    "items.productId": productId,
  });
  if (!claimedOrderExists) {
    throw new ApiError(
      HttpStatus.FORBIDDEN,
      "You can review this product after claiming an order that contains it.",
    );
  }

  const review = await Review.create({
    ...selectFields(request.body, ["rating", "content"]),
    productId,
    userId: request.user._id,
  });
  await review.populate(reviewPopulation);
  response.status(HttpStatus.CREATED).json({
    success: true,
    message: "Review submitted successfully.",
    data: review,
  });
});

export const listReviews = asyncHandler((request, response) =>
  listReviewsWithFilter(request, response, { isHidden: { $ne: true } }),
);

export const listMyReviews = asyncHandler((request, response) =>
  listReviewsWithFilter(request, response, { userId: request.user._id }),
);

export const listAdminReviews = asyncHandler((request, response) => {
  const isHidden = parseOptionalBoolean(request.query.isHidden, "isHidden");
  const isFlagged = parseOptionalBoolean(
    request.query.isFlagged,
    "isFlagged",
  );
  const filter = {
    ...(isHidden === undefined ? {} : { isHidden }),
    ...(isFlagged === undefined ? {} : { isFlagged }),
  };
  return listReviewsWithFilter(request, response, filter);
});

export const updateReview = asyncHandler(async (request, response) => {
  const updates = selectFields(request.body, ["isFlagged", "isHidden"]);
  if (Object.keys(updates).length === 0) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Only review flagging and visibility can be changed.",
    );
  }
  const review = await Review.findByIdAndUpdate(
    request.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  ).populate(reviewPopulation);

  if (!review) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Review was not found.");
  }
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Review moderation updated successfully.",
    data: review,
  });
});
