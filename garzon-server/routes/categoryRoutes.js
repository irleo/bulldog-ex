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
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', listCategories);
router.post('/', authenticate, authorizeRoles(UserRole.ADMIN), createCategory);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getCategory)
  .patch(authenticate, authorizeRoles(UserRole.ADMIN), updateCategory)
  .delete(authenticate, authorizeRoles(UserRole.ADMIN), deleteCategory);

export default router;
