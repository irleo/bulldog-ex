import { validateRequest } from '../middleware/validationMiddleware.js';
import { Router } from 'express';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { validateBody } from '../utils/validation.js';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { HttpStatus, UserRole } from '../config/constants.js';
import {
  createProduct,
  getProduct,
  listProducts,
  setProductStatus,
  updateProduct,
} from '../controllers/productController.js';
import { authenticate } from '../middleware/authentication.js';
import { authorize } from '../middleware/authorization.js';
import { ApiError } from '../middleware/errorHandlers.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(validateRequest);
const productUploadsDirectory = fileURLToPath(
  new URL('../uploads/products/', import.meta.url),
);
mkdirSync(productUploadsDirectory, { recursive: true });
const imageExtensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 12, parts: 13, fieldSize: 4096 },
  fileFilter: (_request, file, callback) => {
    if (!imageExtensions.has(file.mimetype) || !['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file.originalname).toLowerCase())) {
      callback(new ApiError(HttpStatus.BAD_REQUEST, 'Image must be a JPG, PNG, or WebP file.'));
      return;
    }
    callback(null, true);
  },
});

const uploadProductImage = (request, response, next) => {
  upload.single('image')(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      next(
        new ApiError(
          HttpStatus.BAD_REQUEST,
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Image cannot exceed 5 MB.'
            : 'Upload one supported image and the product fields only.',
        ),
      );
      return;
    }
    if (error) return next(error);
    const persistValidatedUpload = async () => {
      request.body = validateBody(request.originalUrl, request.method, request.body, true);
      if (!request.file) return;
      const bytes = request.file.buffer;
      const detected = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
        : bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
        : bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
      if (!detected || detected !== request.file.mimetype) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'The file contents do not match a supported image format.');
      }
      const filename = `${Date.now()}-${randomUUID()}${imageExtensions.get(detected)}`;
      await writeFile(join(productUploadsDirectory, filename), bytes, { flag: 'wx' });
      request.file.filename = filename;
    };
    persistValidatedUpload().then(() => next()).catch(next);
  });
};

router.get('/', listProducts);
router.get('/admin', authenticate, authorize(UserRole.ADMIN), listProducts);
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  uploadProductImage,
  createProduct,
);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getProduct)
  .patch(
    authenticate,
    authorize(UserRole.ADMIN),
    uploadProductImage,
    updateProduct,
  );
router.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.ADMIN),
  validateObjectId(),
  setProductStatus,
);

export default router;
