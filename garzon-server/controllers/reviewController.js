import { HttpStatus } from '../config/constants.js';
import Review from '../models/reviewModel.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/query.js';

const reviewPopulation = [
  { path: 'productId', select: 'name slug sku' },
  { path: 'userId', select: 'firstName lastName' },
];

export const createReview = asyncHandler(async (request, response) => {
  const review = await Review.create(request.body);
  await review.populate(reviewPopulation);
  response.status(HttpStatus.CREATED).json({ success: true, data: review });
});

export const listReviews = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = {
    ...(request.query.productId
      ? { productId: request.query.productId }
      : {}),
    ...(request.query.userId ? { userId: request.query.userId } : {}),
    ...(request.query.rating
      ? { rating: Number(request.query.rating) }
      : {}),
    ...(request.query.isApproved !== undefined
      ? { isApproved: request.query.isApproved === 'true' }
      : {}),
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate(reviewPopulation)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: reviews,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getReview = asyncHandler(async (request, response) => {
  const review = await Review.findById(request.params.id).populate(
    reviewPopulation,
  );

  if (!review) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Review was not found.');
  }

  response.status(HttpStatus.OK).json({ success: true, data: review });
});

export const updateReview = asyncHandler(async (request, response) => {
  const review = await Review.findByIdAndUpdate(
    request.params.id,
    request.body,
    { new: true, runValidators: true },
  ).populate(reviewPopulation);

  if (!review) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Review was not found.');
  }

  response.status(HttpStatus.OK).json({ success: true, data: review });
});

export const deleteReview = asyncHandler(async (request, response) => {
  const review = await Review.findByIdAndDelete(request.params.id);

  if (!review) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Review was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    data: { id: review.id, deleted: true },
  });
});
