import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required."],
      trim: true,
      minlength: [2, "Category name must contain at least 2 characters."],
      maxlength: [80, "Category name cannot exceed 80 characters."],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, "Category slug cannot exceed 100 characters."],
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
  },
);

categorySchema.pre("validate", function setSlug() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1, name: 1 });

const Category = mongoose.model("Category", categorySchema, "categories");

export default Category;
