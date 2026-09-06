import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  createReview,
  listAdminReviews,
  listMyReviews,
  listReviews,
  updateReview,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/authentication.js';
import { authorize } from '../middleware/authorization.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.get('/', listReviews);
router.post('/', authenticate, authorize(UserRole.CUSTOMER), createReview);
router.get('/mine', authenticate, authorize(UserRole.CUSTOMER), listMyReviews);
router.get(
  '/admin',
  authenticate,
  authorize(UserRole.ADMIN),
  listAdminReviews,
);
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateObjectId(),
  updateReview,
);

export default router;
