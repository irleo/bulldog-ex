// @ts-check
import { randomUUID } from "node:crypto";
import cloudinary, { requireCloudinary } from "../config/cloudinary.js";
import {
  scheduleCleanup,
  processCleanup,
  retryCleanupBatch,
} from "../utils/mediaCleanup.js";
import Review from "../models/reviewModel.js";
import mongoose from "mongoose";
import { HttpStatus, UserRole } from "../config/constants.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";
import {
  escapeRegex,
  parseOptionalBoolean,
  parseOptionalNonNegativeNumber,
  parsePagination,
} from "../utils/query.js";

const categoryPopulation = { path: "categoryId", select: "name slug" };
const productFields = [
  "name",
  "sku",
  "price",
  "stock",
  "categoryId",
  "supplier",
  "isActive",
];

/** @param {Record<string, unknown> | undefined} source */
const selectProductFields = (source = {}) =>
  Object.fromEntries(
    productFields
      .filter((field) => source?.[field] !== undefined)
      .map((field) => [field, source[field]]),
  );

/** @param {unknown} rawSort @returns {Record<string, import('mongoose').SortOrder>} */
const parseProductSort = (rawSort) => {
  const requested = String(rawSort ?? "-createdAt");
  const descending = requested.startsWith("-");
  const field = descending ? requested.slice(1) : requested;
  const allowedFields = new Set(["name", "price", "stock", "createdAt"]);

  if (!allowedFields.has(field)) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "sort must be name, price, stock, createdAt, or the descending form prefixed with -.",
    );
  }

  return { [field]: descending ? -1 : 1, _id: 1 };
};

/** @param {unknown} rawCategory */
const resolveCategoryId = async (rawCategory) => {
  if (rawCategory === undefined) return undefined;

  const category = String(rawCategory).trim();
  if (!category) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "category cannot be empty.");
  }

  if (mongoose.isObjectIdOrHexString(category)) return category;

  const pattern = `^${escapeRegex(category)}$`;
  const match = await Category.findOne({
    $or: [
      { name: { $regex: pattern, $options: "i" } },
      { slug: { $regex: pattern, $options: "i" } },
    ],
  })
    .select("_id")
    .lean();

  return match?._id ?? null;
};

export const createProduct = asyncHandler(async (request, response) => {
  const productData = selectProductFields(request.body);
  if (
    !(await Category.exists({ _id: productData.categoryId, isActive: true }))
  ) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Choose an existing active category.",
    );
  }
  const product = await createProductWithImage(
    productData,
    request.file?.buffer,
  );
  product.imagePublicId = undefined;
  await product.populate(categoryPopulation);
  response.status(HttpStatus.CREATED).json({
    success: true,
    message: "Product created successfully.",
    count: 1,
    data: product,
  });
});

export const listProducts = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const categoryId = await resolveCategoryId(
    request.query.category ?? request.query.categoryId,
  );
  const isActive = parseOptionalBoolean(request.query.isActive, "isActive");
  const minPrice = parseOptionalNonNegativeNumber(
    request.query.minPrice,
    "minPrice",
  );
  const maxPrice = parseOptionalNonNegativeNumber(
    request.query.maxPrice,
    "maxPrice",
  );
  /** @type {import('mongoose').QueryFilter<import('mongoose').InferSchemaType<typeof Product.schema>>} */
  const filter = { isActive: true };

  if (categoryId !== undefined) filter.categoryId = categoryId;
  if (request.user?.role === UserRole.ADMIN) {
    if (isActive === undefined) delete filter.isActive;
    else filter.isActive = isActive;
  }
  if (request.query.supplier) {
    filter.supplier = {
      $regex: `^${escapeRegex(request.query.supplier)}$`,
      $options: "i",
    };
  }

  const search = request.query.search ?? request.query.q;
  if (search) {
    const pattern = escapeRegex(search);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { sku: { $regex: pattern, $options: "i" } },
      { supplier: { $regex: pattern, $options: "i" } },
    ];
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {
      ...(minPrice !== undefined ? { $gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
    };
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "minPrice cannot be greater than maxPrice.",
    );
  }
  const requestedSort = parseProductSort(request.query.sort);
  /** @type {Record<string, import('mongoose').SortOrder>} */
  const productSort =
    request.user?.role === UserRole.ADMIN && isActive === undefined
      ? { isActive: -1, ...requestedSort }
      : requestedSort;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate(categoryPopulation)
      .sort(productSort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Products retrieved successfully.",
    count: products.length,
    data: products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getProduct = asyncHandler(async (request, response) => {
  const product = await Product.findOne({
    _id: request.params.id,
    isActive: true,
  }).populate(categoryPopulation);

  if (!product) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Product was not found.");
  }
  const [rating] = await Review.aggregate([
    { $match: { productId: product._id, isHidden: false } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
    { $limit: 1 },
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Product retrieved successfully.",
    count: 1,
    data: {
      ...product.toObject(),
      averageRating: rating?.averageRating ?? null,
      reviewCount: rating?.reviewCount ?? 0,
    },
  });
});

export const updateProduct = asyncHandler(async (request, response) => {
  const productUpdates = selectProductFields(request.body);
  if (!request.file && !Object.keys(productUpdates).length) {
    throw new ApiError(400, "Provide a product field or image to update.");
  }
  if (
    productUpdates.categoryId !== undefined &&
    !(await Category.exists({ _id: productUpdates.categoryId, isActive: true }))
  ) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Choose an existing active category.",
    );
  }
  const { product, warning } = await updateProductWithImage(
    request.params.id,
    productUpdates,
    request.file?.buffer,
  );
  await product.populate(categoryPopulation);

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Product updated successfully.",
    ...(warning ? { warning } : {}),
    count: 1,
    data: product,
  });
});

export const uploadProductImage = asyncHandler(async (request, response) => {
  if (!request.file)
    throw new ApiError(400, "Choose an image in the image field.");
  const { product, warning } = await updateProductWithImage(
    request.params.id,
    {},
    request.file.buffer,
  );
  await product.populate(categoryPopulation);
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Product image updated successfully.",
    count: 1,
    data: product,
    ...(warning ? { warning } : {}),
  });
});

export const setProductStatus = asyncHandler(async (request, response) => {
  if (typeof request.body.isActive !== "boolean") {
    throw new ApiError(HttpStatus.BAD_REQUEST, "isActive must be a boolean.");
  }

  const product = await Product.findByIdAndUpdate(
    request.params.id,
    { $set: { isActive: request.body.isActive } },
    { new: true, runValidators: true },
  ).populate(categoryPopulation);

  if (!product) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Product was not found.");
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: `Product ${product.isActive ? "activated" : "deactivated"} successfully.`,
    count: 1,
    data: product,
  });
});

export const deleteProduct = asyncHandler(async (request, response) => {
  const product = await Product.findById(request.params.id).select(
    "+imagePublicId",
  );

  if (!product) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Product was not found.");
  }

  await scheduleCleanup(product.imagePublicId);
  const removed = await Product.deleteOne({
    _id: product._id,
    imagePublicId: product.imagePublicId ?? { $exists: false },
  });
  if (!removed.deletedCount)
    throw new ApiError(409, "The product changed. Refresh and retry.");
  const warning = await cleanupProductAsset(product.imagePublicId);
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Product deleted successfully.",
    ...(warning ? { warning } : {}),
    count: 1,
    data: { id: product.id, deleted: true },
  });
});

// Cloudinary uploads and product persistence.
/** @typedef {{url: string, publicId: string}} ProductImageAsset */

/** @param {Buffer} buffer @returns {Promise<ProductImageAsset>} */
export async function uploadProductAsset(buffer) {
  requireCloudinary();
  const publicId = `bulldogs-exchange/products/${randomUUID()}`;
  await scheduleCleanup(publicId);
  try {
    const result = await new Promise(
      /** @param {(value: import('cloudinary').UploadApiResponse) => void} resolve */ (
        resolve,
        reject,
      ) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            asset_folder: "bulldogs-exchange/products",
            resource_type: "image",
            format: "webp",
            overwrite: false,
            timeout: 30000,
          },
          (error, uploaded) => {
            if (error) reject(error);
            else if (!uploaded?.secure_url || uploaded.public_id !== publicId)
              reject(new Error("Invalid upload response."));
            else resolve(uploaded);
          },
        );
        stream.on("error", reject);
        stream.end(buffer);
      },
    );
    return { url: result.secure_url, publicId };
  } catch (error) {
    await cleanupProductAsset(publicId);
    console.error("Product image upload failed.", {
      publicId,
      error: error instanceof Error ? error.name : "UploadError",
    });
    throw new ApiError(
      502,
      "Image storage could not accept the upload. Please try again.",
    );
  }
}

/** Cleanup failure must not turn an already committed product write into a failed save.
 * @param {string | null | undefined} publicId @returns {Promise<string | undefined>}
 */
export async function cleanupProductAsset(publicId) {
  if (!publicId) return undefined;
  try {
    await scheduleCleanup(publicId);
    await processCleanup(publicId);
    return undefined;
  } catch (error) {
    console.error("Product asset cleanup requires retry.", {
      publicId,
      error: error instanceof Error ? error.name : "CleanupError",
    });
    return "The product was saved, but an unused image could not be removed. Contact the store administrator.";
  }
}

/** A network/write-concern error may occur after MongoDB committed the write.
 * @param {unknown} error @param {string | undefined} publicId
 */
async function cleanupRejectedWrite(error, publicId) {
  if (!publicId) return;
  const rejected =
    error instanceof ApiError ||
    error instanceof Product.base.Error.ValidationError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000);
  if (rejected) await cleanupProductAsset(publicId);
  else
    console.error(
      "Product write outcome is unknown; reconcile asset before deleting.",
      { publicId },
    );
}

/** @param {Record<string, unknown>} fields @param {Buffer | undefined} buffer */
export async function createProductWithImage(fields, buffer) {
  const product = new Product(fields);
  await product.validate();
  const asset = buffer ? await uploadProductAsset(buffer) : undefined;
  if (asset) {
    product.images = [asset.url];
    product.imagePublicId = asset.publicId;
  }
  try {
    await product.save();
  } catch (error) {
    await cleanupRejectedWrite(error, asset?.publicId);
    throw error;
  }
  return product;
}

/** Compare the previous image state atomically so concurrent replacements cannot orphan each other.
 * @param {string} id
 * @param {Record<string, unknown>} fields
 * @param {Buffer | undefined} buffer
 */
export async function updateProductWithImage(id, fields, buffer) {
  const previous = await Product.findById(id).select("+imagePublicId");
  if (!previous) throw new ApiError(404, "Product was not found.");
  const oldImages = [...previous.images];
  const oldPublicId = previous.imagePublicId;
  if (buffer) await scheduleCleanup(oldPublicId);
  previous.set(fields);
  await previous.validate();
  const asset = buffer ? await uploadProductAsset(buffer) : undefined;
  const updates = {
    ...fields,
    ...(asset ? { images: [asset.url], imagePublicId: asset.publicId } : {}),
  };
  let product;
  try {
    product = await Product.findOneAndUpdate(
      {
        _id: id,
        ...(asset
          ? {
              images: oldImages,
              imagePublicId: oldPublicId ?? { $exists: false },
            }
          : {}),
      },
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    );
    if (!product)
      throw new ApiError(
        409,
        "This product changed during the upload. Reload it and try again.",
      );
  } catch (error) {
    await cleanupRejectedWrite(error, asset?.publicId);
    throw error;
  }
  const warning = asset ? await cleanupProductAsset(oldPublicId) : undefined;
  return { product, warning };
}

export const retryProductImageCleanup = asyncHandler(
  async (_request, response) => {
    response.json({ success: true, data: await retryCleanupBatch() });
  },
);
