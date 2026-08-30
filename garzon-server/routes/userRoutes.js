import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  changeMyPassword,
  getMyProfile,
  getUser,
  listUsers,
  setUserStatus,
  updateMyProfile,
  updateUser,
} from '../controllers/userController.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.use(authenticate);
router.route('/me').get(getMyProfile).patch(updateMyProfile);
router.patch('/me/password', changeMyPassword);

router.use(authorizeRoles(UserRole.ADMIN));
router.get('/', listUsers);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getUser)
  .patch(updateUser);
router.patch('/:id/status', validateObjectId(), setUserStatus);

export default router;
