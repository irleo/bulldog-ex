import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  createReview,
  listAdminReviews,
  listMyReviews,
  listReviews,
  updateReview,
} from '../controllers/reviewController.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.get('/', listReviews);
router.post('/', authenticate, authorizeRoles(UserRole.CUSTOMER), createReview);
router.get('/mine', authenticate, authorizeRoles(UserRole.CUSTOMER), listMyReviews);
router.get(
  '/admin',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  listAdminReviews,
);
router.patch(
  '/:id',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  validateObjectId(),
  updateReview,
);

export default router;
