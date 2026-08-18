import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const shippingAddressSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required.'],
      trim: true,
      maxlength: 160,
    },
    street: { type: String, required: true, trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    province: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
  },
  { _id: false, strict: 'throw' },
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Order item product is required.'],
    },
    productName: {
      type: String,
      required: [true, 'Order item product name is required.'],
      trim: true,
      maxlength: 120,
    },
    sku: {
      type: String,
      required: [true, 'Order item SKU is required.'],
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Order item unit price is required.'],
      min: [0, 'Order item unit price cannot be negative.'],
    },
    quantity: {
      type: Number,
      required: [true, 'Order item quantity is required.'],
      min: [1, 'Order item quantity must be at least 1.'],
      validate: {
        validator: Number.isInteger,
        message: 'Order item quantity must be an integer.',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Order item subtotal cannot be negative.'],
    },
  },
  { _id: false, strict: 'throw' },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      default: () => `ORD-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order user is required.'],
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'An order must contain at least one item.',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, 'Shipping address is required.'],
    },
    phone: {
      type: String,
      required: [true, 'Order contact phone is required.'],
      trim: true,
      match: [/^(?:\+63|0)9\d{9}$/, 'Phone must be a valid Philippine mobile number.'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Order total cannot be negative.'],
    },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

orderSchema.pre('validate', function calculateTotals() {
  if (Array.isArray(this.items)) {
    this.items.forEach((item) => {
      item.subtotal = item.unitPrice * item.quantity;
    });
    this.totalAmount = this.items.reduce((total, item) => total + item.subtotal, 0);
  }
});

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
