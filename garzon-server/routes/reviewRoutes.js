import { Router } from 'express';
import {
  createReview,
  deleteReview,
  getReview,
  listReviews,
  updateReview,
} from '../controllers/reviewController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.route('/').get(listReviews).post(createReview);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getReview)
  .patch(updateReview)
  .delete(deleteReview);

export default router;
