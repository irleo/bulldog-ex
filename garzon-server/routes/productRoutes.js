import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/productController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.route('/').get(listProducts).post(createProduct);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getProduct)
  .patch(updateProduct)
  .delete(deleteProduct);

export default router;
