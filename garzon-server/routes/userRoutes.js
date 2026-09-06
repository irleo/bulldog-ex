import { Router } from 'express';
import { UserRole } from '../config/constants.js';
import {
  changeMyPassword,
  deleteUser,
  getSession,
  getMyProfile,
  getUser,
  listUsers,
  login,
  logout,
  register,
  setUserStatus,
  updateMyProfile,
  updateUser,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authentication.js';
import { authorize } from '../middleware/authorization.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.use(authenticate);
router.post('/logout', logout);
router.get('/me/session', getSession);
router.route('/me').get(getMyProfile).patch(updateMyProfile);
router.patch('/me/password', changeMyPassword);

router.get('/', authorize(UserRole.ADMIN), listUsers);
router
  .route('/:id')
  .all(validateObjectId())
  .get(getUser)
  .patch(updateUser);
router.use(authorize(UserRole.ADMIN));
router.patch('/:id/status', validateObjectId(), setUserStatus);
router.delete('/:id', validateObjectId(), deleteUser);

export default router;
