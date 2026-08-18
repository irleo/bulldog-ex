import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review product is required.'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review user is required.'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required.'],
      min: [1, 'Rating must be at least 1.'],
      max: [5, 'Rating cannot exceed 5.'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer.',
      },
    },
    content: {
      type: String,
      required: [true, 'Review content is required.'],
      trim: true,
      minlength: [10, 'Review content must contain at least 10 characters.'],
      maxlength: [1_000, 'Review content cannot exceed 1000 characters.'],
    },
    isApproved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, rating: -1 });
reviewSchema.index({ isApproved: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
