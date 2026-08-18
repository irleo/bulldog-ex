import { Router } from 'express';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from '../controllers/userController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.route('/').get(listUsers).post(createUser);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

export default router;
