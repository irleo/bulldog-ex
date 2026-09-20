import { validateRequest } from '../middleware/validationMiddleware.js';
import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  addCartItem,
  clearMyCart,
  getMyCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cartController.js';
import { authenticate } from '../middleware/authentication.js';
import { authorize } from '../middleware/authorization.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(validateRequest);

router.use(authenticate, authorize(UserRole.CUSTOMER));
router.route('/').get(getMyCart).delete(clearMyCart);
router.post('/items', addCartItem);
router
  .route('/items/:productId')
  .all(validateObjectId('productId'))
  .patch(updateCartItem)
  .delete(removeCartItem);

export default router;
