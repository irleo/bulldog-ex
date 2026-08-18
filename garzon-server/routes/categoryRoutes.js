import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/categoryController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.route('/').get(listCategories).post(createCategory);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getCategory)
  .patch(updateCategory)
  .delete(deleteCategory);

export default router;
