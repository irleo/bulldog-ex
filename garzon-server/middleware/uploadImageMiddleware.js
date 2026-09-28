import multer from "multer";
import { extname } from "node:path";
import sharp from "sharp";
import { ApiError } from "./errorHandlers.js";
import { validateBody } from "../utils/validation.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const formats = new Map([
  ["image/jpeg", { format: "jpeg", extensions: [".jpg", ".jpeg"] }],
  ["image/png", { format: "png", extensions: [".png"] }],
  ["image/webp", { format: "webp", extensions: [".webp"] }],
]);

/** Decode all pixels, reject animation, and strip metadata/trailing payloads by re-encoding.
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {Promise<Buffer>}
 */
export async function sanitizeImage(buffer, mimetype) {
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, "Choose a non-empty image up to 5 MB.");
  }
  const detected = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "image/png"
    : buffer.length > 3 &&
        buffer[0] === 255 &&
        buffer[1] === 216 &&
        buffer[2] === 255
      ? "image/jpeg"
      : buffer.length > 12 &&
          buffer.toString("ascii", 0, 4) === "RIFF" &&
          buffer.toString("ascii", 8, 12) === "WEBP"
        ? "image/webp"
        : undefined;
  if (detected !== mimetype)
    throw new ApiError(
      400,
      "The file contents do not match a supported image format.",
    );
  try {
    const image = sharp(buffer, {
      failOn: "warning",
      limitInputPixels: 20000000,
    });
    const metadata = await image.metadata();
    if (
      !formats.has(mimetype) ||
      metadata.format !== formats.get(mimetype)?.format ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new ApiError(
        400,
        "Choose a static JPG, PNG, or WebP image whose contents match its type.",
      );
    }
    const sanitized = await image.rotate().webp({ quality: 90 }).toBuffer();
    if (sanitized.length > MAX_IMAGE_BYTES)
      throw new ApiError(
        400,
        "The processed image exceeds 5 MB. Choose a smaller image.",
      );
    return sanitized;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      "The image is corrupt, unsupported, or exceeds 20 megapixels.",
    );
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
    fields: 12,
    parts: 13,
    fieldSize: 4096,
  },
  fileFilter: (_request, file, callback) => {
    if (
      !formats
        .get(file.mimetype)
        ?.extensions.includes(extname(file.originalname).toLowerCase())
    ) {
      callback(new ApiError(400, "Image must be a JPG, PNG, or WebP file."));
      return;
    }
    callback(null, true);
  },
});

/** @type {import('express').RequestHandler} */
export const uploadImageMiddleware = (request, response, next) => {
  upload.single("image")(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      next(
        new ApiError(
          400,
          error.code === "LIMIT_FILE_SIZE"
            ? "Image cannot exceed 5 MB."
            : "Upload one supported image in the image field and product fields only.",
        ),
      );
      return;
    }
    if (error) return next(error);
    const validate = async () => {
      request.body = validateBody(
        request.originalUrl,
        request.method,
        request.body,
        true,
      );
      if (request.file) {
        request.file.buffer = await sanitizeImage(
          request.file.buffer,
          request.file.mimetype,
        );
        request.file.mimetype = "image/webp";
        request.file.size = request.file.buffer.length;
      }
    };
    validate()
      .then(() => next())
      .catch(next);
  });
};
