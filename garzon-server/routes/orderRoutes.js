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
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.use(authenticate);
router.get('/mine', authorizeRoles(UserRole.CUSTOMER), listMyOrders);
router.get('/', authorizeRoles(UserRole.ADMIN), listOrders);
router.post('/', authorizeRoles(UserRole.CUSTOMER), createOrder);
router.patch('/:id/claim', authorizeRoles(UserRole.CUSTOMER), validateObjectId(), claimOrder);
router.patch(
  '/:id/cancel',
  authorizeRoles(UserRole.CUSTOMER),
  validateObjectId(),
  cancelMyOrder,
);
router.get('/:id', validateObjectId(), getOrder);
router.patch(
  '/:id/status',
  authorizeRoles(UserRole.ADMIN),
  validateObjectId(),
  updateOrderStatus,
);

export default router;
