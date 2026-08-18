import { Router } from 'express';
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
} from '../controllers/orderController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.route('/').get(listOrders).post(createOrder);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getOrder)
  .patch(updateOrder)
  .delete(deleteOrder);

export default router;
