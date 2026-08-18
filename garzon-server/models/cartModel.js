import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Cart item product is required.'],
    },
    quantity: {
      type: Number,
      required: [true, 'Cart item quantity is required.'],
      min: [1, 'Cart item quantity must be at least 1.'],
      validate: {
        validator: Number.isInteger,
        message: 'Cart item quantity must be an integer.',
      },
    },
  },
  { _id: false, strict: 'throw' },
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart user is required.'],
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: (items) => {
          const productIds = items.map((item) => String(item.productId));
          return new Set(productIds).size === productIds.length;
        },
        message: 'A product can appear only once in a cart.',
      },
    },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

cartSchema.index({ userId: 1 }, { unique: true });
cartSchema.index({ 'items.productId': 1 });
cartSchema.index({ updatedAt: -1 });

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
