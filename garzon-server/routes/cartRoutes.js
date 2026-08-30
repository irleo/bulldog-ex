import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  addCartItem,
  clearMyCart,
  getMyCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cartController.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.use(authenticate, authorizeRoles(UserRole.CUSTOMER));
router.route('/').get(getMyCart).delete(clearMyCart);
router.post('/items', addCartItem);
router
  .route('/items/:productId')
  .all(validateObjectId('productId'))
  .patch(updateCartItem)
  .delete(removeCartItem);

export default router;
