import { Router } from 'express';
import {
  createCart,
  deleteCart,
  getCart,
  listCarts,
  updateCart,
} from '../controllers/cartController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.route('/').get(listCarts).post(createCart);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getCart)
  .patch(updateCart)
  .delete(deleteCart);

export default router;
