import { Router } from 'express';
import { mkdirSync } from 'node:fs';
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
  storage: multer.diskStorage({
    destination: productUploadsDirectory,
    filename: (_request, file, callback) =>
      callback(
        null,
        `${Date.now()}-${randomUUID()}${imageExtensions.get(file.mimetype)}`,
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!imageExtensions.has(file.mimetype)) {
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
            : error.message,
        ),
      );
      return;
    }
    next(error);
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
