import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
      minlength: [2, "Product name must contain at least 2 characters."],
      maxlength: [120, "Product name cannot exceed 120 characters."],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [140, "Product slug cannot exceed 140 characters."],
    },
    sku: {
      type: String,
      required: [true, "SKU is required."],
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z0-9_-]+$/,
        "SKU may contain letters, numbers, hyphens, and underscores only.",
      ],
      minlength: [3, "SKU must contain at least 3 characters."],
      maxlength: [40, "SKU cannot exceed 40 characters."],
    },
    price: {
      type: Number,
      required: [true, "Product price is required."],
      min: [0, "Product price cannot be negative."],
      max: [1000000, "Product price cannot exceed 1000000."],
      validate: {
        validator: (value) =>
          Number.isFinite(value) &&
          Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
        message: "Price must be finite and use at most two decimal places.",
      },
    },
    stock: {
      type: Number,
      required: [true, "Product stock is required."],
      min: [0, "Product stock cannot be negative."],
      max: [1000000, "Product stock cannot exceed 1000000."],
      validate: {
        validator: Number.isInteger,
        message: "Product stock must be an integer.",
      },
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required."],
    },
    supplier: {
      type: String,
      trim: true,
      maxlength: [120, "Supplier name cannot exceed 120 characters."],
      default: "Bulldogs Exchange",
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length <= 8,
        message: "A product can contain at most 8 images.",
      },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
  },
);

productSchema.pre("validate", function setSlug() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ name: "text" });
productSchema.index({ categoryId: 1, isActive: 1, createdAt: -1 });
productSchema.index({ categoryId: 1, supplier: 1, createdAt: -1 });
productSchema.index({ price: 1 });

const Product = mongoose.model("Product", productSchema, "products");

export default Product;
