import { uploadImageMiddleware } from "../middleware/uploadImageMiddleware.js";
import { uploadProductImage, retryProductImageCleanup } from "../controllers/productController.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { Router } from "express";
import { UserRole } from "../config/constants.js";
import {
  createProduct,
  getProduct,
  listProducts,
  setProductStatus,
  updateProduct,
} from "../controllers/productController.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = Router();
router.use(validateRequest);
router.get("/", listProducts);
router.post('/media-cleanup/retry', authenticate, authorize(UserRole.ADMIN), retryProductImageCleanup);
router.get("/admin", authenticate, authorize(UserRole.ADMIN), listProducts);
router.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  uploadImageMiddleware,
  createProduct,
);
router
  .route("/:id")
  .all(validateObjectId())
  .get(getProduct)
  .patch(
    authenticate,
    authorize(UserRole.ADMIN),
    uploadImageMiddleware,
    updateProduct,
  );
router.patch(
  "/:id/status",
  authenticate,
  authorize(UserRole.ADMIN),
  validateObjectId(),
  setProductStatus,
);

router.post(
  "/:id/upload-image",
  authenticate,
  authorize(UserRole.ADMIN),
  validateObjectId(),
  uploadImageMiddleware,
  uploadProductImage,
);

export default router;
