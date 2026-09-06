import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  cancelMyOrder,
  claimOrder,
  createOrder,
  getOrder,
  listMyOrders,
  listOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/authentication.js';
import { authorize } from '../middleware/authorization.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.use(authenticate);
router.get('/mine', authorize(UserRole.CUSTOMER), listMyOrders);
router.get('/', authorize(UserRole.ADMIN), listOrders);
router.post('/', authorize(UserRole.CUSTOMER), createOrder);
router.patch('/:id/claim', authorize(UserRole.CUSTOMER), validateObjectId(), claimOrder);
router.patch(
  '/:id/cancel',
  authorize(UserRole.CUSTOMER),
  validateObjectId(),
  cancelMyOrder,
);
router.get('/:id', validateObjectId(), getOrder);
router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN),
  validateObjectId(),
  updateOrderStatus,
);

export default router;
