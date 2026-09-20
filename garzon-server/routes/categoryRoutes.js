import { validateRequest } from '../middleware/validationMiddleware.js';
import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/categoryController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { authenticate } from '../middleware/authentication.js';
import { authorize } from '../middleware/authorization.js';

const router = Router();
router.use(validateRequest);

router.get('/', listCategories);
router.post('/', authenticate, authorize(UserRole.ADMIN), createCategory);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getCategory)
  .patch(authenticate, authorize(UserRole.ADMIN), updateCategory)
  .delete(authenticate, authorize(UserRole.ADMIN), deleteCategory);

export default router;
